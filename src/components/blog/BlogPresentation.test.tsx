import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPost, BlogPostType } from "@/lib/blog";
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

/** A version 2 post for the front-page fixture (tests only, never in content/). */
function typedPost(slug: string, publishedAt: string, postType: BlogPostType): BlogPost {
  return {
    ...post,
    schemaVersion: 2,
    slug,
    title: `Title of ${slug}`,
    excerpt: `The result of ${slug} in one sentence.`,
    publishedAt,
    updatedAt: null,
    author: { name: "Joseph Florendo", url: "/about" },
    postType,
  };
}

const fivePosts = [
  typedPost("post-one", "2026-10-01", "case-study"),
  typedPost("post-two", "2026-10-02", "build-notes"),
  typedPost("post-three", "2026-10-03", "explainer"),
  typedPost("post-four", "2026-10-04", "case-study"),
  typedPost("post-five", "2026-10-05", "build-notes"),
];

describe("blog front page (ADR-0027)", () => {
  it("renders the approved header and an honest empty state when no post is published", () => {
    render(<BlogIndex posts={[]} />);

    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Notes from building AI automation." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What I build, how I test it, and what I learn, written up as I go."),
    ).toBeInTheDocument();
    expect(screen.getByText("No published articles yet")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows one post as the featured card only, with no empty row", () => {
    const { container } = render(<BlogIndex posts={[typedPost("only-post", "2026-10-01", "explainer")]} />);

    const featured = screen.getByRole("heading", { level: 2, name: "Title of only-post" }).closest("article")!;
    expect(within(featured).getByText("Featured")).toBeInTheDocument();
    expect(within(featured).getByText("By Joseph Florendo")).toBeInTheDocument();
    expect(within(featured).getByText("1 October 2026")).toBeInTheDocument();
    expect(within(featured).getByText("Explainer")).toBeInTheDocument();
    expect(within(featured).getAllByRole("link")).toHaveLength(1);
    expect(within(featured).getByRole("link")).toHaveAccessibleName("Title of only-post");
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "More posts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Older posts" })).not.toBeInTheDocument();
  });

  it("shows five posts as the featured card, a full row of three and a one-item older list", () => {
    const { container } = render(<BlogIndex posts={fivePosts} featuredSlug="post-two" />);

    const featured = screen.getByRole("heading", { level: 2, name: "Title of post-two" }).closest("article")!;
    expect(within(featured).getByText("Featured")).toBeInTheDocument();
    expect(within(featured).getByText("Build notes")).toBeInTheDocument();

    const row = screen.getByRole("heading", { level: 2, name: "More posts" }).closest("section")!;
    const cards = within(row).getAllByRole("article");
    expect(cards.map((card) => within(card).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "Title of post-five",
      "Title of post-four",
      "Title of post-three",
    ]);
    for (const card of cards) {
      expect(within(card).getAllByRole("link")).toHaveLength(1);
      expect(within(card).getByText(/^The result of post-/)).toBeInTheDocument();
    }
    expect(within(cards[0]).getByText("Build notes")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Case study")).toBeInTheDocument();
    expect(within(cards[2]).getByText("Explainer")).toBeInTheDocument();

    const older = screen.getByRole("heading", { level: 2, name: "Older posts" }).closest("section")!;
    const items = within(older).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByRole("link", { name: "Title of post-one" })).toHaveAttribute("href", "/blog/post-one");
    expect(within(items[0]).getByText("1 October 2026")).toBeInTheDocument();
    expect(within(items[0]).getByText("Case study")).toBeInTheDocument();

    // Every post is reachable exactly once.
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href")).sort()).toEqual(
      fivePosts.map((item) => `/blog/${item.slug}`).sort(),
    );
    expect(container.querySelectorAll("article")).toHaveLength(4);
  });

  it("draws decorative star pictures with no inline styles or scripts", () => {
    const { container } = render(<BlogIndex posts={fivePosts} />);

    const pictures = container.querySelectorAll("svg");
    expect(pictures).toHaveLength(4);
    for (const picture of pictures) {
      expect(picture).toHaveAttribute("aria-hidden", "true");
      expect(picture).toHaveAttribute("focusable", "false");
    }
    // The production CSP blocks inline style attributes; the pictures use none.
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
    expect(container.querySelector("script")).toBeNull();
    const gradientIds = [...container.querySelectorAll("radialGradient, linearGradient")].map((node) => node.id);
    expect(new Set(gradientIds).size).toBe(gradientIds.length);
  });

  it("shows a version 1 post with its stored author and no type label", () => {
    render(<BlogIndex posts={[post]} />);

    expect(screen.getByText("By OJ Florendo")).toBeInTheDocument();
    expect(screen.queryByText(/^(Case study|Build notes|Explainer)$/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A safe article" })).toHaveAttribute("href", "/blog/safe-article");
  });
});

describe("blog presentation", () => {
  it("adds the type label to a version 2 article's meta line", () => {
    render(<BlogArticle post={typedPost("typed-article", "2026-10-05", "case-study")} />);

    expect(screen.getByRole("link", { name: "Joseph Florendo" })).toHaveAttribute("href", "/about");
    expect(screen.getByText("Case study")).toBeInTheDocument();
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
