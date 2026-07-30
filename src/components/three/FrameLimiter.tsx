"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Drives a demand-rendered canvas at a capped frame rate while `active`, and
 * stops entirely otherwise. Capping to ~24–30fps roughly halves GPU work versus
 * a continuous 60fps loop with no visible difference for slow ambient motion,
 * and stopping when off-screen/hidden/reduced-motion frees the main thread and
 * GPU. Shared by every scene so the throttling policy stays in one place.
 */
export function FrameLimiter({ fps, active }: { fps: number; active: boolean }) {
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
