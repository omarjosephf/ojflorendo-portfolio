import { canonicalJson } from "../pipeline/serialization";
import { utf8Bytes } from "../pipeline/security";
import { type LiveAgentConfig, OPENROUTER_PROVIDERS, WEB_SEARCH, costMicroUsd, priceFor } from "./catalog";

/**
 * Minimal server-side client for OpenRouter's chat-completions API (ADR-0026,
 * amended 13 October 2026). It sends one request, never retries, asks for
 * strict JSON output and returns the parsed JSON plus the usage needed for
 * the cost ledger. The API key is passed in by the caller and is never
 * logged, returned or included in an error message.
 */

export const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_KEY_PATTERN = /^sk-or-[A-Za-z0-9_-]{20,200}$/u;
const RESPONSE_LIMIT_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 300_000;

export type FetchLike = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface ModelCallInput {
  config: LiveAgentConfig;
  systemInstruction: string;
  payload: unknown;
  /** Names the output contract in the request, for example "idea-scout-output". */
  outputName: string;
  /**
   * The strict JSON contract, or null for plain text. OpenRouter does not hold
   * a tool-using call to the schema (phase A, 13 October 2026), so a call
   * with web search returns text and a separate call without tools returns JSON.
   */
  outputSchema: Readonly<Record<string, unknown>> | null;
}

export interface WebCitation {
  url: string;
  title: string;
}

export interface ModelCallResult {
  output: unknown;
  model: string;
  /** The OpenRouter provider that served the call, when reported. */
  provider: string | null;
  responseId: string | null;
  inputTokens: number;
  /** Visible output tokens; thinking is counted separately. */
  outputTokens: number;
  thoughtTokens: number;
  webSearches: number;
  /** Addresses and titles only; the result excerpts are never stored. */
  webCitations: WebCitation[];
  /** OpenRouter's own charge for the call, in micro-USD, when reported. */
  reportedCostMicroUsd: number | null;
  /** The larger of the reported charge and the cost from reviewed prices, so the ledger never under-counts. */
  costMicroUsd: number;
  latencyMs: number;
}

export type FailedCallUsage = Pick<
  ModelCallResult,
  "provider" | "responseId" | "inputTokens" | "outputTokens" | "thoughtTokens" | "webSearches" | "reportedCostMicroUsd"
>;

export class ModelCallError extends Error {
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
    /** Cost OpenRouter reported before the failure, when it reported any. */
    readonly partialCostMicroUsd?: number,
    /** HTTP status of a refused request, when there was one. */
    readonly status?: number,
    /** What OpenRouter reported for a call that came back but failed a check; never model text. */
    readonly usage?: FailedCallUsage,
  ) {
    super(message);
    this.name = "ModelCallError";
  }
}

export function buildOpenRouterRequestBody(input: ModelCallInput) {
  const { config } = input;
  const price = priceFor(config.model);
  return {
    model: config.model,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: canonicalJson(input.payload) },
    ],
    ...(input.outputSchema === null
      ? {}
      : {
          response_format: {
            type: "json_schema",
            json_schema: { name: input.outputName, strict: true, schema: input.outputSchema },
          },
        }),
    reasoning: { effort: config.thinkingLevel, exclude: true },
    max_tokens: config.maxOutputTokens,
    stream: false,
    provider: {
      only: [...OPENROUTER_PROVIDERS],
      require_parameters: true,
      max_price: { prompt: price.inputUsdPerMillion, completion: price.outputUsdPerMillion },
    },
    ...(config.webSearch
      ? {
          tools: [
            {
              type: "openrouter:web_search",
              parameters: {
                engine: WEB_SEARCH.engine,
                max_uses: WEB_SEARCH.maxUses,
                max_results: WEB_SEARCH.maxResults,
                max_total_results: WEB_SEARCH.maxTotalResults,
                max_characters: WEB_SEARCH.maxCharacters,
              },
            },
          ],
          max_tool_calls: WEB_SEARCH.maxUses,
        }
      : {}),
  };
}

export function openRouterRequestBytes(input: ModelCallInput) {
  return utf8Bytes(JSON.stringify(buildOpenRouterRequestBody(input)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown, label: string): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ModelCallError("invalid-response", `OpenRouter returned an invalid ${label}.`);
  }
  return value;
}

