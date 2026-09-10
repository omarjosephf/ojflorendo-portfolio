import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/site-url";
import { projects } from "@/data/projects";

describe("sitemap", () => {
  const entries = sitemap();

  it("includes every standalone page", () => {
    // Both routes a visitor can land on directly. /about carries the background
    // sections, so leaving it out would hide half the site from crawlers.
    expect(entries.some((e) => e.url === `${SITE_URL}/`)).toBe(true);
    expect(entries.some((e) => e.url === `${SITE_URL}/about`)).toBe(true);
  });

  it("includes one absolute entry per project case study", () => {
    const withCaseStudy = projects.filter((p) => p.caseStudy);
    for (const project of withCaseStudy) {
      const url = `${SITE_URL}/projects/${project.slug}`;
      expect(entries.some((e) => e.url === url)).toBe(true);
    }
    // Two standalone pages (/ and /about) plus one entry per case study, and
    // nothing else: a stray entry is as much a defect as a missing one.
    expect(entries.length).toBe(2 + withCaseStudy.length);
  });

  it("uses absolute URLs", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith("http")).toBe(true);
    }
  });

  // Regression guard. Every entry previously carried `lastModified: new Date()`,
  // so each deployment claimed the whole site had changed — which teaches search
  // engines to ignore the field. No page here has a real content date, so none
  // may assert one.
  it("never claims a modification date it cannot evidence", () => {
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
  });
});
