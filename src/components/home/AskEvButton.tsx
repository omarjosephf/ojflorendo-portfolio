"use client";

import { OPEN_EV_EVENT } from "@/components/assistant/open-event";

/**
 * Opens the site's E.V panel from inside the page. The floating launcher owns
 * the panel and listens for this event, so there is still exactly one panel
 * and one place its focus returns to.
 */
export function AskEvButton({ label, className = "jf-button" }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_EV_EVENT))}
    >
      {label}
    </button>
  );
}
