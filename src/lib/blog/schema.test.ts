import { describe, expect, it } from "vitest";

import { BLOG_POST_SCHEMA_VERSION } from "./types";
import { BlogPostValidationError, parseBlogPost } from "./schema";

function validPost(status: "draft" | "published" = "published") {
  return {
    schemaVersion: BLOG_POST_SCHEMA_VERSION,
    status,
    slug: "a-safe-post",
    title: "A safe, evidence-led post",
    excerpt: "A concise explanation of a repository-backed engineering decision.",
    publishedAt: status === "published" ? "2026-09-19" : null,
    updatedAt: null,
    author: { name: "OJ Florendo", url: "/about" },
    disclosure:
      "AI tools assisted with drafting; OJ directed, reviewed and remains responsible for the article.",
    blocks: [
      { type: "heading", id: "why-it-matters", level: 2, text: "Why it matters" },
      { type: "paragraph", text: "The renderer receives this value as plain text only." },
      { type: "list", style: "unordered", items: ["First checked point", "Second checked point"] },
      { type: "callout", tone: "note", title: "Evidence note", text: "Measurements need a source." },
    ],
    sources:
      status === "published"
        ? [
            {
              id: "project-handbook",
              title: "Project Zero Engineering Handbook",
              url: "/docs/engineering-handbook",
              publisher: "OJ Florendo",
              accessedAt: "2026-09-19",
            },
          ]
        : [],
    seo: {
      title: "A safe, evidence-led post",
      description: "How repository evidence and constrained content blocks keep a technical article reviewable.",
      keywords: ["engineering", "evidence"],
    },
  };
}

describe("parseBlogPost", () => {
  it("accepts and copies the complete allowlisted block vocabulary", () => {
    const raw = validPost();
    const post = parseBlogPost(raw);

    expect(post).toEqual(raw);
    expect(post).not.toBe(raw);
    expect(post.blocks).not.toBe(raw.blocks);
  });

  it("accepts a draft only when its publication date is null", () => {
    expect(parseBlogPost(validPost("draft"))).toMatchObject({
      status: "draft",
      publishedAt: null,
      sources: [],
    });
  });

  it("accepts a level 3 heading after a level 2 heading", () => {
    const raw = validPost();
    raw.blocks.splice(1, 0, {
      type: "heading",
      id: "supporting-detail",
      level: 3,
      text: "Supporting detail",
    });

    expect(parseBlogPost(raw).blocks[1]).toMatchObject({ level: 3 });
  });

  it("rejects a level 3 heading before the first level 2 heading", () => {
    const raw = validPost();
    raw.blocks.unshift({
      type: "heading",
      id: "skipped-level",
      level: 3,
      text: "Skipped level",
    });

    expect(() => parseBlogPost(raw)).toThrow(/level 3 heading before the first level 2 heading/);
  });

  it.each([
    ["name", "Another Author", /author\.name must be "OJ Florendo"/],
    ["url", "/someone-else", /author\.url must be "\/about"/],
  ] as const)("locks the public author %s", (field, value, message) => {
    const raw = validPost();
    raw.author[field] = value;

    expect(() => parseBlogPost(raw)).toThrow(message);
  });

  it.each(["html", "mdx", "code", "component", "embed"])(
    "rejects the non-allowlisted %s block type",
    (type) => {
      const raw = validPost();
      raw.blocks = [{ type, text: "<script>alert('no')</script>" }] as typeof raw.blocks;

      expect(() => parseBlogPost(raw)).toThrow(/type must be heading, paragraph, list or callout/);
    },
  );

  it("rejects arbitrary fields that could bypass a plain-text renderer", () => {
    const raw = validPost();
    raw.blocks[1] = {
      ...raw.blocks[1],
      html: "<img src=x onerror=alert(1)>",
    } as unknown as (typeof raw.blocks)[number];

    expect(() => parseBlogPost(raw)).toThrow(/root\.blocks\[1\]\.html is not allowed/);
  });

  it("requires a date and at least one source before a post can be published", () => {
    const raw = validPost();
    raw.publishedAt = null;
    raw.sources = [];

    expect(() => parseBlogPost(raw)).toThrowError(BlogPostValidationError);
    expect(() => parseBlogPost(raw)).toThrow(/publishedAt is required/);
    expect(() => parseBlogPost(raw)).toThrow(/at least one source/);
  });

  it("rejects unsafe source schemes and embedded credentials", () => {
    const raw = validPost();
    raw.sources[0].url = "javascript:alert('no')";

    expect(() => parseBlogPost(raw)).toThrow(/HTTPS URL without embedded credentials/);
  });

  it.each(["https:/evidence.example", "https:evidence.example", "https:\\evidence.example"])(
    "rejects the ambiguous source URL %s rather than letting a browser reinterpret it",
    (url) => {
      const raw = validPost();
      raw.sources[0].url = url;

      expect(() => parseBlogPost(raw)).toThrow(/HTTPS URL without embedded credentials/);
    },
  );

  it("rejects duplicate heading and source identifiers", () => {
    const raw = validPost();
    raw.blocks.push({ type: "heading", id: "why-it-matters", level: 3, text: "Repeated id" });
    raw.sources.push({ ...raw.sources[0] });

    expect(() => parseBlogPost(raw)).toThrow(/must not repeat heading ids/);
    expect(() => parseBlogPost(raw)).toThrow(/must not repeat source ids/);
  });

  it("reports invalid calendar dates instead of accepting date-shaped text", () => {
    const raw = validPost();
    raw.publishedAt = "2026-02-30";

    expect(() => parseBlogPost(raw)).toThrow(/real calendar date/);
  });
});
