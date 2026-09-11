"use client";

import { useEffect, useRef } from "react";

/** Finite, event-driven decoration. Never captures pointers or delays an action. */
export function InteractionFeedback() {
  const burstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const burst = burstRef.current;
    if (!burst || typeof Element.prototype.animate !== "function") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const running = new Set<Animation>();
    let burstAnimation: Animation | undefined;

    const play = (element: Element, frames: Keyframe[], duration: number) => {
      const animation = element.animate(frames, {
        duration,
        easing: "cubic-bezier(.2,.7,.2,1)",
      });
      running.add(animation);
      animation.onfinish = animation.oncancel = () => running.delete(animation);
      return animation;
    };
    const cancel = () => {
      running.forEach((animation) => animation.cancel());
      running.clear();
      burstAnimation = undefined;
    };
    const onPreferenceChange = () => {
      if (reduce.matches) cancel();
    };
    const onClick = (event: MouseEvent) => {
      if (reduce.matches || event.button !== 0 || event.detail > 1) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Keep writing, selection, consent controls and the separate assistant quiet.
      if (target.closest("form, input, textarea, select, label, [contenteditable], .assistant-theme")) return;
      if (window.getSelection()?.isCollapsed === false) return;

      // Click, rather than pointerdown, avoids effects during touch scrolling.
      // Keyboard activation receives feedback at the activated control's centre.
      const control = target.closest("a, button, [role='button']");
      if (event.detail === 0 && !control) return;
      const rect = event.detail === 0 ? control!.getBoundingClientRect() : null;
      const x = rect ? rect.left + rect.width / 2 : event.clientX;
      const y = rect ? rect.top + rect.height / 2 : event.clientY;
      burstAnimation?.cancel();
      // Four painted dots share one small compositor-ready element. Position is
      // part of the animation: no per-click style attribute or layout mutation.
      burstAnimation = play(burst.firstElementChild!, [
        { transform: `translate(${x}px, ${y}px) scale(.2)`, opacity: 0.85 },
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 0 },
      ], 360);
    };

    document.addEventListener("click", onClick, { passive: true });
    reduce.addEventListener("change", onPreferenceChange);
    return () => {
      document.removeEventListener("click", onClick);
      reduce.removeEventListener("change", onPreferenceChange);
      cancel();
    };
  }, []);

  return (
    <div ref={burstRef} className="click-feedback" aria-hidden="true">
      <span />
    </div>
  );
}
