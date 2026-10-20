"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useAfterLoadIdle } from "@/components/stars/use-after-load-idle";
import { hasHardwareWebGL } from "@/components/webgl/gl";

const AboutSky = dynamic(() => import("@/components/about/AboutSky").then((m) => m.AboutSky), {
  ssr: false,
});

/** The probe's answer, asked once per page load. */
let hardware: boolean | null = null;
function hardwareWebGL(): boolean {
  if (hardware === null) hardware = hasHardwareWebGL();
  return hardware;
}

/**
 * Starts the journey scene once the page has loaded and the browser is idle.
 * Whether it can run at all is asked at once, so that without a GPU-drawn
 * WebGL the h1 paints the name straight away rather than after the wait. The
 * answer is cached rather than held in state: an update this early would make
 * React redo work on a page that is still hydrating.
 */
export function AboutSkyLazy() {
  const ready = useAfterLoadIdle();

  useEffect(() => {
    const root = document.documentElement;
    const timer = window.setTimeout(() => {
      if (!hardwareWebGL()) root.setAttribute("data-journey-name", "text");
    }, 0);
    return () => {
      window.clearTimeout(timer);
      root.removeAttribute("data-journey-name");
    };
  }, []);

  return ready && hardwareWebGL() ? <AboutSky /> : null;
}
