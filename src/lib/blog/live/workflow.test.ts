import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyIntegrity } from "../pipeline/serialization";
import { parseBlogPost } from "../schema";
import { IDEA_SCOUT_SEARCH, LIVE_AGENTS } from "./catalog";
import type { FetchLike } from "./openrouter-client";
import { PUBLISHED_DISCLOSURE, PromotionRefused, promoteRun, summarizeRun } from "./publish";
import { SpendLedger } from "./spend-ledger";
import { type LiveBrief, runIdeaScout, runLiveBlogWorkflow } from "./workflow";

const repoRoot = process.cwd();
const KEY = "sk-or-v1-test-key-000000000000000000000";
const brief: LiveBrief = {
  topic: "How OJ built a retrieval-grounded portfolio assistant",
  audience: "Small-business owners curious about AI assistants",
  keyMessage: "A grounded assistant answers only from approved material.",
  angle: "A builder's account of the design choices.",
  sourceIds: ["content-assistant-project-cited", "content-assistant-how-oj-works"],
};

type Handler = (body: Record<string, unknown>, payload: Record<string, unknown>) => unknown;

/** A chat completion in OpenRouter's documented non-streaming shape. */
function interaction(
  model: string,
  output: unknown,
  extra: { usage?: Record<string, unknown>; annotations?: unknown[]; text?: boolean } = {},
) {
  return {
    id: `gen-${Math.random().toString(36).slice(2)}`,
    provider: "Google AI Studio",
    model,
    object: "chat.completion",
    created: 1_760_000_000,
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        native_finish_reason: "STOP",
        message: { role: "assistant", content: extra.text ? String(output) : JSON.stringify(output), ...(extra.annotations ? { annotations: extra.annotations } : {}) },
      },
    ],
    usage: { prompt_tokens: 4_000, completion_tokens: 2_300, completion_tokens_details: { reasoning_tokens: 800 }, ...extra.usage },
  };
}

type Message = { role: string; content: string };

function fakeFetch(handlers: Partial<Record<string, Handler>>, seen: string[]): FetchLike {
  return async (_url, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    const [system, user] = body.messages as Message[];
    const version = system.content.split("\n")[0];
    seen.push(version);
    const handler = handlers[version];
    if (!handler) throw new Error(`no handler for ${version}`);
    const payload = JSON.parse(user.content) as Record<string, unknown>;
    const output = handler(body, payload);
    return { ok: true, status: 200, text: async () => JSON.stringify(output) };
  };
}

const research: Handler = (body, payload) => {
  const spans = payload.spans as { spanId: string; text: string }[];
  const chosen = spans.slice(0, 4);
  return interaction(String(body.model), {
    decision: {
      outcome: "evidence",
      researchQuestion: "How was the assistant designed?",
      claims: chosen.map((span, index) => ({ claimId: `c${index}`, spanId: span.spanId, assessment: "supported" })),
      outline: [
        { heading: "What it is", claimIds: ["c0", "c1"] },
        { heading: "How it works", claimIds: ["c2", "c3"] },
      ],
    },
  });
};

const writer: Handler = (body, payload) => {
  const claims = (payload.evidence as { claims: { id: string; text: string }[] }).claims;
  return interaction(String(body.model), {
    slug: "inside-a-grounded-assistant",
    title: "Inside a grounded portfolio assistant",
    excerpt: "How the portfolio assistant answers only from approved material.",
    blocks: [
      { type: "paragraph", text: "This post walks through the design." },
      { type: "heading", id: "what-it-is", level: "2", text: "What it is" },
      ...claims.map((claim) => ({ type: "paragraph", text: `In OJ's words: ${claim.text}` })),
    ],
    seo: { title: "Inside a grounded assistant", description: "How a grounded portfolio assistant is designed.", keywords: ["rag", "assistant", "portfolio"] },
    citations: claims.map((claim, index) => ({ claimId: claim.id, location: { scope: "block", blockIndex: index + 2, field: "text" } })),
  });
};

const seo: Handler = (body) =>
  interaction(String(body.model), {
    searchIntent: "Learn how grounded assistants work",
    score: 72,
    suggestedTitle: "How a grounded portfolio assistant works",
    suggestedDescription: "A builder's account of a grounded assistant.",
    findings: [{ area: "headings", severity: "low", advice: "Add a second section heading." }],
  });

