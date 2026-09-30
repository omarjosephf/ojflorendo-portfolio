import { canonicalJson } from "../pipeline/serialization";
import { utf8Bytes } from "../pipeline/security";
import { type LiveAgentConfig, costMicroUsd } from "./catalog";

/**
 * Minimal server-side client for Google's Interactions API (ADR-0026). It
 * sends one request, never retries, and returns parsed JSON plus the usage
 * needed for the cost ledger. The API key is passed in by the caller and is
 * never logged, returned or included in an error message.
 */

export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const RESPONSE_LIMIT_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 300_000;

export type FetchLike = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface GeminiCallInput {
  config: LiveAgentConfig;
  systemInstruction: string;
  payload: unknown;
  outputSchema: Readonly<Record<string, unknown>>;
}

export interface GroundingCitation {
  url: string;
  title: string;
}

export interface GeminiCallResult {
  output: unknown;
  model: string;
  responseId: string;
  inputTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  searchQueries: string[];
  groundingCitations: GroundingCitation[];
  /** Google's rendered search-suggestion snippets, kept for the owner's record. */
  searchSuggestions: string[];
  costMicroUsd: number;
  latencyMs: number;
}

export class GeminiCallError extends Error {
  constructor(
    readonly code:
      | "http-error"
      | "timeout"
      | "network"
      | "invalid-response"
      | "incomplete"
      | "unexpected-tool-use"
      | "invalid-json",
    message: string,
    /** Tokens Google reported before the failure, when it reported any. */
    readonly partialCostMicroUsd?: number,
  ) {
    super(message);
    this.name = "GeminiCallError";
  }
}

export function buildGeminiRequestBody(input: GeminiCallInput) {
  return {
    model: input.config.model,
    system_instruction: input.systemInstruction,
    input: canonicalJson(input.payload),
    tools: input.config.googleSearch ? [{ type: "google_search" }] : [],
    store: false,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: input.outputSchema,
    },
    generation_config: {
      max_output_tokens: input.config.maxOutputTokens,
      thinking_level: input.config.thinkingLevel,
      thinking_summaries: "none",
    },
  };
}

export function geminiRequestBytes(input: GeminiCallInput) {
  return utf8Bytes(JSON.stringify(buildGeminiRequestBody(input)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown, label: string): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new GeminiCallError("invalid-response", `Gemini returned an invalid ${label}.`);
  }
  return value;
}

const ALLOWED_STEPS = new Set(["model_output", "thought", "google_search_call", "google_search_result"]);
const SEARCH_STEPS = new Set(["google_search_call", "google_search_result"]);

