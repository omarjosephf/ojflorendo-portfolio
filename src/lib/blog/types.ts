export const BLOG_POST_SCHEMA_VERSION = 1 as const;
export const BLOG_AUTHOR = {
  name: "OJ Florendo",
  url: "/about",
} as const;

export type BlogPostStatus = "draft" | "published";

export interface BlogAuthor {
  name: typeof BLOG_AUTHOR.name;
  /** Same-origin profile path, for example `/about`. */
  url: typeof BLOG_AUTHOR.url;
}

export interface BlogHeadingBlock {
  type: "heading";
  id: string;
  level: 2 | 3;
  text: string;
}

export interface BlogParagraphBlock {
  type: "paragraph";
  text: string;
}

export interface BlogListBlock {
  type: "list";
  style: "unordered" | "ordered";
  items: string[];
}

export interface BlogCalloutBlock {
  type: "callout";
  tone: "note" | "warning";
  title?: string;
  text: string;
}

/**
 * The complete rendering vocabulary for repository-managed posts.
 *
 * Every value is plain text. There is deliberately no HTML, MDX, JavaScript,
 * component, embed or arbitrary-attribute block in this union.
 */
export type BlogContentBlock =
  | BlogHeadingBlock
  | BlogParagraphBlock
  | BlogListBlock
  | BlogCalloutBlock;

export interface BlogSource {
  id: string;
  title: string;
  /** An HTTPS URL or a same-origin path beginning with `/`. */
  url: string;
  publisher?: string;
  /** Calendar date in `YYYY-MM-DD` form. */
  accessedAt?: string;
}

export interface BlogSeo {
  title: string;
  description: string;
  keywords: string[];
}

export interface BlogPost {
  schemaVersion: typeof BLOG_POST_SCHEMA_VERSION;
  status: BlogPostStatus;
  slug: string;
  title: string;
  excerpt: string;
  /** `null` while a post is a draft; required for a published post. */
  publishedAt: string | null;
  updatedAt: string | null;
  author: BlogAuthor;
  disclosure: string;
  blocks: BlogContentBlock[];
  sources: BlogSource[];
  seo: BlogSeo;
}
