/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import policy from "../../../content/assistant-policy.json";
import {
  askAssistantService,
  readServiceConfig,
  type AssistantServiceConfig,
} from "./service";
import {
  ASSISTANT_POLICY_IDS,
  ASSISTANT_SERVICE_RESPONSE_BYTE_LIMIT,
} from "./types";

const CONFIG: AssistantServiceConfig = {
  url: "https://assistant.example.com",
  secret: "synthetic-secret",
};
const EVIDENCE_ID = "a".repeat(64);
const ANSWERED = {
  version: 3,
  state: "answered",
  answer: "OJ built Cited.",
  citations: [
    {
      source_id: "project-cited.md",
      evidence_id: EVIDENCE_ID,
      quote: "OJ built Cited",
    },
  ],
  model_route: "primary",
} as const;

function backend(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("assistant service configuration", () => {
  it("accepts HTTPS and exact local HTTP hosts", () => {
    expect(readServiceConfig({
      ASSISTANT_SERVICE_URL: "https://assistant.example.com",
      ASSISTANT_SERVICE_SECRET: "secret",
    })).toEqual({ url: "https://assistant.example.com", secret: "secret" });
    expect(readServiceConfig({
      ASSISTANT_SERVICE_URL: "http://localhost:8000",
      ASSISTANT_SERVICE_SECRET: "secret",
    })).toEqual({ url: "http://localhost:8000", secret: "secret" });
    expect(readServiceConfig({
      ASSISTANT_SERVICE_URL: "http://127.0.0.1:8000",
      ASSISTANT_SERVICE_SECRET: "secret",
    })).toEqual({ url: "http://127.0.0.1:8000", secret: "secret" });
  });

  it.each([
    "ftp://localhost",
    "http://localhost.example.com",
    "http://assistant.example.com",
    "https://user:password@assistant.example.com",
    "https://assistant.example.com?secret=leak",
    "https://assistant.example.com#fragment",
  ])("rejects unsafe URL configuration without logging its value: %s", (url) => {
    const marker = "synthetic-url-secret";
    expect(readServiceConfig({
      ASSISTANT_SERVICE_URL: `${url}${url.includes("?") ? "&" : "?"}${marker}`,
      ASSISTANT_SERVICE_SECRET: marker,
    })).toBeNull();
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls))
      .not.toContain(marker);
  });
});

