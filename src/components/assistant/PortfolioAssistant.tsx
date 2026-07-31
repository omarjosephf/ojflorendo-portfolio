"use client";

import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";
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
        className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent px-4 py-3 font-heading text-sm font-semibold text-night shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        Ask OJ Assistant
      </button>
    </div>
  );
}
