import { describe, it, expect } from "vitest";
import { getProjectBySlug, projects } from "./projects";

describe("getProjectBySlug", () => {
  it("returns the portfolio project (with a case study) for its slug", () => {
    const project = getProjectBySlug("personal-portfolio-website");
    expect(project).toBeDefined();
    expect(project?.title).toBe("Personal Portfolio Website");
    expect(project?.caseStudy).toBeDefined();
  });

  it("returns undefined for an unknown slug", () => {
    expect(getProjectBySlug("does-not-exist")).toBeUndefined();
  });

  it("has unique slugs across all projects", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
