import type { BlogPost } from "../types";

export const BLOG_PIPELINE_SCHEMA_VERSION = 1 as const;
export const BLOG_PIPELINE_PHASE = "18.2" as const;
export const BLOG_PIPELINE_MAX_CALLS = 5 as const;
export const BLOG_PIPELINE_DRAFT_DISCLOSURE =
  "AI assisted with research and drafting. OJ Florendo's evidence review is required before publication, and he remains responsible for any published article." as const;

export type BlogAgentRole = "planner-researcher" | "writer" | "reviewer-verifier";
export type BlogModelStage = "research" | "draft" | "review" | "revision" | "final-review";

export interface ApprovedEvidenceSpan {
  startByte: number;
  endByte: number;
  sha256: string;
}

export interface OfflineSourceDocument {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  accessedAt: string;
  /** Owner attestation that this saved source is public and approved for model input. */
  approvedForModelUse: true;
  /** Owner attestation that the source was checked for non-public personal data. */
  privacyReviewed: true;
  /** Exact owner-approved source spans that may be promoted into Writer evidence. */
  approvedEvidenceSpans: ApprovedEvidenceSpan[];
  content: string;
}

export interface BlogWorkflowInput {
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  runId: string;
  requestedAt: string;
  topic: string;
  audience: string;
  allowedDomains: string[];
  runCostCeilingMicroUsd: number;
  dryRun: true;
  sources: OfflineSourceDocument[];
}

export type SourceSecurityFindingKind =
  | "instruction-override"
  | "prompt-extraction"
  | "role-spoofing"
  | "credential-exfiltration";

export interface SourceSecurityFinding {
  sourceId: string;
  kind: SourceSecurityFindingKind;
  startByte: number;
  endByte: number;
  sha256: string;
}

export interface EvidenceSourceRecord {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  accessedAt: string;
  approvedForModelUse: true;
  privacyReviewed: true;
  approvedEvidenceSpans: ApprovedEvidenceSpan[];
  contentSha256: string;
  contentBytes: number;
}

export type EvidenceExcerptClassification = "evidence" | "untrusted-instruction";

export interface EvidenceExcerpt {
  id: string;
  sourceId: string;
  locator: string;
  startByte: number;
  endByte: number;
  text: string;
  classification: EvidenceExcerptClassification;
}

export type EvidenceAssessment = "supported" | "contradicted" | "insufficient";

export interface EvidenceClaim {
  id: string;
  text: string;
  assessment: EvidenceAssessment;
  evidenceIds: string[];
}

export interface EvidenceOutlineSection {
  id: string;
  heading: string;
  claimIds: string[];
}

export interface ResearcherOutput {
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  researchQuestion: string;
  excerpts: EvidenceExcerpt[];
  claims: EvidenceClaim[];
  outline: EvidenceOutlineSection[];
}

export interface EvidenceLedger {
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  researchQuestion: string;
  sources: EvidenceSourceRecord[];
  excerpts: EvidenceExcerpt[];
  claims: EvidenceClaim[];
  outline: EvidenceOutlineSection[];
  securityFindings: SourceSecurityFinding[];
}

export type DraftCitationLocation =
  | {
      scope: "post";
      field: "title" | "excerpt" | "disclosure" | "seo-title" | "seo-description";
    }
  | {
      scope: "post";
      field: "seo-keyword";
      itemIndex: number;
    }
  | {
      scope: "block";
      blockIndex: number;
      field: "text" | "title" | "item";
      itemIndex?: number;
    };

export interface DraftCitation {
  id: string;
  claimId: string;
  evidenceIds: string[];
  location: DraftCitationLocation;
  quotedText: string;
}

export interface WriterOutput {
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  post: BlogPost;
  citations: DraftCitation[];
}

export type ReviewRecommendation = "approve" | "revise" | "reject";
export type ClaimReviewAssessment = "supported" | "unsupported" | "contradicted" | "unverifiable";
export type ReviewIssueCategory =
  | "evidence"
  | "citation"
  | "contradiction"
  | "prompt-injection"
  | "privacy"
  | "unsafe-content"
  | "writing-quality"
  | "voice"
  | "seo";
export type ReviewIssueSeverity = "low" | "medium" | "high";

export interface ClaimReview {
  citationId: string;
  assessment: ClaimReviewAssessment;
  note: string;
}

export interface UnmappedFactualClaim {
  location: DraftCitationLocation;
  text: string;
  reason: string;
}

export interface ReviewIssue {
  code: string;
  category: ReviewIssueCategory;
  severity: ReviewIssueSeverity;
  message: string;
}

export interface ReviewScores {
  groundedness: number;
  citationQuality: number;
  writingAndVoice: number;
  securityAndRobustness: number;
}

