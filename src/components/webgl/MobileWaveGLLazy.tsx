"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { COMPACT_QUERY } from "@/components/three/hooks";
import { hasWebGL } from "@/lib/webgl";

const MobileWaveGL = dynamic(
  () => import("@/components/webgl/MobileWaveGL").then((m) => m.MobileWaveGL),
  { ssr: false },
);

/**
 * Mounts the phone wave on exactly the viewports `useSceneEnabled()` denies the
 * three.js scene, so the two are mutually exclusive and no viewport ever runs
 * both.
 *
 * There is no JS fallback when WebGL is missing, on purpose: the ambient
 * `body::before` / `body::after` glow is the documented no-WebGL state, and
 * every page keeps it.
 */
export function MobileWaveGLLazy() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia(COMPACT_QUERY).matches) return;
    // Defer a frame so the hero paints before a GL context is created.
    const id = requestAnimationFrame(() => setEnabled(hasWebGL()));
    return () => cancelAnimationFrame(id);
  }, []);

  return enabled ? <MobileWaveGL /> : null;
}
