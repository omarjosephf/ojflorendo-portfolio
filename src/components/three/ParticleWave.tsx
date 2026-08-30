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
  fragmentShader,
  vertexShader,
} from "@/components/three/wave-shaders";
import {
  BAND_HIGH,
  BAND_LOW,
  buildGrid,
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
 * never interactive, and every page reads identically without it (the ambient
 * `body::before` / `body::after` glow is the no-JS / no-WebGL state).
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