/** OpenRouter reports cost in US-dollar credits; converted to whole micro-USD, rounded up. */
function reportedMicroUsd(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.ceil(Math.round(value * 1e9) / 1e3);
}

/** A dated snapshot suffix is the same model, for example google/gemini-3.8-flash-20260902. */
function sameModel(reported: unknown, requested: string) {
  return typeof reported === "string" && (reported === requested || new RegExp(`^${requested.replace(/[.]/gu, "\\.")}-\\d{8}$`, "u").test(reported));
}

export function parseOpenRouterCompletion(
  config: LiveAgentConfig,
  raw: unknown,
  latencyMs: number,
  format: "json" | "text" = "json",
): ModelCallResult {
  if (!isRecord(raw)) throw new ModelCallError("invalid-response", "OpenRouter returned a non-object response.");

  // Usage is read first so a failed call still settles what OpenRouter billed.
  const usage = isRecord(raw.usage) ? raw.usage : undefined;
  const details = usage && isRecord(usage.completion_tokens_details) ? usage.completion_tokens_details : {};
  const toolUse = usage && isRecord(usage.server_tool_use) ? usage.server_tool_use : {};
  const inputTokens = usage ? count(usage.prompt_tokens, "prompt-token count") : 0;
  const completionTokens = usage ? count(usage.completion_tokens, "completion-token count") : 0;
  const thoughtTokens = Math.min(count(details.reasoning_tokens, "reasoning-token count"), completionTokens);
  const webSearches = count(toolUse.web_search_requests, "web-search count");
  const reportedCostMicroUsd = usage ? reportedMicroUsd(usage.cost) : null;
  // Reasoning tokens are part of completion_tokens and billed as output.
  const computed = costMicroUsd(config.model, { inputTokens, outputTokens: completionTokens, webSearches });
  const cost = Math.max(computed, reportedCostMicroUsd ?? 0);
  // A usage record can settle the call only when it states the charge or, for a
  // call without search, both token counts. Search fees appear only in the
  // reported charge, because OpenRouter reports zero searches. Anything less is
  // an unknown outcome, and the full reservation stays counted.
  const settles =
    usage !== undefined &&
    (reportedCostMicroUsd !== null ||
      (!config.webSearch && typeof usage.prompt_tokens === "number" && typeof usage.completion_tokens === "number"));

  // The response outline (field names and finish reason, never content) makes a
  // contract failure diagnosable without paying for another call.
  const choices = Array.isArray(raw.choices) ? raw.choices : [];
  const choice = isRecord(choices[0]) ? choices[0] : undefined;
  const outline = ` [response fields: ${Object.keys(raw).sort().join(",").slice(0, 300)}; choices: ${choices.length}; finish: ${String(
    choice?.finish_reason,
  ).slice(0, 30)}/${String(choice?.native_finish_reason).slice(0, 30)}]`;
  const reported: FailedCallUsage = {
    provider: typeof raw.provider === "string" ? raw.provider.slice(0, 60) : null,
    responseId: typeof raw.id === "string" && raw.id.length > 0 ? raw.id.slice(0, 200) : null,
    inputTokens,
    outputTokens: completionTokens - thoughtTokens,
    thoughtTokens,
    webSearches,
    reportedCostMicroUsd,
  };
  // Without a settling usage record the charge is unknown, so the full reservation stays counted.
  const fail = (code: ModelCallError["code"], message: string): never => {
    throw new ModelCallError(code, `${message}${outline}`, settles ? cost : undefined, undefined, usage ? reported : undefined);
  };

  if (!settles) fail("invalid-response", "OpenRouter returned no usage record that states the charge.");
  if (isRecord(raw.error)) fail("invalid-response", "OpenRouter returned an error inside a successful response.");
  if (!sameModel(raw.model, config.model)) fail("invalid-response", "OpenRouter answered with a different model.");
  if (!config.webSearch && webSearches > 0) fail("unexpected-tool-use", "The model searched the web in a role that has no tools.");
  if (webSearches > WEB_SEARCH.maxUses) fail("unexpected-tool-use", "The model searched more often than the cap allows.");
  if (choices.length !== 1 || !choice) return fail("invalid-response", "OpenRouter did not return exactly one choice.");
  if (isRecord(choice.error)) fail("incomplete", "The provider reported an error for this call.");
  if (choice.finish_reason !== "stop") {
    fail("incomplete", `The model did not finish normally (finish reason ${String(choice.finish_reason).slice(0, 40)}).`);
  }
  const message = isRecord(choice.message) ? choice.message : undefined;
  if (!message) return fail("invalid-response", "OpenRouter returned no message.");
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    fail("unexpected-tool-use", "The model asked to call a tool this role does not have.");
  }
  if (typeof message.content !== "string" || message.content.length === 0) {
    return fail("invalid-response", "OpenRouter returned no text output.");
  }
  const text = message.content;
  if (utf8Bytes(text) > RESPONSE_LIMIT_BYTES) fail("invalid-response", "The model output exceeded the size limit.");

  const webCitations: WebCitation[] = [];
  if (Array.isArray(message.annotations)) {
    for (const annotation of message.annotations) {
      const citation = isRecord(annotation) && annotation.type === "url_citation" ? annotation.url_citation : undefined;
      // Addresses with spaces or control characters are dropped; titles lose
      // control and direction-changing characters before they reach a terminal.
      if (isRecord(citation) && typeof citation.url === "string" && /^https:\/\/[^\s\p{Cc}]+$/u.test(citation.url)) {
        webCitations.push({
          url: citation.url.slice(0, 2_000),
          title: typeof citation.title === "string" ? citation.title.replace(UNPRINTABLE, "").slice(0, 200) : "",
        });
      }
    }
  }

  if (format === "text") {
    return { output: text.trim(), model: raw.model as string, ...reported, webCitations, costMicroUsd: cost, latencyMs };
  }
  // A model can wrap its JSON in one Markdown fence. Only that exact wrapper
  // is removed; the schema and every later check still apply.
  const fenced = FENCED_JSON.exec(text);
  let output: unknown;
  try {
    output = JSON.parse(fenced ? fenced[1] : text);
  } catch {
    fail("invalid-json", `The model output was not valid JSON (${outputShape(text)}).`);
  }
  return { output, model: raw.model as string, ...reported, webCitations, costMicroUsd: cost, latencyMs };
}

