import { BlogPipelineValidationError } from "./errors";
import {
  RESEARCHER_SYSTEM_INSTRUCTION,
  REVIEWER_RUBRIC,
  REVIEWER_SYSTEM_INSTRUCTION,
  WRITER_SYSTEM_INSTRUCTION,
  reviewerPayload,
  revisionPayload,
  writerPayload,
} from "./prompts";
import { parseReviewerOutput, parseWriterOutput } from "./schema";
import {
  containsDisallowedPrivateMaterial,
  containsDisallowedPrivateMaterialInValue,
  containsInstructionLikeText,
  findTextSecurityFindings,
  isDisallowedLocalHostname,
  sha256,
  sourceUrlPolicyIssues,
  utf8Bytes,
} from "./security";
import { canonicalSha256 } from "./serialization";
import {
  BLOG_PIPELINE_MAX_CALLS,
  BLOG_PIPELINE_PHASE,
  BLOG_PIPELINE_SCHEMA_VERSION,
  type BlogAgentRole,
  type BlogModelStage,
  type EvidenceLedger,
  type ModelCallRequest,
  type ReviewReport,
  type WriterOutput,
} from "./types";

export interface BundleVerificationIssue {
  code: string;
  path: string;
  message: string;
}

export interface BundleVerificationResult {
  valid: boolean;
  issues: BundleVerificationIssue[];
}

type AddIssue = (code: string, path: string, message: string) => void;
type JsonRecord = Record<string, unknown>;

interface CallPlanEntry {
  stage: BlogModelStage;
  role: BlogAgentRole;
  outputSchema: ModelCallRequest["outputSchema"];
  systemInstruction: string;
}

const SHA256 = /^[a-f0-9]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/u;
const MODEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const CALL_PLAN: readonly CallPlanEntry[] = [
  {
    stage: "research",
    role: "planner-researcher",
    outputSchema: "ResearcherOutput.v1",
    systemInstruction: RESEARCHER_SYSTEM_INSTRUCTION,
  },
  {
    stage: "draft",
    role: "writer",
    outputSchema: "WriterOutput.v1",
    systemInstruction: WRITER_SYSTEM_INSTRUCTION,
  },
  {
    stage: "review",
    role: "reviewer-verifier",
    outputSchema: "ReviewerOutput.v1",
    systemInstruction: REVIEWER_SYSTEM_INSTRUCTION,
  },
  {
    stage: "revision",
    role: "writer",
    outputSchema: "WriterOutput.v1",
    systemInstruction: WRITER_SYSTEM_INSTRUCTION,
  },
  {
    stage: "final-review",
    role: "reviewer-verifier",
    outputSchema: "ReviewerOutput.v1",
    systemInstruction: REVIEWER_SYSTEM_INSTRUCTION,
  },
] as const;

const CLIENT_ROLES: readonly BlogAgentRole[] = [
  "planner-researcher",
  "writer",
  "reviewer-verifier",
] as const;

const HARD_GATES = [
  {
    id: "claim-coverage",
    passes: (review: JsonRecord) => Array.isArray(review.unmappedFactualClaims) && review.unmappedFactualClaims.length === 0,
  },
  {
    id: "claim-support",
    passes: (review: JsonRecord) =>
      Array.isArray(review.claimReviews) &&
      review.claimReviews.every((value) => record(value)?.assessment === "supported"),
  },
  {
    id: "citation-integrity",
    passes: (review: JsonRecord) =>
      !reviewHasIssueCategory(review, "citation") && !reviewHasIssueCategory(review, "evidence"),
  },
  {
    id: "contradiction-handling",
    passes: (review: JsonRecord) => !reviewHasIssueCategory(review, "contradiction"),
  },
  {
    id: "prompt-injection",
    passes: (review: JsonRecord) => !reviewHasIssueCategory(review, "prompt-injection"),
  },
  {
    id: "privacy",
    passes: (review: JsonRecord) => !reviewHasIssueCategory(review, "privacy"),
  },
  {
    id: "safe-content",
    passes: (review: JsonRecord) => !reviewHasIssueCategory(review, "unsafe-content"),
  },
] as const;

function record(value: unknown): JsonRecord | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? (value as JsonRecord)
    : undefined;
}

function safeCanonicalSha256(
  value: unknown,
  path: string,
  addIssue: AddIssue,
): string | undefined {
  try {
    return canonicalSha256(value);
  } catch {
    addIssue("digest.unreadable", path, "The value cannot be encoded as canonical JSON.");
    return undefined;
  }
}

function allowedKeys(
  value: JsonRecord,
  allowed: readonly string[],
  path: string,
  addIssue: AddIssue,
) {
  const names = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!names.has(key)) {
      addIssue("shape.unexpected-field", `${path}.${key}`, "This field is not part of the bundle contract.");
    }
  }
}

function compareDigest(
  actual: unknown,
  expected: string | undefined,
  code: string,
  path: string,
  label: string,
  addIssue: AddIssue,
) {
  if (expected !== undefined && actual !== expected) {
    addIssue(code, path, `${label} does not match the canonical SHA-256 digest.`);
  }
}

function nonNegativeMoney(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function boundedSingleLine(
  value: unknown,
  max: number,
  path: string,
  code: string,
  addIssue: AddIssue,
  min = 1,
) {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    value !== value.trim() ||
    /[\r\n]/u.test(value) ||
    CONTROL_CHARACTERS.test(value)
  ) {
    addIssue(code, path, `This value must be a trimmed single-line string of ${min} to ${max} characters.`);
    return false;
  }
  return true;
}

function boundedText(
  value: unknown,
  max: number,
  path: string,
  code: string,
  addIssue: AddIssue,
  min = 1,
) {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    value !== value.trim() ||
    CONTROL_CHARACTERS.test(value)
  ) {
    addIssue(code, path, `This value must be trimmed text of ${min} to ${max} characters.`);
    return false;
  }
  return true;
}

function evidenceIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 100 &&
    value === value.trim() &&
    !/[\r\n]/u.test(value) &&
    !CONTROL_CHARACTERS.test(value) &&
    IDENTIFIER.test(value) &&
    !containsInstructionLikeText(value)
  );
}

