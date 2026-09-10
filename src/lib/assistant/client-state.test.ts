import { describe, expect, it } from "vitest";
import {
  ASSISTANT_EXCHANGE_LIMIT,
  ASSISTANT_SESSION_KEY,
  ASSISTANT_SESSION_BYTE_LIMIT,
  ASSISTANT_RESPONSE_BYTE_LIMIT,
  historyFrom,
  loadAssistantSession,
  parseAssistantResult,
  parseAssistantSession,
  readAssistantResponse,
  saveAssistantSession,
  type AssistantExchange,
} from "./client-state";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const ANSWERED = {
  state: "answered",
  answer: "OJ built Cited.",
  citations: [
    {
      quote: "OJ built Cited",
      label: "Cited — Document Assistant",
      href: "/projects/cited",
    },
  ],
  modelRoute: "primary",
} as const;

describe("assistant client boundary", () => {
  it("rejects oversized chunked response bytes before parsing and cancels the stream", async () => {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(ASSISTANT_RESPONSE_BYTE_LIMIT + 1));
      },
      cancel() { canceled = true; },
    });
    expect(await readAssistantResponse(new Response(body))).toBeNull();
    expect(canceled).toBe(true);
  });

  it("rejects malformed UTF-8, invalid JSON and failed responses", async () => {
    expect(await readAssistantResponse(new Response(new Uint8Array([0xff])))).toBeNull();
    expect(await readAssistantResponse(new Response("not json"))).toBeNull();
    expect(await readAssistantResponse(new Response(JSON.stringify(ANSWERED), { status: 502 }))).toBeNull();
  });
  it("accepts a bounded answer and preserves an exact allowlisted source", () => {
    expect(parseAssistantResult(ANSWERED)).toEqual(ANSWERED);
  });

  it("turns an attacker-selected citation href into plain text", () => {
    const parsed = parseAssistantResult({
      ...ANSWERED,
      citations: [{ ...ANSWERED.citations[0], href: "https://evil.example/x" }],
    });

    expect(parsed?.state).toBe("answered");
    if (parsed?.state === "answered") {
      expect(parsed.citations[0]?.href).toBeNull();
      expect(parsed.citations[0]?.label).toBe("Cited — Document Assistant");
    }
  });

  it("rejects oversized prose, missing citations and unknown states", () => {
    expect(
      parseAssistantResult({ state: "answered", answer: "x".repeat(4_001), citations: [] }),
    ).toBeNull();
    expect(
      parseAssistantResult({ state: "answered", answer: "x", citations: [] }),
    ).toBeNull();
    expect(parseAssistantResult({ state: "surprise", answer: "trust me" })).toBeNull();
  });

  it("rejects unknown route metadata at the browser boundary", () => {
    expect(parseAssistantResult({ ...ANSWERED, modelRoute: "surprise" })).toBeNull();
    expect(parseAssistantResult({
      state: "not-covered",
      answer: "I can't answer that from the information I have. You can contact OJ directly.",
      modelRoute: "surprise",
    })).toBeNull();
  });
});

