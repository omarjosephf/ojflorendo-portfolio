/**
 * Phase 18.4 live-run catalog (ADR-0026). One Gemini model, thinking level,
 * output cap and price row per agent. Changing any value is a reviewed code
 * change, never a runtime option: the Model Scout's test-and-approve path is
 * the only route to a different model.
 */

export type LiveAgentRole =
  | "idea-scout"
  | "planner-researcher"
  | "writer"
  | "seo"
  | "reviewer-verifier"
  | "critique";

export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

export interface GeminiModelPrice {
  /** USD per million input tokens (prompts up to 200k tokens). */
  inputUsdPerMillion: number;
  /** USD per million output tokens, thinking included. */
  outputUsdPerMillion: number;
}

export interface LiveAgentConfig {
  role: LiveAgentRole;
  model: string;
  thinkingLevel: GeminiThinkingLevel;
  /** Includes thinking tokens, per Google's thinking documentation. */
  maxOutputTokens: number;
  googleSearch: boolean;
}

/** Official list prices read on 29 September 2026 (ADR-0026 pricing snapshot). */
export const GEMINI_PRICES: Readonly<Record<string, GeminiModelPrice>> = Object.freeze({
  "gemini-3.8-flash": { inputUsdPerMillion: 0.75, outputUsdPerMillion: 3.75 },
  "gemini-3.5-flash-lite": { inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5 },
  "gemini-3.1-pro-preview": { inputUsdPerMillion: 2, outputUsdPerMillion: 12 },
});

/**
 * Grounding with Google Search: 5,000 free requests a month, then US$14 per
 * 1,000. Every search query is charged at the paid rate so the ledger never
 * under-counts.
 */
export const GOOGLE_SEARCH_QUERY_MICRO_USD = 14_000;
/** At most this many grounded queries are reserved for one Idea Scout call. */
export const GOOGLE_SEARCH_RESERVED_QUERIES = 10;
/** Search results enter the model as input; reserve this many extra tokens for them. */
export const GOOGLE_SEARCH_RESERVED_INPUT_TOKENS = 60_000;

export const LIVE_AGENTS: Readonly<Record<LiveAgentRole, LiveAgentConfig>> = Object.freeze({
  "idea-scout": {
    role: "idea-scout",
    model: "gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 16_384,
    googleSearch: true,
  },
  "planner-researcher": {
    role: "planner-researcher",
    model: "gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 16_384,
    googleSearch: false,
  },
  writer: {
    role: "writer",
    model: "gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 16_384,
    googleSearch: false,
  },
  seo: {
    role: "seo",
    model: "gemini-3.5-flash-lite",
    thinkingLevel: "low",
    maxOutputTokens: 4_096,
    googleSearch: false,
  },
  // ADR-0026 prefers a reviewer model independent of the Writer's. Phase 18.4
  // test posts decide between this and gemini-3.8-flash.
  "reviewer-verifier": {
    role: "reviewer-verifier",
    model: "gemini-3.1-pro-preview",
    thinkingLevel: "high",
    maxOutputTokens: 24_576,
    googleSearch: false,
  },
  critique: {
    role: "critique",
    model: "gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 8_192,
    googleSearch: false,
  },
});

/** Hard per-run ceiling approved by the owner on 30 September 2026. */
export const LIVE_RUN_CEILING_MICRO_USD = 1_000_000;
/** Hard ceiling across every Phase 18.4 run, approved the same day. */
export const LIVE_PHASE_CEILING_MICRO_USD = 5_000_000;
/** research, draft, SEO, review, revision, final review and critique; Idea Scout is its own run. */
export const LIVE_RUN_MAX_CALLS = 7;

export function priceFor(model: string): GeminiModelPrice {
  const price = GEMINI_PRICES[model];
  if (!price) throw new Error(`No reviewed price for ${model}.`);
  return price;
}

/** Cost in micro-USD, rounded up. Thinking tokens are billed as output. */
export function costMicroUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number; searchQueries: number },
): number {
  const price = priceFor(model);
  return (
    Math.ceil(usage.inputTokens * price.inputUsdPerMillion + usage.outputTokens * price.outputUsdPerMillion) +
    usage.searchQueries * GOOGLE_SEARCH_QUERY_MICRO_USD
  );
}

/**
 * Worst-case cost for one call, reserved before dispatch. The request's UTF-8
 * byte count bounds its input tokens: a token is never shorter than one byte.
 */
export function reservationMicroUsd(config: LiveAgentConfig, requestBytes: number): number {
  const inputTokens = requestBytes + (config.googleSearch ? GOOGLE_SEARCH_RESERVED_INPUT_TOKENS : 0);
  return costMicroUsd(config.model, {
    inputTokens,
    outputTokens: config.maxOutputTokens,
    searchQueries: config.googleSearch ? GOOGLE_SEARCH_RESERVED_QUERIES : 0,
  });
}