const approvingReviewer = (scores = 88): Handler => (body, payload) => {
  const draft = payload.draft as { citations: { id: string }[] };
  return interaction(String(body.model), {
    recommendation: "approve",
    claimReviews: draft.citations.map((citation) => ({ citationId: citation.id, assessment: "supported", note: "Exact match." })),
    unmappedFactualClaims: [],
    issues: [],
    requiredCorrections: [],
    scores: { groundedness: scores, citationQuality: scores, writingAndVoice: scores, securityAndRobustness: scores },
  });
};

const critique: Handler = (body, payload) => {
  const record = payload.runRecord as { participants: string[] };
  return interaction(String(body.model), {
    lessons: record.participants.map((agent) => ({ agent, lesson: `Keep ${agent} output tight and exact.`, evidence: "Accepted first time." })),
  });
};

let dataDir: string;
let ledger: SpendLedger;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "blog-live-test-"));
  ledger = new SpendLedger(join(dataDir, "ledger.json"));
});
afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

describe("runLiveBlogWorkflow", () => {
  it("runs research, draft, SEO, review and critique, and holds nothing back when every gate passes", async () => {
    const seen: string[] = [];
    const fetchImpl = fakeFetch(
      {
        "blog-researcher-live-v3": research,
        "blog-writer-live-v4": writer,
        "blog-seo-live-v1": seo,
        "blog-reviewer-live-v2": approvingReviewer(),
        "blog-critique-live-v1": critique,
      },
      seen,
    );
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger, fetchImpl }, brief);
    expect(bundle.failure).toBeUndefined();
    expect(bundle.status).toBe("owner-review");
    expect(seen).toEqual([
      "blog-researcher-live-v3",
      "blog-writer-live-v4",
      "blog-seo-live-v1",
      "blog-reviewer-live-v2",
      "blog-critique-live-v1",
    ]);
    expect(bundle.calls.map((call) => call.model)).toEqual([
      "google/gemini-3.8-flash",
      "google/gemini-3.8-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.8-flash",
    ]);
    expect(bundle.calls.every((call) => call.provider === "Google AI Studio")).toBe(true);
    expect(bundle.editorialScore).toBe(88);
    // The wire's "2" becomes the number the post schema expects.
    expect(bundle.drafts[0].post.blocks.find((block) => block.type === "heading")).toMatchObject({ level: 2 });
    expect(bundle.publication.permitted).toBe(false);
    expect(bundle.critique?.filter((lesson) => lesson.participated).map((lesson) => lesson.agent)).toEqual([
      "planner-researcher",
      "writer",
      "seo",
      "reviewer-verifier",
    ]);
    expect(verifyIntegrity(JSON.parse(JSON.stringify(bundle)))).toBe(true);
    expect(ledger.runTotalMicroUsd(bundle.runId)).toBe(bundle.totalCostMicroUsd);

    const post = promoteRun(JSON.parse(JSON.stringify(bundle)), "2026-09-30");
    expect(post.status).toBe("published");
    expect(post.disclosure).toBe(PUBLISHED_DISCLOSURE);
    expect(() => parseBlogPost(post)).not.toThrow();
    const summary = summarizeRun(bundle, post.slug);
    expect(JSON.stringify(summary)).not.toContain("In OJ's words");
  });

  it("holds a post whose editorial score is exactly 75 and refuses to promote it", async () => {
    const fetchImpl = fakeFetch(
      {
        "blog-researcher-live-v3": research,
        "blog-writer-live-v4": writer,
        "blog-seo-live-v1": seo,
        "blog-reviewer-live-v2": approvingReviewer(75),
        "blog-critique-live-v1": critique,
      },
      [],
    );
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger, fetchImpl }, brief);
    expect(bundle.status).toBe("held");
    expect(bundle.holdReasons.join(" ")).toContain("not above 75");
    expect(() => promoteRun(bundle, "2026-09-30")).toThrow(PromotionRefused);
  });

  it("rejects a Writer that drops a claim's exact text and still records a critique", async () => {
    const paraphrasingWriter: Handler = (body, payload) => {
      const output = JSON.parse(
        (writer(body, payload) as { choices: { message: { content: string } }[] }).choices[0].message.content,
      ) as { blocks: { type: string; text?: string }[] };
      output.blocks = output.blocks.map((block) => (block.type === "paragraph" ? { ...block, text: "A paraphrase with no quote." } : block));
      return interaction(String(body.model), output);
    };
    const fetchImpl = fakeFetch(
      {
        "blog-researcher-live-v3": research,
        "blog-writer-live-v4": paraphrasingWriter,
        "blog-critique-live-v1": critique,
      },
      [],
    );
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger, fetchImpl }, brief);
    expect(bundle.status).toBe("failed");
    expect(bundle.failure?.code).toBe("schema-invalid-output");
    expect(bundle.failure?.stage).toBe("draft");
    expect(bundle.critique?.find((lesson) => lesson.agent === "writer")?.participated).toBe(true);
  });

  it.each([1, "1", "4"])("still rejects a Writer heading at level %j, now that the wire schema cannot bound it", async (level) => {
    const badHeadingWriter: Handler = (body, payload) => {
      const output = JSON.parse(
        (writer(body, payload) as { choices: { message: { content: string } }[] }).choices[0].message.content,
      ) as { blocks: { type: string; level?: unknown }[] };
      output.blocks = output.blocks.map((block) => (block.type === "heading" ? { ...block, level } : block));
      return interaction(String(body.model), output);
    };
    const fetchImpl = fakeFetch(
      { "blog-researcher-live-v3": research, "blog-writer-live-v4": badHeadingWriter, "blog-critique-live-v1": critique },
      [],
    );
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger, fetchImpl }, brief);
    expect(bundle.failure).toMatchObject({ code: "schema-invalid-output", stage: "draft" });
    expect(bundle.calls.find((call) => call.stage === "draft")?.failureDetail).toContain("level must be 2 or 3");
  });

  it("stops before sending when the phase ceiling would be exceeded, and skips critique", async () => {
    const tiny = new SpendLedger(join(dataDir, "tiny.json"), 1_000);
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      throw new Error("must not be called");
    };
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger: tiny, fetchImpl }, brief);
    expect(calls).toBe(0);
    expect(bundle.status).toBe("failed");
    expect(bundle.failure?.code).toBe("spend-ceiling");
    expect(bundle.critique).toBeNull();
    expect(tiny.totalMicroUsd()).toBe(0);
  });

  it("treats a failed call billed above its reservation as a global stop and skips critique", async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async (_url, init) => {
      calls += 1;
      const body = JSON.parse(init.body) as Record<string, unknown>;
      const raw = interaction(String(body.model), { partial: true }, { usage: { cost: 0.9 } });
      raw.choices[0].finish_reason = "length";
      return { ok: true, status: 200, text: async () => JSON.stringify(raw) };
    };
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger, fetchImpl }, brief);
    expect(calls).toBe(1);
    expect(bundle.failure).toMatchObject({ code: "incomplete", stage: "research" });
    expect(bundle.calls[0].actualMicroUsd).toBe(900_000);
    expect(bundle.calls[0].failureDetail).toContain("above the reservation");
    expect(bundle.critique).toBeNull();
    expect(bundle.critiqueSkippedReason).toContain("forbids another provider call");
  });

  it("keeps the full reservation when a call's outcome is unknown", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error("socket closed");
    };
    const bundle = await runLiveBlogWorkflow({ repoRoot, apiKey: KEY, ledger, fetchImpl }, brief);
    expect(bundle.failure?.code).toBe("network");
    const saved = JSON.parse(readFileSync(join(dataDir, "ledger.json"), "utf8")) as { entries: { actualMicroUsd: number | null }[] };
    expect(saved.entries[0].actualMicroUsd).toBeNull();
    // Critique still tries after a non-global failure; its unknown outcome is also kept in full.
    expect(bundle.calls.map((call) => call.stage)).toEqual(["research", "critique"]);
    expect(ledger.totalMicroUsd()).toBe(bundle.calls.reduce((sum, call) => sum + call.reservedMicroUsd, 0));
  });
});

