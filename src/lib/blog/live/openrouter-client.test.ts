import { describe, expect, it } from "vitest";
import { IDEA_SCOUT_SEARCH, LIVE_AGENTS, WEB_SEARCH, costMicroUsd, reservationMicroUsd } from "./catalog";
import {
  type FetchLike,
  ModelCallError,
  type ModelCallInput,
  OPENROUTER_CHAT_URL,
  buildOpenRouterRequestBody,
  callOpenRouter,
  openRouterRequestBytes,
  parseOpenRouterCompletion,
} from "./openrouter-client";

const KEY = "sk-or-v1-test-key-0000000000000000000000000000";
const writer = LIVE_AGENTS.writer;
const scout = IDEA_SCOUT_SEARCH;
const schema = { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false };
const input = (config = writer): ModelCallInput => ({
  config,
  systemInstruction: "test-instruction-v1\nReturn only Test.v1.",
  payload: { brief: "data" },
  outputName: `${config.role}-output`,
  outputSchema: schema,
});

/** A chat completion in the shape OpenRouter documents for non-streaming calls. */
function completion(
  model: string,
  content: string | null,
  overrides: { usage?: Record<string, unknown>; message?: Record<string, unknown>; choice?: Record<string, unknown> } = {},
) {
  return {
    id: "gen-1760000000-abcdefghijklmnop",
    provider: "Google AI Studio",
    model,
    object: "chat.completion",
    created: 1_760_000_000,
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        native_finish_reason: "STOP",
        message: { role: "assistant", content, ...overrides.message },
        ...overrides.choice,
      },
    ],
    usage: {
      prompt_tokens: 4_000,
      completion_tokens: 2_300,
      total_tokens: 6_300,
      completion_tokens_details: { reasoning_tokens: 800 },
      cost: 0.011625,
      is_byok: false,
      ...overrides.usage,
    },
  };
}

function fetchReturning(status: number, body: unknown, seen: { url: string; headers: Record<string, string>; body: string }[] = []): FetchLike {
  return async (url, init) => {
    seen.push({ url, headers: init.headers, body: init.body });
    return { ok: status >= 200 && status < 300, status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) };
  };
}

describe("buildOpenRouterRequestBody", () => {
  it("asks for strict JSON from the catalog model on Google's own endpoints at catalog prices", () => {
    const body = buildOpenRouterRequestBody(input());
    expect(body).toMatchObject({
      model: "google/gemini-3.8-flash",
      messages: [
        { role: "system", content: "test-instruction-v1\nReturn only Test.v1." },
        { role: "user", content: '{"brief":"data"}' },
      ],
      response_format: { type: "json_schema", json_schema: { name: "writer-output", strict: true, schema } },
      reasoning: { effort: "medium", exclude: true },
      max_tokens: 16_384,
      stream: false,
      provider: {
        only: ["google-ai-studio", "google-vertex"],
        require_parameters: true,
        max_price: { prompt: 0.75, completion: 3.75 },
      },
    });
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("max_tool_calls");
  });

  it("sends no schema for a plain-text call and returns its trimmed text", () => {
    const body = buildOpenRouterRequestBody({ ...input(scout), outputSchema: null });
    expect(body).not.toHaveProperty("response_format");
    const result = parseOpenRouterCompletion(scout, completion("google/gemini-3.8-flash", "  Readers ask about X.\n"), 1, "text");
    expect(result.output).toBe("Readers ask about X.");
  });

  it("gives only the Idea Scout's search call web search, with Exa named and every cap set", () => {
    const body = buildOpenRouterRequestBody(input(scout));
    expect(body.tools).toEqual([
      {
        type: "openrouter:web_search",
        parameters: { engine: "exa", max_uses: 3, max_results: 5, max_total_results: 15, max_characters: 2_000 },
      },
    ]);
    expect(body.max_tool_calls).toBe(3);
    for (const role of ["idea-scout", "planner-researcher", "writer", "seo", "reviewer-verifier", "critique"] as const) {
      expect(buildOpenRouterRequestBody(input(LIVE_AGENTS[role]))).not.toHaveProperty("tools");
    }
  });
});

