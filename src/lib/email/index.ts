import type { ContactInput } from "@/lib/contact/schema";
import { ENQUIRY_TYPES } from "@/lib/contact/schema";

/**
 * Server-only email delivery abstraction.
 *
 * This module must only ever be imported from server code (the contact route
 * handler). It reads server-only secrets from `process.env` and never sends
 * anything to the browser.
 *
 * Default (local dev / no secrets): a MOCK transport that performs NO delivery
 * and honestly reports `delivered: false`. It does not pretend an email was
 * sent. Configure the environment variables below to enable real delivery via
 * Resend (called through the HTTP API with `fetch`, so no SDK dependency and no
 * effect on the browser CSP).
 *
 * Environment variables (server-only — never `NEXT_PUBLIC_`):
 *   RESEND_API_KEY      — Resend API key
 *   CONTACT_TO_EMAIL    — inbox that receives enquiries
 *   CONTACT_FROM_EMAIL  — sender address on the verified sending domain
 *
 * All three are required together; a partial set falls back to mock and warns.
 * `send()` never throws: delivery failures and timeouts resolve as
 * `{ ok: false, delivered: false }` so the route can report them accurately.
 */

export type EmailMode = "mock" | "resend";

export interface SendResult {
  ok: boolean;
  /** true only when an email was actually dispatched by a real transport. */
  delivered: boolean;
  mode: EmailMode;
}

export interface EmailTransport {
  readonly mode: EmailMode;
  send(input: ContactInput): Promise<SendResult>;
}

function enquiryLabel(value: ContactInput["enquiryType"]): string {
  return ENQUIRY_TYPES.find((t) => t.value === value)?.label ?? value;
}

function buildText(input: ContactInput): string {
  return [
    `Enquiry type: ${enquiryLabel(input.enquiryType)}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.company ? `Company: ${input.company}` : null,
    `Subject: ${input.subject}`,
    "",
    input.message,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Mock transport: validates the flow without sending. Never logs the message body. */
const mockTransport: EmailTransport = {
  mode: "mock",
  async send() {
    console.info(
      "[contact] mock transport: enquiry accepted and validated. Email delivery is not configured (set RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL to enable). No email was sent.",
    );
    return { ok: true, delivered: false, mode: "mock" };
  },
};

/**
 * Upper bound on a single delivery attempt. Without it, an unresponsive provider
 * holds the serverless function open to its platform limit while the visitor
 * waits on a spinner. Ten seconds is far above Resend's normal response time.
 */
const RESEND_TIMEOUT_MS = 10_000;

/** Real transport via the Resend HTTP API (server-side fetch; secret-gated). */
function createResendTransport(
  apiKey: string,
  to: string,
  from: string,
): EmailTransport {
  return {
    mode: "resend",
    async send(input) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [to],
            reply_to: input.email,
            subject: `[Portfolio] ${enquiryLabel(input.enquiryType)}: ${input.subject}`,
            text: buildText(input),
          }),
          signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
        });
        // Do not read or log the response body (may echo submitted content).
        if (!res.ok) return { ok: false, delivered: false, mode: "resend" };
        return { ok: true, delivered: true, mode: "resend" };
      } catch {
        // Timeout or network failure. Never inspect or log the thrown error — it
        // can carry request detail. Reporting ok:false (rather than throwing)
        // lets the route return its accurate "couldn't be sent" 502 instead of a
        // generic 500, and keeps the route's own catch as a true backstop.
        return { ok: false, delivered: false, mode: "resend" };
      }
    },
  };
}

/** Choose a transport based on configured environment (mock when unset). */
export function getEmailTransport(): EmailTransport {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (apiKey && to && from) return createResendTransport(apiKey, to, from);

  // Partially configured almost always means a missing or misspelled variable in
  // the hosting environment. Without this, delivery degrades silently to mock and
  // the only symptom is visitors being told nothing was sent. Log variable NAMES
  // only — never values — so the cause is visible in server logs. Names are
  // already public in `.env.example`; the values are secrets.
  const missing = [
    apiKey ? null : "RESEND_API_KEY",
    to ? null : "CONTACT_TO_EMAIL",
    from ? null : "CONTACT_FROM_EMAIL",
  ].filter((name): name is string => name !== null);

  // All three absent is the expected local/dev default, not a misconfiguration.
  if (missing.length < 3) {
    console.warn(
      `[contact] email delivery is NOT configured: missing ${missing.join(", ")}. Falling back to the mock transport — no email will be sent.`,
    );
  }
  return mockTransport;
}
