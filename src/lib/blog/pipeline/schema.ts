import { BlogPostValidationError, parseBlogPost } from "../schema";
import type { BlogContentBlock, BlogPost } from "../types";
import { BlogPipelineValidationError } from "./errors";
import { writerEvidenceContract } from "./prompts";
import {
  containsDisallowedPrivateMaterial,
  containsDisallowedPrivateMaterialInValue,
  containsInstructionLikeText,
  findSourceSecurityFindings,
  isDisallowedLocalHostname,
  overlapsSecurityFinding,
  sha256,
  sliceUtf8,
  sourceUrlPolicyIssues,
  utf8Bytes,
} from "./security";
import {
  BLOG_PIPELINE_DRAFT_DISCLOSURE,
  BLOG_PIPELINE_SCHEMA_VERSION,
  type ApprovedEvidenceSpan,
  type BlogWorkflowInput,
  type ClaimReview,
  type DraftCitation,
  type DraftCitationLocation,
  type EvidenceClaim,
  type EvidenceExcerpt,
  type EvidenceLedger,
  type EvidenceOutlineSection,
  type EvidenceSourceRecord,
  type ModelCallResponse,
  type ModelIdentity,
  type ModelUsage,
  type OfflineSourceDocument,
  type ResearcherOutput,
  type ReviewIssue,
  type ReviewerOutput,
  type ReviewScores,
  type UnmappedFactualClaim,
  type WriterOutput,
} from "./types";

type JsonObject = Record<string, unknown>;

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const MAX_SOURCE_BYTES = 200_000;
const MAX_SOURCE_PACK_BYTES = 1_000_000;

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function keys(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  issues: string[],
) {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) issues.push(`${path}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${path}.${key} is not allowed`);
  }
}

function text(
  value: unknown,
  path: string,
  issues: string[],
  options: { min?: number; max: number; singleLine?: boolean },
) {
  const { min = 1, max, singleLine = false } = options;
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return "";
  }
  if (value !== value.trim()) issues.push(`${path} must not have leading or trailing whitespace`);
  if (value.length < min || value.length > max) {
    issues.push(`${path} must contain between ${min} and ${max} characters`);
  }
  if (CONTROL_CHARACTERS.test(value)) issues.push(`${path} contains an unsafe control character`);
  if (singleLine && /[\r\n]/u.test(value)) issues.push(`${path} must be a single line`);
  return value;
}

function identifier(value: unknown, path: string, issues: string[], max = 100) {
  const result = text(value, path, issues, { max, singleLine: true });
  if (result && !IDENTIFIER.test(result)) {
    issues.push(`${path} must use lowercase words separated by single hyphens`);
  }
  if (result && containsInstructionLikeText(result)) {
    issues.push(`${path} contains instruction-like text and cannot cross a role boundary`);
  }
  return result;
}

function modelToken(value: unknown, path: string, issues: string[], max = 160) {
  const result = text(value, path, issues, { max, singleLine: true });
  if (result && !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u.test(result)) {
    issues.push(`${path} contains unsupported model-identity characters`);
  }
  return result;
}

function safeInteger(
  value: unknown,
  path: string,
  issues: string[],
  options: { min?: number; max?: number } = {},
) {
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) {
    issues.push(`${path} must be a safe integer between ${min} and ${max}`);
    return min;
  }
  return value as number;
}

function isoTimestamp(value: unknown, path: string, issues: string[]) {
  const result = text(value, path, issues, { min: 24, max: 30, singleLine: true });
  const parsed = new Date(result);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== result) {
    issues.push(`${path} must be a canonical UTC ISO timestamp`);
  }
  return result;
}

function stringArray(
  value: unknown,
  path: string,
  issues: string[],
  options: { min: number; max: number; itemMax?: number; identifiers?: boolean },
) {
  if (!Array.isArray(value) || value.length < options.min || value.length > options.max) {
    issues.push(`${path} must contain between ${options.min} and ${options.max} entries`);
    return [];
  }
  const result = value.map((item, index) =>
    options.identifiers
      ? identifier(item, `${path}[${index}]`, issues)
      : text(item, `${path}[${index}]`, issues, {
          max: options.itemMax ?? 500,
          singleLine: true,
        }),
  );
  if (new Set(result).size !== result.length) issues.push(`${path} must contain unique entries`);
  return result;
}

function sourceUrl(value: unknown, path: string, issues: string[], allowedDomains: readonly string[]) {
  const result = text(value, path, issues, { max: 2_000, singleLine: true });
  for (const issue of sourceUrlPolicyIssues(result, allowedDomains)) {
    issues.push(`${path} ${issue}`);
  }
  return result;
}

function duplicates(values: readonly string[], path: string, issues: string[]) {
  if (new Set(values).size !== values.length) issues.push(`${path} identifiers must be unique`);
}

