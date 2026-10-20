import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadBlogPostsFromDirectory } from "./repository";

const directories: string[] = [];

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "blog-cover-"));
  directories.push(root);
  const posts = join(root, "posts");
  const publicFolder = join(root, "public");
  mkdirSync(posts);
  mkdirSync(join(publicFolder, "blog", "covers"), { recursive: true });
  writeFileSync(
    join(posts, "a-case-study.json"),
    JSON.stringify({
      schemaVersion: 2,
      status: "published",
      slug: "a-case-study",
      title: "A case study",
      excerpt: "What was built, how it was tested, and the result.",
      postType: "case-study",
      publishedAt: "2026-10-20",
      updatedAt: null,
      author: { name: "Joseph Florendo", url: "/about" },
      disclosure: "Written and reviewed by Joseph Florendo.",
      blocks: [{ type: "paragraph", text: "Body." }],
      sources: [{ id: "notes", title: "Notes", url: "/about" }],
      seo: { title: "A case study", description: "A case study with a committed screenshot.", keywords: ["case study"] },
      cover: { kind: "image", src: "/blog/covers/run-panel.webp", width: 1200, height: 800, alt: "The run panel" },
    }),
  );
  return { posts, publicFolder };
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("blog repository, cover screenshots", () => {
  it("fails closed when a post names a cover file that is not committed", () => {
    const { posts, publicFolder } = workspace();
    expect(() => loadBlogPostsFromDirectory(posts, publicFolder)).toThrow(
      /root\.cover\.src must name a file committed in public\/blog\/covers\/run-panel\.webp/,
    );
  });

  it("loads a post whose cover file is committed under public/blog/covers/", () => {
    const { posts, publicFolder } = workspace();
    writeFileSync(join(publicFolder, "blog", "covers", "run-panel.webp"), "");
    expect(loadBlogPostsFromDirectory(posts, publicFolder)[0]).toMatchObject({
      slug: "a-case-study",
      cover: { src: "/blog/covers/run-panel.webp" },
    });
  });
});