describe("assistant service wire v3", () => {
  it("maps exact allowlisted source and evidence identifiers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend(ANSWERED)));

    await expect(askAssistantService("What did OJ build?", CONFIG)).resolves.toEqual({
      state: "answered",
      answer: "OJ built Cited.",
      citations: [
        {
          quote: "OJ built Cited",
          label: "Cited — Document Assistant",
          href: "/projects/cited",
          sourceId: "project-cited.md",
          evidenceId: EVIDENCE_ID,
        },
      ],
      modelRoute: "primary",
    });
  });

  it.each(ASSISTANT_POLICY_IDS)(
    "maps policy %s to its application-owned response",
    async (policyId) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend({
        version: 3,
        state: "not-covered",
        policy: policyId,
        model_route: null,
      })));

      expect(await askAssistantService("policy question", CONFIG)).toEqual({
        state: "not-covered",
        answer: policy.responses[policyId],
      });
    },
  );

  it("maps an unknown policy to fixed unsupported text and ignores backend prose", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend({
        version: 3,
        state: "not-covered",
        policy: "unknown-policy",
        model_route: "fallback",
      })));
    expect(await askAssistantService("Unknown", CONFIG)).toEqual({
      state: "not-covered",
      answer: policy.responses.unsupported,
      modelRoute: "fallback",
    });
  });

  it.each([
    { ...ANSWERED, grounded: true },
    { ...ANSWERED, refused: false },
    { ...ANSWERED, truncated: false },
    { ...ANSWERED, policy: "identity" },
    { ...ANSWERED, unexpected: "field" },
    { version: 3, state: "not-covered", policy: "identity", model_route: null, grounded: false },
  ])("rejects conflicting or unknown root fields", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend(body)));
    await expect(askAssistantService("question", CONFIG)).resolves.toEqual({
      state: "unavailable",
    });
  });

  it("rejects unknown citation fields with fixed unsupported text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend({
      ...ANSWERED,
      citations: [{ ...ANSWERED.citations[0], href: "https://evil.example" }],
    })));
    await expect(askAssistantService("question", CONFIG)).resolves.toEqual({
      state: "not-covered",
      answer: policy.responses.unsupported,
      modelRoute: "primary",
    });
  });

  it.each([
    { label: "empty answer", body: { ...ANSWERED, answer: " " } },
    { label: "oversized answer", body: { ...ANSWERED, answer: "x".repeat(4_001) } },
    { label: "missing citations", body: { ...ANSWERED, citations: [] } },
    {
      label: "unknown source",
      body: { ...ANSWERED, citations: [{ ...ANSWERED.citations[0], source_id: "https://evil.example" }] },
    },
    {
      label: "decorated source",
      body: { ...ANSWERED, citations: [{ ...ANSWERED.citations[0], source_id: "project-cited.md — Intro" }] },
    },
    {
      label: "uppercase evidence ID",
      body: { ...ANSWERED, citations: [{ ...ANSWERED.citations[0], evidence_id: EVIDENCE_ID.toUpperCase() }] },
    },
    {
      label: "invalid evidence ID",
      body: { ...ANSWERED, citations: [{ ...ANSWERED.citations[0], evidence_id: "a".repeat(63) }] },
    },
    {
      label: "oversized quote",
      body: { ...ANSWERED, citations: [{ ...ANSWERED.citations[0], quote: "q".repeat(1_001) }] },
    },
    {
      label: "too many citations",
      body: { ...ANSWERED, citations: Array.from({ length: 9 }, () => ANSWERED.citations[0]) },
    },
  ])("maps unsafe answered payload with $label to fixed unsupported text", async ({ body }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend(body)));
    expect(await askAssistantService("question", CONFIG)).toEqual({
      state: "not-covered",
      answer: policy.responses.unsupported,
      modelRoute: "primary",
    });
  });

  it("retains fallback route when unsafe answered prose is replaced with fixed copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend({
      ...ANSWERED,
      answer: " ",
      model_route: "fallback",
    })));

    await expect(askAssistantService("question", CONFIG)).resolves.toEqual({
      state: "not-covered",
      answer: policy.responses.unsupported,
      modelRoute: "fallback",
    });
  });

  it.each([
    {
      label: "missing answered route",
      body: {
        version: ANSWERED.version,
        state: ANSWERED.state,
        answer: ANSWERED.answer,
        citations: ANSWERED.citations,
      },
    },
    { label: "unknown answered route", body: { ...ANSWERED, model_route: "surprise" } },
    { label: "missing policy route", body: { version: 3, state: "not-covered", policy: "unsupported" } },
    { label: "unknown policy route", body: { version: 3, state: "not-covered", policy: "unsupported", model_route: "surprise" } },
  ])("fails closed for $label", async ({ body }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend(body)));
    await expect(askAssistantService("question", CONFIG)).resolves.toEqual({
      state: "unavailable",
    });
  });

  it.each([
    { answer: "legacy", citations: [], grounded: false, refused: true },
    { version: 1, state: "not-covered", policy: "unsupported" },
    { version: 2, state: "answered", answer: "old wire", citations: ANSWERED.citations },
    { version: 2, state: "not-covered", policy: "unsupported" },
    { version: 3, state: "surprise", answer: "trust me" },
  ])("fails old or malformed wire safely as unavailable", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backend(body)));
    await expect(askAssistantService("question", CONFIG)).resolves.toEqual({
      state: "unavailable",
    });
  });

  it("bounds and rebuilds history without generated answer fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(backend({ version: 3, state: "unavailable" }));
    vi.stubGlobal("fetch", fetchMock);
    const history = Array.from({ length: 6 }, (_, index) => ({
      question: `question ${index}${"x".repeat(300)}`,
      sources: ["s".repeat(100), "Projects"],
      answer: "generated answer must not travel",
    }));

    await askAssistantService("current", CONFIG, history);
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(sent.history).toHaveLength(4);
    expect(sent.history[0].question.startsWith("question 2")).toBe(true);
    expect(sent.history[0].question).toHaveLength(280);
    expect(sent.history[0].sources[0]).toHaveLength(80);
    expect(JSON.stringify(sent)).not.toContain("generated answer");
  });
});

