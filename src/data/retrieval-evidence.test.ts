/**
 * @vitest-environment node
 *
 * Reads the committed evidence file from disk, which jsdom cannot do.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assistantCorpusChecksum } from "./assistant-corpus.generated";

/**
 * The published retrieval numbers must describe the corpus that is actually
 * committed. Before this check existed, the only record of "98% hit rate" lived
 * in an uncommitted scratch directory, so the claim was true but unverifiable —
 * and would have stayed green while the corpus moved underneath it.
 *
 * The newest evidence file is the one under test. Older files are history and
 * are deliberately not re-validated: they describe corpora that have since
 * changed, which is the point of keeping them.
 */
const EVIDENCE_DIR = join(process.cwd(), "docs", "reviews", "evidence");
const SUFFIX = "-portfolio-retrieval.json";

type Measurement = {
  question: string;
  answerable: boolean;
  critical: boolean;
  expects: string;
  expectedRank?: number;
  expectedScore?: number;
  hit?: boolean;
  margin?: number | null;
  rival?: { section: string | null; source: string; score: number } | null;
};

type Evidence = {
  schemaVersion: number;
  date: string;
  topK: number;
  chunkCount: number;
  corpusSha256: string;
  questionFileSha256: string;
  summary: {
    questions: number;
    answerable: number;
    hits: number;
    top1: number;
    criticalHits: number;
    criticalTotal: number;
    tightestMargin: number | null;
    tightestCriticalMargin: number | null;
  };
  measurements: Measurement[];
};

const latest = readdirSync(EVIDENCE_DIR)
  .filter((f) => f.endsWith(SUFFIX))
  .sort()
  .at(-1);

const evidence: Evidence = JSON.parse(
  readFileSync(join(EVIDENCE_DIR, latest as string), "utf8"),
);

describe("committed retrieval evidence", () => {
  it("has an evidence file to check", () => {
    expect(latest).toBeDefined();
  });

  /**
   * The staleness gate. A corpus edit changes the checksum, so evidence that was
   * not regenerated alongside it fails here rather than sitting quietly out of
   * date. This is the check whose absence let the situation arise.
   */
  it("describes the corpus that is committed, not an older one", () => {
    expect(evidence.corpusSha256).toBe(assistantCorpusChecksum);
  });

  it("states its own scope", () => {
    expect(evidence.schemaVersion).toBe(1);
    expect(evidence.topK).toBeGreaterThan(0);
    expect(evidence.chunkCount).toBeGreaterThan(0);
    expect(evidence.questionFileSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  /** A summary that disagrees with its own rows is worse than no summary. */
  it("summarises its own measurements correctly", () => {
    const answerable = evidence.measurements.filter((m) => m.answerable);
    const critical = answerable.filter((m) => m.critical);
    expect(evidence.summary.questions).toBe(evidence.measurements.length);
    expect(evidence.summary.answerable).toBe(answerable.length);
    expect(evidence.summary.hits).toBe(answerable.filter((m) => m.hit).length);
    expect(evidence.summary.top1).toBe(
      answerable.filter((m) => m.expectedRank === 1).length,
    );
    expect(evidence.summary.criticalTotal).toBe(critical.length);
    expect(evidence.summary.criticalHits).toBe(
      critical.filter((m) => m.hit).length,
    );
  });

  it("records every answerable question reaching the top-k", () => {
    const missed = evidence.measurements
      .filter((m) => m.answerable && !m.hit)
      .map((m) => m.question);
    expect(missed).toEqual([]);
  });

  it("records the critical core at 100%", () => {
    expect(evidence.summary.criticalHits).toBe(evidence.summary.criticalTotal);
    expect(evidence.summary.criticalTotal).toBeGreaterThan(0);
  });

  /**
   * The margin is how far an expected section is from being pushed out of the
   * top-k by the next chunk down. The gate cannot see this: a question passing
   * at rank 4 by a thousandth of a point and one passing at rank 1 by a wide
   * lead score identically. On the corpus as committed the tightest critical
   * margin is roughly +0.0008 — real headroom, but very little of it.
   *
   * The number is committed in the evidence file, so any change to it appears in
   * review as a diff. This asserts only that it has not actually gone negative,
   * which would mean a critical question is failing while the summary claims a
   * pass. Judging whether a given margin is comfortable is a review decision,
   * not a threshold worth hard-coding here.
   */
  it("keeps every critical margin positive", () => {
    const negative = evidence.measurements
      .filter(
        (m) =>
          m.critical && m.hit && typeof m.margin === "number" && m.margin <= 0,
      )
      .map((m) => `${m.question} (${m.margin})`);
    expect(negative).toEqual([]);
    expect(evidence.summary.tightestCriticalMargin).toBeGreaterThan(0);
  });

  it("reports a tightest margin that matches its rows", () => {
    const margins = evidence.measurements
      .filter((m) => m.answerable && m.hit && typeof m.margin === "number")
      .map((m) => m.margin as number);
    expect(evidence.summary.tightestMargin).toBeCloseTo(Math.min(...margins), 10);
  });
});