function parseApprovedEvidenceSpans(
  value: unknown,
  path: string,
  issues: string[],
  content: string,
): ApprovedEvidenceSpan[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    issues.push(`${path} must contain between 1 and 100 owner-approved exact spans`);
    return [];
  }
  const spans = value.map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!object(entry)) {
      issues.push(`${entryPath} must be an object`);
      return { startByte: 0, endByte: 0, sha256: "" };
    }
    keys(entry, ["startByte", "endByte", "sha256"], [], entryPath, issues);
    const startByte = safeInteger(entry.startByte, `${entryPath}.startByte`, issues);
    const endByte = safeInteger(entry.endByte, `${entryPath}.endByte`, issues);
    const digest = text(entry.sha256, `${entryPath}.sha256`, issues, {
      min: 64,
      max: 64,
      singleLine: true,
    });
    if (!/^[a-f0-9]{64}$/u.test(digest)) issues.push(`${entryPath}.sha256 must be lowercase SHA-256`);
    const exact = sliceUtf8(content, startByte, endByte);
    if (endByte <= startByte || endByte > utf8Bytes(content) || exact === undefined) {
      issues.push(`${entryPath} must use complete UTF-8 byte bounds inside source content`);
    } else if (sha256(exact) !== digest) {
      issues.push(`${entryPath}.sha256 does not match its exact source span`);
    }
    return { startByte, endByte, sha256: digest };
  });
  const rangeKeys = spans.map((span) => `${span.startByte}:${span.endByte}`);
  if (new Set(rangeKeys).size !== rangeKeys.length) issues.push(`${path} must contain unique spans`);
  return spans;
}

function parseSource(
  value: unknown,
  path: string,
  issues: string[],
  allowedDomains: readonly string[],
): OfflineSourceDocument {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return {
      id: "",
      title: "",
      url: "",
      accessedAt: "",
      approvedForModelUse: true,
      privacyReviewed: true,
      approvedEvidenceSpans: [],
      content: "",
    };
  }
  keys(
    value,
    [
      "id",
      "title",
      "url",
      "accessedAt",
      "approvedForModelUse",
      "privacyReviewed",
      "approvedEvidenceSpans",
      "content",
    ],
    ["publisher"],
    path,
    issues,
  );
  if (value.approvedForModelUse !== true) {
    issues.push(`${path}.approvedForModelUse must be true after owner review of the saved public source`);
  }
  if (value.privacyReviewed !== true) {
    issues.push(`${path}.privacyReviewed must be true after owner review for non-public personal data`);
  }
  const content = text(value.content, `${path}.content`, issues, { max: MAX_SOURCE_BYTES });
  const source: OfflineSourceDocument = {
    id: identifier(value.id, `${path}.id`, issues),
    title: text(value.title, `${path}.title`, issues, { max: 200, singleLine: true }),
    url: sourceUrl(value.url, `${path}.url`, issues, allowedDomains),
    accessedAt: isoTimestamp(value.accessedAt, `${path}.accessedAt`, issues),
    approvedForModelUse: true,
    privacyReviewed: true,
    approvedEvidenceSpans: parseApprovedEvidenceSpans(
      value.approvedEvidenceSpans,
      `${path}.approvedEvidenceSpans`,
      issues,
      content,
    ),
    content,
  };
  if (Object.hasOwn(value, "publisher")) {
    source.publisher = text(value.publisher, `${path}.publisher`, issues, {
      max: 120,
      singleLine: true,
    });
  }
  if (utf8Bytes(source.content) > MAX_SOURCE_BYTES) {
    issues.push(`${path}.content must be at most ${MAX_SOURCE_BYTES} UTF-8 bytes`);
  }
  if (containsDisallowedPrivateMaterial(source.content)) {
    issues.push(
      `${path}.content contains credential-shaped sensitive material, a machine-local path or other personal sensitive material`,
    );
  }
  const metadata = [source.id, source.title, source.url, source.publisher ?? ""].join("\n");
  if (containsDisallowedPrivateMaterial(metadata)) {
    issues.push(
      `${path} metadata contains credential-shaped sensitive material, a machine-local path or other personal sensitive material`,
    );
  }
  if (containsInstructionLikeText(metadata)) {
    issues.push(`${path} metadata contains instruction-like text and cannot enter the Writer source list`);
  }
  return source;
}

export function parseBlogWorkflowInput(value: unknown): BlogWorkflowInput {
  const issues: string[] = [];
  if (!object(value)) throw new BlogPipelineValidationError(["root must be an object"], "workflow input");
  keys(
    value,
    [
      "schemaVersion",
      "runId",
      "requestedAt",
      "topic",
      "audience",
      "allowedDomains",
      "runCostCeilingMicroUsd",
      "dryRun",
      "sources",
    ],
    [],
    "root",
    issues,
  );
  if (value.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    issues.push(`root.schemaVersion must be ${BLOG_PIPELINE_SCHEMA_VERSION}`);
  }
  if (value.dryRun !== true) issues.push("root.dryRun must be true in Phase 18.2");

  const allowedDomains = stringArray(value.allowedDomains, "root.allowedDomains", issues, {
    min: 1,
    max: 20,
    itemMax: 253,
  }).map((domain, index) => {
    const normalised = domain.toLocaleLowerCase("en-GB");
    if (domain !== normalised || !DOMAIN.test(normalised)) {
      issues.push(`root.allowedDomains[${index}] must be a lowercase hostname without wildcards or ports`);
    }
    if (isDisallowedLocalHostname(normalised)) {
      issues.push(`root.allowedDomains[${index}] must not identify a loopback, private, link-local or local-network host`);
    }
    return normalised;
  });

  const sources: OfflineSourceDocument[] = [];
  if (!Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 20) {
    issues.push("root.sources must contain between 1 and 20 saved source documents");
  } else {
    value.sources.forEach((source, index) => {
      sources.push(parseSource(source, `root.sources[${index}]`, issues, allowedDomains));
    });
  }
  duplicates(sources.map((source) => source.id), "root.sources", issues);
  duplicates(sources.map((source) => source.url), "root.sources URLs", issues);
  if (sources.reduce((total, source) => total + utf8Bytes(source.content), 0) > MAX_SOURCE_PACK_BYTES) {
    issues.push(`root.sources must total at most ${MAX_SOURCE_PACK_BYTES} UTF-8 bytes`);
  }

  const parsed: BlogWorkflowInput = {
    schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
    runId: identifier(value.runId, "root.runId", issues, 120),
    requestedAt: isoTimestamp(value.requestedAt, "root.requestedAt", issues),
    topic: text(value.topic, "root.topic", issues, { min: 4, max: 300, singleLine: true }),
    audience: text(value.audience, "root.audience", issues, {
      min: 4,
      max: 300,
      singleLine: true,
    }),
    allowedDomains,
    runCostCeilingMicroUsd: safeInteger(
      value.runCostCeilingMicroUsd,
      "root.runCostCeilingMicroUsd",
      issues,
      { min: 1, max: 1_000_000_000 },
    ),
    dryRun: true,
    sources,
  };
  if (
    containsDisallowedPrivateMaterial(
      `${parsed.runId}\n${parsed.topic}\n${parsed.audience}\n${parsed.allowedDomains.join("\n")}`,
    )
  ) {
    issues.push(
      "root run metadata must not contain credential-shaped sensitive material, a machine-local path or other personal sensitive material",
    );
  }
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "workflow input");
  return parsed;
}

