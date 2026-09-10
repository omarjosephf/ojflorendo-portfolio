"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget, rendered explicitly.
 *
 * Callers render this only when their public site key is configured.
 * Contact and managed Auth keep separate enforcement policies.
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

let scriptLoading: Promise<void> | undefined;
/** Load once, with a bounded failure even if the script request never finishes. */
function ensureScript(nonce: string | undefined): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing ?? document.createElement("script");
    function done(ok: boolean) {
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
      if (ok) resolve(); else reject(new Error("Verification could not load"));
    }
    const loaded = () => done(Boolean(window.turnstile));
    const failed = () => done(false);
    const timer = setTimeout(failed, 10000);
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", failed, { once: true });
    if (!existing) {
      const element = script as HTMLScriptElement;
      element.id = SCRIPT_ID;
      element.src = SCRIPT_SRC;
      element.async = true;
      if (nonce) element.nonce = nonce;
      document.head.appendChild(element);
    }
  });
  return scriptLoading;
}

export function TurnstileWidget({
  siteKey,
  nonce,
  onToken,
  onUnavailable,
  resetSignal = 0,
  theme = "dark",
  failureMessage = "The verification check couldn’t load, so this form can’t be sent right now. Please reload the page, or use the email button instead.",
}: {
  siteKey: string;
  theme?: "auto" | "light" | "dark";
  failureMessage?: string;
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
          callback: (token) => { if (!cancelled) { setFailed(false); onToken(token); } },
          // A stale token must not be submitted; clear it and let the widget retry.
          "expired-callback": () => { if (!cancelled) onToken(""); },
          "error-callback": () => {
            if (cancelled) return;
            onToken("");
            setFailed(true);
            onUnavailable?.();
          },
          theme,
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
  }, [siteKey, nonce, theme]);

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
          {failureMessage}
        </p>
      ) : null}
    </div>
  );
}
