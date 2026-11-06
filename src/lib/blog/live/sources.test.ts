import { describe, expect, it } from "vitest";
import { sliceUtf8 } from "../pipeline/security";
import { LIVE_SOURCE_ALLOWLIST, readAllowlistedSource, sentenceSpans } from "./sources";

describe("sentenceSpans", () => {
  it("never offers a sentence with Markdown emphasis or code, which would print its markup in a post", () => {
    const content = [
      "**Cited** is a document assistant.",
      "- **Network rate limiting is not applicable**: no request crosses a network boundary.",
      "Retrieval runs behind a `Retriever` interface in the service.",
      "Plain sentences like this one are offered as evidence. A second plain sentence follows here.",
      "Old text with ~~struck words~~ is skipped as well.",
    ].join("\n");
    const texts = sentenceSpans(content).map((span) => span.text);
    expect(texts).toEqual([
      "Plain sentences like this one are offered as evidence.",
      "A second plain sentence follows here.",
    ]);
  });

  it("offers a bold lead sentence and the sentence after it without their emphasis markers", () => {
    const content = "**Provider cost is zero because no provider is used.** There is no account, key or quota to manage.";
    const spans = sentenceSpans(content);
    expect(spans.map((span) => span.text)).toEqual([
      "Provider cost is zero because no provider is used.",
      "There is no account, key or quota to manage.",
    ]);
    for (const span of spans) expect(sliceUtf8(content, span.startByte, span.endByte)).toBe(span.text);
  });

  it("keeps exact byte bounds for every offered sentence", () => {
    const content = "- Café owners ask about chat. They want answers that cite sources.";
    for (const span of sentenceSpans(content)) {
      expect(sliceUtf8(content, span.startByte, span.endByte)).toBe(span.text);
    }
  });

  it("leaves no Markdown in any sentence offered from the real allowlist", () => {
    const accessedAt = "2026-10-14T00:00:00.000Z";
    for (const entry of LIVE_SOURCE_ALLOWLIST) {
      const { spans } = readAllowlistedSource(process.cwd(), entry, accessedAt);
      expect(spans.length).toBeGreaterThan(0);
      for (const span of spans) expect(span.text).not.toMatch(/[*`]|__|~~/u);
    }
  });
});
