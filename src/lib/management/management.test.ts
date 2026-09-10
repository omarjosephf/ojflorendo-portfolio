/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { previewAllowed, previewWriteAllowed } from "./access";
import { groupQuestions, questionKey, selectWindow, summarize } from "./analytics";
import { sampleAnchor, sampleConversations } from "./fixtures";
import { parseMutation } from "./validation";
import corpus from "@/data/management-corpus.generated.json";
import { assistantCorpusChecksum, assistantCorpusFiles } from "@/data/assistant-corpus.generated";
import { createHash } from "node:crypto";
const preview = { NODE_ENV: "development", EV_MANAGEMENT_MODE: "preview" };

describe("preview access boundary", () => {
  it.each(["127.0.0.1:3215", "localhost:3215", "[::1]:3215"])("permits explicit local development at %s", (host) => {
    expect(previewAllowed(host, preview)).toBe(true);
  });
  it.each([null, "ojfr.me", "localhost.evil.example", "127.0.0.1@evil.example", "localhost:3215.evil", "0.0.0.0:3215"])("denies non-loopback host %s", (host) => {
    expect(previewAllowed(host, preview)).toBe(false);
  });
  it("denies production, preview deployments, test mode and missing flag", () => {
    for (const env of [{ ...preview, NODE_ENV: "production" }, { ...preview, VERCEL: "1" }, { ...preview, NODE_ENV: "test" }, { NODE_ENV: "development" }]) {
      expect(previewAllowed("localhost:3215", env)).toBe(false);
    }
  });
  it("never grants writes under the default test environment", () => {
    expect(previewWriteAllowed(new Request("http://localhost:3215/api/management/workspace", { headers: { host: "localhost:3215", origin: "http://localhost:3215", "content-type": "application/json" } }))).toBe(false);
  });
});
describe("analytics integrity", () => {
  it("selects UTC calendar days and removes out-of-window turns", () => {
    const result = selectWindow(sampleConversations, sampleAnchor, 7);
    expect(result).toHaveLength(18);
    expect(result.flatMap((c) => c.turns)).toHaveLength(19);
    expect(selectWindow(sampleConversations, sampleAnchor, 30)).toHaveLength(24);
    expect(result.every((c) => c.turns.every((t) => t.at >= "2026-09-02" && t.at <= sampleAnchor))).toBe(true);
  });
  it("separates occurrences and distinct conversations", () => {
    const c = structuredClone(sampleConversations[0]);
    c.turns = [c.turns[0], { ...c.turns[0], id: "another-turn", question: " WHAT did OJ build with Cited?! " }];
    const result = groupQuestions([c]);
    expect(result).toHaveLength(1); expect(result[0].count).toBe(2); expect(result[0].sessions).toBe(1);
    expect(questionKey("What’s OJ’s rate?")).toBe("whats ojs rate");
  });
  it("does not interpret technical and privacy failures as missing content", () => {
    const gaps = groupQuestions(sampleConversations, true);
    expect(gaps).toHaveLength(5);
    expect(gaps.find((g) => g.question.includes("phone"))?.outcomes).toEqual(["policy_boundary"]);
    expect(gaps.find((g) => g.question.includes("design"))?.outcomes).toEqual(["provider_failure"]);
  });
  it("uses rated-answer denominators and counts each source only once per turn", () => {
    const sources = assistantCorpusFiles.map((s) => s.path);
    const report = summarize(sampleConversations, sampleAnchor, 7, sources);
    expect(report.answered).toBe(11); expect(report.feedback).toHaveLength(4); expect(report.helpful).toBe(3);
    expect(report.sourceSignals.find((s) => s.source === "project-cited.md")?.cited).toBe(5);
    expect(report.sourceSignals.find((s) => s.source === "skills.md")?.cited).toBe(0);
    expect(report.daily.reduce((n, d) => n + d.total, 0)).toBe(report.turns.length);
    expect(report.daily.reduce((n, d) => n + d.answered, 0)).toBe(report.answered);
  });
  it("returns honest empty denominators", () => {
    const r = summarize([], sampleAnchor, 7, ["services.md"]);
    expect(r.sessions).toBe(0); expect(r.feedback).toHaveLength(0); expect(r.sourceSignals[0].rated).toBe(0);
  });
});
describe("canonical snapshot", () => {
  it("binds the chunk text, sources and checksum to the current corpus", () => {
    expect(corpus.corpusSha256).toBe(assistantCorpusChecksum);
    const paths = assistantCorpusFiles.map((s) => s.path).sort();
    expect([...new Set(corpus.chunks.map((c) => c.source))].sort()).toEqual(paths);
    expect(corpus.chunks).toHaveLength(69);
    expect(new Set(corpus.chunks.map((c) => c.index)).size).toBe(corpus.chunks.length);
    for (const c of corpus.chunks) {
      expect(c.tokens).toBeGreaterThan(0); expect(c.tokens).toBeLessThanOrEqual(corpus.tokenLimit);
      expect(createHash("sha256").update(c.section ? `${c.section}. ${c.text}` : c.text).digest("hex")).toBe(c.indexedSha256);
    }
    for (const c of sampleConversations) for (const t of c.turns) for (const s of [...t.retrieved, ...t.cited]) expect(paths).toContain(s);
  });
});
describe("editor input validation", () => {
  const draft = { id: "draft-1", title: "Sample", body: "A verified statement.", provenance: "Owner confirmation", gapKey: null, status: "draft" };
  it("strips extra attributes instead of permitting ownership or path injection", () => {
    const result = parseMutation({ revision: 0, action: "save_draft", draft: { ...draft, path: "../private", userId: "forged" } });
    expect(result).toEqual({ revision: 0, action: "save_draft", draft });
  });
  it.each([{ ...draft, title: " " }, { ...draft, body: "x".repeat(20001) }, { ...draft, provenance: "" }, { ...draft, status: "published" }, { ...draft, id: "../file" }])("rejects incomplete, oversized or invalid draft values", (value) => {
    expect(parseMutation({ revision: 0, action: "save_draft", draft: value })).toBeNull();
  });
  it.each(["__proto__", "constructor", "prototype"])("rejects unsafe triage key %s", (key) => {
    expect(parseMutation({ revision: 0, action: "triage", key, status: "new", note: "" })).toBeNull();
  });
});
