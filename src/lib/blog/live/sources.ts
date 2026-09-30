import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256, sliceUtf8, utf8Bytes } from "../pipeline/security";
import type { ApprovedEvidenceSpan, OfflineSourceDocument } from "../pipeline/types";

/**
 * Owner-approved source allowlist for Phase 18.4 (approved 30 September 2026).
 * Every file is already public in the GitHub repository and on the site, and
 * was written by or for OJ. Drafting agents see only exact sentences from
 * these files; nothing is fetched from the web.
 */
export const LIVE_SOURCE_REPOSITORY_URL = "https://github.com/omarjosephf/ojflorendo-portfolio/blob/main/";

export const LIVE_SOURCE_ALLOWLIST: readonly { path: string; title: string }[] = Object.freeze([
  { path: "content/assistant/about-oj.md", title: "About OJ Florendo" },
  { path: "content/assistant/experience.md", title: "OJ Florendo's experience" },
  { path: "content/assistant/skills.md", title: "OJ Florendo's skills" },
  { path: "content/assistant/services.md", title: "OJ Florendo's services" },
  { path: "content/assistant/how-oj-works.md", title: "How OJ works" },
  { path: "content/assistant/education-and-credentials.md", title: "Education and credentials" },
  { path: "content/assistant/project-cited.md", title: "Project: Cited" },
  { path: "content/assistant/project-portfolio-platform.md", title: "Project: the portfolio platform" },
  { path: "content/assistant/contact-and-this-assistant.md", title: "Contact and the E.V. assistant" },
  { path: "docs/adr/0004-curated-portfolio-assistant.md", title: "ADR-0004: curated portfolio assistant" },
  { path: "docs/adr/0006-retrieval-grounded-portfolio-assistant.md", title: "ADR-0006: retrieval-grounded portfolio assistant" },
  { path: "docs/adr/0014-luna-gemini-fallback.md", title: "ADR-0014: Gemini fallback for the assistant" },
  { path: "docs/adr/0020-gemini-paid-tier-for-visitor-input.md", title: "ADR-0020: Gemini paid tier for visitor input" },
  { path: "docs/reviews/ev-embedding-comparison.md", title: "E.V. embedding comparison" },
  { path: "docs/runbooks/assistant-corpus.md", title: "E.V. assistant corpus runbook" },
  { path: "README.md", title: "Portfolio repository README" },
]);

export const LIVE_ALLOWED_DOMAINS = Object.freeze(["github.com"]);
export const LIVE_SOURCE_PUBLISHER = "OJ Florendo";
/** The 18.2 contract accepts at most 100 approved spans per source and 20 sources. */
const MAX_SPANS_PER_SOURCE = 100;
const MAX_SOURCES_PER_RUN = 6;
const MIN_SPAN_CHARS = 30;
const MAX_SPAN_CHARS = 600;

export interface SelectableSpan {
  spanId: string;
  sourceId: string;
  startByte: number;
  endByte: number;
  text: string;
}

export interface LiveSourcePack {
  sources: OfflineSourceDocument[];
  spans: SelectableSpan[];
}

