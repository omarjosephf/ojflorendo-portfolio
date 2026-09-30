import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { BlogContentBlock } from "../types";
import { LIVE_PHASE_CEILING_MICRO_USD } from "./catalog";
import { PromotionRefused, promoteRun, summarizeRun } from "./publish";
import { SpendLedger } from "./spend-ledger";
import {
  type IdeaScoutRecord,
  type LiveRunBundle,
  briefFromIdea,
  runIdeaScout,
  runLiveBlogWorkflow,
} from "./workflow";

/**
 * Owner-run command line for Phase 18.4. Launched by scripts/blog-agents.mjs.
 *
 *   ideas                       Idea Scout suggests topics
 *   run --slate <id> --idea <n> run the drafting agents on the chosen idea
 *   show --run <id>             print a run's draft and review for reading
 *   promote --run <id> --date YYYY-MM-DD
 *                               write the approved post and its public summary
 *   spend                       show the spend ledger totals
 *
 * Private run records live in the data directory, outside the repository.
 * Only `promote` writes into the repository, after the owner's approval.
 */

const usd = (micro: number) => `US$${(micro / 1_000_000).toFixed(4)}`;

function option(args: readonly string[], name: string) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function requireId(value: string | undefined, label: string) {
  if (!value || !/^[a-z0-9-]{4,80}$/u.test(value)) throw new Error(`Give a valid --${label}.`);
  return value;
}

function paths(repoRoot: string, dataDir: string) {
  if (!isAbsolute(dataDir)) throw new Error("BLOG_AGENTS_DATA_DIR must be an absolute path.");
  const insideRepo = !relative(repoRoot, dataDir).startsWith("..") && !isAbsolute(relative(repoRoot, dataDir));
  if (insideRepo) throw new Error("The data directory must be outside the repository.");
  const ideas = join(dataDir, "ideas");
  const runs = join(dataDir, "runs");
  for (const dir of [dataDir, ideas, runs]) if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return { ideas, runs, ledger: join(dataDir, "spend-ledger.json") };
}