describe("reservation", () => {
  it("covers every search turn and stays inside the US$1 run ceiling for the Idea Scout", () => {
    const bytes = openRouterRequestBytes(input(scout));
    const reserved = reservationMicroUsd(scout, bytes);
    const turns = WEB_SEARCH.maxUses + 1;
    // Every turn re-reads the request and all earlier turns' outputs (1 + 2 + 3 caps over four turns).
    const earlierOutputs = 6 * scout.maxOutputTokens;
    expect(reserved).toBeGreaterThanOrEqual(
      costMicroUsd(scout.model, {
        inputTokens: turns * bytes + earlierOutputs,
        outputTokens: turns * scout.maxOutputTokens,
        webSearches: WEB_SEARCH.maxUses,
      }),
    );
    expect(reserved).toBeLessThan(1_000_000);
  });

  it("prices a Reviewer prompt above 200k tokens at the long-context rate", () => {
    const reviewer = LIVE_AGENTS["reviewer-verifier"].model;
    expect(costMicroUsd(reviewer, { inputTokens: 200_000, outputTokens: 0, webSearches: 0 })).toBe(400_000);
    expect(costMicroUsd(reviewer, { inputTokens: 200_001, outputTokens: 0, webSearches: 0 })).toBe(800_004);
  });
});