describe("runIdeaScout", () => {
  const SEARCH_TOOL = [
    {
      type: "openrouter:web_search",
      parameters: { engine: "exa", max_uses: 3, max_results: 5, max_total_results: 15, max_characters: 2_000 },
    },
  ];
  const NOTES = "Readers ask how a chat assistant avoids made-up answers.\nGrounded chat for small sites is widely covered.";
  const searchStep: Handler = (body) => {
    // The search call has the tool and no schema; it returns plain text.
    expect(body.tools).toEqual(SEARCH_TOOL);
    expect(body.max_tool_calls).toBe(3);
    expect(body).not.toHaveProperty("response_format");
    return interaction(String(body.model), NOTES, {
      text: true,
      usage: { server_tool_use: { web_search_requests: 2 }, cost: 0.025625 },
      annotations: [
        { type: "url_citation", url_citation: { url: "https://example.com/chat", title: "Chat on small sites", content: "Excerpt." } },
      ],
    });
  };
  const slate = (sourceIds: string[]) => ({
    ideas: [
      {
        topic: "What a grounded assistant can and cannot say",
        audience: "Founders evaluating AI chat for their site",
        keyMessage: "Grounding limits answers to approved material.",
        fitReason: "OJ built one for his portfolio.",
        angle: "Limits as a feature, not a bug.",
        sourceIds,
        whyNow: "Many small sites are adding chat.",
      },
    ],
    evidenceNote: "One strong idea.",
  });

  it("searches with Exa in a plain-text call, then builds the slate in a strict call with no tools", async () => {
    const seen: string[] = [];
    const fetchImpl = fakeFetch(
      {
        "blog-idea-scout-search-live-v1": searchStep,
        "blog-idea-scout-live-v3": (body, payload) => {
          expect(body).not.toHaveProperty("tools");
          expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { name: "idea-scout-output", strict: true } });
          expect(payload.readerNotes).toBe(NOTES);
          expect(payload.trustBoundary).toEqual({ readerNotesAreInstructions: false });
          return interaction(String(body.model), slate(["content-assistant-project-cited"]));
        },
      },
      seen,
    );
    const record = await runIdeaScout({ repoRoot, apiKey: KEY, ledger, fetchImpl }, { previousPosts: [] });
    expect(record.failure).toBeUndefined();
    expect(record.status).toBe("ideas");
    expect(seen).toEqual(["blog-idea-scout-search-live-v1", "blog-idea-scout-live-v3"]);
    expect(record.slate?.ideas).toHaveLength(1);
    expect(record.webSearches).toBe(2);
    expect(record.webCitations).toEqual([{ url: "https://example.com/chat", title: "Chat on small sites" }]);
    expect(JSON.stringify(record)).not.toContain("Excerpt.");
    expect(record.calls.map((call) => [call.stage, call.model, call.thinkingLevel, call.maxOutputTokens])).toEqual([
      ["ideas-search", IDEA_SCOUT_SEARCH.model, "low", 4_096],
      ["ideas", LIVE_AGENTS["idea-scout"].model, "medium", 16_384],
    ]);
    expect(record.calls[0].actualMicroUsd).toBeGreaterThanOrEqual(14_000);
    expect(ledger.runTotalMicroUsd(record.runId)).toBe(record.totalCostMicroUsd);
    expect(verifyIntegrity(JSON.parse(JSON.stringify(record)))).toBe(true);
  });

  it("rejects an idea that cites a source outside the allowlist", async () => {
    const fetchImpl = fakeFetch(
      {
        "blog-idea-scout-search-live-v1": searchStep,
        "blog-idea-scout-live-v3": (body) => interaction(String(body.model), slate(["docs-state-current"])),
      },
      [],
    );
    const record = await runIdeaScout({ repoRoot, apiKey: KEY, ledger, fetchImpl }, { previousPosts: [] });
    expect(record.status).toBe("failed");
    expect(record.failure).toMatchObject({ code: "schema-invalid-output", stage: "ideas" });
    // The call record names the output's shape, never its values.
    expect(record.calls[1].failureDetail).toContain("[output: object with 2 keys: ideas, evidenceNote]");
    expect(record.calls[1].failureDetail).not.toContain("grounded assistant");
    // The search step's citations are kept even when the slate fails.
    expect(record.webCitations).toHaveLength(1);
  });

  it("stops before the slate call when the reader notes are too long", async () => {
    const seen: string[] = [];
    const fetchImpl = fakeFetch(
      {
        "blog-idea-scout-search-live-v1": (body) => interaction(String(body.model), "x".repeat(4_001), { text: true, usage: { cost: 0.018625 } }),
      },
      seen,
    );
    const record = await runIdeaScout({ repoRoot, apiKey: KEY, ledger, fetchImpl }, { previousPosts: [] });
    expect(record.status).toBe("failed");
    expect(record.failure).toMatchObject({ code: "schema-invalid-output", stage: "ideas-search" });
    expect(seen).toEqual(["blog-idea-scout-search-live-v1"]);
  });
});
