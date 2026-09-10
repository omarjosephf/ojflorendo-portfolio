"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * The panel and its client-side validation form their own chunk,
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

export function PortfolioAssistant({storageEnabled=false,nonce}:{storageEnabled?:boolean;nonce?:string}) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
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
      {hasOpened ? (
        <AssistantPanel
          storageEnabled={storageEnabled}
          nonce={nonce}
          open={open}
          titleId={titleId}
          descriptionId={descriptionId}
          onClose={close}
        />
      ) : null}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => {
          setHasOpened(true);
          setOpen(true);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open E.V"
        className="inline-flex min-h-11 items-center gap-2 rounded-[3px] border border-accent bg-accent py-2 pl-2 pr-4 font-heading text-base font-semibold tracking-[0.01em] text-night shadow-[0_10px_24px_-18px_rgba(41,42,38,0.55)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-accent-hover"
      >
        {/* A plain <img>, deliberately not next/image.
            next/image renders an inline `style` attribute, which this site's
            `style-src 'self' 'nonce-...'` policy blocks — it produced a real CSP
            violation on every page. Weakening the CSP to accommodate it is not
            acceptable, and the optimiser would add nothing here: the asset is
            already a pre-sized 128px WebP (7.2 KB) shown at 28px, which stays
            crisp past 4x DPR.

            Decorative on purpose: the adjacent visible label already says
            "Ask E.V", so meaningful alt text would make a screen
            reader announce the same thing twice. The identity image that does
            carry alt text lives in the panel. */}
        <img
          src="/images/profile/ev-avatar-launcher.webp"
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="h-7 w-7 rounded-full border border-night/40 bg-night/20 object-cover"
        />
        Ask E.V
      </button>
    </div>
  );
}