describe("assistant tab record", () => {
  it("rejects oversized roots and reversed timestamps, and removes invalid storage", () => {
    expect(parseAssistantSession(" ".repeat(ASSISTANT_SESSION_BYTE_LIMIT + 1))).toBeNull();
    expect(parseAssistantSession(JSON.stringify({ version: 1, createdAt: 2, updatedAt: 1, exchanges: [] }))).toBeNull();
    const storage = new MemoryStorage();
    storage.setItem(ASSISTANT_SESSION_KEY, "not json");
    expect(() => loadAssistantSession(storage)).toThrow("Invalid assistant session");
    expect(storage.getItem(ASSISTANT_SESSION_KEY)).toBeNull();
  });

  it("revalidates sensitive input and unsafe URLs on restore", () => {
    const record = parseAssistantSession(JSON.stringify({
      version: 1, createdAt: 1, updatedAt: 2,
      exchanges: [
        { question: "visitor@example.com", result: ANSWERED },
        { question: "What did OJ build?", result: { ...ANSWERED, citations: [{ ...ANSWERED.citations[0], href: "javascript:alert(1)" }] } },
        { question: "Pending", result: null },
      ],
    }));
    expect(record?.exchanges).toHaveLength(1);
    expect(record?.exchanges[0]?.result).toMatchObject({ citations: [{ href: null }] });
  });

  it("strips extra properties and excludes sensitive text even if a caller labels it answered", () => {
    const storage = new MemoryStorage();
    const result = { ...ANSWERED, internalSecret: "never persist" };
    saveAssistantSession(storage, [
      { id: 0, question: "password: synthetic", result },
      { id: 1, question: "What did OJ build?", result },
    ], 1, 2);
    const raw = storage.getItem(ASSISTANT_SESSION_KEY)!;
    expect(raw).not.toContain("password");
    expect(raw).not.toContain("internalSecret");
    expect(loadAssistantSession(storage)?.exchanges).toHaveLength(1);
  });

  it("trims oldest complete exchanges to fit the byte bound", () => {
    const storage = new MemoryStorage();
    const result = { ...ANSWERED, answer: "界".repeat(4_000) };
    saveAssistantSession(storage, Array.from({ length: 20 }, (_, id) => ({ id, question: `Question ${id}`, result })), 1, 2);
    const raw = storage.getItem(ASSISTANT_SESSION_KEY)!;
    expect(new TextEncoder().encode(raw).byteLength).toBeLessThanOrEqual(ASSISTANT_SESSION_BYTE_LIMIT);
    const exchanges = loadAssistantSession(storage)!.exchanges;
    expect(exchanges.length).toBeLessThan(20);
    expect(exchanges.at(-1)?.question).toBe("Question 19");
  });
  it("rejects corrupt and unknown-version roots", () => {
    expect(parseAssistantSession("not json")).toBeNull();
    expect(
      parseAssistantSession(
        JSON.stringify({ version: 2, createdAt: 1, updatedAt: 2, exchanges: [] }),
      ),
    ).toBeNull();
  });

  it("discards an invalid entry while keeping a valid completed exchange", () => {
    const parsed = parseAssistantSession(
      JSON.stringify({
        version: 1,
        createdAt: 1,
        updatedAt: 2,
        exchanges: [
          { question: "What did OJ build?", result: ANSWERED },
          { question: 42, result: ANSWERED },
        ],
      }),
    );

    expect(parsed?.exchanges).toHaveLength(1);
    expect(parsed?.exchanges[0]?.question).toBe("What did OJ build?");
  });

  it("saves only completed non-sensitive exchanges and restores them", () => {
    const storage = new MemoryStorage();
    const exchanges: AssistantExchange[] = [
      { id: 0, question: "Pending", result: null },
      {
        id: 1,
        question: "email me at visitor@example.com",
        result: {
          state: "blocked",
          reason: "personal-data",
          answer: "Not sent.",
        },
      },
      { id: 2, question: "What did OJ build?", result: ANSWERED },
    ];

    saveAssistantSession(storage, exchanges, 1, 2);
    const raw = storage.getItem(ASSISTANT_SESSION_KEY) ?? "";
    expect(raw).not.toContain("visitor@example.com");
    expect(raw).not.toContain("Pending");
    expect(loadAssistantSession(storage)?.exchanges).toHaveLength(1);
  });

  it("preserves fallback metadata through fixed-copy suppression and session restore", () => {
    const storage = new MemoryStorage();
    const fixedFallback = parseAssistantResult({
      state: "not-covered",
      answer: "attacker-selected unsupported prose",
      modelRoute: "fallback",
    });

    expect(fixedFallback).toEqual({
      state: "not-covered",
      answer: "I can't answer that from the information I have. You can contact OJ directly.",
      modelRoute: "fallback",
    });
    saveAssistantSession(storage, [
      { id: 0, question: "What is not covered?", result: fixedFallback },
    ], 1, 2);

    expect(loadAssistantSession(storage)?.exchanges[0]?.result).toEqual(fixedFallback);
  });

  it("keeps route metadata absent on older tab records", () => {
    const oldAnswered = {
      state: ANSWERED.state,
      answer: ANSWERED.answer,
      citations: ANSWERED.citations,
    };
    const parsed = parseAssistantSession(JSON.stringify({
      version: 1,
      createdAt: 1,
      updatedAt: 2,
      exchanges: [{ question: "What did OJ build?", result: oldAnswered }],
    }));

    expect(parsed?.exchanges[0]?.result).toEqual(oldAnswered);
    expect(parsed?.exchanges[0]?.result).not.toHaveProperty("modelRoute");
  });

  it("trims whole oldest exchanges at the documented count boundary", () => {
    const storage = new MemoryStorage();
    const exchanges: AssistantExchange[] = Array.from(
      { length: ASSISTANT_EXCHANGE_LIMIT + 3 },
      (_, id) => ({ id, question: `Question ${id}`, result: ANSWERED }),
    );

    saveAssistantSession(storage, exchanges, 1, 2);
    const restored = loadAssistantSession(storage);
    expect(restored?.exchanges).toHaveLength(ASSISTANT_EXCHANGE_LIMIT);
    expect(restored?.exchanges[0]?.question).toBe("Question 3");
  });

  it("builds four-turn question/source history without answer prose", () => {
    const exchanges: AssistantExchange[] = Array.from({ length: 6 }, (_, id) => ({
      id,
      question: `Question ${id}`,
      result: ANSWERED,
    }));

    const history = historyFrom(exchanges);
    expect(history.map((turn) => turn.question)).toEqual([
      "Question 2",
      "Question 3",
      "Question 4",
      "Question 5",
    ]);
    expect(JSON.stringify(history)).not.toContain(ANSWERED.answer);
    expect(history[0]?.sources).toEqual(["Cited — Document Assistant"]);
  });
});


describe("citation, policy and route restoration", () => {
  it("re-resolves links and labels by immutable source ID", () => {
    const result = parseAssistantResult({
      ...ANSWERED,
      citations: [{ quote: "A quote", label: "attacker label", href: "https://evil.invalid",
        sourceId: "project-cited.md", evidenceId: "a".repeat(64) }],
    });
    expect(result).toMatchObject({ citations: [{ sourceId: "project-cited.md",
      evidenceId: "a".repeat(64), label: "Cited — Document Assistant", href: "/projects/cited" }] });
  });
  it("rejects unknown IDs instead of trusting a familiar display label", () => {
    expect(parseAssistantResult({ ...ANSWERED, citations: [{ ...ANSWERED.citations[0],
      sourceId: "unknown.md", evidenceId: "a".repeat(64) }] })).toBeNull();
  });
  it("does not restore arbitrary unsupported prose", () => {
    expect(parseAssistantResult({ state: "not-covered", answer: "invented unsupported answer" }))
      .toEqual({ state: "not-covered", answer: "I can't answer that from the information I have. You can contact OJ directly." });
  });
});
