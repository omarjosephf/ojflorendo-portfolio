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

  it("returns the live document assistant with a case study", () => {
    const project = getProjectBySlug("cited");
    expect(project).toBeDefined();
    expect(project?.title).toBe("Cited — Document Assistant");
    expect(project?.status).toBe("Live");
    expect(project?.githubUrl).toBe("https://github.com/omarjosephf/cited");
    expect(project?.caseStudy).toBeDefined();
  });

  // The project's own premise is that a claim you cannot check is not worth
  // making. Quoting its evaluation scores without the size of the set they came
  // from would be exactly the failure it was built to avoid, so the qualifier
  // is load-bearing content, not padding.
  it("qualifies the evaluation figures it quotes", () => {
    const outcome = getProjectBySlug("cited")?.caseStudy?.outcome;
    expect(outcome).toContain("fifteen questions");
    expect(outcome).toContain("not enough to show the system generalises");
  });

  it("discloses AI assistance without listing the tool as a skill", () => {
    for (const project of projects) {
      expect(project.caseStudy?.role).toMatch(/AI-assisted engineering/i);
      expect(project.technologies).not.toContain("Claude Code");
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getProjectBySlug("does-not-exist")).toBeUndefined();
  });

  it("has unique slugs across all projects", () => {
    const slugs = projects.map((project) => project.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
