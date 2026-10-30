"use client";

import { useEffect } from "react";

/** The one short move's length, plus its longest delay, with a little room. */
const MOVE_MS = 1_600;

/**
 * Plays each star picture's one short move the first time it scrolls into
 * view (ADR-0027): sets `data-seen="play"` once, then `"done"` so a later hover
 * or keyboard focus can play it again. Nothing loops, and with reduced motion
 * or without JavaScript the pictures stay still.
 */
export function CoverMotion() {
  useEffect(() => {
    if (typeof IntersectionObserver !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const frame = entry.target as HTMLElement;
          observer.unobserve(frame);
          frame.dataset.seen = "play";
          timers.push(window.setTimeout(() => (frame.dataset.seen = "done"), MOVE_MS));
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll("[data-cover]").forEach((frame) => observer.observe(frame));
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