describe("parseOpenRouterCompletion", () => {
  it("returns the parsed output, splits thinking from visible tokens and costs the call", () => {
    const result = parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", '{"ok":true}'), 1_234);
    expect(result.output).toEqual({ ok: true });
    expect(result).toMatchObject({
      model: "google/gemini-3.8-flash",
      provider: "Google AI Studio",
      responseId: "gen-1760000000-abcdefghijklmnop",
      inputTokens: 4_000,
      outputTokens: 1_500,
      thoughtTokens: 800,
      webSearches: 0,
      latencyMs: 1_234,
    });
    // 4,000 × 0.75 + 2,300 × 3.75 = 11,625 micro-USD, equal to the reported US$0.011625.
    expect(result.reportedCostMicroUsd).toBe(11_625);
    expect(result.costMicroUsd).toBe(11_625);
  });

  it("settles at OpenRouter's charge when it is above the computed cost, and never below the computed cost", () => {
    const higher = parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", '{"ok":true}', { usage: { cost: 0.02 } }), 1);
    expect(higher.costMicroUsd).toBe(20_000);
    const lower = parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", '{"ok":true}', { usage: { cost: 0.000001 } }), 1);
    expect(lower.costMicroUsd).toBe(11_625);
    const missing = parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", '{"ok":true}', { usage: { cost: undefined } }), 1);
    expect(missing.reportedCostMicroUsd).toBeNull();
    expect(missing.costMicroUsd).toBe(11_625);
  });

  it("counts Exa searches and keeps only https citation addresses and titles", () => {
    const raw = completion("google/gemini-3.8-flash", '{"ok":true}', {
      usage: { server_tool_use: { web_search_requests: 2 }, cost: 0.03 },
      message: {
        annotations: [
          { type: "url_citation", url_citation: { url: "https://example.com/a", title: "A", content: "excerpt text", start_index: 0, end_index: 5 } },
          { type: "url_citation", url_citation: { url: "http://example.com/plain", title: "Plain" } },
          { type: "file", file: {} },
        ],
      },
    });
    const result = parseOpenRouterCompletion(scout, raw, 1);
    expect(result.webSearches).toBe(2);
    expect(result.webCitations).toEqual([{ url: "https://example.com/a", title: "A" }]);
    expect(JSON.stringify(result)).not.toContain("excerpt text");
    expect(result.costMicroUsd).toBe(30_000);
  });

  it("accepts a dated snapshot of the same model and refuses any other model", () => {
    expect(parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash-20260902", '{"ok":true}'), 1).model).toBe(
      "google/gemini-3.8-flash-20260902",
    );
    for (const other of ["google/gemini-3.8-flash-lite", "google/gemini-3.5-flash-lite", "openai/gpt-6-sol"]) {
      expect(() => parseOpenRouterCompletion(writer, completion(other, '{"ok":true}'), 1)).toThrow("different model");
    }
  });

  it("fails a truncated answer but settles what was billed", () => {
    const raw = completion("google/gemini-3.8-flash", '{"ok":', { choice: { finish_reason: "length", native_finish_reason: "MAX_TOKENS" } });
    let caught: unknown;
    try {
      parseOpenRouterCompletion(writer, raw, 1);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ModelCallError);
    expect((caught as ModelCallError).code).toBe("incomplete");
    expect((caught as ModelCallError).partialCostMicroUsd).toBe(11_625);
    expect((caught as ModelCallError).message).toContain("finish: length/MAX_TOKENS");
  });

  it("leaves the reservation counted when no usage record came back", () => {
    const raw = { ...completion("google/gemini-3.8-flash", '{"ok":true}'), usage: undefined };
    let caught: unknown;
    try {
      parseOpenRouterCompletion(writer, raw, 1);
    } catch (error) {
      caught = error;
    }
    expect((caught as ModelCallError).code).toBe("invalid-response");
    expect((caught as ModelCallError).partialCostMicroUsd).toBeUndefined();
  });

  it("keeps the reservation when the usage record states neither the charge nor the token counts", () => {
    const empty = { ...completion("google/gemini-3.8-flash", '{"ok":true}'), usage: {} };
    expect(() => parseOpenRouterCompletion(writer, empty, 1)).toThrow(ModelCallError);
    try {
      parseOpenRouterCompletion(writer, empty, 1);
    } catch (error) {
      expect(error).toMatchObject({ code: "invalid-response", partialCostMicroUsd: undefined });
    }
    // The same holds for a truncated answer: an unknown charge never settles at zero.
    const truncated = {
      ...completion("google/gemini-3.8-flash", '{"ok":', { choice: { finish_reason: "length" } }),
      usage: { completion_tokens_details: {} },
    };
    try {
      parseOpenRouterCompletion(writer, truncated, 1);
    } catch (error) {
      expect((error as ModelCallError).partialCostMicroUsd).toBeUndefined();
    }
  });

  it("settles a search call only on OpenRouter's stated charge, because the search count comes back as zero", () => {
    const noCharge = completion("google/gemini-3.8-flash", "Readers ask about X.", { usage: { cost: undefined } });
    let caught: unknown;
    try {
      parseOpenRouterCompletion(scout, noCharge, 1, "text");
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "invalid-response", partialCostMicroUsd: undefined });
    const charged = completion("google/gemini-3.8-flash", "Readers ask about X.", { usage: { cost: 0.018625 } });
    expect(parseOpenRouterCompletion(scout, charged, 1, "text").costMicroUsd).toBe(18_625);
  });

  it("drops citation addresses with spaces or control characters and strips them from titles", () => {
    const raw = completion("google/gemini-3.8-flash", "Notes.", {
      message: {
        annotations: [
          { type: "url_citation", url_citation: { url: "https://example.com/ok", title: "Safe\u001b[2J title‮\u0007" } },
          { type: "url_citation", url_citation: { url: "https://example.com/a b", title: "Space" } },
          { type: "url_citation", url_citation: { url: "https://example.com/\u0000", title: "Null" } },
        ],
      },
    });
    expect(parseOpenRouterCompletion(scout, raw, 1, "text").webCitations).toEqual([{ url: "https://example.com/ok", title: "Safe[2J title" }]);
  });

  it("refuses tool use outside the Idea Scout and searches beyond the cap", () => {
    const searched = completion("google/gemini-3.8-flash", '{"ok":true}', { usage: { server_tool_use: { web_search_requests: 1 } } });
    expect(() => parseOpenRouterCompletion(writer, searched, 1)).toThrow("no tools");
    const tooMany = completion("google/gemini-3.8-flash", '{"ok":true}', { usage: { server_tool_use: { web_search_requests: 4 } } });
    expect(() => parseOpenRouterCompletion(scout, tooMany, 1)).toThrow("more often than the cap");
    const toolCall = completion("google/gemini-3.8-flash", '{"ok":true}', {
      message: { tool_calls: [{ id: "c1", type: "function", function: { name: "anything", arguments: "{}" } }] },
    });
    expect(() => parseOpenRouterCompletion(writer, toolCall, 1)).toThrow("tool this role does not have");
  });

  it("unwraps exactly one Markdown fence around the JSON and nothing looser", () => {
    for (const content of ['```json\n{"ok":true}\n```', '```\n{"ok":true}\n```\n', '  ```json\r\n{"ok":true}\r\n```']) {
      expect(parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", content), 1).output).toEqual({ ok: true });
    }
    for (const content of ['Here are the ideas:\n```json\n{"ok":true}\n```', '```json\n{"ok":true}\n```\nThanks!', '```json {"ok":true}```']) {
      expect(() => parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", content), 1)).toThrow("not valid JSON");
    }
  });

  it("describes unparseable output by shape only and keeps what OpenRouter reported", () => {
    const raw = completion("google/gemini-3.8-flash", "Here are five ideas for OJ's blog: secret-draft-text {", {
      usage: { server_tool_use: { web_search_requests: 2 }, cost: 0.03 },
    });
    let caught: unknown;
    try {
      parseOpenRouterCompletion(scout, raw, 1);
    } catch (error) {
      caught = error;
    }
    const error = caught as ModelCallError;
    expect(error.code).toBe("invalid-json");
    expect(error.message).toContain('54 characters, starts with a letter, first "{" at 53, 0 fence marks');
    expect(error.message).not.toContain("secret-draft-text");
    expect(error.usage).toEqual({
      provider: "Google AI Studio",
      responseId: "gen-1760000000-abcdefghijklmnop",
      inputTokens: 4_000,
      outputTokens: 1_500,
      thoughtTokens: 800,
      webSearches: 2,
      reportedCostMicroUsd: 30_000,
    });
    expect(error.partialCostMicroUsd).toBe(30_000);
  });

  it("refuses empty, non-JSON and errored answers", () => {
    expect(() => parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", null), 1)).toThrow("no text output");
    expect(() => parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", "not json"), 1)).toThrow(
      "not valid JSON",
    );
    expect(() =>
      parseOpenRouterCompletion(writer, completion("google/gemini-3.8-flash", '{"ok":true}', { choice: { error: { code: 502, message: "x" } } }), 1),
    ).toThrow("provider reported an error");
    const twoChoices = completion("google/gemini-3.8-flash", '{"ok":true}');
    twoChoices.choices.push(twoChoices.choices[0]);
    expect(() => parseOpenRouterCompletion(writer, twoChoices, 1)).toThrow("exactly one choice");
  });

  it("rejects a malformed token count instead of guessing", () => {
    const raw = completion("google/gemini-3.8-flash", '{"ok":true}', { usage: { prompt_tokens: -1 } });
    expect(() => parseOpenRouterCompletion(writer, raw, 1)).toThrow("invalid prompt-token count");
  });
});

describe("callOpenRouter", () => {
  it("posts once to the chat-completions endpoint with the key only in the authorization header", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const result = await callOpenRouter(input(), KEY, fetchReturning(200, completion("google/gemini-3.8-flash", '{"ok":true}'), seen));
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe(OPENROUTER_CHAT_URL);
    expect(seen[0].headers.authorization).toBe(`Bearer ${KEY}`);
    expect(seen[0].body).not.toContain(KEY);
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("refuses a malformed key before any request", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    await expect(callOpenRouter(input(), "AQ.gemini-style-key-000000000000", fetchReturning(200, {}, seen))).rejects.toThrow(
      "missing or malformed",
    );
    expect(seen).toHaveLength(0);
  });

  it("reports an HTTP refusal by status and numeric code only, never the echoed message or the key", async () => {
    const body = { error: { code: 402, message: `Key ${KEY} has insufficient credits for this request with prompt secret-text` } };
    let caught: unknown;
    try {
      await callOpenRouter(input(), KEY, fetchReturning(402, body));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ModelCallError);
    const error = caught as ModelCallError;
    expect(error).toMatchObject({ code: "http-error", status: 402, partialCostMicroUsd: undefined });
    expect(error.message).toBe("OpenRouter returned HTTP 402 (code 402).");
    expect(error.message).not.toContain(KEY);
    expect(error.message).not.toContain("secret-text");
  });

  it("maps a timeout and a network failure without detail from the error", async () => {
    const timeout: FetchLike = async () => {
      throw Object.assign(new Error(`aborted ${KEY}`), { name: "TimeoutError" });
    };
    await expect(callOpenRouter(input(), KEY, timeout)).rejects.toMatchObject({ code: "timeout" });
    const network: FetchLike = async () => {
      throw new Error(`socket closed ${KEY}`);
    };
    const failure = await callOpenRouter(input(), KEY, network).catch((error: unknown) => error as ModelCallError);
    expect(failure).toMatchObject({ code: "network", message: "The request to OpenRouter failed." });
  });
});
