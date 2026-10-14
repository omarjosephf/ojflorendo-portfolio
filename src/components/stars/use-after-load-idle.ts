"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has loaded and the browser has an idle moment (or 1.5 s
 * has passed), so decorative scenes never compete with the first paint.
 */
export function useAfterLoadIdle(): boolean {
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

  return ready;
}
