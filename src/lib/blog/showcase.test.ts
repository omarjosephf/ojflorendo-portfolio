import { describe, expect, it } from "vitest";

import { blogShowcase } from "@/data/blog-showcase";
import { getPublishedPosts } from "./repository";
import { arrangeShowcase, postTypeOf } from "./showcase";
import type { BlogPost } from "./types";

function post(slug: string, publishedAt: string, schemaVersion: 1 | 2 = 2): BlogPost {
  const base = {
    status: "published" as const,
    slug,
    title: `Post ${slug}`,
    excerpt: "One sentence that gives the post's result.",
    publishedAt,
    updatedAt: null,
    disclosure: "Written and reviewed by the owner.",
    blocks: [{ type: "paragraph" as const, text: "Body." }],
    sources: [{ id: "notes", title: "Notes", url: "/about" }],
    seo: { title: `Post ${slug}`, description: "A test post description.", keywords: ["test"] },
  };
  return schemaVersion === 1
    ? { ...base, schemaVersion: 1, author: { name: "OJ Florendo", url: "/about" } }
    : { ...base, schemaVersion: 2, author: { name: "Joseph Florendo", url: "/about" }, postType: "build-notes" };
}

const five = [
  post("first", "2026-10-01"),
  post("second", "2026-10-02"),
  post("third", "2026-10-03"),
  post("fourth", "2026-10-04"),
  post("fifth", "2026-10-05"),
];

describe("blog front page order (ADR-0027)", () => {
  it("puts the chosen post first, then the three newest others, then every older post", () => {
    const { featured, row, older } = arrangeShowcase(five, "second");
    expect(featured?.slug).toBe("second");
    expect(row.map((item) => item.slug)).toEqual(["fifth", "fourth", "third"]);
    expect(older.map((item) => item.slug)).toEqual(["first"]);
  });

  it("features the newest post when no post is chosen or the choice is unknown", () => {
    expect(arrangeShowcase(five, null).featured?.slug).toBe("fifth");
    expect(arrangeShowcase(five, "not-a-post").featured?.slug).toBe("fifth");
  });

  it("shows only real posts: one post leaves no row and no list", () => {
    expect(arrangeShowcase([five[0]], null)).toEqual({ featured: five[0], row: [], older: [] });
    expect(arrangeShowcase([], null)).toEqual({ featured: null, row: [], older: [] });
  });

  it("gives a version 1 post no type", () => {
    expect(postTypeOf(post("old", "2026-09-01", 1))).toBeNull();
    expect(postTypeOf(five[0])).toBe("build-notes");
  });

  it("names a published post as the featured post", () => {
    const slugs = getPublishedPosts().map((item) => item.slug);
    if (blogShowcase.featuredSlug !== null) expect(slugs).toContain(blogShowcase.featuredSlug);
  });
});
