import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { BLOG_POST_SCHEMA_VERSION, type BlogPost } from "./types";
import {
  createBlogRepository,
  getPostBySlug,
  getPostSlugs,
  getPublishedPosts,
  loadBlogPostsFromDirectory,
} from "./repository";

const temporaryDirectories: string[] = [];

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "project-zero-blog-"));
  temporaryDirectories.push(directory);
  return directory;
}

function post(slug: string, status: "draft" | "published", publishedAt: string | null): BlogPost {
  return {
    schemaVersion: BLOG_POST_SCHEMA_VERSION,
    status,
    slug,
    title: `Article ${slug}`,
    excerpt: `A sufficiently detailed excerpt for ${slug}.`,
    publishedAt,
    updatedAt: null,
    author: { name: "OJ Florendo", url: "/about" },
    disclosure: "AI assisted with drafting; OJ reviewed and remains responsible for this article.",
    blocks: [{ type: "paragraph", text: `Plain text content for ${slug}.` }],
    sources:
      status === "published"
        ? [{ id: "source", title: "Public source", url: "https://example.com/source" }]
        : [],
    seo: {
      title: `Article ${slug}`,
      description: `A sufficiently detailed search description for ${slug}.`,
      keywords: ["engineering"],
    },
  };
}

function writePost(directory: string, value: BlogPost) {
  writeFileSync(join(directory, `${value.slug}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("blog repository", () => {
  it("loads published posts newest first and never exposes drafts", () => {
    const directory = temporaryDirectory();
    writePost(directory, post("older-post", "published", "2026-09-10"));
    writePost(directory, post("newer-post", "published", "2026-09-18"));
    writePost(directory, post("future-article-draft", "draft", null));
    const repository = createBlogRepository(directory);

    expect(repository.getPublishedPosts().map(({ slug }) => slug)).toEqual(["newer-post", "older-post"]);
    expect(repository.getPostSlugs()).toEqual(["newer-post", "older-post"]);
    expect(repository.getPostBySlug("older-post")?.status).toBe("published");
    expect(repository.getPostBySlug("future-article-draft")).toBeUndefined();
    expect(repository.getPostBySlug("../future-article-draft")).toBeUndefined();
  });

  it("fails closed when a JSON record is malformed", () => {
    const directory = temporaryDirectory();
    writeFileSync(join(directory, "broken.json"), "{ definitely not json", "utf8");

    expect(() => loadBlogPostsFromDirectory(directory)).toThrow(/broken\.json is invalid/);
  });

  it("requires a record slug to match its repository file name", () => {
    const directory = temporaryDirectory();
    writeFileSync(
      join(directory, "wrong-name.json"),
      JSON.stringify(post("actual-slug", "published", "2026-09-19")),
      "utf8",
    );

    expect(() => loadBlogPostsFromDirectory(directory)).toThrow(/slug must match its file name/);
  });

  it("keeps Phase 18.1 public queries empty until an owner-reviewed post exists", () => {
    expect(getPublishedPosts()).toEqual([]);
    expect(getPostSlugs()).toEqual([]);
    expect(getPostBySlug("inside-ev-rag")).toBeUndefined();
  });
});
