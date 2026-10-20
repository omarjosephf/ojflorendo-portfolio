"use client";

import dynamic from "next/dynamic";
import type { StarSkyPlacement } from "@/components/stars/StarSky";
import { useAfterLoadIdle } from "@/components/stars/use-after-load-idle";

const StarSky = dynamic(() => import("@/components/stars/StarSky").then((m) => m.StarSky), {
  ssr: false,
});

/**
 * Starts the star sky only after the page has loaded and the browser is idle,
 * so the decoration never competes with the first paint or the hero text. Until
 * then the page is black, which is what the sky's background already is.
 */
export function StarSkyLazy(placement: StarSkyPlacement) {
  return useAfterLoadIdle() ? <StarSky {...placement} /> : null;
}
