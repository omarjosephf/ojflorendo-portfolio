import { BlogPipelineValidationError } from "../pipeline/errors";
import { writerEvidenceContract } from "../pipeline/prompts";
import { containsDisallowedPrivateMaterialInValue } from "../pipeline/security";
import {
  BLOG_PIPELINE_DRAFT_DISCLOSURE,
  BLOG_PIPELINE_SCHEMA_VERSION,
  type DraftCitationLocation,
  type EvidenceLedger,
  type ResearcherOutput,
  type WriterOutput,
} from "../pipeline/types";
import type { BlogContentBlock, BlogPost } from "../types";
import type { LiveAgentRole } from "./catalog";
import type { SelectableSpan } from "./sources";

/**
 * Wire contracts for the live agents. Models pick evidence by span id and
 * place citations by location; deterministic code fills in exact source
 * bytes, quoted text, source records, dates, author and disclosure. The
 * unchanged Phase 18.2 parsers then validate the result.
 */

type JsonSchema = Readonly<Record<string, unknown>>;
const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;
const exact = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const CLAIM_ASSESSMENTS = ["supported", "contradicted", "insufficient"] as const;

export const RESEARCH_SELECTION_SCHEMA: JsonSchema = exact({
  schemaVersion: { type: "integer", enum: [1] },
  decision: {
    anyOf: [
      exact({
        outcome: { type: "string", enum: ["evidence"] },
        researchQuestion: str,
        claims: {
          type: "array",
          items: exact({
            claimId: str,
            spanId: str,
            assessment: { type: "string", enum: [...CLAIM_ASSESSMENTS] },
          }),
        },
        outline: {
          type: "array",
          items: exact({ heading: str, claimIds: strArray }),
        },
      }),
      exact({
        outcome: { type: "string", enum: ["no-draft"] },
        reasonCode: { type: "string", enum: ["no-supported-evidence"] },
      }),
    ],
  },
});

const blockSchema = {
  anyOf: [
    exact({ type: { type: "string", enum: ["heading"] }, id: str, level: { type: "integer", enum: [2, 3] }, text: str }),
    exact({ type: { type: "string", enum: ["paragraph"] }, text: str }),
    exact({
      type: { type: "string", enum: ["list"] },
      style: { type: "string", enum: ["unordered", "ordered"] },
      items: strArray,
    }),
    exact({ type: { type: "string", enum: ["callout"] }, tone: { type: "string", enum: ["note", "warning"] }, text: str }),
  ],
};

const locationSchema = {
  anyOf: [
    exact({
      scope: { type: "string", enum: ["post"] },
      field: { type: "string", enum: ["title", "excerpt", "seo-title", "seo-description"] },
    }),
    exact({ scope: { type: "string", enum: ["block"] }, blockIndex: { type: "integer" }, field: { type: "string", enum: ["text"] } }),
    exact({
      scope: { type: "string", enum: ["block"] },
      blockIndex: { type: "integer" },
      field: { type: "string", enum: ["item"] },
      itemIndex: { type: "integer" },
    }),
  ],
};

export const WRITER_DRAFT_SCHEMA: JsonSchema = exact({
  schemaVersion: { type: "integer", enum: [1] },
  slug: str,
  title: str,
  excerpt: str,
  blocks: { type: "array", items: blockSchema },
  seo: exact({ title: str, description: str, keywords: strArray }),
  citations: { type: "array", items: exact({ claimId: str, location: locationSchema }) },
});

export const REVIEWER_OUTPUT_SCHEMA: JsonSchema = exact({
  schemaVersion: { type: "integer", enum: [1] },
  recommendation: { type: "string", enum: ["approve", "revise", "reject"] },
  claimReviews: {
    type: "array",
    items: exact({
      citationId: str,
      assessment: { type: "string", enum: ["supported", "unsupported", "contradicted", "unverifiable"] },
      note: str,
    }),
  },
  unmappedFactualClaims: {
    type: "array",
    items: exact({
      location: {
        anyOf: [
          exact({
            scope: { type: "string", enum: ["post"] },
            field: { type: "string", enum: ["title", "excerpt", "disclosure", "seo-title", "seo-description"] },
          }),
          exact({ scope: { type: "string", enum: ["block"] }, blockIndex: { type: "integer" }, field: { type: "string", enum: ["text", "title"] } }),
          exact({
            scope: { type: "string", enum: ["block"] },
            blockIndex: { type: "integer" },
            field: { type: "string", enum: ["item"] },
            itemIndex: { type: "integer" },
          }),
        ],
      },
      text: str,
      reason: str,
    }),
  },
  issues: {
    type: "array",
    items: exact({
      code: str,
      category: {
        type: "string",
        enum: ["evidence", "citation", "contradiction", "prompt-injection", "privacy", "unsafe-content", "writing-quality", "voice", "seo"],
      },
      severity: { type: "string", enum: ["low", "medium", "high"] },
      message: str,
    }),
  },
  requiredCorrections: strArray,
  scores: exact({
    groundedness: { type: "integer", minimum: 0, maximum: 100 },
    citationQuality: { type: "integer", minimum: 0, maximum: 100 },
    writingAndVoice: { type: "integer", minimum: 0, maximum: 100 },
    securityAndRobustness: { type: "integer", minimum: 0, maximum: 100 },
  }),
});