function parseExcerpt(value: unknown, path: string, issues: string[]): EvidenceExcerpt {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return {
      id: "",
      sourceId: "",
      locator: "",
      startByte: 0,
      endByte: 0,
      text: "",
      classification: "untrusted-instruction",
    };
  }
  keys(
    value,
    ["id", "sourceId", "locator", "startByte", "endByte", "text", "classification"],
    [],
    path,
    issues,
  );
  const classification = value.classification;
  if (classification !== "evidence" && classification !== "untrusted-instruction") {
    issues.push(`${path}.classification must be evidence or untrusted-instruction`);
  }
  return {
    id: identifier(value.id, `${path}.id`, issues),
    sourceId: identifier(value.sourceId, `${path}.sourceId`, issues),
    locator: text(value.locator, `${path}.locator`, issues, { max: 300, singleLine: true }),
    startByte: safeInteger(value.startByte, `${path}.startByte`, issues),
    endByte: safeInteger(value.endByte, `${path}.endByte`, issues),
    text: text(value.text, `${path}.text`, issues, { max: 4_000 }),
    classification: classification === "evidence" ? "evidence" : "untrusted-instruction",
  };
}

function parseClaim(value: unknown, path: string, issues: string[]): EvidenceClaim {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { id: "", text: "", assessment: "insufficient", evidenceIds: [] };
  }
  keys(value, ["id", "text", "assessment", "evidenceIds"], [], path, issues);
  const assessment = value.assessment;
  if (assessment !== "supported" && assessment !== "contradicted" && assessment !== "insufficient") {
    issues.push(`${path}.assessment must be supported, contradicted or insufficient`);
  }
  return {
    id: identifier(value.id, `${path}.id`, issues),
    text: text(value.text, `${path}.text`, issues, { max: 1_000, singleLine: true }),
    assessment:
      assessment === "supported" || assessment === "contradicted" ? assessment : "insufficient",
    evidenceIds: stringArray(value.evidenceIds, `${path}.evidenceIds`, issues, {
      min: assessment === "insufficient" ? 0 : 1,
      max: 12,
      identifiers: true,
    }),
  };
}

function parseOutline(value: unknown, path: string, issues: string[]): EvidenceOutlineSection {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { id: "", heading: "", claimIds: [] };
  }
  keys(value, ["id", "heading", "claimIds"], [], path, issues);
  return {
    id: identifier(value.id, `${path}.id`, issues),
    heading: text(value.heading, `${path}.heading`, issues, { max: 120, singleLine: true }),
    claimIds: stringArray(value.claimIds, `${path}.claimIds`, issues, {
      min: 1,
      max: 20,
      identifiers: true,
    }),
  };
}

