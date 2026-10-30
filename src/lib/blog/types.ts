/**
 * Post format version 1: the format the agent pipeline (`src/lib/blog/live/`)
 * still writes. Its author is locked to the name the agents use.
 */
export const BLOG_POST_SCHEMA_VERSION = 1 as const;
export const BLOG_AUTHOR = {
  name: "OJ Florendo",
  url: "/about",
} as const;

/**
 * Post format version 2 (ADR-0027): version 1 plus a required post type, an
 * optional cover, and the Joseph Florendo byline (ADR-0029).
 */
export const BLOG_POST_SCHEMA_VERSION_2 = 2 as const;
export const BLOG_AUTHOR_V2 = {
  name: "Joseph Florendo",
  url: "/about",
} as const;

export const BLOG_POST_TYPES = ["case-study", "build-notes", "explainer"] as const;
export type BlogPostType = (typeof BLOG_POST_TYPES)[number];

/** Committed cover screenshots live in `public/blog/covers/` and nowhere else. */
export const BLOG_COVER_PATH_PREFIX = "/blog/covers/";

export type BlogPostStatus = "draft" | "published";

export interface BlogAuthor {
  name: typeof BLOG_AUTHOR.name;
  /** Same-origin profile path, for example `/about`. */
  url: typeof BLOG_AUTHOR.url;
}

export interface BlogAuthorV2 {
  name: typeof BLOG_AUTHOR_V2.name;
  /** Same-origin profile path, for example `/about`. */
  url: typeof BLOG_AUTHOR_V2.url;
}

/**
 * An owner-reviewed screenshot used instead of the drawn star picture. The
 * path is same-origin, under `/blog/covers/`, and names a WebP or PNG file.
 */
export interface BlogImageCover {
  kind: "image";
  src: string;
  width: number;
  height: number;
  alt: string;
}

export type BlogCover = BlogImageCover;

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

interface BlogPostFields {
  status: BlogPostStatus;
  slug: string;
  title: string;
  excerpt: string;
  /** `null` while a post is a draft; required for a published post. */
  publishedAt: string | null;
  updatedAt: string | null;
  disclosure: string;
  blocks: BlogContentBlock[];
  sources: BlogSource[];
  seo: BlogSeo;
}

export interface BlogPostV1 extends BlogPostFields {
  schemaVersion: typeof BLOG_POST_SCHEMA_VERSION;
  author: BlogAuthor;
}

export interface BlogPostV2 extends BlogPostFields {
  schemaVersion: typeof BLOG_POST_SCHEMA_VERSION_2;
  author: BlogAuthorV2;
  postType: BlogPostType;
  cover?: BlogCover;
}

export type BlogPost = BlogPostV1 | BlogPostV2;
