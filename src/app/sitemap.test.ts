import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/site-url";
import { projects } from "@/data/projects";

describe("sitemap", () => {
  const entries = sitemap();

  it("includes the homepage", () => {
    expect(entries.some((e) => e.url === `${SITE_URL}/`)).toBe(true);
  });

  it("includes one absolute entry per project case study", () => {
    const withCaseStudy = projects.filter((p) => p.caseStudy);
    for (const project of withCaseStudy) {
      const url = `${SITE_URL}/projects/${project.slug}`;
      expect(entries.some((e) => e.url === url)).toBe(true);
    }
    expect(entries.length).toBe(1 + withCaseStudy.length);
  });

  it("uses absolute URLs", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith("http")).toBe(true);
    }
  });
});