function evidenceSourceRecords(sources: readonly OfflineSourceDocument[]): EvidenceSourceRecord[] {
  return sources.map((source) => ({
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

export function parseEvidenceLedger(
  value: unknown,
  input: BlogWorkflowInput,
): EvidenceLedger {
  const issues: string[] = [];
  const suppliedFindings = findSourceSecurityFindings(input.sources);
  if (!object(value)) throw new BlogPipelineValidationError(["root must be an object"], "researcher output");
  keys(value, ["schemaVersion", "researchQuestion", "excerpts", "claims", "outline"], [], "root", issues);
  if (value.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    issues.push(`root.schemaVersion must be ${BLOG_PIPELINE_SCHEMA_VERSION}`);
  }

  const excerpts: EvidenceExcerpt[] = [];
  if (!Array.isArray(value.excerpts) || value.excerpts.length < 1 || value.excerpts.length > 200) {
    issues.push("root.excerpts must contain between 1 and 200 entries");
  } else {
    value.excerpts.forEach((excerpt, index) =>
      excerpts.push(parseExcerpt(excerpt, `root.excerpts[${index}]`, issues)),
    );
  }
  duplicates(excerpts.map((excerpt) => excerpt.id), "root.excerpts", issues);

  const claims: EvidenceClaim[] = [];
  if (!Array.isArray(value.claims) || value.claims.length < 1 || value.claims.length > 100) {
    issues.push("root.claims must contain between 1 and 100 entries");
  } else {
    value.claims.forEach((claim, index) => claims.push(parseClaim(claim, `root.claims[${index}]`, issues)));
  }
  duplicates(claims.map((claim) => claim.id), "root.claims", issues);

  const outline: EvidenceOutlineSection[] = [];
  if (!Array.isArray(value.outline) || value.outline.length < 1 || value.outline.length > 30) {
    issues.push("root.outline must contain between 1 and 30 entries");
  } else {
    value.outline.forEach((section, index) =>
      outline.push(parseOutline(section, `root.outline[${index}]`, issues)),
    );
  }
  duplicates(outline.map((section) => section.id), "root.outline", issues);

  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const excerptById = new Map(excerpts.map((excerpt) => [excerpt.id, excerpt]));
  const claimById = new Map(claims.map((claim) => [claim.id, claim]));
  excerpts.forEach((excerpt, index) => {
    const source = sourceById.get(excerpt.sourceId);
    if (!source) {
      issues.push(`root.excerpts[${index}].sourceId does not identify an input source`);
      return;
    }
    if (excerpt.endByte <= excerpt.startByte || excerpt.endByte > utf8Bytes(source.content)) {
      issues.push(`root.excerpts[${index}] has invalid UTF-8 byte bounds`);
      return;
    }
    const exact = sliceUtf8(source.content, excerpt.startByte, excerpt.endByte);
    if (exact === undefined || exact !== excerpt.text) {
      issues.push(`root.excerpts[${index}].text is not the exact saved source span`);
    }
    if (
      excerpt.classification === "evidence" &&
      !source.approvedEvidenceSpans.some(
        (span) =>
          span.startByte === excerpt.startByte &&
          span.endByte === excerpt.endByte &&
          span.sha256 === sha256(excerpt.text),
      )
    ) {
      issues.push(
        `root.excerpts[${index}] may be Writer evidence only when it exactly matches an owner-approved source span`,
      );
    }
    // Pattern matching is only a warning signal. The durable boundary is that
    // all source text remains untrusted data and only validated evidence reaches
    // the Writer. A clean scan never promotes a source into instructions.
    if (
      overlapsSecurityFinding(
        excerpt.sourceId,
        excerpt.startByte,
        excerpt.endByte,
        suppliedFindings,
      ) &&
      excerpt.classification !== "untrusted-instruction"
    ) {
      issues.push(`root.excerpts[${index}] overlaps an injection signal and must be quarantined`);
    }
    if (
      excerpt.classification === "evidence" &&
      containsInstructionLikeText(excerpt.text)
    ) {
      issues.push(
        `root.excerpts[${index}] contains normalized or encoded instruction-like text and must be quarantined`,
      );
    }
  });

  claims.forEach((claim, claimIndex) => {
    claim.evidenceIds.forEach((evidenceId, evidenceIndex) => {
      const excerpt = excerptById.get(evidenceId);
      if (!excerpt) {
        issues.push(`root.claims[${claimIndex}].evidenceIds[${evidenceIndex}] is unknown`);
      } else if (claim.assessment === "supported" && excerpt.classification !== "evidence") {
        issues.push(`root.claims[${claimIndex}] cannot be supported by quarantined instructions`);
      }
    });
    if (
      claim.assessment === "supported" &&
      !claim.evidenceIds.some((evidenceId) => excerptById.get(evidenceId)?.text === claim.text)
    ) {
      issues.push(
        `root.claims[${claimIndex}].text must exactly equal one of its owner-approved evidence spans`,
      );
    }
  });
  outline.forEach((section, sectionIndex) => {
    section.claimIds.forEach((claimId, claimIndex) => {
      const claim = claimById.get(claimId);
      if (!claim) {
        issues.push(`root.outline[${sectionIndex}].claimIds[${claimIndex}] is unknown`);
      } else if (claim.assessment !== "supported") {
        issues.push(`root.outline[${sectionIndex}] may contain only supported claims`);
      }
    });
  });

  const parsed: EvidenceLedger = {
    schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
    researchQuestion: text(value.researchQuestion, "root.researchQuestion", issues, {
      min: 4,
      max: 500,
      singleLine: true,
    }),
    sources: evidenceSourceRecords(input.sources),
    excerpts,
    claims,
    outline,
    securityFindings: [...suppliedFindings],
  };
  if (containsDisallowedPrivateMaterialInValue(parsed)) {
    issues.push(
      "root contains credential-shaped sensitive material, a machine-local path or other personal sensitive material",
    );
  }
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "researcher output");
  return parsed;
}

function parseLocation(value: unknown, path: string, issues: string[]): DraftCitationLocation {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { scope: "post", field: "title" };
  }
  if (value.scope === "post") {
    const keyword = value.field === "seo-keyword";
    keys(value, ["scope", "field"], keyword ? ["itemIndex"] : [], path, issues);
    if (
      !["title", "excerpt", "disclosure", "seo-title", "seo-description", "seo-keyword"].includes(
        String(value.field),
      )
    ) {
      issues.push(`${path}.field is not a supported post field`);
    }
    if (keyword) {
      return {
        scope: "post",
        field: "seo-keyword",
        itemIndex: safeInteger(value.itemIndex, `${path}.itemIndex`, issues, { max: 11 }),
      };
    }
    const field = ["excerpt", "disclosure", "seo-title", "seo-description"].includes(String(value.field))
      ? (value.field as "excerpt" | "disclosure" | "seo-title" | "seo-description")
      : "title";
    return { scope: "post", field };
  }
  if (value.scope === "block") {
    keys(value, ["scope", "blockIndex", "field"], ["itemIndex"], path, issues);
    if (!["text", "title", "item"].includes(String(value.field))) {
      issues.push(`${path}.field is not a supported block field`);
    }
    const field = value.field === "title" || value.field === "item" ? value.field : "text";
    const location: Extract<DraftCitationLocation, { scope: "block" }> = {
      scope: "block",
      blockIndex: safeInteger(value.blockIndex, `${path}.blockIndex`, issues, { max: 99 }),
      field,
    };
    if (field === "item") {
      location.itemIndex = safeInteger(value.itemIndex, `${path}.itemIndex`, issues, { max: 29 });
    } else if (Object.hasOwn(value, "itemIndex")) {
      issues.push(`${path}.itemIndex is allowed only for item locations`);
    }
    return location;
  }
  issues.push(`${path}.scope must be post or block`);
  return { scope: "post", field: "title" };
}

function parseCitation(value: unknown, path: string, issues: string[]): DraftCitation {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return {
      id: "",
      claimId: "",
      evidenceIds: [],
      location: { scope: "post", field: "title" },
      quotedText: "",
    };
  }
  keys(value, ["id", "claimId", "evidenceIds", "location", "quotedText"], [], path, issues);
  return {
    id: identifier(value.id, `${path}.id`, issues),
    claimId: identifier(value.claimId, `${path}.claimId`, issues),
    evidenceIds: stringArray(value.evidenceIds, `${path}.evidenceIds`, issues, {
      min: 1,
      max: 12,
      identifiers: true,
    }),
    location: parseLocation(value.location, `${path}.location`, issues),
    quotedText: text(value.quotedText, `${path}.quotedText`, issues, { max: 1_500 }),
  };
}

export function readDraftLocation(post: BlogPost, location: DraftCitationLocation) {
  if (location.scope === "post") {
    switch (location.field) {
      case "title":
        return post.title;
      case "excerpt":
        return post.excerpt;
      case "disclosure":
        return post.disclosure;
      case "seo-title":
        return post.seo.title;
      case "seo-description":
        return post.seo.description;
      case "seo-keyword":
        return post.seo.keywords[location.itemIndex];
    }
  }

  const block: BlogContentBlock | undefined = post.blocks[location.blockIndex];
  if (!block) return undefined;
  if (location.field === "item") {
    return block.type === "list" && location.itemIndex !== undefined
      ? block.items[location.itemIndex]
      : undefined;
  }
  if (location.field === "title") {
    return block.type === "callout" ? block.title : undefined;
  }
  return block.type === "heading" || block.type === "paragraph" || block.type === "callout"
    ? block.text
    : undefined;
}

function postText(post: BlogPost) {
  const blockText = post.blocks.flatMap((block) => {
    switch (block.type) {
      case "heading":
      case "paragraph":
        return [block.text];
      case "list":
        return block.items;
      case "callout":
        return block.title ? [block.title, block.text] : [block.text];
    }
  });
  return [
    post.title,
    post.excerpt,
    post.disclosure,
    post.seo.title,
    post.seo.description,
    ...post.seo.keywords,
    ...post.sources.flatMap((source) => [source.title, source.url, source.publisher ?? ""]),
    ...blockText,
  ].join("\n");
}

export function parseWriterOutput(
  value: unknown,
  ledger: EvidenceLedger,
): WriterOutput {
  ledger = writerEvidenceContract(ledger);
  const issues: string[] = [];
  if (!object(value)) throw new BlogPipelineValidationError(["root must be an object"], "writer output");
  keys(value, ["schemaVersion", "post", "citations"], [], "root", issues);
  if (value.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    issues.push(`root.schemaVersion must be ${BLOG_PIPELINE_SCHEMA_VERSION}`);
  }

  let post: BlogPost;
  try {
    post = parseBlogPost(value.post, "writer output post");
  } catch (error) {
    if (error instanceof BlogPostValidationError) issues.push(...error.issues.map((issue) => `root.post: ${issue}`));
    else issues.push("root.post failed blog-post validation");
    post = {
      schemaVersion: 1,
      status: "draft",
      slug: "invalid",
      title: "Invalid draft",
      excerpt: "Invalid draft placeholder.",
      publishedAt: null,
      updatedAt: null,
      author: { name: "OJ Florendo", url: "/about" },
      disclosure: "Invalid disclosure placeholder.",
      blocks: [{ type: "paragraph", text: "Invalid draft placeholder." }],
      sources: [],
      seo: { title: "Invalid draft", description: "Invalid draft placeholder.", keywords: ["invalid"] },
    };
  }
  if (post.status !== "draft" || post.publishedAt !== null || post.updatedAt !== null) {
    issues.push("root.post must remain an unpublished draft with null publication dates");
  }
  if (post.disclosure !== BLOG_PIPELINE_DRAFT_DISCLOSURE) {
    issues.push(
      "root.post.disclosure must use the approved Phase 18.2 wording and state that OJ's review is still required",
    );
  }
  if (containsDisallowedPrivateMaterial(postText(post))) {
    issues.push(
      "root.post contains credential-shaped sensitive material, a machine-local path or other personal sensitive material",
    );
  }

  const citations: DraftCitation[] = [];
  if (!Array.isArray(value.citations) || value.citations.length < 1 || value.citations.length > 100) {
    issues.push("root.citations must contain between 1 and 100 entries");
  } else {
    value.citations.forEach((citation, index) =>
      citations.push(parseCitation(citation, `root.citations[${index}]`, issues)),
    );
  }
  duplicates(citations.map((citation) => citation.id), "root.citations", issues);

  const claimById = new Map(ledger.claims.map((claim) => [claim.id, claim]));
  const excerptById = new Map(ledger.excerpts.map((excerpt) => [excerpt.id, excerpt]));
  const outlinedClaimIds = new Set(ledger.outline.flatMap((section) => section.claimIds));
  const usedSourceIds = new Set<string>();
  citations.forEach((citation, citationIndex) => {
    const claim = claimById.get(citation.claimId);
    if (!claim) {
      issues.push(`root.citations[${citationIndex}].claimId is unknown`);
    } else if (claim.assessment !== "supported") {
      issues.push(`root.citations[${citationIndex}] may cite only a supported claim`);
    } else if (!outlinedClaimIds.has(claim.id)) {
      issues.push(`root.citations[${citationIndex}] may cite only a Writer-eligible outlined claim`);
    }
    citation.evidenceIds.forEach((evidenceId, evidenceIndex) => {
      const excerpt = excerptById.get(evidenceId);
      if (!excerpt) {
        issues.push(`root.citations[${citationIndex}].evidenceIds[${evidenceIndex}] is unknown`);
      } else {
        usedSourceIds.add(excerpt.sourceId);
        if (excerpt.classification !== "evidence") {
          issues.push(`root.citations[${citationIndex}] may not cite a quarantined instruction`);
        }
      }
      if (claim && !claim.evidenceIds.includes(evidenceId)) {
        issues.push(`root.citations[${citationIndex}] cites evidence outside its research claim`);
      }
    });
    if (
      claim &&
      !citation.evidenceIds.some((evidenceId) => {
        const excerpt = excerptById.get(evidenceId);
        return excerpt?.classification === "evidence" && excerpt.text === claim.text;
      })
    ) {
      issues.push(
        `root.citations[${citationIndex}] must include the exact owner-approved evidence span for its claim`,
      );
    }
    const target = readDraftLocation(post, citation.location);
    if (target === undefined) {
      issues.push(`root.citations[${citationIndex}].location does not resolve to draft text`);
    } else if (!target.includes(citation.quotedText)) {
      issues.push(`root.citations[${citationIndex}].quotedText is not present at its draft location`);
    }
    if (claim && citation.quotedText !== claim.text) {
      issues.push(`root.citations[${citationIndex}].quotedText must exactly equal its supported claim`);
    }
  });

  const postSourceIds = post.sources.map((source) => source.id).sort((a, b) => a.localeCompare(b, "en-GB"));
  const citedSourceIds = [...usedSourceIds].sort((a, b) => a.localeCompare(b, "en-GB"));
  if (JSON.stringify(postSourceIds) !== JSON.stringify(citedSourceIds)) {
    issues.push("root.post.sources must be the exact set of sources used by citations");
  }
  const ledgerSourceById = new Map(ledger.sources.map((source) => [source.id, source]));
  post.sources.forEach((source, sourceIndex) => {
    const expected = ledgerSourceById.get(source.id);
    if (
      !expected ||
      source.title !== expected.title ||
      source.url !== expected.url ||
      source.publisher !== expected.publisher ||
      source.accessedAt !== expected.accessedAt.slice(0, 10)
    ) {
      issues.push(`root.post.sources[${sourceIndex}] does not exactly match the saved source manifest`);
    }
  });

  const allPostText = postText(post).toLocaleLowerCase("en-GB");
  for (const excerpt of ledger.excerpts) {
    if (
      excerpt.classification === "untrusted-instruction" &&
      allPostText.includes(excerpt.text.toLocaleLowerCase("en-GB"))
    ) {
      issues.push("root.post copies a quarantined source instruction");
      break;
    }
  }
  if (containsInstructionLikeText(postText(post))) {
    issues.push("root.post contains instruction-like text that cannot enter a draft artefact");
  }

  const parsed: WriterOutput = {
    schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
    post,
    citations,
  };
  if (containsInstructionLikeText(JSON.stringify(parsed))) {
    issues.push("root contains instruction-like text that cannot cross into review or revision");
  }
  if (containsDisallowedPrivateMaterialInValue(parsed)) {
    issues.push(
      "root contains credential-shaped sensitive material, a machine-local path or other personal sensitive material",
    );
  }
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "writer output");
  return parsed;
}

