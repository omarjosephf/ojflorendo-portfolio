import { describe, expect, it } from "vitest";
import type { BlogPost } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";
import { buildBlogPostMetadata, buildBlogPostingJsonLd } from "./presentation";

const post: BlogPost = {
  schemaVersion: 1,
  status: "published",
  slug: "metadata-example",
  title: "Metadata example",
  excerpt: "A visible article summary.",
  publishedAt: "2026-09-24",
  updatedAt: "2026-09-25",
  author: { name: "OJ Florendo", url: "/about" },
  disclosure: "AI-assisted and reviewed by OJ Florendo.",
  blocks: [{ type: "paragraph", text: "Article body." }],
  sources: [
    {
      id: "local-source",
      title: "Local source",
      url: "/projects/personal-portfolio-website",
    },
    {
      id: "external-source",
      title: "External source",
      url: "https://example.com/evidence",
    },
  ],
  seo: {
    title: "Metadata example — OJ Florendo",
    description: "A search description for the metadata example.",
    keywords: ["metadata", "structured data"],
  },
};

describe("blog presentation data", () => {
  it("builds article metadata from the validated post", () => {
    expect(buildBlogPostMetadata(post)).toMatchObject({
      title: post.seo.title,
      description: post.seo.description,
      keywords: post.seo.keywords,
      authors: [{ name: post.author.name, url: `${SITE_URL}/about` }],
      alternates: { canonical: "/blog/metadata-example" },
      openGraph: {
        type: "article",
        url: "/blog/metadata-example",
        publishedTime: "2026-09-24",
        modifiedTime: "2026-09-25",
        authors: [`${SITE_URL}/about`],
      },
    });
  });

  it("builds absolute, canonical BlogPosting structured data", () => {
    expect(buildBlogPostingJsonLd(post)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${SITE_URL}/blog/metadata-example#article`,
      url: `${SITE_URL}/blog/metadata-example`,
      datePublished: "2026-09-24",
      dateModified: "2026-09-25",
      author: {
        "@type": "Person",
        name: "OJ Florendo",
        url: `${SITE_URL}/about`,
      },
      citation: [
        `${SITE_URL}/projects/personal-portfolio-website`,
        "https://example.com/evidence",
      ],
    });
  });
});
