import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyIntegrity } from "../pipeline/serialization";
import { parseBlogPost } from "../schema";
import { LIVE_AGENTS } from "./catalog";
import type { FetchLike } from "./gemini-client";
import { PUBLISHED_DISCLOSURE, PromotionRefused, promoteRun, summarizeRun } from "./publish";
import { SpendLedger } from "./spend-ledger";
import { type LiveBrief, runIdeaScout, runLiveBlogWorkflow } from "./workflow";

const repoRoot = process.cwd();
const KEY = "test-key-000000000000000000000";
const brief: LiveBrief = {
  topic: "How OJ built a retrieval-grounded portfolio assistant",
  audience: "Small-business owners curious about AI assistants",
  keyMessage: "A grounded assistant answers only from approved material.",
  angle: "A builder's account of the design choices.",
  sourceIds: ["content-assistant-project-cited", "content-assistant-how-oj-works"],
};

type Handler = (body: Record<string, unknown>, payload: Record<string, unknown>) => unknown;

function interaction(model: string, output: unknown, extraSteps: unknown[] = []) {
  return {
    object: "interaction",
    id: `int-${Math.random().toString(36).slice(2)}`,
    status: "completed",
    model,
    steps: [...extraSteps, { type: "thought", signature: "x" }, { type: "model_output", content: [{ type: "text", text: JSON.stringify(output) }] }],
    usage: { total_input_tokens: 4_000, total_output_tokens: 1_500, total_thought_tokens: 800 },
  };
}

function fakeFetch(handlers: Partial<Record<string, Handler>>, seen: string[]): FetchLike {
  return async (_url, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    const instruction = String(body.system_instruction);
    const version = instruction.split("\n")[0];
    seen.push(version);
    const handler = handlers[version];
    if (!handler) throw new Error(`no handler for ${version}`);
    const payload = JSON.parse(String(body.input)) as Record<string, unknown>;
    const output = handler(body, payload);
    return { ok: true, status: 200, text: async () => JSON.stringify(output) };
  };
}

const research: Handler = (body, payload) => {
  const spans = payload.spans as { spanId: string; text: string }[];
  const chosen = spans.slice(0, 4);
  return interaction(String(body.model), {
    schemaVersion: 1,
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
    schemaVersion: 1,
    slug: "inside-a-grounded-assistant",
    title: "Inside a grounded portfolio assistant",
    excerpt: "How the portfolio assistant answers only from approved material.",
    blocks: [
      { type: "paragraph", text: "This post walks through the design." },
      { type: "heading", id: "what-it-is", level: 2, text: "What it is" },
      ...claims.map((claim) => ({ type: "paragraph", text: `In OJ's words: ${claim.text}` })),
    ],
    seo: { title: "Inside a grounded assistant", description: "How a grounded portfolio assistant is designed.", keywords: ["rag", "assistant", "portfolio"] },
    citations: claims.map((claim, index) => ({ claimId: claim.id, location: { scope: "block", blockIndex: index + 2, field: "text" } })),
  });
};

const seo: Handler = (body) =>
  interaction(String(body.model), {
    schemaVersion: 1,
    searchIntent: "Learn how grounded assistants work",
    score: 72,
    suggestedTitle: "How a grounded portfolio assistant works",
    suggestedDescription: "A builder's account of a grounded assistant.",
    findings: [{ area: "headings", severity: "low", advice: "Add a second section heading." }],
  });

const approvingReviewer = (scores = 88): Handler => (body, payload) => {
  const draft = payload.draft as { citations: { id: string }[] };
  return interaction(String(body.model), {
    schemaVersion: 1,
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
    schemaVersion: 1,
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
        "blog-researcher-live-v2": research,
        "blog-writer-live-v3": writer,
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
      "blog-researcher-live-v2",
      "blog-writer-live-v3",
      "blog-seo-live-v1",
      "blog-reviewer-live-v2",
      "blog-critique-live-v1",
    ]);
    expect(bundle.calls.map((call) => call.model)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3.8-flash",
    ]);
    expect(bundle.editorialScore).toBe(88);
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
        "blog-researcher-live-v2": research,
        "blog-writer-live-v3": writer,
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
        ((writer(body, payload) as { steps: { type: string; content?: { text: string }[] }[] }).steps.at(-1)?.content?.[0].text) ?? "{}",
      ) as { blocks: { type: string; text?: string }[] };
      output.blocks = output.blocks.map((block) => (block.type === "paragraph" ? { ...block, text: "A paraphrase with no quote." } : block));
      return interaction(String(body.model), output);
    };
    const fetchImpl = fakeFetch(
      {
        "blog-researcher-live-v2": research,
        "blog-writer-live-v3": paraphrasingWriter,
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
  it("uses Google Search and accepts only allowlisted sources", async () => {
    const seen: string[] = [];
    const fetchImpl = fakeFetch(
      {
        "blog-idea-scout-live-v1": (body) => {
          expect(body.tools).toEqual([{ type: "google_search" }]);
          return interaction(
            String(body.model),
            {
              schemaVersion: 1,
              ideas: [
                {
                  topic: "What a grounded assistant can and cannot say",
                  audience: "Founders evaluating AI chat for their site",
                  keyMessage: "Grounding limits answers to approved material.",
                  fitReason: "OJ built one for his portfolio.",
                  angle: "Limits as a feature, not a bug.",
                  sourceIds: ["content-assistant-project-cited"],
                  whyNow: "Many small sites are adding chat.",
                },
              ],
              evidenceNote: "One strong idea.",
            },
            [
              { type: "google_search_call", arguments: { queries: ["grounded chatbot small business"] } },
              { type: "google_search_result", call_id: "search_001", result: [{ search_suggestions: "<div>chip</div>" }] },
            ],
          );
        },
      },
      seen,
    );
    const record = await runIdeaScout({ repoRoot, apiKey: KEY, ledger, fetchImpl }, { previousPosts: [] });
    expect(record.status).toBe("ideas");
    expect(record.slate?.ideas).toHaveLength(1);
    expect(record.searchQueries).toEqual(["grounded chatbot small business"]);
    expect(record.calls[0].model).toBe(LIVE_AGENTS["idea-scout"].model);
    expect(record.calls[0].actualMicroUsd).toBeGreaterThanOrEqual(14_000);
  });

  it("rejects an idea that cites a source outside the allowlist", async () => {
    const fetchImpl = fakeFetch(
      {
        "blog-idea-scout-live-v1": (body) =>
          interaction(String(body.model), {
            schemaVersion: 1,
            ideas: [
              {
                topic: "Something from a private file",
                audience: "Anyone at all",
                keyMessage: "This should not pass validation.",
                fitReason: "It cites a file that is not allowlisted.",
                angle: "An angle that does not matter.",
                sourceIds: ["docs-state-current"],
                whyNow: "",
              },
            ],
            evidenceNote: "",
          }),
      },
      [],
    );
    const record = await runIdeaScout({ repoRoot, apiKey: KEY, ledger, fetchImpl }, { previousPosts: [] });
    expect(record.status).toBe("failed");
    expect(record.failure?.code).toBe("schema-invalid-output");
  });
});