function parseClaimReview(value: unknown, path: string, issues: string[]): ClaimReview {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { citationId: "", assessment: "unverifiable", note: "Invalid review entry." };
  }
  keys(value, ["citationId", "assessment", "note"], [], path, issues);
  const assessment = value.assessment;
  if (!["supported", "unsupported", "contradicted", "unverifiable"].includes(String(assessment))) {
    issues.push(`${path}.assessment is invalid`);
  }
  return {
    citationId: identifier(value.citationId, `${path}.citationId`, issues),
    assessment:
      assessment === "supported" || assessment === "unsupported" || assessment === "contradicted"
        ? assessment
        : "unverifiable",
    note: text(value.note, `${path}.note`, issues, { max: 1_000 }),
  };
}

function parseUnmappedClaim(value: unknown, path: string, issues: string[]): UnmappedFactualClaim {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return {
      location: { scope: "post", field: "title" },
      text: "",
      reason: "Invalid unmapped-claim entry.",
    };
  }
  keys(value, ["location", "text", "reason"], [], path, issues);
  return {
    location: parseLocation(value.location, `${path}.location`, issues),
    text: text(value.text, `${path}.text`, issues, { max: 1_500 }),
    reason: text(value.reason, `${path}.reason`, issues, { max: 1_000 }),
  };
}

