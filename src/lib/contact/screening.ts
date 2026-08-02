/**
 * Server-only screening of an already-validated contact submission.
 *
 * `validateContact` decides whether a submission is well-formed. This decides
 * whether it is plausibly a real enquiry. The two are separate on purpose:
 * shape is a contract, plausibility is a judgement call that will be tuned.
 *
 * What this can and cannot do (ADR-0005): it removes obvious junk. It cannot
 * establish that a sender is a legitimate company or that their intentions are
 * genuine — no technical test for sincerity exists. Anything that survives here
 * is for a human to judge.
 *
 * Failure policy: every check FAILS OPEN. A DNS outage, a slow resolver or an
 * unexpected error lets the enquiry through. Losing a genuine client to our own
 * infrastructure is worse than letting one spam message past.
 */
import { promises as dns } from "node:dns";
import { DISPOSABLE_EMAIL_DOMAINS } from "./disposable-domains";
import type { ContactInput } from "./schema";

export type ScreeningOutcome =
  | "accepted"
  | "disposable-domain"
  | "undeliverable-domain"
  | "link-flood";

export interface ScreeningResult {
  /** true when the submission may proceed. */
  ok: boolean;
  outcome: ScreeningOutcome;
}

/**
 * Maximum links in a message body. Deliberately generous: a real recruiter may
 * reasonably include a company site, a job spec, a LinkedIn profile and a
 * calendar link. Bulk link-spam carries far more.
 */
const MAX_LINKS = 5;

/** Bound the DNS lookup so a slow resolver cannot stall the request. */
const DNS_TIMEOUT_MS = 3_000;

/** Matches http(s):// and bare www. links. */
const LINK_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

/** DNS errors that positively prove the domain cannot receive mail. */
const DOMAIN_DOES_NOT_EXIST = "ENOTFOUND";
/** Domain resolves but publishes no record of the requested type. */
const NO_SUCH_RECORD = "ENODATA";

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/** Reject a pending promise once `ms` elapses, so callers cannot hang. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error("dns-timeout")), ms).unref?.(),
    ),
  ]);
}

export function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function countLinks(message: string): number {
  return message.match(LINK_RE)?.length ?? 0;
}

/**
 * Can this domain receive email?
 *
 * Returns `true`/`false` for a definite answer and `null` when no verdict could
 * be reached, which the caller treats as acceptance.
 */
export async function domainAcceptsMail(
  domain: string,
): Promise<boolean | null> {
  try {
    const records = await withTimeout(dns.resolveMx(domain), DNS_TIMEOUT_MS);
    if (records.length > 0) return true;
    // An empty answer is treated like ENODATA below.
  } catch (error) {
    const code = errorCode(error);
    if (code === DOMAIN_DOES_NOT_EXIST) return false;
    // Anything other than "no MX record" is an infrastructure problem.
    if (code !== NO_SUCH_RECORD) return null;
  }

  // No MX record. RFC 5321 still allows delivery to the address record, and a
  // few small legitimate domains rely on that, so check before rejecting.
  try {
    const addresses = await withTimeout(dns.resolve4(domain), DNS_TIMEOUT_MS);
    return addresses.length > 0;
  } catch (error) {
    const code = errorCode(error);
    if (code === DOMAIN_DOES_NOT_EXIST || code === NO_SUCH_RECORD) return false;
    return null;
  }
}

/**
 * Screen a validated submission. Never throws.
 *
 * Ordered cheapest-first so the network call only happens for a submission that
 * has already passed the local checks.
 */
export async function screenContact(
  input: ContactInput,
): Promise<ScreeningResult> {
  if (countLinks(input.message) > MAX_LINKS) {
    return { ok: false, outcome: "link-flood" };
  }

  const domain = domainOf(input.email);
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, outcome: "disposable-domain" };
  }

  try {
    const deliverable = await domainAcceptsMail(domain);
    // `null` means no verdict — fail open.
    if (deliverable === false) {
      return { ok: false, outcome: "undeliverable-domain" };
    }
  } catch {
    // Defensive: domainAcceptsMail already absorbs its own failures.
    return { ok: true, outcome: "accepted" };
  }

  return { ok: true, outcome: "accepted" };
}
