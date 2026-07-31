"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Drives a demand-rendered canvas at a capped frame rate while `active`, and
 * stops entirely otherwise. Capping to ~20–24fps roughly halves GPU work versus
 * a continuous 60fps loop with no visible difference for slow ambient motion,
 * and stopping when off-screen/hidden/reduced-motion frees the main thread and
 * GPU. Shared by every scene so the throttling policy stays in one place.
 */
export function FrameLimiter({
  fps,
  active,
  phase = 0,
}: {
  fps: number;
  active: boolean;
  /**
   * Offset within the frame interval, 0–1. Scenes sharing a page use different
   * phases so their renders land on different animation frames. Two scenes
   * rendering on the *same* frame doubles that frame's work and blows the
   * budget, which shows up as intermittent stutter rather than a steady cost.
   */
  phase?: number;
}) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let lastSlot = -1;
    const interval = 1000 / fps;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      // Absolute time slots rather than time-since-last-render, so the phase
      // offset is stable and two limiters stay reliably interleaved.
      const slot = Math.floor(t / interval + phase);
      if (slot !== lastSlot) {
        lastSlot = slot;
        invalidate();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, fps, phase, invalidate]);

  return null;
}
