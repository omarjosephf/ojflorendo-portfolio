import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ProjectItem } from "@/types";

/**
 * The card must render a real screenshot when one exists and fall back to the
 * abstract placeholder when it does not. The fallback is the state every future
 * project starts in, so it has to keep working — it is easy to break silently
 * while adding imagery to the one project that has it.
 */

const base: ProjectItem = {
  slug: "example-project",
  title: "Example Project",
  summary: "A summary.",
  description: "A description.",
  status: "Live",
  technologies: ["Next.js"],
  image: null,
  liveUrl: null,
  githubUrl: null,
  featured: true,
  ariaLabel: "Example Project",
};

const projects = vi.hoisted(() => ({ value: [] as ProjectItem[] }));
vi.mock("@/data/projects", () => ({
  get projects() {
    return projects.value;
  },
}));

// Reveal wraps cards in an IntersectionObserver-driven client component; the
// animation is irrelevant here and jsdom has no observer.
vi.mock("@/components/ui/Reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

async function renderProjects() {
  const { Projects } = await import("./Projects");
  render(<Projects />);
}

describe("project card imagery", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders the screenshot when a project has one", async () => {
    projects.value = [
      { ...base, image: "/images/projects/example-project.webp" },
    ];
    await renderProjects();

    const img = document.querySelector<HTMLImageElement>(
      'img[src="/images/projects/example-project.webp"]',
    );
    expect(img).not.toBeNull();
    // Explicit dimensions are what stop the card shifting as the file arrives.
    expect(img?.getAttribute("width")).toBeTruthy();
    expect(img?.getAttribute("height")).toBeTruthy();
    expect(img?.getAttribute("loading")).toBe("lazy");
    // Decorative: the heading and description beside it already name the
    // project, so an alt description would only repeat them.
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("falls back to the placeholder when a project has no image", async () => {
    projects.value = [{ ...base, image: null }];
    await renderProjects();

    expect(document.querySelector("img")).toBeNull();
    // The placeholder is decorative and aria-hidden, so assert on the DOM
    // rather than an accessible role it deliberately does not expose.
    expect(document.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    // The card itself must still be complete.
    expect(screen.getByText("Example Project")).toBeInTheDocument();
  });
});
