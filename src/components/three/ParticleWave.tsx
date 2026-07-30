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
    wave += sin(pointerDistance * 0.45 - uTime * 2.2) * falloff * uPointerStrength * 1.1;

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

  varying float vHeight;
  varying float vDepth;
  varying float vGlow;
  varying float vEdge;

  void main() {
    // Soft round points — square ones read as a pixel grid.
    vec2 offset = gl_PointCoord - 0.5;
    float radial = dot(offset, offset);
    if (radial > 0.25) discard;
    float alpha = smoothstep(0.25, 0.02, radial);

    vec3 color = mix(uColorTrough, uColorCrest, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
    color += uColorCrest * vGlow * 0.35;

    // Dissolve towards the horizon so the grid has no visible far edge.
    float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDepth);

    gl_FragColor = vec4(color, alpha * uOpacity * fade * vEdge * (1.0 + vGlow * 0.6));
  }
`;

/**
 * Scene framing. The camera sits just above the plane looking along it, so the
 * grid recedes to a horizon near the middle of the hero. The field is stretched
 * to the viewport's aspect ratio at runtime, so only the depth fade ever ends
 * it — its lateral edges stay outside the frustum on any screen shape.
 */
const CAMERA = { fov: 55, near: 0.1, far: 160 } as const;
const CAMERA_POSITION = [0, 3.4, 10] as const;
const CAMERA_TARGET = [0, 0.5, -16] as const;
const PLANE_Z = -18;

type WaveConfig = {
  columns: number;
  rows: number;
  spacing: number;
  size: number;
  fps: number;
};

const DESKTOP: WaveConfig = {
  columns: 164,
  rows: 78,
  spacing: 0.62,
  size: 2.4,
  fps: 30,
};

const COMPACT: WaveConfig = {
  columns: 112,
  rows: 56,
  spacing: 0.62,
  size: 2.2,
  fps: 24,
};

const halfWidthOf = (c: WaveConfig) => ((c.columns - 1) * c.spacing) / 2;
const halfDepthOf = (c: WaveConfig) => ((c.rows - 1) * c.spacing) / 2;

/**
 * Distance at which the field has fully dissolved. Derived from the geometry so
 * it always lands just short of the real far edge — the grid must never end in
 * a visible straight line.
 */
const fadeFarOf = (c: WaveConfig) =>
  CAMERA_POSITION[2] - PLANE_Z + halfDepthOf(c) - 2;

/**
 * How far the field must be stretched horizontally to reach past the frustum at
 * the current aspect ratio. Without this the plane's lateral edges are visible
 * on 16:9 and ultrawide desktops, and on phones held in landscape — the field
 * is sized for the viewport rather than assuming one.
 */
function horizontalScale(config: WaveConfig, aspect: number): number {
  const fovRadians = (CAMERA.fov * Math.PI) / 180;
  const required = Math.tan(fovRadians / 2) * aspect * fadeFarOf(config);
  return Math.max(1, required / halfWidthOf(config));
}

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
 * Tracks the pointer in -1..1 canvas space without re-rendering React. The
 * canvas itself is `pointer-events: none` so it can never intercept a click on
 * the hero's buttons — the position is read from `window` instead.
 */
function usePointerField(enabled: boolean) {
  const canvas = useThree((state) => state.gl.domElement);
  const pointer = useRef<PointerState>({ x: 0, y: 0, strength: 0 });

  useEffect(() => {
    if (!enabled) {
      pointer.current.strength = 0;
      return;
    }

    // Cache the rect: reading it on every pointermove forces a layout pass.
    let rect = canvas.getBoundingClientRect();
    const measure = () => {
      rect = canvas.getBoundingClientRect();
    };

    const onMove = (event: PointerEvent) => {
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const inside = x >= -1 && x <= 1 && y >= -1 && y <= 1;

      pointer.current.strength = inside ? 1 : 0;
      if (inside) {
        pointer.current.x = x;
        pointer.current.y = y;
      }
    };

    const onLeave = () => {
      pointer.current.strength = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [canvas, enabled]);

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
    uOpacity: { value: 0.5 },
    uFadeNear: { value: 10 },
    uFadeFar: { value: fadeFarOf(config) },
  };
}

function WaveField({
  animate,
  config,
}: {
  animate: boolean;
  config: WaveConfig;
}) {
  // ~5.4k points on phones, ~11.7k on desktop — one draw call either way.
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
    invalidate();
  }, [dpr, invalidate]);

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

    // Clamp so resuming after a pause (scroll away and back) can't jump.
    const dt = Math.min(delta, 0.05);
    if (animate) uniforms.uTime.value += dt;

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
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const GL = { antialias: false, powerPreference: "high-performance" } as const;
const CANVAS_STYLE = { pointerEvents: "none" } as const;

/**
 * Ambient "particle wave" behind the hero. Decorative only: `aria-hidden`, never
 * interactive, and the hero reads identically without it (the static CSS glow on
 * `.hero-wave` is the no-JS / no-WebGL state).
 *
 * Performance controls mirror the Digital Core — capped DPR (1 on phones, ≤1.5
 * on desktop), no antialiasing, no post-processing or shadows, demand rendering
 * throttled to 24–30fps, and the loop stops entirely when the hero scrolls out
 * of view or the tab is hidden. Under `prefers-reduced-motion` a single static
 * frame is rendered and the pointer listeners are never attached.
 */
export function ParticleWave() {
  const reduce = useReducedMotion();
  const compact = useCompactViewport();
  const { ref, active } = useSceneActive<HTMLDivElement>();

  const config = compact ? COMPACT : DESKTOP;
  const animate = !reduce && active;

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0">
      <Canvas
        frameloop="demand"
        dpr={compact ? 1 : [1, 1.5]}
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
        <FrameLimiter fps={config.fps} active={animate} />
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
