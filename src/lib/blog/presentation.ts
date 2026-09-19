import type { Metadata } from "next";
import { site } from "@/data/site";
import type { BlogPost } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";

function absoluteUrl(value: string) {
  return new URL(value, `${SITE_URL}/`).toString();
}

export function buildBlogPostMetadata(post: BlogPost): Metadata {
  const path = `/blog/${post.slug}`;
  const authorUrl = absoluteUrl(post.author.url);

  return {
    title: post.seo.title,
    description: post.seo.description,
    keywords: post.seo.keywords,
    authors: [{ name: post.author.name, url: authorUrl }],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: post.seo.title,
      description: post.seo.description,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      authors: [authorUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo.title,
      description: post.seo.description,
    },
  };
}

export function buildBlogPostingJsonLd(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    datePublished: post.publishedAt ?? undefined,
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    author: {
      "@type": "Person",
      name: post.author.name,
      url: absoluteUrl(post.author.url),
    },
    publisher: {
      "@type": "Person",
      name: site.name,
      url: SITE_URL,
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    keywords: post.seo.keywords,
    citation: post.sources.map((source) => absoluteUrl(source.url)),
  } as const;
}
