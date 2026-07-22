"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Line } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

/**
 * Drives the demand-rendered canvas at a capped frame rate while `active`, and
 * stops entirely otherwise. Capping to ~30fps roughly halves GPU work versus a
 * continuous 60fps loop with no visible difference for the slow rotation, and
 * stopping when off-screen/hidden/reduced-motion frees the main thread and GPU.
 */
function FrameLimiter({ fps, active }: { fps: number; active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last >= interval) {
        last = t;
        invalidate();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, fps, invalidate]);
  return null;
}

/** Evenly distribute `n` points on a sphere of radius `r` (Fibonacci sphere). */
function fibonacciSphere(n: number, r: number): Float32Array {
  const arr = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    arr[i * 3] = Math.cos(theta) * radius * r;
    arr[i * 3 + 1] = y * r;
    arr[i * 3 + 2] = Math.sin(theta) * radius * r;
  }
  return arr;
}

function CoreScene({ animate, mobile }: { animate: boolean; mobile: boolean }) {
  const group = useRef<THREE.Group>(null);
  const count = mobile ? 42 : 70;

  const positions = useMemo(() => fibonacciSphere(count, 2.2), [count]);

  const connections = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let i = 0; i < count; i += 9) {
      const j = (i + 13) % count;
      lines.push([
        [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]],
        [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]],
      ]);
    }
    return lines;
  }, [positions, count]);

  useFrame((_, delta) => {
    if (animate && group.current) {
      // Clamp delta so resuming after a pause (scroll away/back) can't jump.
      const dt = Math.min(delta, 0.05);
      group.current.rotation.y += dt * 0.15;
      group.current.rotation.x += dt * 0.04;
    }
  });

  return (
    <group ref={group}>
      {/* Outer wireframe shell */}
      <mesh>
        <icosahedronGeometry args={[1.9, 1]} />
        <meshBasicMaterial color="#2dd4bf" wireframe transparent opacity={0.18} />
      </mesh>

      {/* Glowing core */}
      <mesh>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#7ff3e6" />
      </mesh>

      {/* Orbital rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.008, 8, 96]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, 0.6, 0]}>
        <torusGeometry args={[2.8, 0.006, 8, 96]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 1.7, -0.5, 0.3]}>
        <torusGeometry args={[3.2, 0.005, 8, 96]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.22} />
      </mesh>

      {/* Data points */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={mobile ? 0.05 : 0.055}
          color="#38bdf8"
          sizeAttenuation
          transparent
          opacity={0.9}
        />
      </points>

      {/* Connecting lines */}
      {connections.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#2dd4bf"
          lineWidth={1}
          transparent
          opacity={0.25}
        />
      ))}
    </group>
  );
}

/**
 * Procedural "Digital Core" (CLAUDE.md §10). Client-only, dynamically imported.
 * Performance controls: capped DPR (≈1 mobile / ≤1.5 desktop), no post-processing
 * or shadows, unlit basic materials, and the render loop is paused when the canvas
 * is off-screen or the tab is hidden. Static (single frame) under reduced motion.
 * Decorative only — marked aria-hidden and non-interactive; the accessible label
 * lives on the CSS fallback underneath.
 */
export function DigitalCore() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [mobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    let io: IntersectionObserver | undefined;
    if (wrapRef.current && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => setActive(entry.isIntersecting && !document.hidden),
        { threshold: 0.05 },
      );
      io.observe(wrapRef.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, []);

  const animate = !reduce && active;

  return (
    <div ref={wrapRef} aria-hidden="true" className="absolute inset-0">
      <Canvas
        // Demand rendering: nothing renders unless FrameLimiter invalidates.
        // This caps the frame rate and lets the scene stop completely when it is
        // off-screen, the tab is hidden, or reduced motion is preferred.
        frameloop="demand"
        dpr={mobile ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: !mobile, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
      >
        <CoreScene animate={animate} mobile={mobile} />
        <FrameLimiter fps={mobile ? 24 : 30} active={animate} />
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
