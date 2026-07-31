"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether a 3D scene should be running: true only while its wrapper is
 * on-screen *and* the tab is visible. Scenes combine this with
 * `prefers-reduced-motion` to decide whether to animate at all.
 *
 * Attach the returned `ref` to the element that wraps the canvas.
 */
export function useSceneActive<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  // Assume visible until the observer reports otherwise, so the first frame is
  // never withheld from a hero that is on-screen at load.
  const inView = useRef(true);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const sync = () => setActive(inView.current && !document.hidden);

    document.addEventListener("visibilitychange", sync);

    let io: IntersectionObserver | undefined;
    if (ref.current && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          inView.current = entry.isIntersecting;
          sync();
        },
        { threshold: 0.05 },
      );
      io.observe(ref.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", sync);
      io?.disconnect();
    };
  }, []);

  return { ref, active };
}

/**
 * True on phone-sized viewports, sampled once on mount. Scenes use it to pick a
 * cheaper particle count, frame rate and device pixel ratio. Deliberately not
 * reactive: re-sampling on every resize would rebuild geometry mid-scroll, and
 * a device that starts compact stays compact for the life of the page.
 */
export function useCompactViewport(): boolean {
  const [compact] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );
  return compact;
}
