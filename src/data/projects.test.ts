import { describe, expect, it } from "vitest";
import { getProjectBySlug, projects } from "./projects";

describe("getProjectBySlug", () => {
  it("returns the live portfolio platform with a case study", () => {
    const project = getProjectBySlug("personal-portfolio-website");
    expect(project).toBeDefined();
    expect(project?.title).toBe("Personal Portfolio & Professional Platform");
    expect(project?.status).toBe("Live");
    expect(project?.liveUrl).toBe("https://ojfr.me/");
    expect(project?.caseStudy).toBeDefined();
  });

  it("contains one transparent, owner-accountable AI disclosure", () => {
    const project = getProjectBySlug("personal-portfolio-website");
    expect(project?.caseStudy?.role).toContain("Claude Code and ChatGPT");
    expect(project?.caseStudy?.role).toContain(
      "I directed the product decisions",
    );
    expect(project?.technologies).not.toContain("Claude Code");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getProjectBySlug("does-not-exist")).toBeUndefined();
  });

  it("has unique slugs across all projects", () => {
    const slugs = projects.map((project) => project.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
