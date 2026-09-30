import { RunCostBudget } from "./budget";
import { BlogPipelineValidationError, BlogWorkflowFault } from "./errors";
import { SavedFixtureModelClient } from "./fixture-client";
import {
  RESEARCHER_SYSTEM_INSTRUCTION,
  REVIEWER_RUBRIC,
  REVIEWER_SYSTEM_INSTRUCTION,
  WRITER_SYSTEM_INSTRUCTION,
  researcherPayload,
  reviewerPayload,
  revisionPayload,
  writerPayload,
} from "./prompts";
import {
  parseBlogWorkflowInput,
  parseEvidenceLedger,
  parseModelCallMetadata,
  parseModelCallReportedCost,
  parseModelCallResponse,
  parseReviewerOutput,
  parseWriterOutput,
} from "./schema";
import { deepFreeze, sha256, utf8Bytes } from "./security";
import { canonicalSha256, withIntegrity } from "./serialization";
import {
  BLOG_PIPELINE_MAX_CALLS,
  BLOG_PIPELINE_PHASE,
  BLOG_PIPELINE_SCHEMA_VERSION,
  type BlogAgentRole,
  type BlogModelStage,
  type BlogWorkflowBundle,
  type BlogWorkflowInput,
  type EvidenceLedger,
  type EvidenceSourceRecord,
  type ModelCallRecord,
  type ModelCallRequest,
  type ReviewHardGate,
  type ReviewHardGateId,
  type ReviewReport,
  type ReviewerOutput,
  type WriterOutput,
} from "./types";

export interface BlogWorkflowFixtures {
  researcher: unknown;
  writer: unknown;
  reviewer: unknown;
}

type OutputSchema = ModelCallRequest["outputSchema"];

const PUBLICATION_BLOCK =
  "Phase 18.2 creates draft and review evidence only. Publication requires a later owner-reviewed phase and explicit approval.";

function sourceRecords(input: BlogWorkflowInput): EvidenceSourceRecord[] {
  return input.sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    ...(source.publisher === undefined ? {} : { publisher: source.publisher }),
    accessedAt: source.accessedAt,
    approvedForModelUse: true,
    privacyReviewed: true,
    approvedEvidenceSpans: source.approvedEvidenceSpans.map((span) => ({ ...span })),
    contentSha256: sha256(source.content),
    contentBytes: utf8Bytes(source.content),
  }));
}

function runRecord(input: BlogWorkflowInput): Omit<BlogWorkflowInput, "sources"> {
  return {
    schemaVersion: input.schemaVersion,
    runId: input.runId,
    requestedAt: input.requestedAt,
    topic: input.topic,
    audience: input.audience,
    allowedDomains: input.allowedDomains,
    runCostCeilingMicroUsd: input.runCostCeilingMicroUsd,
    dryRun: true,
  };
}

function hardGate(
  id: ReviewHardGateId,
  passed: boolean,
  passDetail: string,
  failDetail: string,
): ReviewHardGate {
  return { id, passed, detail: passed ? passDetail : failDetail };
}

const HARD_ISSUE_CATEGORIES = new Set([
  "evidence",
  "citation",
  "contradiction",
  "prompt-injection",
  "privacy",
  "unsafe-content",
]);

function buildReviewReport(
  output: ReviewerOutput,
  draftRevision: 1 | 2,
  budget: RunCostBudget,
  finalReview: boolean,
): ReviewReport {
  const categories = new Set(output.issues.map((issue) => issue.category));
  const claimCoverage = output.unmappedFactualClaims.length === 0;
  const claimSupport = output.claimReviews.every((review) => review.assessment === "supported");
  const citationIntegrity = !categories.has("citation") && !categories.has("evidence");
  const contradictionHandling = !categories.has("contradiction");
  const injectionSafe = !categories.has("prompt-injection");
  const privacySafe = !categories.has("privacy");
  const contentSafe = !categories.has("unsafe-content");
  const hardGates = [
    hardGate(
      "claim-coverage",
      claimCoverage,
      "The reviewer found no factual statement outside the citation map.",
      "The reviewer found at least one factual statement outside the citation map.",
    ),
    hardGate(
      "claim-support",
      claimSupport,
      "Every cited claim was independently marked supported.",
      "At least one cited claim was unsupported, contradicted or unverifiable.",
    ),
    hardGate(
      "citation-integrity",
      citationIntegrity,
      "No evidence or citation integrity issue was reported.",
      "The reviewer reported an evidence or citation integrity issue.",
    ),
    hardGate(
      "contradiction-handling",
      contradictionHandling,
      "No unresolved contradiction was reported.",
      "Contradictory evidence was presented or resolved unsafely.",
    ),
    hardGate(
      "prompt-injection",
      injectionSafe,
      "No source-instruction obedience was reported.",
      "The draft may have followed or repeated an untrusted source instruction.",
    ),
    hardGate(
      "privacy",
      privacySafe,
      "No privacy or sensitive-data issue was reported.",
      "The reviewer reported a privacy or sensitive-data issue.",
    ),
    hardGate(
      "safe-content",
      contentSafe,
      "The draft remains inert, plain-text content.",
      "The reviewer reported executable or otherwise unsafe content.",
    ),
  ];
  const hardGatePassed = hardGates.every((gate) => gate.passed);
  const decision = !hardGatePassed
    ? "reject"
    : output.recommendation === "revise" && finalReview
      ? "reject"
      : output.recommendation;

  return {
    schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
    draftRevision,
    recommendation: output.recommendation,
    decision,
    hardGates,
    claimReviews: output.claimReviews,
    unmappedFactualClaims: output.unmappedFactualClaims,
    issues: output.issues,
    requiredCorrections: output.requiredCorrections,
    scores: output.scores,
    reportedFixtureCostMicroUsd: budget.snapshot().reportedActualMicroUsd,
    publicationRecommendation: decision === "approve" ? "owner-review-required" : "do-not-publish",
  };
}

