"use client";

import { useEffect, useRef, useState } from "react";
import { hasWebGL } from "@/lib/webgl";

/** Viewports at or below this width are treated as phones. */
export const COMPACT_QUERY = "(max-width: 767px)";

/**
 * Whether a decorative WebGL scene should mount at all.
 *
 * Phone-sized viewports skip WebGL entirely and keep the CSS presentations that
 * already exist as the documented no-WebGL state: the ambient `body::before` /
 * `body::after` glow behind the wave, and `DigitalCoreFallback` behind the hero
 * core. Those layers drift on phones (ADR-0003 amendment), so the background is
 * still in motion there; only the WebGL scenes are lost.
 *
 * Both scenes share one ~234 KiB three.js chunk that costs roughly 1.1s of script
 * evaluation on a throttled mobile CPU. That dominated Total Blocking Time and
 * held mobile Lighthouse Performance between 65 and 80. Skipping it on phones
 * measured 91-93 with TBT 28-62ms across five runs, while desktop keeps both
 * scenes and stays at 100. Phones also get the battery and heat back.
 *
 * Known limitation: a phone held in landscape is wider than the breakpoint and
 * still loads WebGL. That matches the breakpoint the scenes already use for their
 * compact tuning; introducing a second, different heuristic would be worse.
 */
export function useSceneEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia(COMPACT_QUERY).matches) return;
    // Defer a frame so the hero paints first and we never call setState
    // synchronously inside the effect body.
    const id = requestAnimationFrame(() => setEnabled(hasWebGL()));
    return () => cancelAnimationFrame(id);
  }, []);

  return enabled;
}

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
