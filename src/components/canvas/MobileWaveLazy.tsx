"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { COMPACT_QUERY } from "@/components/three/hooks";

const MobileWave = dynamic(
  () => import("@/components/canvas/MobileWave").then((m) => m.MobileWave),
  { ssr: false },
);

/**
 * Mounts the Canvas-2D wave only on the phone-sized viewports that
 * `useSceneEnabled()` denies the WebGL one, so the two are mutually exclusive
 * and no viewport ever runs both.
 */
export function MobileWaveLazy() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!window.matchMedia(COMPACT_QUERY).matches) return;
    const id = requestAnimationFrame(() => setCompact(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return compact ? <MobileWave /> : null;
}
