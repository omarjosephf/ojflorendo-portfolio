"use client";

import dynamic from "next/dynamic";
import { useSceneEnabled } from "@/components/three/hooks";

// Load the WebGL bundle only on the client, after the hero text is painted.
const ParticleWave = dynamic(
  () => import("@/components/three/ParticleWave").then((m) => m.ParticleWave),
  { ssr: false },
);

/**
 * Mounts the site-wide particle wave only where WebGL is actually available.
 *
 * There is no JS-rendered fallback on purpose: the wave is a decorative
 * enhancement over the static `body::before` glow, so with no JS, no WebGL, or
 * on a phone, every page keeps that background and loses nothing else.
 */
export function ParticleWaveLazy() {
  const enabled = useSceneEnabled();

  return enabled ? <ParticleWave /> : null;
}
