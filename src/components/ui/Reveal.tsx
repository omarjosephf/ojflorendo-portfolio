"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper. Applies the `.reveal` class and toggles `is-visible`
 * once the element enters the viewport, using IntersectionObserver.
 *
 * Animation itself lives in CSS (globals.css) so there are no inline styles —
 * this keeps it compatible with the strict Content Security Policy, and it
 * degrades to fully visible when JS is off or reduced motion is preferred.
 */
export function Reveal({
  children,
  className = "",
  delay,
}: {
  children: ReactNode;
  className?: string;
  /** Optional stagger step 1–4 (maps to a CSS transition-delay). */
  delay?: 1 | 2 | 3 | 4;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      // Very old browser with JS on: reveal on the next frame (deferred so we
      // never call setState synchronously inside the effect body).
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Reveal when the element enters the viewport OR is already at/above
          // the fold (e.g. after an anchor jump that skips past it), so content
          // can never get stuck invisible.
          if (
            entry.isIntersecting ||
            entry.boundingClientRect.top < window.innerHeight
          ) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-delay={delay}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