function canonicalIsoTimestamp(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length < 24 ||
    value.length > 30 ||
    value !== value.trim() ||
    /[\r\n]/u.test(value) ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function verifyModelIdentity(identity: JsonRecord, path: string, addIssue: AddIssue) {
  for (const field of ["provider", "model"] as const) {
    if (
      boundedSingleLine(identity[field], 160, `${path}.${field}`, "provenance.call-identity", addIssue) &&
      !MODEL_TOKEN.test(identity[field] as string)
    ) {
      addIssue(
        "provenance.call-identity",
        `${path}.${field}`,
        "Model identity tokens may contain only letters, digits, dot, underscore, colon, slash and hyphen.",
      );
    }
  }
  boundedSingleLine(identity.version, 100, `${path}.version`, "provenance.call-identity", addIssue);
}

function verifyModelUsage(usage: JsonRecord, path: string, addIssue: AddIssue) {
  const maxima = {
    inputTokens: 10_000_000,
    outputTokens: 10_000_000,
    latencyMs: 3_600_000,
    costMicroUsd: 1_000_000_000,
  } as const;
  for (const [field, max] of Object.entries(maxima)) {
    const value = usage[field];
    if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > max) {
      addIssue(
        "provenance.call-usage",
        `${path}.${field}`,
        `Usage must be a safe integer between 0 and ${max}.`,
      );
    }
  }
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

function reviewHasIssueCategory(review: JsonRecord, category: string) {
  return (
    Array.isArray(review.issues) &&
    review.issues.some((value) => record(value)?.category === category)
  );
}

function verifyOuterIntegrity(root: JsonRecord, addIssue: AddIssue) {
  const integrity = record(root.integrity);
  if (!integrity) {
    addIssue("integrity.missing", "root.integrity", "The outer integrity record is required.");
    return;
  }
  allowedKeys(integrity, ["algorithm", "sha256"], "root.integrity", addIssue);
  if (integrity.algorithm !== "sha256") {
    addIssue("integrity.algorithm", "root.integrity.algorithm", "The integrity algorithm must be sha256.");
  }
  if (typeof integrity.sha256 !== "string" || !SHA256.test(integrity.sha256)) {
    addIssue("integrity.format", "root.integrity.sha256", "The integrity digest must be lowercase SHA-256 hex.");
  }
  const unsigned = Object.fromEntries(Object.entries(root).filter(([key]) => key !== "integrity"));
  const expected = safeCanonicalSha256(unsigned, "root", addIssue);
  compareDigest(
    integrity.sha256,
    expected,
    "integrity.mismatch",
    "root.integrity.sha256",
    "The outer bundle integrity",
    addIssue,
  );
}

function verifyRun(run: JsonRecord | undefined, addIssue: AddIssue): string[] {
  if (!run) {
    addIssue("shape.run", "root.run", "The run manifest must be an object.");
    return [];
  }
  allowedKeys(
    run,
    [
      "schemaVersion",
      "runId",
      "requestedAt",
      "topic",
      "audience",
      "allowedDomains",
      "runCostCeilingMicroUsd",
      "dryRun",
    ],
    "root.run",
    addIssue,
  );
  if (run.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    addIssue("contract.run-schema", "root.run.schemaVersion", "The run schema version must be 1.");
  }
  if (
    !boundedSingleLine(run.runId, 120, "root.run.runId", "contract.run-id", addIssue) ||
    !IDENTIFIER.test(run.runId as string) ||
    containsInstructionLikeText(run.runId as string)
  ) {
    addIssue(
      "contract.run-id",
      "root.run.runId",
      "The run identifier must use lowercase words separated by single hyphens.",
    );
  }
  if (!canonicalIsoTimestamp(run.requestedAt)) {
    addIssue(
      "contract.run-field",
      "root.run.requestedAt",
      "The requested timestamp must be canonical UTC ISO format.",
    );
  }
  boundedSingleLine(run.topic, 300, "root.run.topic", "contract.run-field", addIssue, 4);
  boundedSingleLine(run.audience, 300, "root.run.audience", "contract.run-field", addIssue, 4);
  if (
    containsDisallowedPrivateMaterial(
      `${String(run.runId)}\n${String(run.topic)}\n${String(run.audience)}\n${
        stringArray(run.allowedDomains)?.join("\n") ?? ""
      }`,
    )
  ) {
    addIssue(
      "privacy.run-metadata",
      "root.run",
      "Run metadata must not contain credential-shaped, machine-local or personal sensitive material.",
    );
  }
  if (
    !nonNegativeMoney(run.runCostCeilingMicroUsd) ||
    run.runCostCeilingMicroUsd < 1 ||
    run.runCostCeilingMicroUsd > 1_000_000_000
  ) {
    addIssue(
      "budget.ceiling",
      "root.run.runCostCeilingMicroUsd",
      "The run ceiling must be a positive safe integer no greater than 1,000,000,000 micro-USD.",
    );
  }
  if (run.dryRun !== true) {
    addIssue("scope.dry-run", "root.run.dryRun", "Phase 18.2 bundles must remain dry-run only.");
  }
  const domains = stringArray(run.allowedDomains);
  if (!domains || domains.length < 1 || domains.length > 20) {
    addIssue(
      "contract.allowed-domains",
      "root.run.allowedDomains",
      "Allowed domains must contain between 1 and 20 strings.",
    );
    return [];
  }
  domains.forEach((domain, index) => {
    if (
      domain.length > 253 ||
      domain !== domain.toLocaleLowerCase("en-GB") ||
      !DOMAIN.test(domain)
    ) {
      addIssue(
        "contract.allowed-domains",
        `root.run.allowedDomains[${index}]`,
        "Allowed domains must be lowercase hostnames without wildcards or ports.",
      );
    }
    if (isDisallowedLocalHostname(domain)) {
      addIssue(
        "contract.allowed-domains",
        `root.run.allowedDomains[${index}]`,
        "Allowed domains must not identify a loopback, private, link-local or local-network host.",
      );
    }
  });
  if (new Set(domains).size !== domains.length) {
    addIssue("contract.allowed-domains", "root.run.allowedDomains", "Allowed domains must be unique.");
  }
  return domains;
}

function verifySourceManifests(
  sources: unknown[],
  allowedDomains: readonly string[],
  addIssue: AddIssue,
) {
  const ids = new Set<string>();
  const urls = new Set<string>();
  if (sources.length < 1 || sources.length > 20) {
    addIssue(
      "provenance.source-count",
      "root.provenance.sources",
      "Source provenance must contain between 1 and 20 manifests.",
    );
  }
  sources.forEach((sourceValue, index) => {
    const path = `root.provenance.sources[${index}]`;
    const source = record(sourceValue);
    if (!source) {
      addIssue("shape.source", path, "Each source manifest must be an object.");
      return;
    }
    allowedKeys(
      source,
      [
        "id",
        "title",
        "url",
        "publisher",
        "accessedAt",
        "approvedForModelUse",
        "privacyReviewed",
        "approvedEvidenceSpans",
        "contentSha256",
        "contentBytes",
      ],
      path,
      addIssue,
    );
    if (
      !boundedSingleLine(source.id, 100, `${path}.id`, "provenance.source-id", addIssue) ||
      !IDENTIFIER.test(source.id as string) ||
      containsInstructionLikeText(source.id as string)
    ) {
      addIssue(
        "provenance.source-id",
        `${path}.id`,
        "A source identifier must use lowercase words separated by single hyphens.",
      );
    } else if (ids.has(source.id as string)) {
      addIssue("provenance.source-id", `${path}.id`, "Source identifiers must be unique.");
    } else {
      ids.add(source.id as string);
    }
    boundedSingleLine(source.title, 200, `${path}.title`, "provenance.source-field", addIssue);
    boundedSingleLine(source.url, 2_000, `${path}.url`, "provenance.source-field", addIssue);
    if (!canonicalIsoTimestamp(source.accessedAt)) {
      addIssue(
        "provenance.source-field",
        `${path}.accessedAt`,
        "The source access timestamp must be canonical UTC ISO format.",
      );
    }
    if (typeof source.url === "string") {
      for (const issue of sourceUrlPolicyIssues(source.url, allowedDomains)) {
        addIssue("provenance.source-url", `${path}.url`, `The retained source URL ${issue}.`);
      }
      if (urls.has(source.url)) {
        addIssue("provenance.source-url", `${path}.url`, "Retained source URLs must be unique.");
      }
      urls.add(source.url);
    }
    if (Object.hasOwn(source, "publisher")) {
      boundedSingleLine(
        source.publisher,
        120,
        `${path}.publisher`,
        "provenance.source-field",
        addIssue,
      );
    }
    const metadata = [source.id, source.title, source.url, source.publisher ?? ""].join("\n");
    if (containsDisallowedPrivateMaterial(metadata)) {
      addIssue(
        "privacy.source-metadata",
        path,
        "Retained source metadata must not contain credential-shaped, machine-local or personal sensitive material.",
      );
    }
    if (containsInstructionLikeText(metadata)) {
      addIssue(
        "evidence.source-metadata-instruction",
        path,
        "Instruction-like text is not allowed in retained source metadata.",
      );
    }
    if (source.approvedForModelUse !== true) {
      addIssue(
        "provenance.source-approval",
        `${path}.approvedForModelUse`,
        "Every retained source manifest must record explicit model-use approval.",
      );
    }
    if (source.privacyReviewed !== true) {
      addIssue(
        "provenance.privacy-review",
        `${path}.privacyReviewed`,
        "Every retained source manifest must record completed privacy review.",
      );
    }
    if (typeof source.contentSha256 !== "string" || !SHA256.test(source.contentSha256)) {
      addIssue("provenance.source-digest", `${path}.contentSha256`, "Source content needs a SHA-256 digest.");
    }
    if (!nonNegativeMoney(source.contentBytes)) {
      addIssue("provenance.source-bytes", `${path}.contentBytes`, "Source byte length must be a safe integer.");
    } else if (source.contentBytes > 200_000) {
      addIssue("provenance.source-bytes", `${path}.contentBytes`, "A source cannot exceed 200,000 UTF-8 bytes.");
    }
    const approvedSpans = Array.isArray(source.approvedEvidenceSpans)
      ? source.approvedEvidenceSpans
      : [];
    if (
      !Array.isArray(source.approvedEvidenceSpans) ||
      source.approvedEvidenceSpans.length < 1 ||
      source.approvedEvidenceSpans.length > 100
    ) {
      addIssue(
        "provenance.approved-spans",
        `${path}.approvedEvidenceSpans`,
        "Owner-approved evidence spans must contain between 1 and 100 entries.",
      );
    }
    const spanKeys = new Set<string>();
    approvedSpans.forEach((spanValue, spanIndex) => {
      const spanPath = `${path}.approvedEvidenceSpans[${spanIndex}]`;
      const span = record(spanValue);
      if (!span) {
        addIssue("provenance.approved-span", spanPath, "Each approved span must be an object.");
        return;
      }
      allowedKeys(span, ["startByte", "endByte", "sha256"], spanPath, addIssue);
      if (
        !Number.isSafeInteger(span.startByte) ||
        !Number.isSafeInteger(span.endByte) ||
        (span.startByte as number) < 0 ||
        (span.endByte as number) <= (span.startByte as number) ||
        (nonNegativeMoney(source.contentBytes) && (span.endByte as number) > source.contentBytes)
      ) {
        addIssue("provenance.approved-span", spanPath, "The approved span has invalid byte bounds.");
      }
      if (typeof span.sha256 !== "string" || !SHA256.test(span.sha256)) {
        addIssue("provenance.approved-span", `${spanPath}.sha256`, "The approved span needs a SHA-256 digest.");
      }
      const key = `${String(span.startByte)}:${String(span.endByte)}`;
      if (spanKeys.has(key)) {
        addIssue("provenance.approved-span", spanPath, "Approved evidence spans must be unique.");
      }
      spanKeys.add(key);
    });
  });
  const totalBytes = sources.reduce<number>((total, sourceValue) => {
    const bytes = record(sourceValue)?.contentBytes;
    return total + (nonNegativeMoney(bytes) ? bytes : 0);
  }, 0);
  if (totalBytes > 1_000_000) {
    addIssue(
      "provenance.source-bytes",
      "root.provenance.sources",
      "Retained source manifests cannot total more than 1,000,000 UTF-8 bytes.",
    );
  }
}

function verifyEvidenceLinks(
  evidence: JsonRecord,
  sourceManifests: unknown[],
  addIssue: AddIssue,
) {
  allowedKeys(
    evidence,
    [
      "schemaVersion",
      "researchQuestion",
      "sources",
      "excerpts",
      "claims",
      "outline",
      "securityFindings",
    ],
    "root.evidenceLedger",
    addIssue,
  );
  if (evidence.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    addIssue("evidence.schema", "root.evidenceLedger.schemaVersion", "The evidence schema version must be 1.");
  }
  boundedSingleLine(
    evidence.researchQuestion,
    500,
    "root.evidenceLedger.researchQuestion",
    "evidence.question",
    addIssue,
    4,
  );
  if (containsDisallowedPrivateMaterialInValue(evidence)) {
    addIssue(
      "evidence.sensitive-material",
      "root.evidenceLedger",
      "Evidence must not contain credential-shaped, machine-local or personal sensitive material.",
    );
  }
  if (!Array.isArray(evidence.sources)) {
    addIssue("evidence.sources", "root.evidenceLedger.sources", "Evidence sources must be an array.");
  }
  const evidenceSources = Array.isArray(evidence.sources) ? evidence.sources : [];
  const sourceDigest = safeCanonicalSha256(sourceManifests, "root.provenance.sources", addIssue);
  compareDigest(
    safeCanonicalSha256(evidenceSources, "root.evidenceLedger.sources", addIssue),
    sourceDigest,
    "evidence.source-manifest",
    "root.evidenceLedger.sources",
    "Evidence source manifests",
    addIssue,
  );

  const sourcesById = new Map<string, JsonRecord>();
  evidenceSources.forEach((value) => {
    const source = record(value);
    if (source && typeof source.id === "string") sourcesById.set(source.id, source);
  });
  if (!Array.isArray(evidence.excerpts) || evidence.excerpts.length < 1 || evidence.excerpts.length > 200) {
    addIssue("evidence.excerpts", "root.evidenceLedger.excerpts", "Evidence must contain between 1 and 200 excerpts.");
  }
  const excerpts = Array.isArray(evidence.excerpts) ? evidence.excerpts : [];
  const excerptsById = new Map<string, JsonRecord>();
  excerpts.forEach((value, index) => {
    const path = `root.evidenceLedger.excerpts[${index}]`;
    const excerpt = record(value);
    if (!excerpt) {
      addIssue("evidence.excerpt", path, "Each evidence excerpt must be an object.");
      return;
    }
    allowedKeys(
      excerpt,
      ["id", "sourceId", "locator", "startByte", "endByte", "text", "classification"],
      path,
      addIssue,
    );
    if (
      !evidenceIdentifier(excerpt.id) ||
      excerptsById.has(excerpt.id)
    ) {
      addIssue("evidence.excerpt-id", `${path}.id`, "Excerpt identifiers must be non-empty and unique.");
    } else {
      excerptsById.set(excerpt.id, excerpt);
    }
    if (
      !evidenceIdentifier(excerpt.sourceId)
    ) {
      addIssue("evidence.excerpt-source", `${path}.sourceId`, "An excerpt source identifier is required.");
    }
    boundedSingleLine(
      excerpt.locator,
      300,
      `${path}.locator`,
      "evidence.excerpt-locator",
      addIssue,
    );
    if (excerpt.classification !== "evidence" && excerpt.classification !== "untrusted-instruction") {
      addIssue("evidence.excerpt-classification", `${path}.classification`, "The excerpt classification is invalid.");
    }
    const source = typeof excerpt.sourceId === "string" ? sourcesById.get(excerpt.sourceId) : undefined;
    if (!source) {
      addIssue("evidence.excerpt-source", `${path}.sourceId`, "The excerpt must reference a retained source.");
      return;
    }
    if (
      !Number.isSafeInteger(excerpt.startByte) ||
      !Number.isSafeInteger(excerpt.endByte) ||
      (excerpt.startByte as number) < 0 ||
      (excerpt.endByte as number) <= (excerpt.startByte as number) ||
      (nonNegativeMoney(source.contentBytes) && (excerpt.endByte as number) > source.contentBytes)
    ) {
      addIssue("evidence.excerpt-bounds", path, "The excerpt has invalid UTF-8 byte bounds.");
    }
    boundedText(
      excerpt.text,
      4_000,
      `${path}.text`,
      "evidence.excerpt-text",
      addIssue,
    );
    if (
      typeof excerpt.text !== "string" ||
      (Number.isSafeInteger(excerpt.startByte) &&
        Number.isSafeInteger(excerpt.endByte) &&
        utf8Bytes(excerpt.text) !== (excerpt.endByte as number) - (excerpt.startByte as number))
    ) {
      addIssue("evidence.excerpt-length", `${path}.text`, "Excerpt text must match its recorded byte length.");
    }
    if (excerpt.classification === "evidence" && typeof excerpt.text === "string") {
      const approvedSpans = Array.isArray(source.approvedEvidenceSpans)
        ? source.approvedEvidenceSpans
        : [];
      const matchesApproval = approvedSpans.some((spanValue) => {
        const span = record(spanValue);
        return (
          span !== undefined &&
          span.startByte === excerpt.startByte &&
          span.endByte === excerpt.endByte &&
          span.sha256 === sha256(excerpt.text as string)
        );
      });
      if (!matchesApproval) {
        addIssue(
          "evidence.owner-approved-span",
          path,
          "Evidence-classified text must exactly match an owner-approved source span.",
        );
      }
    }
  });

  if (!Array.isArray(evidence.claims) || evidence.claims.length < 1 || evidence.claims.length > 100) {
    addIssue("evidence.claims", "root.evidenceLedger.claims", "Evidence must contain between 1 and 100 claims.");
  }
  const claims = Array.isArray(evidence.claims) ? evidence.claims : [];
  const claimsById = new Map<string, JsonRecord>();
  claims.forEach((value, index) => {
    const path = `root.evidenceLedger.claims[${index}]`;
    const claim = record(value);
    if (!claim) {
      addIssue("evidence.claim", path, "Each evidence claim must be an object.");
      return;
    }
    allowedKeys(claim, ["id", "text", "assessment", "evidenceIds"], path, addIssue);
    if (
      !evidenceIdentifier(claim.id) ||
      claimsById.has(claim.id)
    ) {
      addIssue("evidence.claim-id", `${path}.id`, "Claim identifiers must be non-empty and unique.");
    } else {
      claimsById.set(claim.id, claim);
    }
    boundedSingleLine(
      claim.text,
      1_000,
      `${path}.text`,
      "evidence.claim-text",
      addIssue,
    );
    if (!["supported", "contradicted", "insufficient"].includes(String(claim.assessment))) {
      addIssue("evidence.claim-assessment", `${path}.assessment`, "The claim assessment is invalid.");
    }
    const evidenceIds = stringArray(claim.evidenceIds);
    if (!evidenceIds) {
      addIssue("evidence.claim-links", `${path}.evidenceIds`, "Claim evidence identifiers must be strings.");
      return;
    }
    if (evidenceIds.some((id) => !evidenceIdentifier(id))) {
      addIssue(
        "evidence.claim-links",
        `${path}.evidenceIds`,
        "Claim evidence identifiers must follow the evidence identifier contract.",
      );
    }
    const minimumEvidence = claim.assessment === "insufficient" ? 0 : 1;
    if (
      evidenceIds.length < minimumEvidence ||
      evidenceIds.length > 12 ||
      new Set(evidenceIds).size !== evidenceIds.length
    ) {
      addIssue(
        "evidence.claim-links",
        `${path}.evidenceIds`,
        "Claim evidence identifiers must be unique and within the assessment-specific bounds.",
      );
    }
    for (const id of evidenceIds) {
      const excerpt = excerptsById.get(id);
      if (!excerpt) {
        addIssue("evidence.claim-links", `${path}.evidenceIds`, "The claim references an unknown excerpt.");
      } else if (claim.assessment === "supported" && excerpt.classification !== "evidence") {
        addIssue("evidence.claim-links", path, "A supported claim cannot rely on quarantined instructions.");
      }
    }
    if (
      claim.assessment === "supported" &&
      !evidenceIds.some((id) => excerptsById.get(id)?.text === claim.text)
    ) {
      addIssue(
        "evidence.claim-text",
        `${path}.text`,
        "A supported claim must exactly equal one of its owner-approved evidence spans.",
      );
    }
  });

  if (!Array.isArray(evidence.outline) || evidence.outline.length < 1 || evidence.outline.length > 30) {
    addIssue("evidence.outline", "root.evidenceLedger.outline", "Evidence must contain between 1 and 30 outline sections.");
  }
  const outline = Array.isArray(evidence.outline) ? evidence.outline : [];
  const outlineIds = new Set<string>();
  outline.forEach((value, index) => {
    const path = `root.evidenceLedger.outline[${index}]`;
    const section = record(value);
    const claimIds = section && stringArray(section.claimIds);
    if (!section || !claimIds) {
      addIssue("evidence.outline-links", path, "Outline claims are invalid.");
      return;
    }
    allowedKeys(section, ["id", "heading", "claimIds"], path, addIssue);
    if (
      !evidenceIdentifier(section.id) ||
      outlineIds.has(section.id)
    ) {
      addIssue("evidence.outline-id", `${path}.id`, "Outline identifiers must be non-empty and unique.");
    } else {
      outlineIds.add(section.id);
    }
    boundedSingleLine(
      section.heading,
      120,
      `${path}.heading`,
      "evidence.outline-heading",
      addIssue,
    );
    if (claimIds.some((id) => !evidenceIdentifier(id))) {
      addIssue(
        "evidence.outline-links",
        `${path}.claimIds`,
        "Outline claim identifiers must follow the evidence identifier contract.",
      );
    }
    if (claimIds.length < 1 || claimIds.length > 20 || new Set(claimIds).size !== claimIds.length) {
      addIssue(
        "evidence.outline-links",
        `${path}.claimIds`,
        "Outline claim identifiers must contain between 1 and 20 unique entries.",
      );
    }
    for (const id of claimIds) {
      const claim = claimsById.get(id);
      if (!claim || claim.assessment !== "supported") {
        addIssue(
          "evidence.outline-links",
          `${path}.claimIds`,
          "The outline may reference only supported claims.",
        );
      }
    }
  });

  const securityFindings = Array.isArray(evidence.securityFindings)
    ? evidence.securityFindings
    : [];
  if (!Array.isArray(evidence.securityFindings)) {
    addIssue("evidence.security-findings", "root.evidenceLedger.securityFindings", "Security findings must be an array.");
  } else {
    securityFindings.forEach((value, index) => {
      const path = `root.evidenceLedger.securityFindings[${index}]`;
      const finding = record(value);
      const source = finding && typeof finding.sourceId === "string"
        ? sourcesById.get(finding.sourceId)
        : undefined;
      if (!finding || !source) {
        addIssue("evidence.security-finding", path, "The security finding must reference a retained source.");
        return;
      }
      allowedKeys(
        finding,
        ["sourceId", "kind", "startByte", "endByte", "sha256"],
        path,
        addIssue,
      );
      if (
        ![
          "instruction-override",
          "prompt-extraction",
          "role-spoofing",
          "credential-exfiltration",
        ].includes(String(finding.kind))
      ) {
        addIssue("evidence.security-finding", `${path}.kind`, "The security finding kind is invalid.");
      }
      if (
        !Number.isSafeInteger(finding.startByte) ||
        !Number.isSafeInteger(finding.endByte) ||
        (finding.startByte as number) < 0 ||
        (finding.endByte as number) <= (finding.startByte as number) ||
        (nonNegativeMoney(source.contentBytes) && (finding.endByte as number) > source.contentBytes)
      ) {
        addIssue("evidence.security-finding", path, "The security finding has invalid byte bounds.");
      }
      if (typeof finding.sha256 !== "string" || !SHA256.test(finding.sha256)) {
        addIssue("evidence.security-finding", `${path}.sha256`, "The security finding needs a SHA-256 digest.");
      }
    });
  }
  excerpts.forEach((excerptValue, excerptIndex) => {
    const excerpt = record(excerptValue);
    if (!excerpt || typeof excerpt.text !== "string") return;
    const detectedFindings = findTextSecurityFindings(excerpt.text);
    if (
      excerpt.classification === "evidence" &&
      (detectedFindings.length > 0 || containsInstructionLikeText(excerpt.text))
    ) {
      addIssue(
        "evidence.instruction-text",
        `root.evidenceLedger.excerpts[${excerptIndex}]`,
        "Instruction-like excerpt text must remain quarantined even if retained findings were altered.",
      );
    }
    if (
      typeof excerpt.sourceId === "string" &&
      Number.isSafeInteger(excerpt.startByte)
    ) {
      for (const detected of detectedFindings) {
        const startByte = (excerpt.startByte as number) + detected.startByte;
        const endByte = (excerpt.startByte as number) + detected.endByte;
        const recorded = securityFindings.some((findingValue) => {
          const finding = record(findingValue);
          return (
            finding !== undefined &&
            finding.sourceId === excerpt.sourceId &&
            finding.kind === detected.kind &&
            finding.startByte === startByte &&
            finding.endByte === endByte &&
            finding.sha256 === detected.sha256
          );
        });
        if (!recorded) {
          addIssue(
            "evidence.security-finding-missing",
            `root.evidenceLedger.excerpts[${excerptIndex}]`,
            "A deterministically detected source instruction is missing from the security findings.",
          );
        }
      }
    }
    if (excerpt.classification !== "evidence") return;
    const overlapsFinding = securityFindings.some((findingValue) => {
      const finding = record(findingValue);
      return (
        finding !== undefined &&
        finding.sourceId === excerpt.sourceId &&
        Number.isSafeInteger(finding.startByte) &&
        Number.isSafeInteger(finding.endByte) &&
        Number.isSafeInteger(excerpt.startByte) &&
        Number.isSafeInteger(excerpt.endByte) &&
        (excerpt.startByte as number) < (finding.endByte as number) &&
        (excerpt.endByte as number) > (finding.startByte as number)
      );
    });
    if (overlapsFinding) {
      addIssue(
        "evidence.injection-overlap",
        `root.evidenceLedger.excerpts[${excerptIndex}]`,
        "An excerpt overlapping a security finding must remain quarantined.",
      );
    }
  });
}

function verifyClients(values: unknown[], addIssue: AddIssue) {
  const byRole = new Map<BlogAgentRole, JsonRecord>();
  const contexts = new Set<string>();
  if (values.length !== CLIENT_ROLES.length) {
    addIssue("provenance.clients", "root.provenance.clients", "Exactly three independent role contexts are required.");
  }
  values.forEach((value, index) => {
    const path = `root.provenance.clients[${index}]`;
    const client = record(value);
    if (!client) {
      addIssue("shape.client", path, "Each client provenance entry must be an object.");
      return;
    }
    allowedKeys(client, ["role", "adapter", "contextId"], path, addIssue);
    const expectedRole = CLIENT_ROLES[index];
    if (client.role !== expectedRole) {
      addIssue("provenance.client-role", `${path}.role`, "Client roles must use the fixed three-role order.");
    }
    if (CLIENT_ROLES.includes(client.role as BlogAgentRole)) {
      byRole.set(client.role as BlogAgentRole, client);
    }
    if (client.adapter !== "saved-fixture-v1") {
      addIssue("scope.adapter", `${path}.adapter`, "Phase 18.2 permits only the saved-fixture adapter.");
    }
    if (
      typeof client.contextId !== "string" ||
      client.contextId.length > 100 ||
      !IDENTIFIER.test(client.contextId) ||
      containsDisallowedPrivateMaterial(client.contextId) ||
      containsInstructionLikeText(client.contextId)
    ) {
      addIssue(
        "provenance.context",
        `${path}.contextId`,
        "A context must be a safe lowercase hyphenated identifier of at most 100 characters.",
      );
    } else if (contexts.has(client.contextId)) {
      addIssue("provenance.context", `${path}.contextId`, "Researcher, Writer and Reviewer contexts must differ.");
    } else {
      contexts.add(client.contextId);
    }
  });
  return byRole;
}

function reconstructRequestPayload(
  index: number,
  evidence: JsonRecord | undefined,
  drafts: unknown[],
  reviews: unknown[],
): { available: boolean; payload?: unknown } {
  // The first request contains raw source bytes, which are deliberately absent
  // from the durable bundle. Its hash is therefore format-checked but cannot be
  // recomputed. Calls two through five use only retained, validated artifacts.
  if (!evidence || index === 0) return { available: false };
  try {
    const ledger = evidence as unknown as EvidenceLedger;
    switch (index) {
      case 1:
        return { available: true, payload: writerPayload(ledger) };
      case 2:
        if (!drafts[0]) return { available: false };
        return {
          available: true,
          payload: reviewerPayload(ledger, drafts[0] as WriterOutput, 1),
        };
      case 3:
        if (!drafts[0] || !reviews[0]) return { available: false };
        return {
          available: true,
          payload: revisionPayload(
            ledger,
            drafts[0] as WriterOutput,
            reviews[0] as ReviewReport,
          ),
        };
      case 4:
        if (!drafts[1]) return { available: false };
        return {
          available: true,
          payload: reviewerPayload(ledger, drafts[1] as WriterOutput, 2),
        };
      default:
        return { available: false };
    }
  } catch {
    return { available: false };
  }
}

function verifyCalls(
  values: unknown[],
  run: JsonRecord | undefined,
  clients: Map<BlogAgentRole, JsonRecord>,
  evidence: JsonRecord | undefined,
  drafts: unknown[],
  reviews: unknown[],
  addIssue: AddIssue,
) {
  if (values.length > BLOG_PIPELINE_MAX_CALLS) {
    addIssue(
      "state.call-limit",
      "root.provenance.calls",
      `The workflow exceeds the fixed ${BLOG_PIPELINE_MAX_CALLS}-call maximum.`,
    );
  }
  const calls: JsonRecord[] = [];
  let encounteredTerminalOutcome = false;
  values.forEach((value, index) => {
    const path = `root.provenance.calls[${index}]`;
    const call = record(value);
    if (!call) {
      addIssue("shape.call", path, "Each call provenance entry must be an object.");
      return;
    }
    calls.push(call);
    allowedKeys(
      call,
      [
        "callId",
        "role",
        "stage",
        "adapter",
        "contextId",
        "outputSchema",
        "toolsProvided",
        "requestSha256",
        "systemInstructionSha256",
        "reservationMicroUsd",
        "actualCostMicroUsd",
        "responseMetadataStatus",
        "outcome",
        "identity",
        "usage",
        "failureCode",
      ],
      path,
      addIssue,
    );
    const expected = CALL_PLAN[index];
    if (!expected) return;
    const expectedCallId =
      run && typeof run.runId === "string" ? `${run.runId}-call-${index + 1}` : undefined;
    if (expectedCallId !== undefined && call.callId !== expectedCallId) {
      addIssue("state.call-id", `${path}.callId`, "Call identifiers must be contiguous and run-scoped.");
    }
    if (call.stage !== expected.stage || call.role !== expected.role) {
      addIssue("state.call-prefix", path, "Calls must be an exact prefix of the fixed five-stage workflow.");
    }
    if (call.outputSchema !== expected.outputSchema) {
      addIssue("provenance.output-schema", `${path}.outputSchema`, "The output schema does not match the call stage.");
    }
    if (call.toolsProvided !== 0) {
      addIssue("scope.tools", `${path}.toolsProvided`, "Phase 18.2 model requests provide no tools.");
    }
    compareDigest(
      call.systemInstructionSha256,
      sha256(expected.systemInstruction),
      "provenance.system-instruction",
      `${path}.systemInstructionSha256`,
      "The system-instruction attestation",
      addIssue,
    );
    if (typeof call.requestSha256 !== "string" || !SHA256.test(call.requestSha256)) {
      addIssue("provenance.request-format", `${path}.requestSha256`, "The request attestation must be SHA-256 hex.");
    }
    const payload = reconstructRequestPayload(index, evidence, drafts, reviews);
    if (payload.available && expectedCallId !== undefined) {
      const request: ModelCallRequest = {
        callId: expectedCallId,
        phase: BLOG_PIPELINE_PHASE,
        role: expected.role,
        stage: expected.stage,
        outputSchema: expected.outputSchema,
        systemInstruction: expected.systemInstruction,
        tools: [],
        payload: payload.payload,
      };
      compareDigest(
        call.requestSha256,
        safeCanonicalSha256(request, path, addIssue),
        "provenance.request",
        `${path}.requestSha256`,
        "The reconstructable request attestation",
        addIssue,
      );
    }

    const client = clients.get(expected.role);
    if (client && (call.adapter !== client.adapter || call.contextId !== client.contextId)) {
      addIssue("provenance.call-context", path, "The call does not match its role's recorded adapter context.");
    }
    if (!nonNegativeMoney(call.reservationMicroUsd) || call.reservationMicroUsd > 1_000_000_000) {
      addIssue("budget.call-reservation", `${path}.reservationMicroUsd`, "Call reservations must be non-negative integers.");
    }
    if (
      call.actualCostMicroUsd !== null &&
      (!nonNegativeMoney(call.actualCostMicroUsd) || call.actualCostMicroUsd > 1_000_000_000)
    ) {
      addIssue("budget.call-actual", `${path}.actualCostMicroUsd`, "Actual call cost must be null or a non-negative integer.");
    }
    const exceededReservation =
      nonNegativeMoney(call.reservationMicroUsd) &&
      nonNegativeMoney(call.actualCostMicroUsd) &&
      call.actualCostMicroUsd > call.reservationMicroUsd;
    const usage = record(call.usage);
    const identity = record(call.identity);
    if (Object.hasOwn(call, "identity") && !identity) {
      addIssue("provenance.call-identity", `${path}.identity`, "Retained model identity must be an object.");
    }
    if (Object.hasOwn(call, "usage") && !usage) {
      addIssue("provenance.call-usage", `${path}.usage`, "Retained model usage must be an object.");
    }
    if (identity) {
      allowedKeys(identity, ["provider", "model", "version"], `${path}.identity`, addIssue);
      verifyModelIdentity(identity, `${path}.identity`, addIssue);
    }
    if (usage) {
      allowedKeys(
        usage,
        ["inputTokens", "outputTokens", "latencyMs", "costMicroUsd"],
        `${path}.usage`,
        addIssue,
      );
      verifyModelUsage(usage, `${path}.usage`, addIssue);
    }
    if (
      usage &&
      nonNegativeMoney(usage.costMicroUsd) &&
      call.actualCostMicroUsd !== usage.costMicroUsd
    ) {
      addIssue("budget.call-usage", path, "The call's actual cost must equal its usage cost.");
    }
    const retainedActual = nonNegativeMoney(call.actualCostMicroUsd);
    const metadataStatus = call.responseMetadataStatus;
    if (
      metadataStatus !== "unavailable" &&
      metadataStatus !== "cost-only" &&
      metadataStatus !== "complete"
    ) {
      addIssue(
        "provenance.call-metadata",
        `${path}.responseMetadataStatus`,
        "Response metadata status must be unavailable, cost-only or complete.",
      );
    } else if (metadataStatus === "unavailable") {
      if (
        call.actualCostMicroUsd !== null ||
        Object.hasOwn(call, "identity") ||
        Object.hasOwn(call, "usage")
      ) {
        addIssue(
          "provenance.call-metadata",
          path,
          "Unavailable response metadata cannot retain identity, usage or actual cost fields.",
        );
      }
    } else if (metadataStatus === "cost-only") {
      if (!retainedActual || Object.hasOwn(call, "identity") || Object.hasOwn(call, "usage")) {
        addIssue(
          "provenance.call-metadata",
          path,
          "Cost-only response metadata requires only a bounded actual cost.",
        );
      }
    } else if (!retainedActual || !identity || !usage) {
      addIssue(
        "provenance.call-metadata",
        path,
        "Complete response metadata requires bounded identity, usage and actual cost fields.",
      );
    }
    const claimsReservationOverrun = call.failureCode === "cost-reservation-exceeded";
    if (
      claimsReservationOverrun &&
      (call.outcome !== "invalid-response" || !exceededReservation)
    ) {
      addIssue(
        "budget.call-overrun",
        path,
        "cost-reservation-exceeded is valid only for an invalid response whose actual cost exceeds its reservation.",
      );
    }
    if (
      exceededReservation &&
      (call.outcome !== "invalid-response" || !claimsReservationOverrun)
    ) {
      addIssue(
        "budget.call-overrun",
        path,
        "A cost overrun must be the terminal invalid-response cost-reservation-exceeded failure.",
      );
    }
    if (encounteredTerminalOutcome) {
      addIssue("state.call-after-failure", path, "No call may follow a non-accepted model call.");
    }
    if (call.outcome === "accepted") {
      if (metadataStatus !== "complete" || !identity || !usage || !retainedActual) {
        addIssue("provenance.accepted-call", path, "Accepted calls require identity, usage and actual cost metadata.");
      }
      if (Object.hasOwn(call, "failureCode")) {
        addIssue("provenance.accepted-call", `${path}.failureCode`, "Accepted calls cannot carry a failure code.");
      }
    } else if (call.outcome === "adapter-failure" || call.outcome === "invalid-response") {
      encounteredTerminalOutcome = true;
      if (typeof call.failureCode !== "string" || call.failureCode.length === 0) {
        addIssue("provenance.failed-call", `${path}.failureCode`, "A non-accepted call needs a failure code.");
      }
      if (call.outcome === "adapter-failure" && metadataStatus !== "unavailable") {
        addIssue(
          "provenance.failed-call",
          path,
          "Adapter failures cannot claim response metadata that was never received.",
        );
      }
      if (
        call.outcome === "invalid-response" &&
        ["incomplete-model-response", "schema-invalid-output", "invalid-stage-output"].includes(
          call.failureCode as string,
        ) &&
        metadataStatus !== "complete"
      ) {
        addIssue(
          "provenance.failed-call",
          path,
          "This failure occurs only after complete response metadata has been retained.",
        );
      }
      if (
        call.outcome === "invalid-response" &&
        ["cost-reservation-exceeded", "cost-settlement-failed"].includes(
          call.failureCode as string,
        ) &&
        metadataStatus !== "complete" &&
        metadataStatus !== "cost-only"
      ) {
        addIssue(
          "provenance.failed-call",
          path,
          "A reported-cost failure requires complete or cost-only response metadata.",
        );
      }
    } else {
      addIssue("provenance.call-outcome", `${path}.outcome`, "The call outcome is invalid.");
      encounteredTerminalOutcome = true;
    }
  });
  return calls;
}

function verifyBudget(
  budget: JsonRecord | undefined,
  costBasis: JsonRecord | undefined,
  run: JsonRecord | undefined,
  calls: JsonRecord[],
  addIssue: AddIssue,
) {
  if (!budget) {
    addIssue("shape.budget", "root.provenance.budget", "The terminal budget snapshot is required.");
    return;
  }
  allowedKeys(
    budget,
    [
      "ceilingMicroUsd",
      "reservedMicroUsd",
      "committedMicroUsd",
      "reportedActualMicroUsd",
      "remainingMicroUsd",
    ],
    "root.provenance.budget",
    addIssue,
  );
  const fields = [
    "ceilingMicroUsd",
    "reservedMicroUsd",
    "committedMicroUsd",
    "reportedActualMicroUsd",
    "remainingMicroUsd",
  ] as const;
  for (const field of fields) {
    if (!nonNegativeMoney(budget[field])) {
      addIssue("budget.value", `root.provenance.budget.${field}`, "Budget values must be non-negative safe integers.");
    }
  }
  if (run && budget.ceilingMicroUsd !== run.runCostCeilingMicroUsd) {
    addIssue("budget.ceiling", "root.provenance.budget.ceilingMicroUsd", "Budget and run ceilings must match.");
  }
  if (budget.reservedMicroUsd !== 0) {
    addIssue("budget.unsettled", "root.provenance.budget.reservedMicroUsd", "A terminal bundle cannot retain reservations.");
  }

  let expectedCommitted = 0;
  let expectedActual = 0;
  let admittedAuthority = 0;
  let arithmeticAvailable = true;
  calls.forEach((call, index) => {
    if (!nonNegativeMoney(call.reservationMicroUsd)) {
      arithmeticAvailable = false;
      return;
    }
    if (
      nonNegativeMoney(budget.ceilingMicroUsd) &&
      admittedAuthority + call.reservationMicroUsd > budget.ceilingMicroUsd
    ) {
      addIssue(
        "budget.admission",
        `root.provenance.calls[${index}].reservationMicroUsd`,
        "This call could not have been reserved within the one-way run ceiling.",
      );
    }
    if (call.actualCostMicroUsd === null) {
      expectedCommitted += call.reservationMicroUsd;
      admittedAuthority += call.reservationMicroUsd;
    } else if (nonNegativeMoney(call.actualCostMicroUsd)) {
      expectedCommitted += Math.max(call.reservationMicroUsd, call.actualCostMicroUsd);
      admittedAuthority += Math.max(call.reservationMicroUsd, call.actualCostMicroUsd);
      expectedActual += call.actualCostMicroUsd;
    } else {
      arithmeticAvailable = false;
    }
  });
  if (arithmeticAvailable && budget.committedMicroUsd !== expectedCommitted) {
    addIssue("budget.committed", "root.provenance.budget.committedMicroUsd", "Committed cost does not equal dispatched authority.");
  }
  if (arithmeticAvailable && budget.reportedActualMicroUsd !== expectedActual) {
    addIssue("budget.actual", "root.provenance.budget.reportedActualMicroUsd", "Reported actual cost does not equal call metadata.");
  }
  const lastCall = calls.at(-1);
  const terminalCostOverrun =
    lastCall?.outcome === "invalid-response" &&
    lastCall.failureCode === "cost-reservation-exceeded" &&
    nonNegativeMoney(lastCall.reservationMicroUsd) &&
    nonNegativeMoney(lastCall.actualCostMicroUsd) &&
    lastCall.actualCostMicroUsd > lastCall.reservationMicroUsd;
  if (
    nonNegativeMoney(budget.committedMicroUsd) &&
    nonNegativeMoney(budget.ceilingMicroUsd) &&
    budget.committedMicroUsd > budget.ceilingMicroUsd &&
    !terminalCostOverrun
  ) {
    addIssue(
      "budget.ceiling-exceeded",
      "root.provenance.budget.committedMicroUsd",
      "Committed authority may exceed the ceiling only for a terminal reported cost overrun.",
    );
  }
  if (
    nonNegativeMoney(budget.ceilingMicroUsd) &&
    nonNegativeMoney(budget.committedMicroUsd) &&
    nonNegativeMoney(budget.reservedMicroUsd)
  ) {
    const expectedRemaining = Math.max(
      0,
      budget.ceilingMicroUsd - budget.committedMicroUsd - budget.reservedMicroUsd,
    );
    if (budget.remainingMicroUsd !== expectedRemaining) {
      addIssue("budget.remaining", "root.provenance.budget.remainingMicroUsd", "Remaining budget arithmetic is inconsistent.");
    }
  }

  if (!costBasis) {
    addIssue("shape.cost-basis", "root.provenance.costBasis", "The Phase 18.2 cost basis is required.");
  } else {
    allowedKeys(costBasis, ["kind", "providerSpendMicroUsd"], "root.provenance.costBasis", addIssue);
    if (costBasis.kind !== "saved-fixture-synthetic" || costBasis.providerSpendMicroUsd !== 0) {
      addIssue(
        "scope.cost-basis",
        "root.provenance.costBasis",
        "Phase 18.2 costs must be labelled synthetic with zero provider spend.",
      );
    }
  }
}

function verifyArtifactDigests(
  digests: JsonRecord | undefined,
  run: JsonRecord | undefined,
  sources: unknown[],
  evidence: JsonRecord | undefined,
  drafts: unknown[],
  reviews: unknown[],
  addIssue: AddIssue,
) {
  if (!digests) {
    addIssue("shape.contract-digests", "root.provenance.contractDigests", "Contract digests are required.");
    return;
  }
  allowedKeys(
    digests,
    [
      "inputManifestSha256",
      "researcherPromptSha256",
      "writerPromptSha256",
      "reviewerPromptSha256",
      "reviewerRubricSha256",
      "evidenceSha256",
      "draftSha256",
      "reviewSha256",
    ],
    "root.provenance.contractDigests",
    addIssue,
  );
  compareDigest(
    digests.inputManifestSha256,
    run ? safeCanonicalSha256({ run, sources }, "root.provenance.contractDigests", addIssue) : undefined,
    "digest.input-manifest",
    "root.provenance.contractDigests.inputManifestSha256",
    "The input manifest",
    addIssue,
  );
  const promptDigests = [
    ["researcherPromptSha256", sha256(RESEARCHER_SYSTEM_INSTRUCTION)],
    ["writerPromptSha256", sha256(WRITER_SYSTEM_INSTRUCTION)],
    ["reviewerPromptSha256", sha256(REVIEWER_SYSTEM_INSTRUCTION)],
    ["reviewerRubricSha256", sha256(REVIEWER_RUBRIC)],
  ] as const;
  for (const [field, expected] of promptDigests) {
    compareDigest(
      digests[field],
      expected,
      `digest.${field}`,
      `root.provenance.contractDigests.${field}`,
      `The ${field}`,
      addIssue,
    );
  }

  if (evidence) {
    compareDigest(
      digests.evidenceSha256,
      safeCanonicalSha256(evidence, "root.evidenceLedger", addIssue),
      "digest.evidence",
      "root.provenance.contractDigests.evidenceSha256",
      "The evidence ledger",
      addIssue,
    );
  } else if (Object.hasOwn(digests, "evidenceSha256")) {
    addIssue("digest.evidence", "root.provenance.contractDigests.evidenceSha256", "No evidence digest is allowed without evidence.");
  }

  const draftDigests = Array.isArray(digests.draftSha256) ? digests.draftSha256 : [];
  if (!Array.isArray(digests.draftSha256) || draftDigests.length !== drafts.length) {
    addIssue("digest.draft-count", "root.provenance.contractDigests.draftSha256", "Draft and digest counts must match.");
  }
  drafts.forEach((draft, index) => {
    compareDigest(
      draftDigests[index],
      safeCanonicalSha256(draft, `root.drafts[${index}]`, addIssue),
      "digest.draft",
      `root.provenance.contractDigests.draftSha256[${index}]`,
      `Draft ${index + 1}`,
      addIssue,
    );
  });

  const reviewDigests = Array.isArray(digests.reviewSha256) ? digests.reviewSha256 : [];
  if (!Array.isArray(digests.reviewSha256) || reviewDigests.length !== reviews.length) {
    addIssue("digest.review-count", "root.provenance.contractDigests.reviewSha256", "Review and digest counts must match.");
  }
  reviews.forEach((review, index) => {
    compareDigest(
      reviewDigests[index],
      safeCanonicalSha256(review, `root.reviews[${index}]`, addIssue),
      "digest.review",
      `root.provenance.contractDigests.reviewSha256[${index}]`,
      `Review ${index + 1}`,
      addIssue,
    );
  });
}

function verifyDraftsAndReviews(
  evidence: JsonRecord | undefined,
  drafts: unknown[],
  reviews: unknown[],
  calls: JsonRecord[],
  addIssue: AddIssue,
) {
  if (evidence) {
    drafts.forEach((draft, index) => {
      try {
        parseWriterOutput(draft, evidence as unknown as EvidenceLedger);
      } catch (error) {
        const detail =
          error instanceof BlogPipelineValidationError
            ? error.issues.slice(0, 3).join("; ")
            : "The draft could not be validated.";
        addIssue("artifact.draft-contract", `root.drafts[${index}]`, detail);
      }
    });
  }

  reviews.forEach((value, index) => {
    const path = `root.reviews[${index}]`;
    const review = record(value);
    const draft = record(drafts[index]);
    if (!review) {
      addIssue("shape.review", path, "Each review report must be an object.");
      return;
    }
    allowedKeys(
      review,
      [
        "schemaVersion",
        "draftRevision",
        "recommendation",
        "decision",
        "hardGates",
        "claimReviews",
        "unmappedFactualClaims",
        "issues",
        "requiredCorrections",
        "scores",
        "reportedFixtureCostMicroUsd",
        "publicationRecommendation",
      ],
      path,
      addIssue,
    );
    if (draft) {
      try {
        parseReviewerOutput(
          {
            schemaVersion: review.schemaVersion,
            recommendation: review.recommendation,
            claimReviews: review.claimReviews,
            unmappedFactualClaims: review.unmappedFactualClaims,
            issues: review.issues,
            requiredCorrections: review.requiredCorrections,
            scores: review.scores,
          },
          drafts[index] as WriterOutput,
        );
      } catch (error) {
        const detail =
          error instanceof BlogPipelineValidationError
            ? error.issues.slice(0, 3).join("; ")
            : "The review could not be validated.";
        addIssue("artifact.review-contract", path, detail);
      }
    }
    for (const field of ["claimReviews", "unmappedFactualClaims", "issues", "requiredCorrections"] as const) {
      if (!Array.isArray(review[field])) {
        addIssue("artifact.review-shape", `${path}.${field}`, "This review field must be an array.");
      }
    }
    if (review.draftRevision !== index + 1) {
      addIssue("artifact.review-revision", `${path}.draftRevision`, "Review revisions must be contiguous.");
    }
    const hardGates = Array.isArray(review.hardGates) ? review.hardGates : [];
    if (hardGates.length !== HARD_GATES.length) {
      addIssue(
        "artifact.review-hard-gates",
        `${path}.hardGates`,
        "A review must contain exactly the seven fixed hard gates.",
      );
    }
    const expectedGatePasses = HARD_GATES.map((definition) => definition.passes(review));
    HARD_GATES.forEach((definition, gateIndex) => {
      const gatePath = `${path}.hardGates[${gateIndex}]`;
      const gate = record(hardGates[gateIndex]);
      if (!gate) {
        addIssue("artifact.review-hard-gates", gatePath, `The ${definition.id} hard gate is required.`);
        return;
      }
      allowedKeys(gate, ["id", "passed", "detail"], gatePath, addIssue);
      if (gate.id !== definition.id) {
        addIssue(
          "artifact.review-hard-gates",
          `${gatePath}.id`,
          "Hard-gate identifiers and order are fixed by the reviewer contract.",
        );
      }
      if (gate.passed !== expectedGatePasses[gateIndex]) {
        addIssue(
          "artifact.review-hard-gate-result",
          `${gatePath}.passed`,
          "The recorded hard-gate result does not match the review findings.",
        );
      }
      if (typeof gate.detail !== "string" || gate.detail.length === 0) {
        addIssue("artifact.review-hard-gates", `${gatePath}.detail`, "Each hard gate needs a detail string.");
      }
    });
    const hardGatePassed = expectedGatePasses.every(Boolean);
    const recommendation = review.recommendation;
    if (!["approve", "revise", "reject"].includes(String(recommendation))) {
      addIssue(
        "artifact.review-recommendation",
        `${path}.recommendation`,
        "The reviewer recommendation must be approve, revise or reject.",
      );
    }
    const expectedDecision = !hardGatePassed
      ? "reject"
      : recommendation === "revise" && index === 1
        ? "reject"
        : recommendation;
    if (review.decision !== expectedDecision) {
      addIssue("artifact.review-decision", `${path}.decision`, "Review hard gates and recommendation do not derive this decision.");
    }
    const expectedPublication = review.decision === "approve" ? "owner-review-required" : "do-not-publish";
    if (review.publicationRecommendation !== expectedPublication) {
      addIssue(
        "artifact.review-publication",
        `${path}.publicationRecommendation`,
        "The publication recommendation must be derived from the deterministic decision.",
      );
    }

    const draftCitations = draft && Array.isArray(draft.citations) ? draft.citations : [];
    const expectedIds = draftCitations
      .map((citation) => record(citation)?.id)
      .filter((id): id is string => typeof id === "string")
      .sort((left, right) => left.localeCompare(right, "en-GB"));
    const claimReviews = Array.isArray(review.claimReviews) ? review.claimReviews : [];
    const reviewedIds = claimReviews
      .map((claimReview) => record(claimReview)?.citationId)
      .filter((id): id is string => typeof id === "string")
      .sort((left, right) => left.localeCompare(right, "en-GB"));
    if (JSON.stringify(expectedIds) !== JSON.stringify(reviewedIds)) {
      addIssue("artifact.review-coverage", `${path}.claimReviews`, "The review must cover every draft citation exactly once.");
    }

    const reviewCallIndex = index === 0 ? 2 : 4;
    const expectedReportedCost = calls
      .slice(0, reviewCallIndex + 1)
      .reduce(
        (sum, call) => sum + (nonNegativeMoney(call.actualCostMicroUsd) ? call.actualCostMicroUsd : 0),
        0,
      );
    if (review.reportedFixtureCostMicroUsd !== expectedReportedCost) {
      addIssue(
        "budget.review-cost",
        `${path}.reportedFixtureCostMicroUsd`,
        "The review's reported fixture cost must match calls completed at that point.",
      );
    }
  });
}

function verifyWorkflowState(
  root: JsonRecord,
  evidence: JsonRecord | undefined,
  drafts: unknown[],
  reviews: unknown[],
  calls: JsonRecord[],
  addIssue: AddIssue,
) {
  const acceptedResearch = calls[0]?.outcome === "accepted";
  const acceptedDrafts = calls.filter(
    (call) => call.outcome === "accepted" && (call.stage === "draft" || call.stage === "revision"),
  ).length;
  const acceptedReviews = calls.filter(
    (call) => call.outcome === "accepted" && (call.stage === "review" || call.stage === "final-review"),
  ).length;
  if (Boolean(evidence) !== acceptedResearch) {
    addIssue("state.evidence", "root.evidenceLedger", "Evidence presence must match an accepted research call.");
  }
  if (drafts.length !== acceptedDrafts) {
    addIssue("state.drafts", "root.drafts", "Draft count must match accepted Writer calls.");
  }
  if (reviews.length !== acceptedReviews) {
    addIssue("state.reviews", "root.reviews", "Review count must match accepted Reviewer calls.");
  }
  if (drafts.length > 2 || reviews.length > 2 || reviews.length > drafts.length) {
    addIssue("state.artifact-count", "root", "The bundle exceeds the one-revision artifact boundary.");
  }

  const status = root.status;
  const failure = record(root.failure);
  if (status === "failed") {
    if (!failure) {
      addIssue("state.failure", "root.failure", "A failed workflow requires a failure record.");
    }
  } else if (status === "owner-review-required" || status === "rejected") {
    if (failure || Object.hasOwn(root, "failure")) {
      addIssue("state.failure", "root.failure", "A completed workflow cannot carry a failure record.");
    }
    if (calls.some((call) => call.outcome !== "accepted")) {
      addIssue("state.completed-calls", "root.provenance.calls", "Completed workflows require accepted calls only.");
    }
    const expectedArtifacts = calls.length === 3 ? 1 : calls.length === 5 ? 2 : 0;
    if (expectedArtifacts === 0 || drafts.length !== expectedArtifacts || reviews.length !== expectedArtifacts) {
      addIssue("state.completed-path", "root", "Completed workflows must end after exactly three or five calls.");
    }
    if (calls.length === 5 && record(reviews[0])?.decision !== "revise") {
      addIssue("state.revision-entry", "root.reviews[0].decision", "Only a revise decision may enter calls four and five.");
    }
    const finalDecision = record(reviews.at(-1))?.decision;
    const expectedDecision = status === "owner-review-required" ? "approve" : "reject";
    if (finalDecision !== expectedDecision) {
      addIssue("state.final-decision", "root.status", "Workflow status must match the final deterministic review decision.");
    }
  } else {
    addIssue("state.status", "root.status", "The workflow status is invalid.");
  }

  if (failure) {
    allowedKeys(failure, ["code", "stage", "message"], "root.failure", addIssue);
    if (typeof failure.code !== "string" || failure.code.length === 0) {
      addIssue("state.failure", "root.failure.code", "A failure code is required.");
    }
    if (
      failure.stage !== "configuration" &&
      !CALL_PLAN.some(({ stage }) => stage === failure.stage)
    ) {
      addIssue("state.failure", "root.failure.stage", "The failure stage is invalid.");
    }
    if (typeof failure.message !== "string" || failure.message.length === 0) {
      addIssue("state.failure", "root.failure.message", "A failure message is required.");
    }
    const lastCall = calls.at(-1);
    if (
      lastCall &&
      lastCall.outcome !== "accepted" &&
      (failure.stage !== lastCall.stage || failure.code !== lastCall.failureCode)
    ) {
      addIssue("state.failure-provenance", "root.failure", "Failure metadata must match the terminal failed call.");
    }
  }

  const publication = record(root.publication);
  if (!publication) {
    addIssue("shape.publication", "root.publication", "The publication boundary is required.");
  } else {
    allowedKeys(publication, ["permitted", "reason"], "root.publication", addIssue);
    if (publication.permitted !== false) {
      addIssue("scope.publication", "root.publication.permitted", "Phase 18.2 never permits publication.");
    }
    if (typeof publication.reason !== "string" || publication.reason.length === 0) {
      addIssue("scope.publication", "root.publication.reason", "A publication-block reason is required.");
    }
  }
}

/**
 * Verifies a persisted Phase 18.2 output bundle without trusting its TypeScript
 * type annotation. The digest is an integrity check, not an authenticity
 * signature, so all deterministic cross-contract invariants are rechecked.
 */
export function verifyBlogWorkflowBundle(value: unknown): BundleVerificationResult {
  const issues: BundleVerificationIssue[] = [];
  const addIssue: AddIssue = (code, path, message) => issues.push({ code, path, message });
  const root = record(value);
  if (!root) {
    return {
      valid: false,
      issues: [{ code: "shape.root", path: "root", message: "The workflow bundle must be an object." }],
    };
  }

  try {
    if (containsDisallowedPrivateMaterialInValue(root)) {
      addIssue(
        "privacy.bundle-sensitive-material",
        "root",
        "The persisted bundle contains credential-shaped, machine-local or personal sensitive material.",
      );
    }
  } catch {
    addIssue("shape.bundle-json", "root", "The workflow bundle must be bounded JSON data.");
  }

  allowedKeys(
    root,
    [
      "kind",
      "schemaVersion",
      "phase",
      "executionMode",
      "run",
      "status",
      "evidenceLedger",
      "drafts",
      "reviews",
      "provenance",
      "publication",
      "failure",
      "integrity",
    ],
    "root",
    addIssue,
  );
  verifyOuterIntegrity(root, addIssue);
  if (root.kind !== "blog-draft-review-bundle") {
    addIssue("contract.kind", "root.kind", "The bundle kind is invalid.");
  }
  if (root.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    addIssue("contract.schema", "root.schemaVersion", "The bundle schema version is invalid.");
  }
  if (root.phase !== BLOG_PIPELINE_PHASE) {
    addIssue("scope.phase", "root.phase", "The bundle must remain within Phase 18.2.");
  }
  if (root.executionMode !== "saved-fixture") {
    addIssue("scope.execution-mode", "root.executionMode", "Phase 18.2 permits saved-fixture execution only.");
  }

  const run = record(root.run);
  const allowedDomains = verifyRun(run, addIssue);
  const provenance = record(root.provenance);
  if (!provenance) {
    addIssue("shape.provenance", "root.provenance", "The provenance record is required.");
    return { valid: false, issues };
  }
  allowedKeys(
    provenance,
    ["sources", "clients", "calls", "budget", "costBasis", "contractDigests"],
    "root.provenance",
    addIssue,
  );

  const sources = Array.isArray(provenance.sources) ? provenance.sources : [];
  if (!Array.isArray(provenance.sources)) {
    addIssue("shape.sources", "root.provenance.sources", "Source provenance must be an array.");
  }
  verifySourceManifests(sources, allowedDomains, addIssue);
  const evidence = record(root.evidenceLedger);
  if (Object.hasOwn(root, "evidenceLedger") && !evidence) {
    addIssue("shape.evidence", "root.evidenceLedger", "The evidence ledger must be an object when present.");
  }
  if (evidence) verifyEvidenceLinks(evidence, sources, addIssue);

  const drafts = Array.isArray(root.drafts) ? root.drafts : [];
  const reviews = Array.isArray(root.reviews) ? root.reviews : [];
  if (!Array.isArray(root.drafts)) addIssue("shape.drafts", "root.drafts", "Drafts must be an array.");
  if (!Array.isArray(root.reviews)) addIssue("shape.reviews", "root.reviews", "Reviews must be an array.");

  const clientValues = Array.isArray(provenance.clients) ? provenance.clients : [];
  if (!Array.isArray(provenance.clients)) {
    addIssue("shape.clients", "root.provenance.clients", "Client provenance must be an array.");
  }
  const clients = verifyClients(clientValues, addIssue);
  const callValues = Array.isArray(provenance.calls) ? provenance.calls : [];
  if (!Array.isArray(provenance.calls)) {
    addIssue("shape.calls", "root.provenance.calls", "Call provenance must be an array.");
  }
  const calls = verifyCalls(callValues, run, clients, evidence, drafts, reviews, addIssue);
  verifyBudget(record(provenance.budget), record(provenance.costBasis), run, calls, addIssue);
  verifyArtifactDigests(
    record(provenance.contractDigests),
    run,
    sources,
    evidence,
    drafts,
    reviews,
    addIssue,
  );
  verifyDraftsAndReviews(evidence, drafts, reviews, calls, addIssue);
  verifyWorkflowState(root, evidence, drafts, reviews, calls, addIssue);

  return { valid: issues.length === 0, issues };
}
