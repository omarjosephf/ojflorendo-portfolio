"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import type { ExperienceItem } from "@/types";

/**
 * Experience timeline with a scroll-linked progress treatment.
 *
 * Performance: the moving fill and marker are driven by Framer MotionValues
 * (useScroll → useTransform), which write directly to the DOM off the React
 * render loop — the list never re-renders per frame. The only React state is
 * `activeIndex`, updated by an IntersectionObserver and only when the active
 * card actually changes (never per scroll frame).
 *
 * Accessibility: the line, fill, marker and nodes are decorative and
 * aria-hidden. Under reduced motion the moving parts are omitted and a static
 * timeline (line + nodes + cards) is shown.
 */
export function ExperienceTimeline({ items }: { items: ExperienceItem[] }) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const inView = useRef<boolean[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // The motion fill/marker are rendered client-only. This keeps their inline
  // styles out of the server HTML (Framer applies runtime styles via the CSSOM,
  // which the strict style-src CSP permits — a server-rendered `style` attribute
  // would be blocked), and doubles as the no-JS static fallback.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 0 → 1 as the list scrolls through the vertical centre of the viewport.
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start center", "end center"],
  });
  const markerTop = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Active card = the one crossing the viewport centre line. A zero-height root
  // band means at most one card qualifies at a time; works up and down.
  useEffect(() => {
    if (reduce) return;
    if (typeof IntersectionObserver === "undefined") return;
    inView.current = new Array(items.length).fill(false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(idx)) inView.current[idx] = entry.isIntersecting;
        }
        const next = inView.current.findIndex(Boolean);
        if (next !== -1) setActiveIndex((prev) => (prev === next ? prev : next));
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items.length, reduce]);

  return (
    <ol
      ref={listRef}
      className="relative space-y-8 border-l border-line pl-6 sm:pl-8"
    >
      {/* Scroll-linked progress fill + marker (decorative, motion only).
          Client-only + not under reduced motion. */}
      {mounted && !reduce ? (
        <>
          <motion.span
            aria-hidden="true"
            style={{ scaleY: scrollYProgress }}
            className="pointer-events-none absolute left-0 top-0 -ml-px h-full w-0.5 origin-top rounded-full bg-gradient-to-b from-accent to-sky"
          />
          <motion.span
            aria-hidden="true"
            style={{ top: markerTop }}
            className="pointer-events-none absolute left-0 -ml-[7px] -mt-[7px] h-3.5 w-3.5 rounded-full border-2 border-night bg-accent shadow-[0_0_14px_var(--color-accent)]"
          />
        </>
      ) : null}

      {items.map((job, i) => {
        const isActive = !reduce && activeIndex === i;
        return (
          <li
            key={`${job.role}-${job.organisation}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            data-index={i}
            className="relative"
          >
            {/* Timeline node (decorative reference point) */}
            <span
              aria-hidden="true"
              className={`absolute -left-[calc(1.5rem+6px)] top-1.5 h-3 w-3 rounded-full ring-4 ring-night transition-transform sm:-left-[calc(2rem+6px)] ${
                isActive
                  ? "scale-125 bg-accent"
                  : job.current
                    ? "bg-accent/70"
                    : "bg-line"
              }`}
            />
            <Reveal
              className={`glass rounded-2xl p-5 transition-colors sm:p-6 ${
                isActive ? "ring-1 ring-accent/40" : ""
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-heading text-lg font-semibold text-ink">
                  {job.role}
                </h3>
                <span className="text-sm font-medium text-muted">
                  {job.period}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-accent">
                {job.organisation}
                <span className="text-muted"> · {job.location}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {job.responsibilities.map((item, j) => (
                  <li
                    key={j}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
