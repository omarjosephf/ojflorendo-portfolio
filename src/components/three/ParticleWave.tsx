"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

import { FrameLimiter } from "@/components/three/FrameLimiter";
import {
  useCompactViewport,
  useSceneActive,
} from "@/components/three/hooks";
import {
  BAND_HIGH,
  BAND_LOW,
  CAMERA,
  CAMERA_POSITION,
  CAMERA_TARGET,
  COMPACT,
  DESKTOP,
  PLANE_Z,
  fadeFarOf,
  halfDepthOf,
  halfWidthOf,
  horizontalScale,
  type WaveConfig,
} from "@/components/three/wave-geometry";

/**
 * All wave motion happens on the GPU: the vertex shader displaces a flat point
 * grid from a single `uTime` uniform, so the per-frame CPU cost is a handful of
 * uniform writes regardless of particle count, and the geometry is uploaded once.
 */
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uAmplitude;
  uniform float uHalfDepth;
  uniform float uHalfWidth;

  varying float vHeight;
  varying float vDepth;
  varying float vGlow;
  varying float vEdge;

  void main() {
    vec3 pos = position;

    // Three crossing sine waves at unrelated speeds, so the surface drifts and
    // never visibly loops.
    float wave =
        sin(pos.x * 0.32 + uTime * 0.50) * 0.55
      + sin(pos.z * 0.24 + uTime * 0.36) * 0.45
      + sin((pos.x + pos.z) * 0.16 - uTime * 0.28) * 0.40;

    // A localised ripple that follows the pointer and decays with distance.
    float pointerDistance = distance(pos.xz, uPointer);
    float falloff = exp(-pointerDistance * 0.09);
    wave += sin(pointerDistance * 0.45 - uTime * 2.2) * falloff * uPointerStrength * 0.6;

    // Settle the wave flat towards the horizon. Distant water reads as calm
    // anyway, and at this shallow viewing angle un-settled far crests project
    // into hard vertical streaks.
    float nearness = clamp((pos.z + uHalfDepth) / (2.0 * uHalfDepth), 0.0, 1.0);
    pos.y = wave * uAmplitude * smoothstep(0.0, 0.55, nearness);

    vHeight = wave;
    vGlow = falloff * uPointerStrength;
    // Safety net for aspect ratios wider than the field was stretched to: the
    // lateral edges dissolve rather than ending in a straight line.
    vEdge = 1.0 - smoothstep(0.82, 1.0, abs(pos.x) / uHalfWidth);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
    // Perspective-correct sizing, capped so the nearest row cannot bloom into
    // large blobs. Scaled by DPR because gl_PointSize is in physical pixels and
    // would otherwise shrink on high-density screens.
    gl_PointSize = min(uSize * (30.0 / max(vDepth, 2.0)), 7.0) * uPixelRatio;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorCrest;
  uniform vec3 uColorTrough;
  uniform float uOpacity;
  uniform float uFadeNear;
  uniform float uFadeFar;
  uniform float uViewportHeightPx;
  uniform float uBandLow;
  uniform float uBandHigh;

  varying float vHeight;
  varying float vDepth;
  varying float vGlow;
  varying float vEdge;

  void main() {
    // Soft round points. The falloff is deliberately wide and gradual: small
    // hard-edged bright dots on a dark field are exactly what starbursts and
    // smears for readers with astigmatism.
    vec2 offset = gl_PointCoord - 0.5;
    float radial = dot(offset, offset);
    if (radial > 0.25) discard;
    float alpha = smoothstep(0.25, 0.06, radial) * 0.85;

    vec3 color = mix(uColorTrough, uColorCrest, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
    color += uColorCrest * vGlow * 0.15;

    // Dissolve towards the horizon so the grid has no visible far edge.
    float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDepth);

    // Confine the water to the lower half of the viewport, like a shoreline
    // seen from the beach. Done in screen space rather than by moving the
    // camera, so the band lands identically on any viewport shape — and it
    // leaves the upper half, where most reading happens, completely clear.
    float ny = gl_FragCoord.y / max(uViewportHeightPx, 1.0);
    float band = 1.0 - smoothstep(uBandLow, uBandHigh, ny);

    gl_FragColor = vec4(
      color,
      alpha * uOpacity * fade * vEdge * band * (1.0 + vGlow * 0.25)
    );
  }
`;

/** A flat grid of points on the XZ plane, centred on the origin. */
function buildGrid(
  columns: number,
  rows: number,
  spacing: number,
): Float32Array {
  const positions = new Float32Array(columns * rows * 3);
  const halfWidth = ((columns - 1) * spacing) / 2;
  const halfDepth = ((rows - 1) * spacing) / 2;

  let i = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      positions[i++] = column * spacing - halfWidth;
      positions[i++] = 0;
      positions[i++] = row * spacing - halfDepth;
    }
  }

  return positions;
}

// Scratch objects reused every frame so the render loop allocates nothing.
// Safe as module singletons: they are only ever touched synchronously inside a
// single frame callback, and a page mounts one wave.
const raycaster = new THREE.Raycaster();
const wavePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();
const ndc = new THREE.Vector2();

type PointerState = { x: number; y: number; strength: number };

/**
 * Tracks the pointer in -1..1 viewport space without re-rendering React.
 *
 * The canvas is fixed to the viewport, so viewport coordinates *are* canvas
 * coordinates. That removes the `getBoundingClientRect` this used to do — and
 * with it the scroll listener that called it, which forced a synchronous layout
 * on every scroll event and was a major source of scroll jank.
 */
function usePointerField(enabled: boolean) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, strength: 0 });

  useEffect(() => {
    if (!enabled) {
      pointer.current.strength = 0;
      return;
    }

    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
      pointer.current.strength = 1;
    };

    const onLeave = () => {
      pointer.current.strength = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  return pointer;
}

function createUniforms(config: WaveConfig) {
  return {
    uHalfDepth: { value: halfDepthOf(config) },
    uHalfWidth: { value: halfWidthOf(config) },
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerStrength: { value: 0 },
    uSize: { value: config.size },
    uPixelRatio: { value: 1 },
    // Crests stay well below the camera height so the wave never breaks above
    // the horizon.
    uAmplitude: { value: 1.35 },
    uColorCrest: { value: new THREE.Color("#2dd4bf") },
    uColorTrough: { value: new THREE.Color("#38bdf8") },
    // Deliberately restrained. This is background texture behind body copy on
    // every page — the content is the subject, never this. Paired with normal
    // (non-additive) blending, this reads as a calm, flat texture rather than
    // the glowing points it used to be. This is the main dial if the balance
    // needs adjusting.
    uOpacity: { value: 0.32 },
    uFadeNear: { value: 10 },
    uFadeFar: { value: fadeFarOf(config) },
    uViewportHeightPx: { value: 1 },
    uBandLow: { value: BAND_LOW },
    uBandHigh: { value: BAND_HIGH },
  };
}

function WaveField({
  animate,
  config,
}: {
  animate: boolean;
  config: WaveConfig;
}) {
  // ~3.9k points on phones, ~7.4k on desktop — one draw call either way.
  const positions = useMemo(
    () => buildGrid(config.columns, config.rows, config.spacing),
    [config],
  );

  const dpr = useThree((state) => state.viewport.dpr);
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const pointer = usePointerField(animate);

  // Recomputed whenever the canvas resizes, so rotating a phone or dragging a
  // window to an ultrawide monitor re-fits the field instead of exposing an edge.
  const xScale = horizontalScale(config, size.width / Math.max(size.height, 1));

  // Where the ripple is heading, in the plane's local XZ space.
  const desired = useRef(new THREE.Vector2());

  // Wall-clock reference for the animation, so speed never depends on frame
  // rate. Seeded on the first frame rather than during render, which must stay
  // pure.
  const lastTick = useRef(0);

  // Uniforms are mutated every frame, so they are reached through the material
  // ref — the sanctioned mutable escape hatch — rather than a memoised object.
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const initialUniforms = useMemo(() => createUniforms(config), [config]);

  // AdaptiveDpr can lower the ratio under load; keep point sizes in step. The
  // explicit invalidate matters under reduced motion, where nothing else asks
  // the demand-rendered canvas to draw another frame.
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uPixelRatio.value = dpr;
    material.uniforms.uViewportHeightPx.value = size.height * dpr;
    invalidate();
  }, [dpr, size.height, invalidate]);

  // Mobile browsers drop WebGL contexts under memory pressure or when a tab is
  // backgrounded. three re-initialises the renderer itself, but a demand-rendered
  // canvas also has to be asked for a frame or it would come back blank.
  useEffect(() => {
    const canvas = gl.domElement;
    const onRestored = () => invalidate();
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => canvas.removeEventListener("webglcontextrestored", onRestored);
  }, [gl, invalidate]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const uniforms = material.uniforms;

    // Advance the wave on wall-clock time, not on frame timing.
    //
    // This used to accumulate the render delta clamped to 50ms. At 24fps a
    // frame is 41.7ms, so any late frame — a scroll hitch, a GC pause — landed
    // over the clamp and the wave quietly lost time, then ran true again once
    // frames settled. That reads as the wave drifting faster and slower every
    // few seconds. Wall-clock time makes the speed constant no matter how the
    // frames fall. The generous clamp only exists to stop a backgrounded tab
    // from jumping the wave forward on return; it is far above normal jitter.
    const now = performance.now() / 1000;
    if (lastTick.current === 0) lastTick.current = now;
    const wall = now - lastTick.current;
    lastTick.current = now;
    if (animate) uniforms.uTime.value += Math.min(wall, 0.25);

    // Keep using the render delta for smoothing, where frame-rate proportional
    // easing is what we actually want.
    const dt = Math.min(delta, 0.05);

    // Project the pointer onto the wave plane, so the ripple lands under the
    // cursor. A linear screen-space mapping is badly wrong at this shallow
    // viewing angle, where a few pixels near the horizon span many world units.
    // Above the horizon the ray never meets the plane; keep the last target.
    const { x, y, strength } = pointer.current;
    ndc.set(x, -y);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(wavePlane, hitPoint)) {
      // Back out of the horizontal stretch: the shader compares against the
      // grid's unscaled local coordinates.
      desired.current.set(hitPoint.x / xScale, hitPoint.z - PLANE_Z);
    }

    // Ease the ripple towards that point instead of snapping to it.
    const ease = Math.min(dt * 3.5, 1);
    const target: THREE.Vector2 = uniforms.uPointer.value;

    target.x += (desired.current.x - target.x) * ease;
    target.y += (desired.current.y - target.y) * ease;
    uniforms.uPointerStrength.value +=
      ((animate ? strength : 0) - uniforms.uPointerStrength.value) * ease;
  });

  return (
    // Displacement happens in the shader, so the CPU-side bounding sphere of a
    // flat plane would be wrong; skip culling for this single draw call.
    <points
      frustumCulled={false}
      position={[0, 0, PLANE_Z]}
      scale={[xScale, 1, 1]}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={initialUniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        // Normal rather than additive blending. Additive makes every point a
        // small light source that blooms where points overlap — the brightest,
        // most eye-catching thing on screen, and the hardest to look past for
        // readers with astigmatism. Normal blending keeps it flat and calm.
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

const GL = { antialias: false, powerPreference: "high-performance" } as const;
const CANVAS_STYLE = { pointerEvents: "none" } as const;

/**
 * Ambient "particle wave" behind the whole site. Decorative only: `aria-hidden`,
 * never interactive, and every page reads identically without it (the static
 * `body::before` glow is the no-JS / no-WebGL state).
 *
 * This is a *fixed* viewport layer, not a scrolling one, and that is a
 * performance decision as much as a visual one: a fixed canvas does not move
 * relative to the viewport, so scrolling never re-rasterises it, and the scene
 * needs no element measurement (see `usePointerField`).
 *
 * Because it is on screen the whole time it runs to a tight budget — DPR pinned
 * to 1, ~7.4k points desktop / ~3.9k compact in a single draw call, no
 * antialiasing, no post-processing, no shadows, demand rendering throttled to
 * 24–30fps, and the loop stopped entirely when the tab is hidden. Under
 * `prefers-reduced-motion` one static frame is drawn and no pointer listener is
 * attached.
 */
export function ParticleWave() {
  const reduce = useReducedMotion();
  const compact = useCompactViewport();
  const { ref, active } = useSceneActive<HTMLDivElement>();

  const config = compact ? COMPACT : DESKTOP;
  const animate = !reduce && active;

  return (
    <div ref={ref} aria-hidden="true" className="site-wave">
      <Canvas
        frameloop="demand"
        // Pinned to 1. This is a soft, out-of-focus dot field where a higher
        // ratio is not visible, but costs 2.25x the fragments at 1.5.
        dpr={1}
        camera={CAMERA}
        gl={GL}
        style={CANVAS_STYLE}
        onCreated={({ camera, invalidate }) => {
          // Sit just above the plane looking along its length, so the grid
          // recedes to a horizon rather than being seen edge-on.
          camera.position.set(...CAMERA_POSITION);
          camera.lookAt(...CAMERA_TARGET);
          invalidate();
        }}
      >
        <WaveField animate={animate} config={config} />
        {/* Half-interval offset: the Digital Core renders on the alternate
            frames, so no single frame ever pays for both scenes. */}
        <FrameLimiter fps={config.fps} active={animate} phase={0.5} />
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