const UNPRINTABLE = /[\p{Cc}‎‏‪-‮⁦-⁩]/gu;

const FENCED_JSON = /^\s*```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```\s*$/u;

/** Describes the output's form without repeating any of its text. */
function outputShape(text: string) {
  const first = text.trimStart().charAt(0);
  const kind = first === "{" || first === "[" || first === "`" ? `"${first}"` : /\p{L}/u.test(first) ? "a letter" : "another character";
  return `${text.length} characters, starts with ${kind}, first "{" at ${text.indexOf("{")}, ${(text.match(/```/gu) ?? []).length} fence marks`;
}

export async function callOpenRouter(
  input: ModelCallInput,
  apiKey: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  now: () => number = Date.now,
): Promise<ModelCallResult> {
  if (!OPENROUTER_KEY_PATTERN.test(apiKey)) {
    throw new ModelCallError("http-error", "The OpenRouter API key is missing or malformed.");
  }
  const body = JSON.stringify(buildOpenRouterRequestBody(input));
  const started = now();
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ModelCallError(
      timedOut ? "timeout" : "network",
      timedOut ? "OpenRouter did not answer within five minutes." : "The request to OpenRouter failed.",
    );
  }
  const latencyMs = now() - started;
  const text = await response.text();
  if (!response.ok) {
    // Error messages can echo request details; keep only the status and OpenRouter's numeric code.
    let reason = "";
    try {
      const parsed = JSON.parse(text) as { error?: { code?: unknown } };
      if (typeof parsed.error?.code === "number") reason = ` (code ${parsed.error.code})`;
    } catch {
      // Non-JSON error body: status only.
    }
    throw new ModelCallError("http-error", `OpenRouter returned HTTP ${response.status}${reason}.`, undefined, response.status);
  }
  if (utf8Bytes(text) > RESPONSE_LIMIT_BYTES) {
    throw new ModelCallError("invalid-response", "The OpenRouter response exceeded the size limit.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ModelCallError("invalid-response", "The OpenRouter response was not JSON.");
  }
  return parseOpenRouterCompletion(input.config, raw, latencyMs, input.outputSchema === null ? "text" : "json");
}
