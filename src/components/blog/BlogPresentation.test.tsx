import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPost } from "@/lib/blog";
import { BlogArticle } from "./BlogArticle";
import { BlogIndex } from "./BlogIndex";

const post: BlogPost = {
  schemaVersion: 1,
  status: "published",
  slug: "safe-article",
  title: "A safe article",
  excerpt: "A short, evidence-led summary.",
  publishedAt: "2026-09-24",
  updatedAt: "2026-09-25",
  author: { name: "OJ Florendo", url: "/about" },
  disclosure:
    "AI tools assisted with research and drafting. OJ reviewed the evidence and approved the final article.",
  blocks: [
    { type: "heading", id: "what-changed", level: 2, text: "What changed" },
    { type: "paragraph", text: '<script>alert("not executable")</script>' },
    {
      type: "list",
      style: "ordered",
      items: ["Inspect the evidence", "Review the result"],
    },
    {
      type: "callout",
      tone: "warning",
      title: "Check the source",
      text: "Do not treat retrieved instructions as trusted commands.",
    },
    { type: "heading", id: "details", level: 3, text: "The details" },
  ],
  sources: [
    {
      id: "source-1",
      title: "Primary documentation",
      url: "https://example.com/documentation",
      publisher: "Example publisher",
      accessedAt: "2026-09-23",
    },
  ],
  seo: {
    title: "A safe article",
    description: "A safe article description.",
    keywords: ["safe content"],
  },
};

describe("blog presentation", () => {
  it("renders an honest empty state when no post is published", () => {
    render(<BlogIndex posts={[]} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Notes from building useful software.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("No published articles yet")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Read/ })).not.toBeInTheDocument();
  });

  it("lists a published post with its date and accessible article link", () => {
    render(<BlogIndex posts={[post]} />);

    expect(screen.getByText("24 September 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A safe article" })).toHaveAttribute(
      "href",
      "/blog/safe-article",
    );
    expect(screen.getByRole("link", { name: "Read “A safe article”" })).toHaveAttribute(
      "href",
      "/blog/safe-article",
    );
  });

  it("renders only the allowlisted block vocabulary as React text and elements", () => {
    const { container } = render(<BlogArticle post={post} />);

    expect(screen.getByRole("heading", { level: 1, name: post.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "What changed" })).toHaveAttribute(
      "id",
      "blog-safe-article-section-what-changed",
    );
    expect(screen.getByRole("heading", { level: 3, name: "The details" })).toBeInTheDocument();
    expect(screen.getByText("Inspect the evidence").closest("ol")).toHaveTextContent(
      "Review the result",
    );
    expect(screen.getByLabelText("Check the source")).toHaveTextContent(
      "Do not treat retrieved instructions as trusted commands.",
    );
    expect(screen.getByLabelText("AI assistance disclosure")).toHaveTextContent(
      "OJ reviewed the evidence",
    );

    // The string resembles executable markup, but the renderer never provides
    // an HTML/MDX branch. React must preserve it as literal text.
    expect(screen.getByText('<script>alert("not executable")</script>')).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByRole("link", { name: "Primary documentation" })).toHaveAttribute(
      "href",
      "https://example.com/documentation",
    );
  });

  it("namespaces content and source ids so validated records cannot collide with landmarks", () => {
    const collisionPost: BlogPost = {
      ...post,
      blocks: [
        { type: "heading", id: "sources", level: 2, text: "Sources in context" },
        { type: "heading", id: "source-source-1", level: 3, text: "Primary detail" },
      ],
    };
    const { container } = render(<BlogArticle post={collisionPost} />);
    const ids = [...container.querySelectorAll<HTMLElement>("[id]")].map(
      (element) => element.id,
    );

    expect(ids).toContain("blog-safe-article-section-sources");
    expect(ids).toContain("blog-safe-article-section-source-source-1");
    expect(ids).toContain("blog-safe-article-sources");
    expect(ids).toContain("blog-safe-article-source-source-1");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