export interface ReviewerOutput {
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  recommendation: ReviewRecommendation;
  claimReviews: ClaimReview[];
  unmappedFactualClaims: UnmappedFactualClaim[];
  issues: ReviewIssue[];
  requiredCorrections: string[];
  scores: ReviewScores;
}

export type ReviewHardGateId =
  | "claim-coverage"
  | "claim-support"
  | "citation-integrity"
  | "contradiction-handling"
  | "prompt-injection"
  | "privacy"
  | "safe-content";

export interface ReviewHardGate {
  id: ReviewHardGateId;
  passed: boolean;
  detail: string;
}

export interface ReviewReport {
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  draftRevision: 1 | 2;
  recommendation: ReviewRecommendation;
  decision: "approve" | "revise" | "reject";
  hardGates: ReviewHardGate[];
  claimReviews: ClaimReview[];
  unmappedFactualClaims: UnmappedFactualClaim[];
  issues: ReviewIssue[];
  requiredCorrections: string[];
  scores: ReviewScores;
  /** Synthetic adapter-reported cost in Phase 18.2; no provider spend occurs. */
  reportedFixtureCostMicroUsd: number;
  publicationRecommendation: "owner-review-required" | "do-not-publish";
}

export interface ModelIdentity {
  provider: string;
  model: string;
  version: string;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costMicroUsd: number;
}

export interface ModelCallRequest {
  callId: string;
  phase: typeof BLOG_PIPELINE_PHASE;
  role: BlogAgentRole;
  stage: BlogModelStage;
  outputSchema: "ResearcherOutput.v1" | "WriterOutput.v1" | "ReviewerOutput.v1";
  systemInstruction: string;
  tools: readonly [];
  payload: unknown;
}

export interface ModelCallQuote {
  reservationMicroUsd: number;
}

export interface ModelCallResponse {
  identity: ModelIdentity;
  usage: ModelUsage;
  finishReason: "stop" | "length" | "content-filter" | "refusal" | "error";
  output: unknown;
}

export interface ModelClient {
  readonly adapter: string;
  readonly contextId: string;
  readonly role: BlogAgentRole;
  quote(request: ModelCallRequest): ModelCallQuote;
  generate(request: ModelCallRequest): Promise<ModelCallResponse>;
}

export type ModelCallOutcome = "accepted" | "adapter-failure" | "invalid-response";
export type ResponseMetadataStatus = "unavailable" | "cost-only" | "complete";

export interface ModelCallRecord {
  callId: string;
  role: BlogAgentRole;
  stage: BlogModelStage;
  adapter: string;
  contextId: string;
  outputSchema: ModelCallRequest["outputSchema"];
  toolsProvided: 0;
  requestSha256: string;
  systemInstructionSha256: string;
  reservationMicroUsd: number;
  actualCostMicroUsd: number | null;
  responseMetadataStatus: ResponseMetadataStatus;
  outcome: ModelCallOutcome;
  identity?: ModelIdentity;
  usage?: ModelUsage;
  failureCode?: string;
}

export interface BudgetSnapshot {
  ceilingMicroUsd: number;
  reservedMicroUsd: number;
  committedMicroUsd: number;
  reportedActualMicroUsd: number;
  remainingMicroUsd: number;
}

export type BlogWorkflowStatus = "owner-review-required" | "rejected" | "failed";

export interface WorkflowFailure {
  code: string;
  stage: BlogModelStage | "configuration";
  message: string;
}

export interface BlogWorkflowBundle {
  kind: "blog-draft-review-bundle";
  schemaVersion: typeof BLOG_PIPELINE_SCHEMA_VERSION;
  phase: typeof BLOG_PIPELINE_PHASE;
  executionMode: "saved-fixture";
  run: Omit<BlogWorkflowInput, "sources">;
  status: BlogWorkflowStatus;
  evidenceLedger?: EvidenceLedger;
  drafts: WriterOutput[];
  reviews: ReviewReport[];
  provenance: {
    sources: EvidenceSourceRecord[];
    clients: Array<{
      role: BlogAgentRole;
      adapter: string;
      contextId: string;
    }>;
    calls: ModelCallRecord[];
    budget: BudgetSnapshot;
    costBasis: {
      kind: "saved-fixture-synthetic";
      providerSpendMicroUsd: 0;
    };
    contractDigests: {
      inputManifestSha256: string;
      researcherPromptSha256: string;
      writerPromptSha256: string;
      reviewerPromptSha256: string;
      reviewerRubricSha256: string;
      evidenceSha256?: string;
      draftSha256: string[];
      reviewSha256: string[];
    };
  };
  publication: {
    permitted: false;
    reason: string;
  };
  failure?: WorkflowFailure;
  integrity: {
    algorithm: "sha256";
    sha256: string;
  };
}