function parseIssue(value: unknown, path: string, issues: string[]): ReviewIssue {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return {
      code: "invalid-review-issue",
      category: "unsafe-content",
      severity: "high",
      message: "Invalid review issue entry.",
    };
  }
  keys(value, ["code", "category", "severity", "message"], [], path, issues);
  const categories = [
    "evidence",
    "citation",
    "contradiction",
    "prompt-injection",
    "privacy",
    "unsafe-content",
    "writing-quality",
    "voice",
    "seo",
  ] as const;
  const severities = ["low", "medium", "high"] as const;
  if (!categories.includes(value.category as (typeof categories)[number])) {
    issues.push(`${path}.category is invalid`);
  }
  if (!severities.includes(value.severity as (typeof severities)[number])) {
    issues.push(`${path}.severity is invalid`);
  }
  return {
    code: identifier(value.code, `${path}.code`, issues),
    category: categories.includes(value.category as (typeof categories)[number])
      ? (value.category as (typeof categories)[number])
      : "unsafe-content",
    severity: severities.includes(value.severity as (typeof severities)[number])
      ? (value.severity as (typeof severities)[number])
      : "high",
    message: text(value.message, `${path}.message`, issues, { max: 1_000 }),
  };
}

function parseScores(value: unknown, path: string, issues: string[]): ReviewScores {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { groundedness: 0, citationQuality: 0, writingAndVoice: 0, securityAndRobustness: 0 };
  }
  keys(
    value,
    ["groundedness", "citationQuality", "writingAndVoice", "securityAndRobustness"],
    [],
    path,
    issues,
  );
  return {
    groundedness: safeInteger(value.groundedness, `${path}.groundedness`, issues, { max: 100 }),
    citationQuality: safeInteger(value.citationQuality, `${path}.citationQuality`, issues, { max: 100 }),
    writingAndVoice: safeInteger(value.writingAndVoice, `${path}.writingAndVoice`, issues, { max: 100 }),
    securityAndRobustness: safeInteger(value.securityAndRobustness, `${path}.securityAndRobustness`, issues, {
      max: 100,
    }),
  };
}

