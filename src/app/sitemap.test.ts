import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/site-url";
import { getPublishedPosts } from "@/lib/blog";
import { projects } from "@/data/projects";

describe("sitemap", () => {
  const entries = sitemap();

  it("includes every standalone page", () => {
    // Both routes a visitor can land on directly. /about carries the background
    // sections, so leaving it out would hide half the site from crawlers.
    expect(entries.some((e) => e.url === `${SITE_URL}/`)).toBe(true);
    expect(entries.some((e) => e.url === `${SITE_URL}/about`)).toBe(true);
    expect(entries.some((e) => e.url === `${SITE_URL}/blog`)).toBe(true);
  });

  it("includes one absolute entry per project case study", () => {
    const withCaseStudy = projects.filter((p) => p.caseStudy);
    for (const project of withCaseStudy) {
      const url = `${SITE_URL}/projects/${project.slug}`;
      expect(entries.some((e) => e.url === url)).toBe(true);
    }
    // Three standalone pages plus one entry per case study and published blog
    // post. Drafts are filtered by the blog repository before they reach here.
    expect(entries.length).toBe(
      3 + withCaseStudy.length + getPublishedPosts().length,
    );
  });

  it("includes every published blog post with its evidenced content date", () => {
    for (const post of getPublishedPosts()) {
      const entry = entries.find(
        (candidate) => candidate.url === `${SITE_URL}/blog/${post.slug}`,
      );
      expect(entry).toBeDefined();
      expect(entry?.lastModified).toBe(post.updatedAt ?? post.publishedAt);
    }
  });

  it("uses absolute URLs", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith("http")).toBe(true);
    }
  });

  // Regression guard. Static pages and case studies still have no tracked
  // revision date. Blog post records do, so only their routes may emit one.
  it("never invents a modification date for undated content", () => {
    const blogUrls = new Set(
      getPublishedPosts().map((post) => `${SITE_URL}/blog/${post.slug}`),
    );
    for (const entry of entries.filter((item) => !blogUrls.has(item.url))) {
      expect(entry.lastModified).toBeUndefined();
    }
  });
});
