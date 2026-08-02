"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget, rendered explicitly.
 *
 * Renders nothing unless `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured, so the
 * form behaves exactly as before until the owner sets it up.
 *
 * CSP: `api.js` carries the per-request nonce, which Turnstile propagates to the
 * resources it loads. Combined with the existing `'strict-dynamic'` policy this
 * needs no `'unsafe-inline'`. The challenge itself renders in a
 * challenges.cloudflare.com iframe, which is why `frame-src` allows that origin
 * (see `src/proxy.ts` and ADR-0005).
 */

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme?: "auto" | "light" | "dark";
    },
  ) => string;
  /** Issues a fresh token. Required after any submission — tokens are single-use. */
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Load api.js once per document, carrying the CSP nonce. */
function ensureScript(nonce: string | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    if (nonce) script.nonce = nonce;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({
  siteKey,
  nonce,
  onToken,
  onUnavailable,
  resetSignal = 0,
}: {
  siteKey: string;
  nonce?: string;
  onToken: (token: string) => void;
  /** Called when the check cannot run at all (script blocked, or widget error). */
  onUnavailable?: () => void;
  /**
   * Increment to issue a fresh token. A Turnstile token is single-use and
   * expires after five minutes, so the widget MUST be reset after every
   * submission attempt — otherwise a visitor whose submission was rejected
   * (a mistyped email, say) resubmits the spent token, Cloudflare returns
   * `timeout-or-duplicate`, and they are locked out of the form.
   */
  resetSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    ensureScript(nonce)
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          // A stale token must not be submitted; clear it and let the widget retry.
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("");
            setFailed(true);
            onUnavailable?.();
          },
          theme: "dark",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        onUnavailable?.();
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) window.turnstile.remove(id);
      widgetIdRef.current = undefined;
    };
    // `onToken` is a stable setter from the parent; re-rendering the widget on
    // every keystroke would reset the challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, nonce]);

  useEffect(() => {
    // Skip the initial render — the widget issues its first token on its own.
    if (resetSignal === 0) return;
    const id = widgetIdRef.current;
    if (!id || !window.turnstile) return;
    // Drop the spent token immediately so it can never be resubmitted while the
    // replacement is still being issued.
    onToken("");
    window.turnstile.reset(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  return (
    <div className="mt-5">
      <div ref={containerRef} />
      {failed ? (
        // Must not promise the form will go through: with the check enforced,
        // a submission carrying no token is refused server-side. Point at the
        // two routes that actually work — reload, or the direct email button.
        <p role="alert" className="mt-2 text-sm text-red-300">
          The verification check couldn&apos;t load, so this form can&apos;t be
          sent right now. Please reload the page, or use the email button
          instead.
        </p>
      ) : null}
    </div>
  );
}
