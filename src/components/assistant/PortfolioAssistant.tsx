"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * The panel, its reviewed answer manifest and its matcher form their own chunk,
 * fetched the first time a visitor opens the assistant.
 *
 * This component renders on every page, so anything it imports eagerly is paid
 * for on every page load by every visitor, including the great majority who
 * never open it. Shipping the panel eagerly measured a consistent 1-2 point drop
 * in mobile Lighthouse Performance (median 91 to 89) and pushed the site below
 * its 90+ target on most runs. Only the toggle button below is in the initial
 * bundle now.
 */
const AssistantPanel = dynamic(
  () => import("@/components/assistant/AssistantPanel").then((m) => m.AssistantPanel),
  { ssr: false },
);

export function PortfolioAssistant() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <div data-testid="oj-assistant" className="fixed bottom-4 right-4 z-[60]">
      {open ? (
        <AssistantPanel
          titleId={titleId}
          descriptionId={descriptionId}
          onClose={close}
        />
      ) : null}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open OJ Assistant"
        className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent py-2 pl-2 pr-4 font-heading text-sm font-semibold text-night shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5"
      >
        {/* A plain <img>, deliberately not next/image.
            next/image renders an inline `style` attribute, which this site's
            `style-src 'self' 'nonce-...'` policy blocks — it produced a real CSP
            violation on every page. Weakening the CSP to accommodate it is not
            acceptable, and the optimiser would add nothing here: the asset is
            already a pre-sized 128px WebP (4.5 KB) shown at 28px, which stays
            crisp past 4x DPR.

            Decorative on purpose: the adjacent visible label already says
            "Ask OJ Assistant", so meaningful alt text would make a screen
            reader announce the same thing twice. The identity image that does
            carry alt text lives in the panel. */}
        <img
          src="/images/profile/oj-assistant-avatar-2d.webp"
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="h-7 w-7 rounded-full bg-night/20 object-cover"
        />
        Ask OJ Assistant
      </button>
    </div>
  );
}