export function parseReviewerOutput(value: unknown, draft: WriterOutput): ReviewerOutput {
  const issues: string[] = [];
  if (!object(value)) throw new BlogPipelineValidationError(["root must be an object"], "reviewer output");
  keys(
    value,
    [
      "schemaVersion",
      "recommendation",
      "claimReviews",
      "unmappedFactualClaims",
      "issues",
      "requiredCorrections",
      "scores",
    ],
    [],
    "root",
    issues,
  );
  if (value.schemaVersion !== BLOG_PIPELINE_SCHEMA_VERSION) {
    issues.push(`root.schemaVersion must be ${BLOG_PIPELINE_SCHEMA_VERSION}`);
  }
  const recommendation = value.recommendation;
  if (!['approve', 'revise', 'reject'].includes(String(recommendation))) {
    issues.push("root.recommendation must be approve, revise or reject");
  }

  const claimReviews: ClaimReview[] = [];
  if (!Array.isArray(value.claimReviews) || value.claimReviews.length < 1 || value.claimReviews.length > 100) {
    issues.push("root.claimReviews must contain between 1 and 100 entries");
  } else {
    value.claimReviews.forEach((review, index) =>
      claimReviews.push(parseClaimReview(review, `root.claimReviews[${index}]`, issues)),
    );
  }
  duplicates(claimReviews.map((review) => review.citationId), "root.claimReviews", issues);
  const expectedCitationIds = draft.citations.map((citation) => citation.id).sort((a, b) => a.localeCompare(b, "en-GB"));
  const reviewedCitationIds = claimReviews.map((review) => review.citationId).sort((a, b) => a.localeCompare(b, "en-GB"));
  if (JSON.stringify(expectedCitationIds) !== JSON.stringify(reviewedCitationIds)) {
    issues.push("root.claimReviews must cover every draft citation exactly once and no others");
  }

  const unmappedFactualClaims: UnmappedFactualClaim[] = [];
  if (!Array.isArray(value.unmappedFactualClaims) || value.unmappedFactualClaims.length > 50) {
    issues.push("root.unmappedFactualClaims must be an array of at most 50 entries");
  } else {
    value.unmappedFactualClaims.forEach((claim, index) =>
      unmappedFactualClaims.push(parseUnmappedClaim(claim, `root.unmappedFactualClaims[${index}]`, issues)),
    );
  }
  unmappedFactualClaims.forEach((claim, index) => {
    const target = readDraftLocation(draft.post, claim.location);
    if (target === undefined || !target.includes(claim.text)) {
      issues.push(`root.unmappedFactualClaims[${index}].text is not present at its draft location`);
    }
  });

  const reviewIssues: ReviewIssue[] = [];
  if (!Array.isArray(value.issues) || value.issues.length > 50) {
    issues.push("root.issues must be an array of at most 50 entries");
  } else {
    value.issues.forEach((issue, index) => reviewIssues.push(parseIssue(issue, `root.issues[${index}]`, issues)));
  }
  duplicates(reviewIssues.map((issue) => issue.code), "root.issues", issues);

  const requiredCorrections = stringArray(value.requiredCorrections, "root.requiredCorrections", issues, {
    min: 0,
    max: 50,
    itemMax: 1_000,
  });
  if (recommendation === "approve" && requiredCorrections.length > 0) {
    issues.push("root.requiredCorrections must be empty when recommendation is approve");
  }
  if (recommendation === "revise" && requiredCorrections.length < 1) {
    issues.push("root.requiredCorrections must not be empty when recommendation is revise");
  }

  const parsed: ReviewerOutput = {
    schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
    recommendation:
      recommendation === "approve" || recommendation === "revise" ? recommendation : "reject",
    claimReviews,
    unmappedFactualClaims,
    issues: reviewIssues,
    requiredCorrections,
    scores: parseScores(value.scores, "root.scores", issues),
  };
  if (containsDisallowedPrivateMaterialInValue(parsed)) {
    issues.push(
      "root contains credential-shaped sensitive material, a machine-local path or other personal sensitive material",
    );
  }
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "reviewer output");
  return parsed;
}

