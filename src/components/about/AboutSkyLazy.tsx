"use client";

import dynamic from "next/dynamic";
import { useAfterLoadIdle } from "@/components/stars/use-after-load-idle";

const AboutSky = dynamic(() => import("@/components/about/AboutSky").then((m) => m.AboutSky), {
  ssr: false,
});

/** Starts the journey scene once the page has loaded and the browser is idle. */
export function AboutSkyLazy() {
  return useAfterLoadIdle() ? <AboutSky /> : null;
}
