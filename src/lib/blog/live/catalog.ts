/**
 * Live-run catalog (ADR-0026, amended 13 October 2026). One Gemini model,
 * thinking level, output cap and price row per agent, reached through
 * OpenRouter. Changing any value is a reviewed code change, never a runtime
 * option: the Model Scout's test-and-approve path is the only route to a
 * different model.
 */

export type LiveAgentRole =
  | "idea-scout"
  | "planner-researcher"
  | "writer"
  | "seo"
  | "reviewer-verifier"
  | "critique";

/** Sent as OpenRouter's reasoning effort, which it passes to Gemini 3 as thinkingLevel unchanged. */
export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

export interface ModelPrice {
  /** USD per million input tokens. */
  inputUsdPerMillion: number;
  /** USD per million output tokens, thinking included. */
  outputUsdPerMillion: number;
  /** Higher rates for a request whose prompt exceeds this many tokens, where the model has them. */
  longContext?: { aboveInputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number };
}

export interface LiveAgentConfig {
  role: LiveAgentRole;
  /** OpenRouter model name. */
  model: string;
  thinkingLevel: GeminiThinkingLevel;
  /** Includes thinking tokens: OpenRouter counts reasoning as output. */
  maxOutputTokens: number;
  webSearch: boolean;
}

/**
 * OpenRouter's standard-tier prices for Google AI Studio, read from
 * https://openrouter.ai/api/v1/models/google/<model>/endpoints on
 * 13 October 2026. They equal Google's list prices in the ADR-0026 snapshot.
 * The request's max_price sends a call only to an endpoint at or below these
 * rates, so the cheaper flex tier is possible and the dearer priority tier is not.
 */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = Object.freeze({
  "google/gemini-3.8-flash": { inputUsdPerMillion: 0.75, outputUsdPerMillion: 3.75 },
  "google/gemini-3.5-flash-lite": { inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5 },
  "google/gemini-3.1-pro-preview": {
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 12,
    longContext: { aboveInputTokens: 200_000, inputUsdPerMillion: 4, outputUsdPerMillion: 18 },
  },
});

/** Only Google's own endpoints serve these models; no other host may receive a call. */
export const OPENROUTER_PROVIDERS = ["google-ai-studio", "google-vertex"] as const;

/**
 * The Idea Scout's web search: OpenRouter's server tool with the engine fixed
 * to Exa. Left on "auto", Gemini would use Google's own grounding, whose terms
 * this route exists to avoid. Exa's auto mode costs US$0.007 a search for up
 * to 10 results (OpenRouter web-search page, read 13 October 2026).
 */
export const WEB_SEARCH = Object.freeze({
  engine: "exa",
  maxUses: 3,
  maxResults: 5,
  maxTotalResults: 15,
  maxCharacters: 2_000,
  searchMicroUsd: 7_000,
});

/**
 * Upper bound on the tokens search results add to one model turn: every result
 * at its character cap plus 1,000 characters of title, address and framing,
 * at 4 bytes a character, and a token is never shorter than one byte.
 */
const WEB_SEARCH_RESULT_TOKENS = WEB_SEARCH.maxTotalResults * (WEB_SEARCH.maxCharacters + 1_000) * 4;

/**
 * The Idea Scout's first call: web search on, plain-text notes out. Its second
 * call, LIVE_AGENTS["idea-scout"], has no tools and returns the strict slate.
 */
export const IDEA_SCOUT_SEARCH: LiveAgentConfig = Object.freeze({
  role: "idea-scout",
  model: "google/gemini-3.8-flash",
  thinkingLevel: "low",
  maxOutputTokens: 4_096,
  webSearch: true,
});

export const LIVE_AGENTS: Readonly<Record<LiveAgentRole, LiveAgentConfig>> = Object.freeze({
  "idea-scout": {
    role: "idea-scout",
    model: "google/gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 16_384,
    webSearch: false,
  },
  "planner-researcher": {
    role: "planner-researcher",
    model: "google/gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 16_384,
    webSearch: false,
  },
  writer: {
    role: "writer",
    model: "google/gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 16_384,
    webSearch: false,
  },
  seo: {
    role: "seo",
    model: "google/gemini-3.5-flash-lite",
    thinkingLevel: "low",
    maxOutputTokens: 4_096,
    webSearch: false,
  },
  // ADR-0026 prefers a reviewer model independent of the Writer's. Phase 18.4
  // kept this one; it is not yet calibrated against the owner's judgement.
  "reviewer-verifier": {
    role: "reviewer-verifier",
    model: "google/gemini-3.1-pro-preview",
    thinkingLevel: "high",
    maxOutputTokens: 24_576,
    webSearch: false,
  },
  critique: {
    role: "critique",
    model: "google/gemini-3.8-flash",
    thinkingLevel: "medium",
    maxOutputTokens: 8_192,
    webSearch: false,
  },
});

/** Hard per-run ceiling approved by the owner on 30 September 2026. */
export const LIVE_RUN_CEILING_MICRO_USD = 1_000_000;
/**
 * Hard ceiling across every call on the OpenRouter route, approved by the
 * owner on 13 October 2026 for phase A. Raising it is an owner decision.
 */
export const LIVE_SPEND_CEILING_MICRO_USD = 2_000_000;
/** research, draft, SEO, review, revision, final review and critique; Idea Scout is its own run. */
export const LIVE_RUN_MAX_CALLS = 7;
/** The Idea Scout's search call and its slate call. */
export const IDEA_SCOUT_MAX_CALLS = 2;

export function priceFor(model: string): ModelPrice {
  const price = MODEL_PRICES[model];
  if (!price) throw new Error(`No reviewed price for ${model}.`);
  return price;
}

/** Cost in micro-USD, rounded up. Thinking tokens are billed as output. */
export function costMicroUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number; webSearches: number },
): number {
  const price = priceFor(model);
  const rates =
    price.longContext && usage.inputTokens > price.longContext.aboveInputTokens ? price.longContext : price;
  return (
    Math.ceil(usage.inputTokens * rates.inputUsdPerMillion + usage.outputTokens * rates.outputUsdPerMillion) +
    usage.webSearches * WEB_SEARCH.searchMicroUsd
  );
}

/**
 * Worst-case cost for one call, reserved before dispatch. The request's UTF-8
 * byte count bounds its input tokens. With web search the model may take one
 * turn per search plus a final one. Each turn re-reads the request, every
 * result so far and every earlier turn's output, and each may use its whole
 * output cap.
 */
export function reservationMicroUsd(config: LiveAgentConfig, requestBytes: number): number {
  const turns = config.webSearch ? WEB_SEARCH.maxUses + 1 : 1;
  const earlierOutputs = ((turns * (turns - 1)) / 2) * config.maxOutputTokens;
  return costMicroUsd(config.model, {
    inputTokens: turns * (requestBytes + (config.webSearch ? WEB_SEARCH_RESULT_TOKENS : 0)) + earlierOutputs,
    outputTokens: turns * config.maxOutputTokens,
    webSearches: config.webSearch ? WEB_SEARCH.maxUses : 0,
  });
}
