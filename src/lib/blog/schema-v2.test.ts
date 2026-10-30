import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BLOG_POST_SCHEMA_VERSION_2 } from "./types";
import { parseBlogPost } from "./schema";

// Post format version 2 (ADR-0027). Version 1 keeps its own, untouched tests
// in schema.test.ts.
function validV2Post() {
  return {
    schemaVersion: BLOG_POST_SCHEMA_VERSION_2,
    status: "published" as const,
    slug: "a-typed-post",
    title: "A typed, evidence-led post",
    excerpt: "A concise explanation of a repository-backed engineering decision.",
    postType: "case-study",
    publishedAt: "2026-10-20",
    updatedAt: null,
    author: { name: "Joseph Florendo", url: "/about" },
    disclosure: "AI tools assisted with drafting; Joseph Florendo reviewed and approved the article.",
    blocks: [{ type: "paragraph", text: "The renderer receives this value as plain text only." }],
    sources: [{ id: "project-handbook", title: "Project Zero Engineering Handbook", url: "/docs/engineering-handbook" }],
    seo: {
      title: "A typed, evidence-led post",
      description: "How a typed post keeps its picture, label and byline checked by code.",
      keywords: ["engineering"],
    },
  } as Record<string, unknown>;
}

const validCover: Record<string, unknown> = {
  kind: "image",
  src: "/blog/covers/run-summary.webp",
  width: 1200,
  height: 800,
  alt: "The run summary panel",
};

function without(value: Record<string, unknown>, key: string) {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

describe("parseBlogPost, format version 2", () => {
  it("accepts a typed post with the Joseph Florendo byline and copies it", () => {
    const raw = validV2Post();
    const post = parseBlogPost(raw);
    expect(post).toEqual(raw);
    expect(post).not.toBe(raw);
  });

  it.each(["case-study", "build-notes", "explainer"])("accepts the %s type", (postType) => {
    expect(parseBlogPost({ ...validV2Post(), postType })).toMatchObject({ schemaVersion: 2, postType });
  });

  it("accepts an owner-reviewed screenshot cover under /blog/covers/", () => {
    const post = parseBlogPost({ ...validV2Post(), cover: { ...validCover, src: "/blog/covers/panel-1.png" } });
    expect(post.schemaVersion === 2 && post.cover).toEqual({ ...validCover, src: "/blog/covers/panel-1.png" });
  });

  it("requires a post type", () => {
    expect(() => parseBlogPost(without(validV2Post(), "postType"))).toThrow(/root\.postType is required/);
  });

  it.each(["tutorial", "Case study", "", 3, null])("rejects the post type %j", (postType) => {
    expect(() => parseBlogPost({ ...validV2Post(), postType })).toThrow(
      /root\.postType must be case-study, build-notes or explainer/,
    );
  });

  it.each([
    ["name", "OJ Florendo", /author\.name must be "Joseph Florendo"/],
    ["url", "/someone-else", /author\.url must be "\/about"/],
  ] as const)("locks the version 2 author %s", (field, value, message) => {
    const raw = validV2Post();
    raw.author = { name: "Joseph Florendo", url: "/about", [field]: value };
    expect(() => parseBlogPost(raw)).toThrow(message);
  });

  it.each([
    ["an outside URL", "https://example.com/covers/a.webp"],
    ["a protocol-relative URL", "//example.com/blog/covers/a.webp"],
    ["a data URL", "data:image/png;base64,AAAA"],
    ["a path outside the covers folder", "/images/projects/a.webp"],
    ["a parent-folder step", "/blog/covers/../secret.png"],
    ["an encoded parent-folder step", "/blog/covers/%2e%2e/secret.png"],
    ["a sub-folder", "/blog/covers/drafts/a.webp"],
    ["a query string", "/blog/covers/a.webp?v=2"],
    ["a backslash", "/blog/covers\\a.webp"],
    ["an SVG file", "/blog/covers/a.svg"],
    ["a JPEG file", "/blog/covers/a.jpg"],
    ["capital letters", "/blog/covers/A.webp"],
  ])("rejects a cover with %s", (_case, src) => {
    expect(() => parseBlogPost({ ...validV2Post(), cover: { ...validCover, src } })).toThrow(
      /root\.cover\.src must name a WebP or PNG file directly under \/blog\/covers\//,
    );
  });

  it("rejects a cover with missing alt text, bad sizes, another kind or extra fields", () => {
    const bad = (cover: Record<string, unknown>) => () => parseBlogPost({ ...validV2Post(), cover });
    expect(bad(without(validCover, "alt"))).toThrow(/root\.cover\.alt is required/);
    expect(bad({ ...validCover, width: 12.5 })).toThrow(/root\.cover\.width must be a whole number/);
    expect(bad({ ...validCover, height: 0 })).toThrow(/root\.cover\.height must be a whole number/);
    expect(bad({ ...validCover, kind: "video" })).toThrow(/root\.cover\.kind must be image/);
    expect(bad({ ...validCover, href: "https://example.com" })).toThrow(/root\.cover\.href is not allowed/);
  });

  it("still rejects unknown fields and a third format version", () => {
    expect(() => parseBlogPost({ ...validV2Post(), heroVideo: "/a.mp4" })).toThrow(/root\.heroVideo is not allowed/);
    expect(() => parseBlogPost({ ...validV2Post(), schemaVersion: 3 })).toThrow(/root\.schemaVersion must be 1 or 2/);
  });

  it("keeps version 1 closed to the version 2 fields", () => {
    const raw = { ...validV2Post(), schemaVersion: 1, author: { name: "OJ Florendo", url: "/about" } };
    expect(() => parseBlogPost(raw)).toThrow(/root\.postType is not allowed/);
    const v1 = without(raw, "postType");
    expect(() => parseBlogPost({ ...v1, cover: validCover })).toThrow(/root\.cover is not allowed/);
    expect(parseBlogPost(v1)).toMatchObject({ schemaVersion: 1, author: { name: "OJ Florendo" } });
  });

  it("reads the live post as a version 2 explainer with only its byline changed", () => {
    const file = join(
      process.cwd(),
      "content",
      "blog",
      "posts",
      "evaluating-retrieval-systems-refusal-testing-and-quote-integrity.json",
    );
    const post = parseBlogPost(JSON.parse(readFileSync(file, "utf8")));
    expect(post).toMatchObject({
      schemaVersion: 2,
      postType: "explainer",
      publishedAt: "2026-09-30",
      updatedAt: null,
      author: { name: "Joseph Florendo", url: "/about" },
    });
    expect(post.disclosure).toBe(
      "AI agents researched and drafted this article from Joseph Florendo's own project notes, quoting them word for word; an independent AI reviewer and automated checks verified every citation. Joseph Florendo reviewed and approved it and is responsible for it.",
    );
    // Quotes from the source notes stay word for word (ADR-0027).
    expect(post.blocks.some((block) => block.type === "paragraph" && block.text.includes("“Cited is OJ's document-assistant demo.”"))).toBe(true);
    expect(post.sources.map((source) => source.publisher)).toEqual(["OJ Florendo", "OJ Florendo"]);
  });
});
