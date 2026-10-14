"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const StarSky = dynamic(() => import("@/components/stars/StarSky").then((m) => m.StarSky), {
  ssr: false,
});

/**
 * Starts the star sky only after the page has loaded and the browser is idle,
 * so the decoration never competes with the first paint or the hero text. Until
 * then the page is black, which is what the sky's background already is.
 */
export function StarSkyLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const begin = () => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      } else {
        timer = globalThis.setTimeout(() => setReady(true), 300) as unknown as number;
      }
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    return () => {
      window.removeEventListener("load", begin);
      if (idle) window.cancelIdleCallback(idle);
      if (timer) globalThis.clearTimeout(timer);
    };
  }, []);

  return ready ? <StarSky /> : null;
}