export function parseGeminiInteraction(
  config: LiveAgentConfig,
  raw: unknown,
  latencyMs: number,
): GeminiCallResult {
  if (!isRecord(raw)) throw new GeminiCallError("invalid-response", "Gemini returned a non-object response.");

  // Usage is read first so a failed call still settles what Google billed.
  const usage = isRecord(raw.usage) ? raw.usage : undefined;
  const inputTokens = usage
    ? count(usage.total_input_tokens, "input-token count") + count(usage.total_tool_use_tokens, "tool-token count")
    : 0;
  const outputTokens = usage ? count(usage.total_output_tokens, "output-token count") : 0;
  const thoughtTokens = usage ? count(usage.total_thought_tokens, "thought-token count") : 0;

  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const searchQueries: string[] = [];
  const searchSuggestions: string[] = [];
  for (const step of steps) {
    if (!isRecord(step)) continue;
    if (step.type === "google_search_call" && Array.isArray(step.queries)) {
      for (const query of step.queries) if (typeof query === "string") searchQueries.push(query);
    }
    if (step.type === "google_search_result" && typeof step.search_suggestions === "string") {
      searchSuggestions.push(step.search_suggestions);
    }
  }
  // An unreported query count is still charged once per search step.
  const chargedQueries = Math.max(
    searchQueries.length,
    steps.filter((step) => isRecord(step) && step.type === "google_search_call").length,
  );
  const cost = costMicroUsd(config.model, {
    inputTokens,
    outputTokens: outputTokens + thoughtTokens,
    searchQueries: chargedQueries,
  });
  const fail = (code: GeminiCallError["code"], message: string): never => {
    throw new GeminiCallError(code, message, cost);
  };

  if (!usage) fail("invalid-response", "Gemini returned no usage record.");
  if (raw.status !== "completed") {
    fail("incomplete", `Gemini did not complete the interaction (status ${String(raw.status).slice(0, 40)}).`);
  }
  if (raw.model !== config.model) fail("invalid-response", "Gemini answered with a different model.");
  if (typeof raw.id !== "string" || raw.id.length === 0 || raw.id.length > 200) {
    fail("invalid-response", "Gemini returned no interaction id.");
  }
  for (const step of steps) {
    if (!isRecord(step) || typeof step.type !== "string" || !ALLOWED_STEPS.has(step.type)) {
      fail("unexpected-tool-use", "Gemini returned a step type this role does not allow.");
    }
    if (!config.googleSearch && SEARCH_STEPS.has((step as { type: string }).type)) {
      fail("unexpected-tool-use", "Gemini used Google Search in a role that has no tools.");
    }
  }
  const finalStep = steps.at(-1);
  if (!isRecord(finalStep) || finalStep.type !== "model_output" || !Array.isArray(finalStep.content)) {
    return fail("invalid-response", "Gemini returned no final model output.");
  }
  const groundingCitations: GroundingCitation[] = [];
  const text = finalStep.content
    .map((item) => {
      if (!isRecord(item) || item.type !== "text" || typeof item.text !== "string") {
        return fail("invalid-response", "Gemini returned non-text model output.");
      }
      if (Array.isArray(item.annotations)) {
        for (const annotation of item.annotations) {
          if (
            isRecord(annotation) &&
            annotation.type === "url_citation" &&
            typeof annotation.url === "string" &&
            annotation.url.startsWith("https://")
          ) {
            groundingCitations.push({
              url: annotation.url.slice(0, 2_000),
              title: typeof annotation.title === "string" ? annotation.title.slice(0, 200) : "",
            });
          }
        }
      }
      return item.text;
    })
    .join("");
  if (utf8Bytes(text) > RESPONSE_LIMIT_BYTES) fail("invalid-response", "Gemini output exceeded the size limit.");
  let output: unknown;
  try {
    output = JSON.parse(text);
  } catch {
    fail("invalid-json", "Gemini output was not valid JSON.");
  }
  return {
    output,
    model: raw.model as string,
    responseId: raw.id as string,
    inputTokens,
    outputTokens,
    thoughtTokens,
    searchQueries,
    groundingCitations,
    searchSuggestions,
    costMicroUsd: cost,
    latencyMs,
  };
}

export async function callGemini(
  input: GeminiCallInput,
  apiKey: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  now: () => number = Date.now,
): Promise<GeminiCallResult> {
  if (!/^[A-Za-z0-9_-]{20,200}$/u.test(apiKey)) {
    throw new GeminiCallError("http-error", "The Gemini API key is missing or malformed.");
  }
  const body = JSON.stringify(buildGeminiRequestBody(input));
  const started = now();
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new GeminiCallError(
      timedOut ? "timeout" : "network",
      timedOut ? "Gemini did not answer within five minutes." : "The request to Gemini failed.",
    );
  }
  const latencyMs = now() - started;
  const text = await response.text();
  if (!response.ok) {
    // Google's error bodies can echo request details; keep only a short status line.
    let reason = "";
    try {
      const parsed = JSON.parse(text) as { error?: { status?: unknown } };
      if (typeof parsed.error?.status === "string") reason = ` ${parsed.error.status.slice(0, 60)}`;
    } catch {
      // Non-JSON error body: status code only.
    }
    throw new GeminiCallError("http-error", `Gemini returned HTTP ${response.status}${reason}.`);
  }
  if (utf8Bytes(text) > RESPONSE_LIMIT_BYTES) {
    throw new GeminiCallError("invalid-response", "Gemini response exceeded the size limit.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new GeminiCallError("invalid-response", "Gemini response was not JSON.");
  }
  return parseGeminiInteraction(input.config, raw, latencyMs);
}