export const IDEA_SLATE_SCHEMA: JsonSchema = exact({
  schemaVersion: { type: "integer", enum: [1] },
  ideas: {
    type: "array",
    minItems: 0,
    maxItems: 5,
    items: exact({
      topic: str,
      audience: str,
      keyMessage: str,
      fitReason: str,
      angle: str,
      sourceIds: strArray,
      whyNow: str,
    }),
  },
  evidenceNote: str,
});

export const SEO_AREAS = ["search-intent", "title", "description", "headings", "structure", "links", "readability", "keywords", "originality"] as const;

export const SEO_REVIEW_SCHEMA: JsonSchema = exact({
  schemaVersion: { type: "integer", enum: [1] },
  searchIntent: str,
  score: { type: "integer", minimum: 0, maximum: 100 },
  suggestedTitle: str,
  suggestedDescription: str,
  findings: {
    type: "array",
    maxItems: 12,
    items: exact({
      area: { type: "string", enum: [...SEO_AREAS] },
      severity: { type: "string", enum: ["low", "medium", "high"] },
      advice: str,
    }),
  },
});

export const LIVE_AGENT_ROLES: readonly LiveAgentRole[] = [
  "idea-scout",
  "planner-researcher",
  "writer",
  "seo",
  "reviewer-verifier",
  "critique",
];

export const CRITIQUE_SCHEMA: JsonSchema = exact({
  schemaVersion: { type: "integer", enum: [1] },
  lessons: {
    type: "array",
    items: exact({
      agent: { type: "string", enum: [...LIVE_AGENT_ROLES] },
      lesson: str,
      evidence: str,
    }),
  },
});

// ---------------------------------------------------------------------------
// Parsing helpers

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function text(value: unknown, path: string, issues: string[], max: number, min = 1): string {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) issues.push(`${path} must contain ${min}–${max} characters`);
  return trimmed;
}

function fail(issues: string[], context: string): void {
  if (issues.length > 0) throw new BlogPipelineValidationError(issues.slice(0, 20), context);
}

// ---------------------------------------------------------------------------
// Planner–Researcher

export type ResearchSelectionResult =
  | { outcome: "evidence"; researcherOutput: ResearcherOutput }
  | { outcome: "no-draft"; reasonCode: "no-supported-evidence" };

/**
 * Turns span choices into the exact Phase 18.2 ResearcherOutput. Each claim's
 * text is the chosen span's exact text, so the 18.2 exact-span rule holds by
 * construction; the 18.2 parser still re-checks it against the source bytes.
 */