function parseIdentity(value: unknown, path: string, issues: string[]): ModelIdentity {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { provider: "invalid", model: "invalid", version: "invalid" };
  }
  keys(value, ["provider", "model", "version"], [], path, issues);
  const parsed = {
    provider: modelToken(value.provider, `${path}.provider`, issues),
    model: modelToken(value.model, `${path}.model`, issues),
    version: text(value.version, `${path}.version`, issues, { max: 100, singleLine: true }),
  };
  if (containsDisallowedPrivateMaterialInValue(parsed)) {
    issues.push(
      `${path} contains credential-shaped sensitive material, a machine-local path or other personal sensitive material`,
    );
  }
  return parsed;
}

function parseUsage(value: unknown, path: string, issues: string[]): ModelUsage {
  if (!object(value)) {
    issues.push(`${path} must be an object`);
    return { inputTokens: 0, outputTokens: 0, latencyMs: 0, costMicroUsd: 0 };
  }
  keys(value, ["inputTokens", "outputTokens", "latencyMs", "costMicroUsd"], [], path, issues);
  return {
    inputTokens: safeInteger(value.inputTokens, `${path}.inputTokens`, issues, { max: 10_000_000 }),
    outputTokens: safeInteger(value.outputTokens, `${path}.outputTokens`, issues, { max: 10_000_000 }),
    latencyMs: safeInteger(value.latencyMs, `${path}.latencyMs`, issues, { max: 3_600_000 }),
    costMicroUsd: safeInteger(value.costMicroUsd, `${path}.costMicroUsd`, issues, {
      max: 1_000_000_000,
    }),
  };
}

export function parseModelCallMetadata(
  value: unknown,
): Pick<ModelCallResponse, "identity" | "usage"> {
  const issues: string[] = [];
  if (!object(value)) {
    throw new BlogPipelineValidationError(["root must be an object"], "model response metadata");
  }
  const parsed = {
    identity: parseIdentity(value.identity, "root.identity", issues),
    usage: parseUsage(value.usage, "root.usage", issues),
  };
  if (issues.length > 0) {
    throw new BlogPipelineValidationError(issues, "model response metadata");
  }
  return parsed;
}

export function parseModelCallReportedCost(value: unknown): number {
  const issues: string[] = [];
  if (!object(value)) {
    throw new BlogPipelineValidationError(["root must be an object"], "model response cost");
  }
  if (!object(value.usage)) {
    throw new BlogPipelineValidationError(["root.usage must be an object"], "model response cost");
  }
  const cost = safeInteger(value.usage.costMicroUsd, "root.usage.costMicroUsd", issues, {
    max: 1_000_000_000,
  });
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "model response cost");
  return cost;
}

export function parseModelCallResponse(value: unknown): ModelCallResponse {
  const issues: string[] = [];
  if (!object(value)) throw new BlogPipelineValidationError(["root must be an object"], "model response");
  keys(value, ["identity", "usage", "finishReason", "output"], [], "root", issues);
  const finishReasons = ["stop", "length", "content-filter", "refusal", "error"] as const;
  if (!finishReasons.includes(value.finishReason as (typeof finishReasons)[number])) {
    issues.push("root.finishReason is invalid");
  }
  const parsed: ModelCallResponse = {
    identity: parseIdentity(value.identity, "root.identity", issues),
    usage: parseUsage(value.usage, "root.usage", issues),
    finishReason: finishReasons.includes(value.finishReason as (typeof finishReasons)[number])
      ? (value.finishReason as (typeof finishReasons)[number])
      : "error",
    output: value.output,
  };
  if (issues.length > 0) throw new BlogPipelineValidationError(issues, "model response");
  return parsed;
}

export type { ResearcherOutput };
