/**
 * The contract between the assistant route and the panel.
 *
 * Provider fallback preserves the approved evidence and answer states. The
 * application identifies backup responses; changing models never permits an
 * answer outside the approved corpus or relaxes citation and policy checks.
 */

/** Maximum characters accepted from the visitor, enforced on both sides. */
export const ASSISTANT_INPUT_LIMIT = 280;

/**
 * Earlier turns that may travel with a question (ADR-0007 E4).
 *
 * Four, not "the conversation". The cap is a security control as much as a cost
 * one: the anti-extraction guard counts reproduced passages per request, and an
 * unbounded conversation is how a sequence of bounded requests becomes an
 * unbounded one.
 */
export const ASSISTANT_HISTORY_LIMIT = 4;

/** Absolute budgets for the two browser/server transport boundaries. */
export const ASSISTANT_PROXY_TIMEOUT_MS = 9_000;
export const ASSISTANT_UI_TIMEOUT_MS = 10_000;

/** Maximum untrusted backend response size before JSON parsing. */
export const ASSISTANT_SERVICE_RESPONSE_BYTE_LIMIT = 48 * 1024;

export const ASSISTANT_POLICY_IDS = [
  "unsupported",
  "identity",
  "architecture",
  "bulk_extraction",
  "unpublished_work",
  "provider_self_identification",
  "bulk_reproduction",
  "privacy",
] as const;

export type AssistantPolicyId = (typeof ASSISTANT_POLICY_IDS)[number];

/** Assigned by the service, never by generated answer content. */
export type AssistantModelRoute = "primary" | "fallback";

export function isAssistantModelRoute(value: unknown): value is AssistantModelRoute {
  return value === "primary" || value === "fallback";
}

/**
 * One earlier exchange, as sent back with a follow-up question.
 *
 * The visitor's earlier question and the labels of the sources that answered
 * it — and deliberately **not** the answer text (ADR-0007 E2). Replaying
 * generated prose would push corpus passages back across the trust boundary on
 * every turn. The earlier question and the documents it reached are enough to
 * resolve "tell me more about that", and cost a handful of tokens.
 *
 * That this type has no `answer` field is the enforcement. It is not a
 * convention for callers to observe.
 */
export interface AssistantHistoryTurn {
  readonly question: string;
  readonly sources: readonly string[];
}

export interface AssistantCitation {
  /** The exact passage the model was sent and quoted from. */
  readonly quote: string;
  /** Human-readable source name, e.g. "Experience" or "Public CV". */
  readonly label: string;
  /**
   * Where to send a reader, or `null` when the source has no public home.
   *
   * Always resolved through the corpus allowlist — never built from model
   * output or visitor input. `null` renders as plain text with no link, which
   * is the intended failure mode.
   */
  readonly href: string | null;
  /** Stable corpus path from the backend transport, when available. */
  readonly sourceId?: string;
  /** Stable evidence identity from the backend transport, when available. */
  readonly evidenceId?: string;
}

export type AssistantResult =
  /** Grounded, with at least one verified citation. */
  | {
      readonly state: "answered";
      readonly answer: string;
      readonly citations: readonly AssistantCitation[];
      /** Absent on older tab records; never infer a provider for those records. */
      readonly modelRoute?: AssistantModelRoute;
    }
  /**
   * The corpus does not answer this. Distinct from `unavailable`: the assistant
   * worked correctly and the honest answer is "not in what I have".
   */
  | {
      readonly state: "not-covered";
      readonly answer: string;
      /** Absent when a policy or retrieval decision needed no model call. */
      readonly modelRoute?: AssistantModelRoute;
    }
  /**
   * Outage, timeout, budget exhausted, or misconfiguration.
   *
   * Deliberately one state rather than several. Which of those it was is
   * operator information; to a visitor they all mean "not now", and enumerating
   * them would leak service internals for no benefit.
   */
  | { readonly state: "unavailable" }
  /**
   * The visitor's own personal, financial or credential data was detected in
   * their input, so it was never transmitted.
   *
   * Deliberately the *only* thing the browser decides. Questions about OJ, about
   * his privacy boundary, and probes of either are product policy and belong to
   * the assistant service, which is the single authority for them — see
   * `guard.ts` and ADR-0006 D14. The `reason` field is a single-member union
   * because there is one reason and adding a second would mean the browser had
   * started deciding policy again.
   */
  | {
      readonly state: "blocked";
      readonly reason: "personal-data";
      readonly answer: string;
    };
