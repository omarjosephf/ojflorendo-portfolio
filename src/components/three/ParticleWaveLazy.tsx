"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { hasWebGL } from "@/lib/webgl";

// Load the WebGL bundle only on the client, after the hero text is painted.
const ParticleWave = dynamic(
  () => import("@/components/three/ParticleWave").then((m) => m.ParticleWave),
  { ssr: false },
);

/**
 * Mounts the site-wide particle wave only where WebGL is actually available.
 *
 * There is no JS-rendered fallback on purpose: the wave is a decorative
 * enhancement over the static `body::before` glow, so with no JS or no WebGL
 * every page keeps that background and loses nothing else.
 */
export function ParticleWaveLazy() {
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    // Defer a frame so the hero paints first and we never call setState
    // synchronously inside the effect body.
    const id = requestAnimationFrame(() => setWebgl(hasWebGL()));
    return () => cancelAnimationFrame(id);
  }, []);

  return webgl ? <ParticleWave /> : null;
}