export function projectResearchSelection(
  value: unknown,
  spans: readonly SelectableSpan[],
): ResearchSelectionResult {
  const issues: string[] = [];
  if (!isRecord(value) || value.schemaVersion !== 1 || !exactKeys(value, ["schemaVersion", "decision"]) || !isRecord(value.decision)) {
    throw new BlogPipelineValidationError(["root must be ResearchSelection.v1"], "research selection");
  }
  const decision = value.decision;
  if (decision.outcome === "no-draft") {
    if (!exactKeys(decision, ["outcome", "reasonCode"]) || decision.reasonCode !== "no-supported-evidence") {
      throw new BlogPipelineValidationError(["no-draft must carry only the fixed reason"], "research selection");
    }
    return { outcome: "no-draft", reasonCode: "no-supported-evidence" };
  }
  if (decision.outcome !== "evidence" || !exactKeys(decision, ["outcome", "researchQuestion", "claims", "outline"])) {
    throw new BlogPipelineValidationError(["decision must be evidence or no-draft"], "research selection");
  }
  const researchQuestion = text(decision.researchQuestion, "researchQuestion", issues, 500, 4).replace(/\s+/gu, " ");
  const spanById = new Map(spans.map((span) => [span.spanId, span]));
  const rawClaims = Array.isArray(decision.claims) ? decision.claims : [];
  if (rawClaims.length < 1 || rawClaims.length > 60) issues.push("claims must contain 1–60 entries");
  const claimIdMap = new Map<string, string>();
  const excerptIdBySpan = new Map<string, string>();
  const excerpts: ResearcherOutput["excerpts"] = [];
  const claims: ResearcherOutput["claims"] = [];
  rawClaims.forEach((raw, index) => {
    if (!isRecord(raw) || !exactKeys(raw, ["claimId", "spanId", "assessment"])) {
      issues.push(`claims[${index}] must be an exact claim object`);
      return;
    }
    const span = typeof raw.spanId === "string" ? spanById.get(raw.spanId) : undefined;
    if (!span) {
      issues.push(`claims[${index}].spanId is not an offered span`);
      return;
    }
    if (typeof raw.claimId !== "string" || claimIdMap.has(raw.claimId)) {
      issues.push(`claims[${index}].claimId must be unique`);
      return;
    }
    if (!CLAIM_ASSESSMENTS.includes(raw.assessment as (typeof CLAIM_ASSESSMENTS)[number])) {
      issues.push(`claims[${index}].assessment is invalid`);
      return;
    }
    let excerptId = excerptIdBySpan.get(span.spanId);
    if (!excerptId) {
      excerptId = `excerpt-${excerpts.length + 1}`;
      excerptIdBySpan.set(span.spanId, excerptId);
      excerpts.push({
        id: excerptId,
        sourceId: span.sourceId,
        locator: `sentence-${span.spanId.split("--").at(-1)}`,
        startByte: span.startByte,
        endByte: span.endByte,
        text: span.text,
        classification: "evidence",
      });
    }
    const claimId = `claim-${claims.length + 1}`;
    claimIdMap.set(raw.claimId, claimId);
    claims.push({
      id: claimId,
      text: span.text,
      assessment: raw.assessment as (typeof CLAIM_ASSESSMENTS)[number],
      evidenceIds: [excerptId],
    });
  });
  const rawOutline = Array.isArray(decision.outline) ? decision.outline : [];
  if (rawOutline.length < 1 || rawOutline.length > 30) issues.push("outline must contain 1–30 sections");
  const outline: ResearcherOutput["outline"] = [];
  rawOutline.forEach((raw, index) => {
    if (!isRecord(raw) || !exactKeys(raw, ["heading", "claimIds"]) || !Array.isArray(raw.claimIds)) {
      issues.push(`outline[${index}] must be an exact section object`);
      return;
    }
    const claimIds = raw.claimIds.map((id) => (typeof id === "string" ? claimIdMap.get(id) : undefined));
    if (claimIds.some((id) => id === undefined) || claimIds.length < 1 || claimIds.length > 20) {
      issues.push(`outline[${index}].claimIds must list 1–20 known claims`);
      return;
    }
    outline.push({
      id: `section-${index + 1}`,
      heading: text(raw.heading, `outline[${index}].heading`, issues, 120).replace(/\s+/gu, " "),
      claimIds: [...new Set(claimIds as string[])],
    });
  });
  fail(issues, "research selection");
  return {
    outcome: "evidence",
    researcherOutput: {
      schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION,
      researchQuestion,
      excerpts,
      claims,
      outline,
    },
  };
}

// ---------------------------------------------------------------------------
// Writer

/**
 * Builds the full Phase 18.2 WriterOutput from the Writer's post body and
 * citation placements. Quoted text, evidence ids and source records come from
 * the validated ledger, never from the model.
 */
