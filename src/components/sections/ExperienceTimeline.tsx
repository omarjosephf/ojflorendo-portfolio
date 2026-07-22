"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import type { ExperienceItem } from "@/types";

/**
 * Experience timeline with a scroll-linked progress treatment.
 *
 * The fill + marker are driven by a Framer MotionValue (useScroll). Each
 * milestone node's active state is toggled directly on the DOM inside the SAME
 * scroll handler (`data-reached` / `data-leading`), so a node lights up exactly
 * when the travelling marker reaches or passes its position and reverts when the
 * marker moves back above it — synchronised in both directions, with no
 * per-frame React re-render. A node's position is measured from stable layout
 * geometry (`offsetTop`, unaffected by transforms/scroll), re-measured on resize.
 *
 * Accessibility: the line, fill, marker and nodes are decorative and
 * aria-hidden. Under reduced motion the moving parts are omitted and no node is
 * ever activated, leaving a static, fully-inactive timeline.
 */
export function ExperienceTimeline({ items }: { items: ExperienceItem[] }) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // Each node's centre as a fraction (0..1) of the list height — the same space
  // the marker travels (`top: 0% → 100%`).
  const positions = useRef<number[]>([]);

  // The motion fill/marker are rendered client-only (keeps their inline styles
  // out of the server HTML for the strict style-src CSP; also the no-JS fallback).
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

  // Toggle node state in the same frame the marker moves. `reached` = the marker
  // has passed this node; `leading` = the node the marker is currently at.
  const apply = useCallback(
    (progress: number) => {
      const pos = positions.current;
      let reached = -1;
      if (!reduce) {
        for (let i = 0; i < pos.length; i++) {
          if (progress >= pos[i]!) reached = i;
        }
      }
      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        node.dataset.reached = String(reached >= i);
        node.dataset.leading = String(reached === i);
      });
    },
    [reduce],
  );

  // Measure node positions from stable layout metrics, then re-apply.
  const measure = useCallback(() => {
    const ol = listRef.current;
    if (!ol) return;
    const height = ol.clientHeight || 1;
    positions.current = nodeRefs.current.map((node) => {
      const li = node?.parentElement;
      if (!node || !li) return Infinity;
      return (li.offsetTop + node.offsetTop + node.offsetHeight / 2) / height;
    });
    apply(scrollYProgress.get());
  }, [apply, scrollYProgress]);

  // Re-measure on mount and whenever the list resizes (fonts, breakpoints).
  useEffect(() => {
    const ol = listRef.current;
    if (!ol) return;
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(ol);
    return () => ro.disconnect();
  }, [measure]);

  // Keep node state synced to the travelling progress, both directions.
  useMotionValueEvent(scrollYProgress, "change", apply);

  // Re-apply when `apply` changes (e.g. reduced-motion preference flips).
  useEffect(() => {
    apply(scrollYProgress.get());
  }, [apply, scrollYProgress]);

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

      {items.map((job, i) => (
        <li key={`${job.role}-${job.organisation}`} className="relative">
          {/* Timeline node — activated only once the marker reaches its position. */}
          <span
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="exp-node absolute -left-[calc(1.5rem+6px)] top-1.5 h-3 w-3 rounded-full ring-4 ring-night sm:-left-[calc(2rem+6px)]"
          />
          <Reveal className="exp-card glass rounded-2xl p-5 sm:p-6">
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
      ))}
    </ol>
  );
}
