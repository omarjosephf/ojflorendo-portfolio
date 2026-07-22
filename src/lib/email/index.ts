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
 * Future environment variables (server-only — never `NEXT_PUBLIC_`):
 *   RESEND_API_KEY      — Resend API key
 *   CONTACT_TO_EMAIL    — inbox that receives enquiries
 *   CONTACT_FROM_EMAIL  — verified sender address
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

/** Real transport via the Resend HTTP API (server-side fetch; secret-gated). */
function createResendTransport(
  apiKey: string,
  to: string,
  from: string,
): EmailTransport {
  return {
    mode: "resend",
    async send(input) {
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
      });
      // Do not log the response body (may echo submitted content).
      if (!res.ok) return { ok: false, delivered: false, mode: "resend" };
      return { ok: true, delivered: true, mode: "resend" };
    },
  };
}

/** Choose a transport based on configured environment (mock when unset). */
export function getEmailTransport(): EmailTransport {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (apiKey && to && from) return createResendTransport(apiKey, to, from);
  return mockTransport;
}