function blockText(block: BlogContentBlock) {
  switch (block.type) {
    case "heading":
      return `${block.level === 2 ? "##" : "###"} ${block.text}`;
    case "paragraph":
      return block.text;
    case "list":
      return block.items.map((item, index) => (block.style === "ordered" ? `${index + 1}. ${item}` : `- ${item}`)).join("\n");
    case "callout":
      return `> ${block.text}`;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

/**
 * The owner's local reading page for an idea slate. Model text is escaped;
 * Google's Search Suggestions are inserted exactly as Google supplied them,
 * as its grounding terms require.
 */
export function renderIdeasPage(record: IdeaScoutRecord) {
  const ideas = (record.slate?.ideas ?? [])
    .map(
      (idea, index) => `<section><h2>[${index + 1}] ${escapeHtml(idea.topic)}</h2><dl>
<dt>Audience</dt><dd>${escapeHtml(idea.audience)}</dd>
<dt>Key message</dt><dd>${escapeHtml(idea.keyMessage)}</dd>
<dt>Why it fits OJ</dt><dd>${escapeHtml(idea.fitReason)}</dd>
<dt>Angle</dt><dd>${escapeHtml(idea.angle)}</dd>
<dt>Why now</dt><dd>${escapeHtml(idea.whyNow)}</dd>
<dt>Sources</dt><dd>${idea.sourceIds.map(escapeHtml).join(", ")}</dd></dl></section>`,
    )
    .join("\n");
  const citations = record.webCitations
    .slice(0, 15)
    .map((citation) => `<li>${escapeHtml(citation.title || citation.url)}: ${escapeHtml(citation.url)}</li>`)
    .join("");
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Blog ideas ${escapeHtml(record.runId)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1d1d1f;background:#fff}section{border-top:1px solid #ddd;padding:.5rem 0}dt{font-weight:600}dd{margin:0 0 .5rem}</style></head><body>
<h1>Idea Scout: ${escapeHtml(record.runId)}</h1>
<p>Status: ${escapeHtml(record.status)}. ${escapeHtml(record.slate?.evidenceNote ?? record.failure?.message ?? "")}</p>
${ideas}
<h2>Google Search suggestions</h2>
${record.searchSuggestions.join("\n")}
${citations ? `<h2>Web pages the search used</h2><ul>${citations}</ul>` : ""}
</body></html>
`;
}

/** Adds or replaces one run in the committed panel data, newest first. */
function recordRunSummary(repoRoot: string, bundle: LiveRunBundle, postSlug: string | null) {
  const file = join(repoRoot, "src", "data", "blog-runs.json");
  const existing = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ReturnType<typeof summarizeRun>[]) : [];
  const next = [summarizeRun(bundle, postSlug), ...existing.filter((run) => run.runId !== bundle.runId)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  writeFileSync(file, `${JSON.stringify(next, null, 2)}
`);
}

/** A plain-text reading copy of a run for the owner. */
export function renderRunForOwner(bundle: LiveRunBundle) {
  const lines: string[] = [];
  lines.push(`# Run ${bundle.runId}`, "");
  lines.push(`Status: ${bundle.status}`);
  if (bundle.holdReasons.length) lines.push(`Held because: ${bundle.holdReasons.join(" ")}`);
  lines.push(`Editorial score: ${bundle.editorialScore ?? "none"} (passes only above 75)`);
  lines.push(`Cost: ${usd(bundle.totalCostMicroUsd)} across ${bundle.calls.length} calls`, "");
  const review = bundle.reviews.at(-1);
  if (review) {
    lines.push("## Hard gates");
    for (const gate of review.hardGates) lines.push(`- ${gate.passed ? "PASS" : "FAIL"} ${gate.id}`);
    lines.push("", `Scores: ${JSON.stringify(review.scores)}`, `Reviewer decisions: ${bundle.reviews.map((r) => r.decision).join(" → ")}`);
    if (review.issues.length) {
      lines.push("", "## Reviewer issues");
      for (const issue of review.issues) lines.push(`- [${issue.severity}] ${issue.category}: ${issue.message}`);
    }
    lines.push("");
  }
  const draft = bundle.drafts.at(-1);
  if (draft) {
    lines.push("## Draft", "", `Title: ${draft.post.title}`, `Slug: ${draft.post.slug}`, `Excerpt: ${draft.post.excerpt}`, "");
    for (const block of draft.post.blocks) lines.push(blockText(block), "");
    lines.push("## Sources");
    for (const source of draft.post.sources) lines.push(`- ${source.title}: ${source.url}`);
    lines.push("");
  }
  if (bundle.seoReview) {
    lines.push(`## SEO advice (score ${bundle.seoReview.score})`);
    for (const finding of bundle.seoReview.findings) lines.push(`- [${finding.severity}] ${finding.area}: ${finding.advice}`);
    lines.push("");
  }
  if (bundle.critique) {
    lines.push("## Critique lessons");
    for (const lesson of bundle.critique) lines.push(`- ${lesson.agent}: ${lesson.lesson}`);
  } else if (bundle.critiqueSkippedReason) {
    lines.push(`Critique: ${bundle.critiqueSkippedReason}`);
  }
  if (bundle.failure) lines.push("", `Failure: ${bundle.failure.stage} ${bundle.failure.code}: ${bundle.failure.message}`);
  return `${lines.join("\n")}\n`;
}

export async function main(args: readonly string[], env: Readonly<Record<string, string | undefined>>, repoRootInput: string) {
  const repoRoot = resolve(repoRootInput);
  const command = args[0];
  const dataDir = env.BLOG_AGENTS_DATA_DIR ?? "";
  const dirs = paths(repoRoot, dataDir);
  const ledger = new SpendLedger(dirs.ledger);
  const apiKey = env.BLOG_GEMINI_API_KEY ?? "";
  if ((command === "ideas" || command === "run") && !/^[A-Za-z0-9._-]{20,200}$/u.test(apiKey)) {
    // Checked before any reservation, so a missing key never consumes ledger room.
    throw new Error("BLOG_GEMINI_API_KEY is missing or malformed; pass the key file with --env-file.");
  }
  const deps = { repoRoot, apiKey, ledger };
  const out = (...lines: string[]) => process.stdout.write(`${(lines.length ? lines : [""]).join("\n")}\n`);

  if (command === "spend") {
    out(`Phase 18.4 spend so far: ${usd(ledger.totalMicroUsd())} of ${usd(LIVE_PHASE_CEILING_MICRO_USD)}`);
    return 0;
  }

  if (command === "ideas") {
    const postsDir = join(repoRoot, "content", "blog", "posts");
    const previousPosts = existsSync(postsDir)
      ? readdirSync(postsDir)
          .filter((name) => name.endsWith(".json"))
          .map((name) => (JSON.parse(readFileSync(join(postsDir, name), "utf8")) as { title: string }).title)
      : [];
    const record = await runIdeaScout(deps, { previousPosts });
    writeFileSync(join(dirs.ideas, `${record.runId}.json`), `${JSON.stringify(record, null, 2)}\n`);
    // Google's grounding terms require the Search Suggestions to be shown with
    // grounded results; this local page is how the owner reads the ideas.
    const htmlPath = join(dirs.ideas, `${record.runId}.html`);
    writeFileSync(htmlPath, renderIdeasPage(record));
    out(`Idea slate ${record.runId}: ${record.status}, cost ${usd(record.totalCostMicroUsd)}`);
    if (record.failure) out(`Failure: ${record.failure.code}: ${record.failure.message}`);
    record.slate?.ideas.forEach((idea, index) => {
      out("");
      out(`[${index + 1}] ${idea.topic}`);
      out(`    Audience: ${idea.audience}`);
      out(`    Key message: ${idea.keyMessage}`);
      out(`    Why OJ: ${idea.fitReason}`);
      out(`    Angle: ${idea.angle}`);
      out(`    Why now: ${idea.whyNow}`);
      out(`    Sources: ${idea.sourceIds.join(", ")}`);
    });
    if (record.slate) out("", `Evidence note: ${record.slate.evidenceNote}`);
    if (record.webCitations.length) {
      out("", "Web pages the search used:");
      for (const citation of record.webCitations.slice(0, 15)) out(`- ${citation.title} ${citation.url}`);
    }
    out("", `Read the ideas with Google's search suggestions: ${htmlPath}`);
    out("", `Spend so far: ${usd(ledger.totalMicroUsd())} of ${usd(LIVE_PHASE_CEILING_MICRO_USD)}`);
    return record.status === "ideas" ? 0 : 1;
  }

  if (command === "run") {
    const slateId = requireId(option(args, "slate"), "slate");
    const ideaNumber = Number(option(args, "idea"));
    const slate = JSON.parse(readFileSync(join(dirs.ideas, `${slateId}.json`), "utf8")) as IdeaScoutRecord;
    const idea = slate.slate?.ideas[ideaNumber - 1];
    if (!idea) throw new Error("That idea number is not in the slate.");
    const bundle = await runLiveBlogWorkflow(deps, briefFromIdea(idea));
    const recordPath = join(dirs.runs, `${bundle.runId}.json`);
    writeFileSync(recordPath, `${JSON.stringify(bundle, null, 2)}\n`);
    writeFileSync(join(dirs.runs, `${bundle.runId}.md`), renderRunForOwner(bundle));
    out(`Run ${bundle.runId}: ${bundle.status}`);
    if (bundle.holdReasons.length) out(`Held because: ${bundle.holdReasons.join(" ")}`);
    out(`Editorial score: ${bundle.editorialScore ?? "none"}; cost ${usd(bundle.totalCostMicroUsd)}`);
    for (const call of bundle.calls) {
      out(`- ${call.stage} (${call.model}): ${call.outcome}${call.failureCode ? ` ${call.failureCode}` : ""}, ${call.actualMicroUsd === null ? "cost unknown, reservation kept" : usd(call.actualMicroUsd)}`);
      if (call.failureDetail) out(`    ${call.failureDetail}`);
    }
    out(`Reading copy: ${join(dirs.runs, `${bundle.runId}.md`)}`);
    out(`Spend so far: ${usd(ledger.totalMicroUsd())} of ${usd(LIVE_PHASE_CEILING_MICRO_USD)}`);
    return bundle.status === "failed" ? 1 : 0;
  }

  if (command === "show") {
    const runId = requireId(option(args, "run"), "run");
    const bundle = JSON.parse(readFileSync(join(dirs.runs, `${runId}.json`), "utf8")) as LiveRunBundle;
    out(renderRunForOwner(bundle));
    return 0;
  }

  if (command === "promote") {
    const runId = requireId(option(args, "run"), "run");
    const date = option(args, "date") ?? "";
    const bundle = JSON.parse(readFileSync(join(dirs.runs, `${runId}.json`), "utf8")) as LiveRunBundle;
    try {
      const post = promoteRun(bundle, date);
      const postPath = join(repoRoot, "content", "blog", "posts", `${post.slug}.json`);
      if (existsSync(postPath)) throw new PromotionRefused(`A post with slug ${post.slug} already exists.`);
      writeFileSync(postPath, `${JSON.stringify(post, null, 2)}\n`);
      recordRunSummary(repoRoot, bundle, post.slug);
      out(`Wrote ${relative(repoRoot, postPath)} and its run summary. Nothing was committed.`);
      return 0;
    } catch (error) {
      out(`Refused: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }

  if (command === "summarize") {
    // Records a held or failed run for the Blog panel without publishing anything.
    const runId = requireId(option(args, "run"), "run");
    const bundle = JSON.parse(readFileSync(join(dirs.runs, `${runId}.json`), "utf8")) as LiveRunBundle;
    recordRunSummary(repoRoot, bundle, null);
    out(`Wrote the run summary for ${bundle.runId}. Nothing was committed.`);
    return 0;
  }

  out("Commands: ideas | run --slate <id> --idea <n> | show --run <id> | promote --run <id> --date YYYY-MM-DD | summarize --run <id> | spend");
  return 2;
}
