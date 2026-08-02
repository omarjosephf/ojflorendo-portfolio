/**
 * Server-only Cloudflare Turnstile verification.
 *
 * This module must only ever be imported from server code (the contact route).
 * It reads a server-only secret from `process.env` and never sends anything to
 * the browser.
 *
 * Default (no secret configured): verification is DISABLED and every submission
 * is allowed through, exactly as the form behaved before Turnstile existed. This
 * mirrors `src/lib/email/index.ts` — nothing breaks before the owner configures
 * it, and local development and CI keep working without an account.
 *
 * Environment variables:
 *   TURNSTILE_SECRET_KEY         — server-only secret (never `NEXT_PUBLIC_`)
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — public site key, read by the client widget
 *
 * Failure policy (ADR-0005): an explicit rejection blocks the submission, but an
 * INFRASTRUCTURE failure — Cloudflare unreachable, timeout, malformed reply —
 * allows it through. Losing a genuine client to someone else's outage is worse
 * than letting one spam message past.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Upper bound on a verification attempt, so a hung provider cannot stall the route. */
const TURNSTILE_TIMEOUT_MS = 10_000;

export type TurnstileOutcome =
  /** No secret configured — the check is switched off entirely. */
  | "disabled"
  /** Cloudflare confirmed the token. */
  | "verified"
  /** Enforcing, but the submission carried no token. */
  | "missing-token"
  /** Cloudflare rejected the visitor's token. */
  | "rejected"
  /** OUR credentials or request were wrong; allowed through by the fail-open policy. */
  | "misconfigured"
  /** Could not reach a verdict; allowed through by the fail-open policy. */
  | "unavailable";

export interface TurnstileResult {
  /** true when the submission may proceed. */
  ok: boolean;
  outcome: TurnstileOutcome;
  /**
   * Cloudflare's `error-codes`, when it returned any.
   *
   * Safe to log: a fixed enum describing OUR request, never visitor content and
   * never a secret. Without it a misconfiguration is undiagnosable in production,
   * which is exactly how a wrong secret key silently blocked every enquiry.
   */
  errorCodes?: string[];
}

/**
 * Failures that mean the request WE sent was wrong, or Cloudflare itself broke —
 * not that the visitor is a bot.
 *
 * Cloudflare answers HTTP 200 with `success: false` for these just as it does for
 * a genuinely bad token, so they must be separated by code. Treating them as a
 * failed challenge would blame the visitor for our mistake and block every
 * enquiry the moment a key is mistyped.
 */
const NOT_THE_VISITORS_FAULT = new Set([
  "missing-input-secret",
  "invalid-input-secret",
  "bad-request",
  "internal-error",
]);

function readErrorCodes(data: unknown): string[] {
  const raw = (data as { "error-codes"?: unknown } | null)?.["error-codes"];
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === "string") : [];
}

/** True when a secret is configured and submissions are therefore checked. */
export function isTurnstileEnforced(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token. Never throws — infrastructure failures resolve as
 * `ok: true` with the `unavailable` outcome so the caller can log the category.
 */
export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, outcome: "disabled" };

  // A real browser widget always supplies a token. Its absence is an explicit
  // signal, not an infrastructure problem, so it is refused.
  if (typeof token !== "string" || token === "") {
    return { ok: false, outcome: "missing-token" };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    // Cloudflare treats remoteip as optional; only send a real one.
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });

    // A non-2xx here means our own configuration is wrong (a bad secret, say),
    // not that the visitor is a bot. Fail open and let the caller warn.
    if (!res.ok) return { ok: true, outcome: "unavailable" };

    // Cloudflare's own JSON, not visitor content.
    const data: unknown = await res.json();
    const success = (data as { success?: unknown } | null)?.success;

    if (success === true) return { ok: true, outcome: "verified" };

    if (success === false) {
      const errorCodes = readErrorCodes(data);
      // Our key or our request was wrong. Let the enquiry through and let the
      // caller shout about it — never make a genuine client pay for it.
      if (errorCodes.some((code) => NOT_THE_VISITORS_FAULT.has(code))) {
        return { ok: true, outcome: "misconfigured", errorCodes };
      }
      return { ok: false, outcome: "rejected", errorCodes };
    }

    // Unrecognised shape — no verdict, so do not punish the visitor.
    return { ok: true, outcome: "unavailable" };
  } catch {
    // Timeout or network failure. Never inspect the thrown error: it can carry
    // the request URL and body, which contain the secret.
    return { ok: true, outcome: "unavailable" };
  }
}