function sourceId(path: string) {
  return path
    .toLowerCase()
    .replace(/\.md$/u, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

export function sourceIdForPath(path: string) {
  return sourceId(path);
}

/**
 * Candidate sentences with exact UTF-8 byte bounds. Headings, code fences,
 * tables, HTML and link-heavy lines are skipped so a quoted claim reads as
 * plain prose. List markers are excluded from the span.
 */
export function sentenceSpans(content: string): { startByte: number; endByte: number; text: string }[] {
  const spans: { startByte: number; endByte: number; text: string }[] = [];
  let offset = 0;
  let inFence = false;
  const lines = content.split("\n");
  for (const line of lines) {
    const lineStart = offset;
    offset += utf8Bytes(line) + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (
      inFence ||
      trimmed.length === 0 ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("<") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("---") ||
      trimmed.includes("](")
    ) {
      continue;
    }
    const marker = /^(\s*(?:[-*+]|\d+\.)\s+)/u.exec(line);
    const bodyStartChar = marker ? marker[1].length : line.length - line.trimStart().length;
    const body = line.slice(bodyStartChar).trimEnd();
    const bodyStartByte = lineStart + utf8Bytes(line.slice(0, bodyStartChar));
    // Split into sentences at ". ", "! " or "? " followed by a capital letter or digit.
    const pattern = /[^.!?]+(?:[.!?]+(?=\s+[A-Z0-9"“(]|\s*$)|$)/gu;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }
      const raw = match[0];
      const leading = raw.length - raw.trimStart().length;
      const text = raw.trim();
      if (text.length < MIN_SPAN_CHARS || text.length > MAX_SPAN_CHARS) continue;
      if (!/[.!?]$/u.test(text)) continue;
      const startByte = bodyStartByte + utf8Bytes(body.slice(0, match.index + leading));
      const endByte = startByte + utf8Bytes(text);
      if (sliceUtf8(content, startByte, endByte) !== text) continue;
      spans.push({ startByte, endByte, text });
    }
  }
  return spans;
}

export function readAllowlistedSource(
  repoRoot: string,
  entry: { path: string; title: string },
  accessedAt: string,
): { document: OfflineSourceDocument; spans: SelectableSpan[] } {
  // The 18.2 contract rejects leading or trailing whitespace; spans are computed after trimming.
  const content = readFileSync(join(repoRoot, entry.path), "utf8").replace(/\r\n/gu, "\n").trim();
  const id = sourceId(entry.path);
  const candidates = sentenceSpans(content).slice(0, MAX_SPANS_PER_SOURCE);
  const approvedEvidenceSpans: ApprovedEvidenceSpan[] = candidates.map((span) => ({
    startByte: span.startByte,
    endByte: span.endByte,
    sha256: sha256(span.text),
  }));
  return {
    document: {
      id,
      title: entry.title,
      url: `${LIVE_SOURCE_REPOSITORY_URL}${entry.path}`,
      publisher: LIVE_SOURCE_PUBLISHER,
      accessedAt,
      approvedForModelUse: true,
      privacyReviewed: true,
      approvedEvidenceSpans,
      content,
    },
    spans: candidates.map((span, index) => ({
      spanId: `${id}--${index + 1}`,
      sourceId: id,
      ...span,
    })),
  };
}

/** Loads the chosen allowlisted sources for one run, in allowlist order. */
export function loadLiveSourcePack(
  repoRoot: string,
  sourceIds: readonly string[],
  accessedAt: string,
): LiveSourcePack {
  const wanted = new Set(sourceIds);
  const entries = LIVE_SOURCE_ALLOWLIST.filter((entry) => wanted.has(sourceId(entry.path)));
  if (entries.length !== wanted.size) {
    throw new Error("A requested source is not on the owner-approved allowlist.");
  }
  if (entries.length < 1 || entries.length > MAX_SOURCES_PER_RUN) {
    throw new Error(`A run must use between 1 and ${MAX_SOURCES_PER_RUN} allowlisted sources.`);
  }
  const loaded = entries.map((entry) => readAllowlistedSource(repoRoot, entry, accessedAt));
  const usable = loaded.filter((item) => item.spans.length > 0);
  if (usable.length === 0) throw new Error("The chosen sources contain no quotable sentences.");
  return {
    sources: usable.map((item) => item.document),
    spans: usable.flatMap((item) => item.spans),
  };
}

/** A short catalog of every allowlisted source for Idea Scout. */
export function sourceCatalog(repoRoot: string) {
  return LIVE_SOURCE_ALLOWLIST.map((entry) => {
    const content = readFileSync(join(repoRoot, entry.path), "utf8").replace(/\r\n/gu, "\n");
    const headings = content
      .split("\n")
      .filter((line) => /^#{1,3}\s/u.test(line))
      .map((line) => line.replace(/^#+\s*/u, "").trim())
      .slice(0, 25);
    return {
      sourceId: sourceId(entry.path),
      title: entry.title,
      headings,
      sampleSentences: sentenceSpans(content)
        .slice(0, 6)
        .map((span) => span.text),
    };
  });
}