function configuredClients(fixtures: BlogWorkflowFixtures) {
  // Only plain fixture data crosses the public Phase 18.2 boundary. Executable
  // adapter objects are never accepted from callers.
  const ordered = [
    new SavedFixtureModelClient(fixtures.researcher),
    new SavedFixtureModelClient(fixtures.writer),
    new SavedFixtureModelClient(fixtures.reviewer),
  ];
  const expected: readonly BlogAgentRole[] = ["planner-researcher", "writer", "reviewer-verifier"];
  ordered.forEach((client, index) => {
    if (client.role !== expected[index]) {
      throw new BlogWorkflowFault(
        "role-client-mismatch",
        "configuration",
        "Each workflow role must use its explicitly assigned fixture context.",
      );
    }
  });
  if (new Set(ordered.map((client) => client.contextId)).size !== ordered.length) {
    throw new BlogWorkflowFault(
      "shared-agent-context",
      "configuration",
      "Researcher, Writer and Reviewer must use independent model contexts.",
    );
  }
  return ordered as [SavedFixtureModelClient, SavedFixtureModelClient, SavedFixtureModelClient];
}

function allFixturesConsumed(clients: readonly SavedFixtureModelClient[]) {
  if (clients.some((client) => client.remainingCalls !== 0)) {
    throw new BlogWorkflowFault(
      "unused-saved-fixture",
      "configuration",
      "The saved fixture contains calls outside the workflow's terminal path.",
    );
  }
}