export function projectWriterDraft(value: unknown, ledger: EvidenceLedger): WriterOutput {
  const issues: string[] = [];
  const keys = ["schemaVersion", "slug", "title", "excerpt", "blocks", "seo", "citations"];
  if (!isRecord(value) || value.schemaVersion !== 1 || !exactKeys(value, keys)) {
    throw new BlogPipelineValidationError(["root must be WriterDraft.v1"], "writer draft");
  }
  const contract = writerEvidenceContract(ledger);
  const claimById = new Map(contract.claims.map((claim) => [claim.id, claim]));
  const excerptById = new Map(contract.excerpts.map((excerpt) => [excerpt.id, excerpt]));
  const sourceById = new Map(contract.sources.map((source) => [source.id, source]));
  const rawCitations = Array.isArray(value.citations) ? value.citations : [];
  const citations: WriterOutput["citations"] = [];
  const usedSourceIds = new Set<string>();
  rawCitations.forEach((raw, index) => {
    if (!isRecord(raw) || !exactKeys(raw, ["claimId", "location"]) || !isRecord(raw.location)) {
      issues.push(`citations[${index}] must be an exact citation object`);
      return;
    }
    const claim = typeof raw.claimId === "string" ? claimById.get(raw.claimId) : undefined;
    if (!claim) {
      issues.push(`citations[${index}].claimId is not a Writer-eligible claim`);
      return;
    }
    for (const evidenceId of claim.evidenceIds) {
      const excerpt = excerptById.get(evidenceId);
      if (excerpt) usedSourceIds.add(excerpt.sourceId);
    }
    citations.push({
      id: `citation-${citations.length + 1}`,
      claimId: claim.id,
      evidenceIds: [...claim.evidenceIds],
      location: { ...(raw.location as Record<string, unknown>) } as DraftCitationLocation,
      quotedText: claim.text,
    });
  });
  const post: BlogPost = {
    schemaVersion: 1,
    status: "draft",
    slug: typeof value.slug === "string" ? value.slug : "",
    title: typeof value.title === "string" ? value.title : "",
    excerpt: typeof value.excerpt === "string" ? value.excerpt : "",
    publishedAt: null,
    updatedAt: null,
    author: { name: "OJ Florendo", url: "/about" },
    disclosure: BLOG_PIPELINE_DRAFT_DISCLOSURE,
    blocks: (Array.isArray(value.blocks) ? value.blocks : []) as BlogContentBlock[],
    sources: [...usedSourceIds]
      .sort((a, b) => a.localeCompare(b, "en-GB"))
      .map((id) => {
        const source = sourceById.get(id);
        if (!source) {
          issues.push(`source ${id} is missing from the evidence contract`);
          return { id, title: "", url: "" };
        }
        return {
          id: source.id,
          title: source.title,
          url: source.url,
          ...(source.publisher === undefined ? {} : { publisher: source.publisher }),
          accessedAt: source.accessedAt.slice(0, 10),
        };
      }),
    seo: (isRecord(value.seo) ? value.seo : {}) as unknown as BlogPost["seo"],
  };
  fail(issues, "writer draft");
  return { schemaVersion: BLOG_PIPELINE_SCHEMA_VERSION, post, citations };
}

// ---------------------------------------------------------------------------
// Idea Scout, SEO and Critique

export interface IdeaSuggestion {
  topic: string;
  audience: string;
  keyMessage: string;
  fitReason: string;
  angle: string;
  sourceIds: string[];
  whyNow: string;
}

export interface IdeaSlate {
  schemaVersion: 1;
  ideas: IdeaSuggestion[];
  evidenceNote: string;
}

export function parseIdeaSlate(value: unknown, allowedSourceIds: ReadonlySet<string>): IdeaSlate {
  const issues: string[] = [];
  if (!isRecord(value) || value.schemaVersion !== 1 || !exactKeys(value, ["schemaVersion", "ideas", "evidenceNote"])) {
    throw new BlogPipelineValidationError(["root must be IdeaSlate.v1"], "idea slate");
  }
  const rawIdeas = Array.isArray(value.ideas) ? value.ideas : [];
  if (rawIdeas.length > 5) issues.push("ideas must contain at most five entries");
  const ideas = rawIdeas.slice(0, 5).map((raw, index): IdeaSuggestion => {
    const path = `ideas[${index}]`;
    if (!isRecord(raw)) {
      issues.push(`${path} must be an object`);
      return { topic: "", audience: "", keyMessage: "", fitReason: "", angle: "", sourceIds: [], whyNow: "" };
    }
    const sourceIds = Array.isArray(raw.sourceIds) ? raw.sourceIds.filter((id): id is string => typeof id === "string") : [];
    if (sourceIds.length < 1 || sourceIds.length > 6 || sourceIds.some((id) => !allowedSourceIds.has(id))) {
      issues.push(`${path}.sourceIds must name 1–6 allowlisted sources`);
    }
    return {
      topic: text(raw.topic, `${path}.topic`, issues, 160, 8),
      audience: text(raw.audience, `${path}.audience`, issues, 200, 4),
      keyMessage: text(raw.keyMessage, `${path}.keyMessage`, issues, 400, 8),
      fitReason: text(raw.fitReason, `${path}.fitReason`, issues, 500, 8),
      angle: text(raw.angle, `${path}.angle`, issues, 400, 8),
      sourceIds: [...new Set(sourceIds)],
      whyNow: text(raw.whyNow, `${path}.whyNow`, issues, 500, 0),
    };
  });
  const slate: IdeaSlate = { schemaVersion: 1, ideas, evidenceNote: text(value.evidenceNote, "evidenceNote", issues, 800, 0) };
  if (containsDisallowedPrivateMaterialInValue(slate)) issues.push("the slate contains private or credential-like material");
  fail(issues, "idea slate");
  return slate;
}

