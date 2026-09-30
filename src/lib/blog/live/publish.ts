import { parseBlogPost } from "../schema";
import { verifyIntegrity } from "../pipeline/serialization";
import type { BlogPost } from "../types";
import type { LiveRunBundle } from "./workflow";

/**
 * Turns an owner-approved run into a published post and a public run summary.
 * The owner's approval happens outside this code, before it is called; the
 * function only refuses runs that did not pass every gate.
 */

export const PUBLISHED_DISCLOSURE =
  "AI assisted with research and drafting. OJ Florendo checked every claim against its source, approved this article and is responsible for it.";

export class PromotionRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromotionRefused";
  }
}

export function promoteRun(bundle: LiveRunBundle, publishedOn: string): BlogPost {
  if (!bundle.integrity || !verifyIntegrity(bundle as LiveRunBundle & { integrity: { algorithm: "sha256"; sha256: string } })) {
    throw new PromotionRefused("The run record's integrity digest does not match; it may have been edited.");
  }
  if (bundle.status !== "owner-review") {
    throw new PromotionRefused(`Only a run that passed every gate can be published; this one is ${bundle.status}.`);
  }
  const draft = bundle.drafts.at(-1);
  const review = bundle.reviews.at(-1);
  if (!draft || !review || review.decision !== "approve" || review.draftRevision !== bundle.drafts.length) {
    throw new PromotionRefused("The final draft has no matching approving review.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(publishedOn)) {
    throw new PromotionRefused("The publication date must be YYYY-MM-DD.");
  }
  return parseBlogPost(
    {
      ...draft.post,
      status: "published",
      publishedAt: publishedOn,
      updatedAt: null,
      disclosure: PUBLISHED_DISCLOSURE,
    },
    "promoted post",
  );
}

export interface PublicRunSummary {
  kind: "blog-run-summary";
  runId: string;
  createdAt: string;
  /** The final draft title. The Idea Scout brief is a grounded result and stays in the private record. */
  title: string | null;
  status: LiveRunBundle["status"];
  holdReasons: string[];
  postSlug: string | null;
  editorialScore: number | null;
  hardGates: { id: string; passed: boolean }[];
  scores: LiveRunBundle["reviews"][number]["scores"] | null;
  reviewDecisions: string[];
  seo: { score: number; findings: { area: string; severity: string; advice: string }[] } | null;
  critique: { agent: string; participated: boolean; lesson: string }[] | null;
  calls: {
    role: string;
    stage: string;
    model: string;
    thinkingLevel: string;
    outcome: string;
    inputTokens: number | null;
    outputTokens: number | null;
    thoughtTokens: number | null;
    costMicroUsd: number | null;
    latencyMs: number | null;
  }[];
  totalCostMicroUsd: number;
  recordSha256: string | null;
}

/** A summary safe to commit: no source text, prompts or model reasoning. */
export function summarizeRun(bundle: LiveRunBundle, postSlug: string | null): PublicRunSummary {
  const review = bundle.reviews.at(-1);
  return {
    kind: "blog-run-summary",
    runId: bundle.runId,
    createdAt: bundle.createdAt,
    title: bundle.drafts.at(-1)?.post.title ?? null,
    status: bundle.status,
    holdReasons: bundle.holdReasons,
    postSlug,
    editorialScore: bundle.editorialScore,
    hardGates: review ? review.hardGates.map((gate) => ({ id: gate.id, passed: gate.passed })) : [],
    scores: review ? review.scores : null,
    reviewDecisions: bundle.reviews.map((item) => item.decision),
    seo: bundle.seoReview
      ? {
          score: bundle.seoReview.score,
          findings: bundle.seoReview.findings.map((finding) => ({
            area: finding.area,
            severity: finding.severity,
            advice: finding.advice,
          })),
        }
      : null,
    critique: bundle.critique
      ? bundle.critique.map((lesson) => ({ agent: lesson.agent, participated: lesson.participated, lesson: lesson.lesson }))
      : null,
    calls: bundle.calls.map((call) => ({
      role: call.role,
      stage: call.stage,
      model: call.model,
      thinkingLevel: call.thinkingLevel,
      outcome: call.outcome,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      thoughtTokens: call.thoughtTokens,
      costMicroUsd: call.actualMicroUsd,
      latencyMs: call.latencyMs,
    })),
    totalCostMicroUsd: bundle.totalCostMicroUsd,
    recordSha256: bundle.integrity?.sha256 ?? null,
  };
}