export async function runOfflineBlogWorkflow(
  rawInput: unknown,
  rawFixtures: BlogWorkflowFixtures,
): Promise<Readonly<BlogWorkflowBundle>> {
  const input = parseBlogWorkflowInput(rawInput);
  const clients = configuredClients(rawFixtures);
  const [researcher, writer, reviewer] = clients;
  const budget = new RunCostBudget(input.runCostCeilingMicroUsd);
  const calls: ModelCallRecord[] = [];
  const drafts: WriterOutput[] = [];
  const reviews: ReviewReport[] = [];
  const sources = sourceRecords(input);
  const run = runRecord(input);
  let evidenceLedger: EvidenceLedger | undefined;
  let currentStage: BlogModelStage | "configuration" = "configuration";

  const digests: BlogWorkflowBundle["provenance"]["contractDigests"] = {
    inputManifestSha256: canonicalSha256({ run, sources }),
    researcherPromptSha256: sha256(RESEARCHER_SYSTEM_INSTRUCTION),
    writerPromptSha256: sha256(WRITER_SYSTEM_INSTRUCTION),
    reviewerPromptSha256: sha256(REVIEWER_SYSTEM_INSTRUCTION),
    reviewerRubricSha256: sha256(REVIEWER_RUBRIC),
    draftSha256: [],
    reviewSha256: [],
  };

  const bundle = (
    status: BlogWorkflowBundle["status"],
    failure?: BlogWorkflowBundle["failure"],
  ) => {
    const unsigned: Omit<BlogWorkflowBundle, "integrity"> = {
      kind: "blog-draft-review-bundle",
      schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
      phase: BLOG_PIPELINE_PHASE,
      executionMode: "saved-fixture",
      run,
      status,
      ...(evidenceLedger === undefined ? {} : { evidenceLedger }),
      drafts,
      reviews,
      provenance: {
        sources,
        clients: clients.map((client) => ({
          role: client.role,
          adapter: client.adapter,
          contextId: client.contextId,
        })),
        calls,
        budget: budget.snapshot(),
        costBasis: {
          kind: "saved-fixture-synthetic",
          providerSpendMicroUsd: 0,
        },
        contractDigests: digests,
      },
      publication: { permitted: false, reason: PUBLICATION_BLOCK },
      ...(failure === undefined ? {} : { failure }),
    };
    return withIntegrity(unsigned) as Readonly<BlogWorkflowBundle>;
  };

  const invoke = async <T>(
    client: SavedFixtureModelClient,
    stage: BlogModelStage,
    outputSchema: OutputSchema,
    systemInstruction: string,
    payload: unknown,
    parseOutput: (value: unknown) => T,
  ) => {
    currentStage = stage;
    if (calls.length >= BLOG_PIPELINE_MAX_CALLS) {
      throw new BlogWorkflowFault(
        "model-call-limit",
        stage,
        `The workflow cannot exceed ${BLOG_PIPELINE_MAX_CALLS} model calls.`,
      );
    }
    const callId = `${input.runId}-call-${calls.length + 1}`;
    const request = deepFreeze<ModelCallRequest>({
      callId,
      phase: BLOG_PIPELINE_PHASE,
      role: client.role,
      stage,
      outputSchema,
      systemInstruction,
      tools: [],
      payload: structuredClone(payload),
    });

    let reservationMicroUsd: number;
    try {
      reservationMicroUsd = client.quote(request).reservationMicroUsd;
    } catch {
      throw new BlogWorkflowFault(
        "adapter-quote-failed",
        stage,
        "The saved-fixture adapter could not quote the next call.",
      );
    }
    budget.reserve(callId, stage, reservationMicroUsd);

    const record: ModelCallRecord = {
      callId,
      role: client.role,
      stage,
      adapter: client.adapter,
      contextId: client.contextId,
      outputSchema,
      toolsProvided: 0,
      requestSha256: canonicalSha256(request),
      systemInstructionSha256: sha256(systemInstruction),
      reservationMicroUsd,
      actualCostMicroUsd: null,
      responseMetadataStatus: "unavailable",
      outcome: "adapter-failure",
    };
    // A model-call slot is consumed immediately before dispatch. Thrown or lost
    // responses never cause a retry and never reopen the slot.
    calls.push(record);

    let rawResponse: unknown;
    try {
      rawResponse = await client.generate(request);
    } catch {
      budget.forfeit(callId);
      record.failureCode = "adapter-call-failed";
      throw new BlogWorkflowFault(
        "adapter-call-failed",
        stage,
        "The saved-fixture model call failed; no retry was attempted.",
      );
    }

    let reportedCost: number | undefined;
    try {
      reportedCost = parseModelCallReportedCost(rawResponse);
      record.actualCostMicroUsd = reportedCost;
      record.responseMetadataStatus = "cost-only";
    } catch {
      // Unknown or invalid cost metadata consumes the full reservation below.
    }

    let responseMetadata: ReturnType<typeof parseModelCallMetadata> | undefined;
    try {
      responseMetadata = parseModelCallMetadata(rawResponse);
      record.identity = responseMetadata.identity;
      record.usage = responseMetadata.usage;
      record.responseMetadataStatus = "complete";
    } catch {
      // Invalid metadata is never copied into provenance. The reservation still
      // closes one-way below, so missing metadata cannot restore call authority.
    }

    const rejectInvalidResponse = (code: string, message: string): never => {
      record.outcome = "invalid-response";
      record.failureCode = code;
      if (reportedCost !== undefined) {
        if (reportedCost > reservationMicroUsd) {
          try {
            budget.settle(callId, reportedCost);
          } catch (error) {
            record.failureCode =
              error instanceof BlogWorkflowFault ? error.code : "cost-settlement-failed";
            if (error instanceof BlogWorkflowFault) throw error;
            throw new BlogWorkflowFault(
              "cost-settlement-failed",
              stage,
              "The saved response cost could not be settled safely.",
            );
          }
          throw new BlogWorkflowFault(
            "cost-settlement-failed",
            stage,
            "The saved response exceeded its reservation without a terminal settlement failure.",
          );
        }
        budget.forfeit(callId, reportedCost);
      } else {
        budget.forfeit(callId);
      }
      throw new BlogWorkflowFault(code, stage, message);
    };

    try {
      const encoded = JSON.stringify(rawResponse);
      if (utf8Bytes(encoded) > 1_000_000) {
        throw new Error("oversized response");
      }
    } catch {
      rejectInvalidResponse(
        "invalid-model-response",
        "The model response was not bounded JSON data.",
      );
    }
    const response = (() => {
      try {
        return parseModelCallResponse(rawResponse);
      } catch {
        return rejectInvalidResponse(
          "invalid-model-response",
          "The model response metadata or finish state was invalid.",
        );
      }
    })();

    record.identity = response.identity;
    record.usage = response.usage;
    record.actualCostMicroUsd = response.usage.costMicroUsd;
    record.responseMetadataStatus = "complete";

    if (response.usage.costMicroUsd > reservationMicroUsd) {
      try {
        budget.settle(callId, response.usage.costMicroUsd);
      } catch (error) {
        record.outcome = "invalid-response";
        record.failureCode =
          error instanceof BlogWorkflowFault ? error.code : "cost-settlement-failed";
        throw error;
      }
    }

    if (response.finishReason !== "stop") {
      budget.forfeit(callId, response.usage.costMicroUsd);
      record.outcome = "invalid-response";
      record.failureCode = "incomplete-model-response";
      throw new BlogWorkflowFault(
        "incomplete-model-response",
        stage,
        "The saved response did not finish normally; its reported cost was retained and no output was accepted.",
      );
    }

    let output: T;
    try {
      output = parseOutput(response.output);
    } catch (error) {
      budget.forfeit(callId, response.usage.costMicroUsd);
      record.outcome = "invalid-response";
      record.failureCode =
        error instanceof BlogPipelineValidationError ? "schema-invalid-output" : "invalid-stage-output";
      throw new BlogWorkflowFault(
        record.failureCode,
        stage,
        "The model output failed its role-specific runtime contract.",
      );
    }

    try {
      budget.settle(callId, response.usage.costMicroUsd);
    } catch (error) {
      record.outcome = "invalid-response";
      record.failureCode = error instanceof BlogWorkflowFault ? error.code : "cost-settlement-failed";
      throw error;
    }
    record.outcome = "accepted";
    return output;
  };

  try {
    evidenceLedger = await invoke(
      researcher,
      "research",
      "ResearcherOutput.v1",
      RESEARCHER_SYSTEM_INSTRUCTION,
      researcherPayload(input),
      (output) => parseEvidenceLedger(output, input),
    );
    digests.evidenceSha256 = canonicalSha256(evidenceLedger);

    const firstDraft = await invoke(
      writer,
      "draft",
      "WriterOutput.v1",
      WRITER_SYSTEM_INSTRUCTION,
      writerPayload(evidenceLedger),
      (output) => parseWriterOutput(output, evidenceLedger as EvidenceLedger),
    );
    drafts.push(firstDraft);
    digests.draftSha256.push(canonicalSha256(firstDraft));

    const firstReviewOutput = await invoke(
      reviewer,
      "review",
      "ReviewerOutput.v1",
      REVIEWER_SYSTEM_INSTRUCTION,
      reviewerPayload(evidenceLedger, firstDraft, 1),
      (output) => parseReviewerOutput(output, firstDraft),
    );
    const firstReview = buildReviewReport(firstReviewOutput, 1, budget, false);
    reviews.push(firstReview);
    digests.reviewSha256.push(canonicalSha256(firstReview));

    if (firstReview.decision === "approve") {
      allFixturesConsumed(clients);
      return bundle("owner-review-required");
    }
    if (firstReview.decision === "reject") {
      allFixturesConsumed(clients);
      return bundle("rejected");
    }

    const revisedDraft = await invoke(
      writer,
      "revision",
      "WriterOutput.v1",
      WRITER_SYSTEM_INSTRUCTION,
      revisionPayload(evidenceLedger, firstDraft, firstReview),
      (output) => parseWriterOutput(output, evidenceLedger as EvidenceLedger),
    );
    drafts.push(revisedDraft);
    digests.draftSha256.push(canonicalSha256(revisedDraft));

    const finalReviewOutput = await invoke(
      reviewer,
      "final-review",
      "ReviewerOutput.v1",
      REVIEWER_SYSTEM_INSTRUCTION,
      reviewerPayload(evidenceLedger, revisedDraft, 2),
      (output) => parseReviewerOutput(output, revisedDraft),
    );
    const finalReview = buildReviewReport(finalReviewOutput, 2, budget, true);
    reviews.push(finalReview);
    digests.reviewSha256.push(canonicalSha256(finalReview));
    allFixturesConsumed(clients);
    return bundle(finalReview.decision === "approve" ? "owner-review-required" : "rejected");
  } catch (error) {
    const failure =
      error instanceof BlogWorkflowFault
        ? { code: error.code, stage: error.stage, message: error.message }
        : {
            code: "workflow-failed",
            stage: currentStage,
            message: "The offline workflow failed closed without preserving raw model output.",
          };
    return bundle("failed", failure);
  }
}

export function reviewIssueIsHardGate(category: string) {
  return HARD_ISSUE_CATEGORIES.has(category);
}