export interface SeoReview {
  schemaVersion: 1;
  searchIntent: string;
  score: number;
  suggestedTitle: string;
  suggestedDescription: string;
  findings: { area: (typeof SEO_AREAS)[number]; severity: "low" | "medium" | "high"; advice: string }[];
}

export function parseSeoReview(value: unknown): SeoReview {
  const issues: string[] = [];
  const keys = ["schemaVersion", "searchIntent", "score", "suggestedTitle", "suggestedDescription", "findings"];
  if (!isRecord(value) || value.schemaVersion !== 1 || !exactKeys(value, keys)) {
    throw new BlogPipelineValidationError(["root must be SeoReview.v1"], "SEO review");
  }
  const score = value.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100) issues.push("score must be 0–100");
  const rawFindings = Array.isArray(value.findings) ? value.findings : [];
  if (rawFindings.length > 12) issues.push("findings must contain at most 12 entries");
  const findings = rawFindings.slice(0, 12).map((raw, index) => {
    const path = `findings[${index}]`;
    const record = isRecord(raw) ? raw : {};
    if (!SEO_AREAS.includes(record.area as (typeof SEO_AREAS)[number])) issues.push(`${path}.area is invalid`);
    if (!["low", "medium", "high"].includes(record.severity as string)) issues.push(`${path}.severity is invalid`);
    return {
      area: record.area as (typeof SEO_AREAS)[number],
      severity: record.severity as "low" | "medium" | "high",
      advice: text(record.advice, `${path}.advice`, issues, 500, 4),
    };
  });
  const review: SeoReview = {
    schemaVersion: 1,
    searchIntent: text(value.searchIntent, "searchIntent", issues, 300, 4),
    score: score as number,
    suggestedTitle: text(value.suggestedTitle, "suggestedTitle", issues, 120, 4),
    suggestedDescription: text(value.suggestedDescription, "suggestedDescription", issues, 200, 10),
    findings,
  };
  if (containsDisallowedPrivateMaterialInValue(review)) issues.push("the review contains private or credential-like material");
  fail(issues, "SEO review");
  return review;
}

export interface CritiqueLesson {
  agent: LiveAgentRole;
  participated: boolean;
  lesson: string;
  evidence: string;
}

/**
 * Exactly one lesson per participating agent. Agents that did not run get a
 * fixed record instead of an invented lesson.
 */
export function parseCritique(value: unknown, participants: ReadonlySet<LiveAgentRole>): CritiqueLesson[] {
  const issues: string[] = [];
  if (!isRecord(value) || value.schemaVersion !== 1 || !exactKeys(value, ["schemaVersion", "lessons"]) || !Array.isArray(value.lessons)) {
    throw new BlogPipelineValidationError(["root must be Critique.v1"], "critique");
  }
  const byAgent = new Map<LiveAgentRole, { lesson: string; evidence: string }>();
  value.lessons.forEach((raw, index) => {
    const record = isRecord(raw) ? raw : {};
    const agent = record.agent as LiveAgentRole;
    if (!LIVE_AGENT_ROLES.includes(agent)) {
      issues.push(`lessons[${index}].agent is invalid`);
      return;
    }
    if (!participants.has(agent)) {
      issues.push(`lessons[${index}] gives a lesson to ${agent}, which did not run`);
      return;
    }
    if (byAgent.has(agent)) {
      issues.push(`lessons[${index}] repeats ${agent}`);
      return;
    }
    byAgent.set(agent, {
      lesson: text(record.lesson, `lessons[${index}].lesson`, issues, 600, 10),
      evidence: text(record.evidence, `lessons[${index}].evidence`, issues, 600, 4),
    });
  });
  for (const agent of participants) {
    if (!byAgent.has(agent)) issues.push(`no lesson for ${agent}, which ran`);
  }
  const lessons = LIVE_AGENT_ROLES.map((agent) => {
    const entry = byAgent.get(agent);
    return entry
      ? { agent, participated: true, ...entry }
      : { agent, participated: false, lesson: "Did not run in this attempt.", evidence: "No run evidence exists for this agent." };
  });
  if (containsDisallowedPrivateMaterialInValue(lessons)) issues.push("the critique contains private or credential-like material");
  fail(issues, "critique");
  return lessons;
}
