import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { parseBlogPost } from "../schema";
import { main } from "./cli";
import { LIVE_SOURCE_ALLOWLIST } from "./sources";

const KEY = "test-key-000000000000000000000";
let root: string;
let repo: string;
let data: string;

function interaction(model: string, output: unknown, extraSteps: unknown[] = []) {
  return {
    object: "interaction",
    id: "int-1",
    status: "completed",
    model,
    steps: [...extraSteps, { type: "model_output", content: [{ type: "text", text: JSON.stringify(output) }] }],
    usage: { total_input_tokens: 3_000, total_output_tokens: 1_000, total_thought_tokens: 500 },
  };
}

function respond(body: Record<string, unknown>): unknown {
  const version = String(body.system_instruction).split("\n")[0];
  const model = String(body.model);
  const payload = JSON.parse(String(body.input)) as Record<string, unknown>;
  switch (version) {
    case "blog-idea-scout-live-v1":
      return interaction(
        model,
        {
          schemaVersion: 1,
          ideas: [
            {
              topic: "Building a portfolio assistant that cites its sources",
              audience: "Small-business owners",
              keyMessage: "Grounded answers come from approved material only.",
              fitReason: "OJ designed and built one.",
              angle: "What grounding rules out.",
              sourceIds: ["content-assistant-project-cited"],
              whyNow: "Chat assistants are spreading on small sites.",
            },
          ],
          evidenceNote: "One well-supported idea.",
        },
        [
          { type: "google_search_call", queries: ["portfolio chatbot citations"] },
          { type: "google_search_result", search_suggestions: '<div class="gs-chip">portfolio chatbot citations</div>' },
        ],
      );
    case "blog-researcher-live-v1": {
      const spans = (payload.spans as { spanId: string }[]).slice(0, 3);
      return interaction(model, {
        schemaVersion: 1,
        decision: {
          outcome: "evidence",
          researchQuestion: "What does the assistant do?",
          claims: spans.map((span, index) => ({ claimId: `c${index + 1}`, spanId: span.spanId, assessment: "supported" })),
          outline: [{ heading: "The assistant", claimIds: spans.map((_, index) => `c${index + 1}`) }],
        },
      });
    }
    case "blog-writer-live-v1": {
      const claims = (payload.evidence as { claims: { id: string; text: string }[] }).claims;
      return interaction(model, {
        schemaVersion: 1,
        slug: "a-portfolio-assistant-that-cites",
        title: "A portfolio assistant that cites its sources",
        excerpt: "What a grounded assistant does, in OJ's own words.",
        blocks: [
          { type: "heading", id: "the-assistant", level: 2, text: "The assistant" },
          ...claims.map((claim) => ({ type: "paragraph", text: claim.text })),
        ],
        seo: { title: "A portfolio assistant that cites", description: "How a grounded portfolio assistant works.", keywords: ["assistant", "grounding"] },
        citations: claims.map((claim, index) => ({ claimId: claim.id, location: { scope: "block", blockIndex: index + 1, field: "text" } })),
      });
    }
    case "blog-seo-live-v1":
      return interaction(model, {
        schemaVersion: 1,
        searchIntent: "Understand grounded assistants",
        score: 70,
        suggestedTitle: "How a grounded portfolio assistant works",
        suggestedDescription: "A grounded assistant, explained by its builder.",
        findings: [],
      });
    case "blog-reviewer-live-v1": {
      const draft = payload.draft as { citations: { id: string }[] };
      return interaction(model, {
        schemaVersion: 1,
        recommendation: "approve",
        claimReviews: draft.citations.map((citation) => ({ citationId: citation.id, assessment: "supported", note: "Exact." })),
        unmappedFactualClaims: [],
        issues: [],
        requiredCorrections: [],
        scores: { groundedness: 90, citationQuality: 90, writingAndVoice: 80, securityAndRobustness: 90 },
      });
    }
    case "blog-critique-live-v1": {
      const record = payload.runRecord as { participants: string[] };
      return interaction(model, {
        schemaVersion: 1,
        lessons: record.participants.map((agent) => ({ agent, lesson: `Keep ${agent} precise next time.`, evidence: "All calls accepted." })),
      });
    }
    default:
      throw new Error(`unexpected ${version}`);
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "blog-cli-test-"));
  repo = join(root, "repo");
  data = join(root, "data");
  for (const entry of LIVE_SOURCE_ALLOWLIST) {
    mkdirSync(dirname(join(repo, entry.path)), { recursive: true });
    cpSync(join(process.cwd(), entry.path), join(repo, entry.path));
  }
  mkdirSync(join(repo, "content", "blog", "posts"), { recursive: true });
  mkdirSync(join(repo, "src", "data"), { recursive: true });
  writeFileSync(join(repo, "src", "data", "blog-runs.json"), "[]\n");
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const output = respond(JSON.parse(init.body) as Record<string, unknown>);
    return { ok: true, status: 200, text: async () => JSON.stringify(output) };
  });
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

it("rehearses ideas, run and promote end to end without touching the real repository", async () => {
  const env = { BLOG_GEMINI_API_KEY: KEY, BLOG_AGENTS_DATA_DIR: data };
  expect(await main(["ideas"], env, repo)).toBe(0);
  const slateFile = readdirSync(join(data, "ideas")).find((name) => name.endsWith(".json")) as string;
  const page = readFileSync(join(data, "ideas", slateFile.replace(/\.json$/u, ".html")), "utf8");
  expect(page).toContain('<div class="gs-chip">portfolio chatbot citations</div>');
  expect(page).toContain("Building a portfolio assistant that cites its sources");

  expect(await main(["run", "--slate", slateFile.replace(/\.json$/u, ""), "--idea", "1"], env, repo)).toBe(0);
  const runFile = readdirSync(join(data, "runs")).find((name) => name.endsWith(".json")) as string;
  const runId = runFile.replace(/\.json$/u, "");
  expect(readFileSync(join(data, "runs", `${runId}.md`), "utf8")).toContain("Status: owner-review");

  expect(await main(["promote", "--run", runId, "--date", "2026-09-30"], env, repo)).toBe(0);
  const post = JSON.parse(readFileSync(join(repo, "content", "blog", "posts", "a-portfolio-assistant-that-cites.json"), "utf8"));
  expect(parseBlogPost(post).status).toBe("published");
  const runs = JSON.parse(readFileSync(join(repo, "src", "data", "blog-runs.json"), "utf8")) as { runId: string; postSlug: string }[];
  expect(runs).toHaveLength(1);
  expect(runs[0]).toMatchObject({ runId, postSlug: "a-portfolio-assistant-that-cites" });

  // A second promotion of the same run is refused rather than overwriting the post.
  expect(await main(["promote", "--run", runId, "--date", "2026-09-30"], env, repo)).toBe(1);
  expect(existsSync(join(data, "spend-ledger.json"))).toBe(true);
});

it("refuses a data directory inside the repository and a missing key before any call", async () => {
  await expect(main(["spend"], { BLOG_AGENTS_DATA_DIR: join(repo, "private") }, repo)).rejects.toThrow("outside the repository");
  await expect(main(["ideas"], { BLOG_AGENTS_DATA_DIR: data }, repo)).rejects.toThrow("BLOG_GEMINI_API_KEY");
  expect(existsSync(join(data, "spend-ledger.json"))).toBe(false);
});