describe("assistant service response and deadline bounds", () => {
  it("rejects an oversized response without awaiting a hostile cancel hook", async () => {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(ASSISTANT_SERVICE_RESPONSE_BYTE_LIMIT));
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        canceled = true;
        return new Promise<void>(() => {});
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));

    const outcome = await Promise.race([
      askAssistantService("question", CONFIG),
      new Promise<"still-pending">((resolve) =>
        setTimeout(() => resolve("still-pending"), 50),
      ),
    ]);
    expect(outcome).toEqual({ state: "unavailable" });
    expect(canceled).toBe(true);
  });

  it("best-effort cancels a non-OK body without awaiting cancellation", async () => {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        canceled = true;
        return new Promise<void>(() => {});
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 502 })));

    const outcome = await Promise.race([
      askAssistantService("question", CONFIG),
      new Promise<"still-pending">((resolve) =>
        setTimeout(() => resolve("still-pending"), 50),
      ),
    ]);
    expect(outcome).toEqual({ state: "unavailable" });
    expect(canceled).toBe(true);
  });

  it("rejects truncated JSON without returning contained prose", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      '{"version":3,"state":"answered","answer":"do not show"',
    )));
    const result = await askAssistantService("question", CONFIG);
    expect(result).toEqual({ state: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("do not show");
  });

  it("cancels a stalled response body at the supplied deadline", async () => {
    vi.useFakeTimers();
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        canceled = true;
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));

    const pending = askAssistantService("question", CONFIG, [], {
      deadlineMs: 125,
    });
    await vi.advanceTimersByTimeAsync(125);

    await expect(pending).resolves.toEqual({ state: "unavailable" });
    expect(canceled).toBe(true);
  });

  it("passes a clamped integer remaining deadline and no-store fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(backend({ version: 3, state: "unavailable" }));
    vi.stubGlobal("fetch", fetchMock);
    await askAssistantService("question", CONFIG, [], { deadlineMs: 12_345.9 });
    expect(fetchMock.mock.calls[0]![1].headers["X-Assistant-Deadline-Ms"]).toBe("9000");
    expect(fetchMock.mock.calls[0]![1].cache).toBe("no-store");
    expect(fetchMock.mock.calls[0]![1].redirect).toBe("error");
  });

  it("aborts a stalled backend at the supplied deadline", async () => {
    vi.useFakeTimers();
    let backendSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      (_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
        backendSignal = init.signal as AbortSignal;
        backendSignal.addEventListener("abort", () => reject(new Error("synthetic secret in provider error")));
      }),
    ));

    const pending = askAssistantService("question", CONFIG, [], { deadlineMs: 125 });
    await vi.advanceTimersByTimeAsync(125);
    await expect(pending).resolves.toEqual({ state: "unavailable" });
    expect(backendSignal?.aborted).toBe(true);
  });

  it("forwards caller abort and suppresses a late backend result", async () => {
    let release!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => { release = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const pending = askAssistantService("question", CONFIG, [], { signal: controller.signal });
    controller.abort();
    release(backend(ANSWERED));
    await expect(pending).resolves.toEqual({ state: "unavailable" });
  });

  it("never logs synthetic question, exception, URL, or credential values", async () => {
    const markers = [
      "synthetic-question-secret",
      "synthetic-exception-secret",
      "synthetic-url-secret",
      CONFIG.secret,
    ];
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(markers[1])));
    await askAssistantService(markers[0], {
      url: `https://${markers[2]}.example.com`,
      secret: CONFIG.secret,
    });
    const logged = [
      ...(console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls,
      ...(console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls,
    ].map((call) => JSON.stringify(call)).join(" ");
    for (const marker of markers) expect(logged).not.toContain(marker);
  });
});
