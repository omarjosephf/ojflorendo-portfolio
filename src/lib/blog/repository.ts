import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { BlogPostValidationError, parseBlogPost } from "./schema";
import type { BlogPost } from "./types";

const POSTS_DIRECTORY = join(process.cwd(), "content", "blog", "posts");
const PUBLIC_DIRECTORY = join(process.cwd(), "public");
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseJson(contents: string, fileName: string) {
  try {
    return JSON.parse(contents) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown JSON error";
    throw new BlogPostValidationError([reason], fileName);
  }
}

/** @internal Exported for deterministic repository-boundary tests. */
export function loadBlogPostsFromDirectory(
  directory: string,
  publicDirectory: string = PUBLIC_DIRECTORY,
): BlogPost[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "en-GB"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unable to read directory";
    throw new BlogPostValidationError([reason], "blog post directory");
  }

  const posts = fileNames.map((fileName) => {
    const source = basename(fileName);
    const post = parseBlogPost(parseJson(readFileSync(join(directory, fileName), "utf8"), source), source);
    const fileSlug = fileName.slice(0, -".json".length);
    if (post.slug !== fileSlug) {
      throw new BlogPostValidationError(
        [`root.slug must match its file name (${JSON.stringify(fileSlug)})`],
        source,
      );
    }
    // The parser has already limited the path to one file name under
    // /blog/covers/, so joining it to the public folder cannot leave it.
    if (post.schemaVersion === 2 && post.cover && !existsSync(join(publicDirectory, ...post.cover.src.split("/")))) {
      throw new BlogPostValidationError(
        [`root.cover.src must name a file committed in public${post.cover.src}`],
        source,
      );
    }
    return post;
  });

  const slugs = posts.map((post) => post.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new BlogPostValidationError(["post slugs must be unique"], "blog post directory");
  }
  return posts;
}

function publishedPosts(posts: readonly BlogPost[]) {
  return posts
    .filter((post): post is BlogPost & { status: "published"; publishedAt: string } =>
      post.status === "published" && post.publishedAt !== null,
    )
    .sort(
      (left, right) =>
        right.publishedAt.localeCompare(left.publishedAt, "en-GB") ||
        left.slug.localeCompare(right.slug, "en-GB"),
    );
}

/** @internal Factory used to test query behaviour without mutating public content. */
export function createBlogRepository(directory: string) {
  return {
    getPublishedPosts() {
      return publishedPosts(loadBlogPostsFromDirectory(directory));
    },
    getPostBySlug(slug: string) {
      if (!VALID_SLUG.test(slug)) return undefined;
      return publishedPosts(loadBlogPostsFromDirectory(directory)).find((post) => post.slug === slug);
    },
    getPostSlugs() {
      return publishedPosts(loadBlogPostsFromDirectory(directory)).map((post) => post.slug);
    },
  };
}

const repository = createBlogRepository(POSTS_DIRECTORY);

/** Return published posts newest first. Drafts are never exposed to a route. */
export function getPublishedPosts() {
  return repository.getPublishedPosts();
}

/** Return a published post only; unknown, malformed and draft slugs do not resolve. */
export function getPostBySlug(slug: string) {
  return repository.getPostBySlug(slug);
}

/** Return the complete, date-sorted set of slugs suitable for static params. */
export function getPostSlugs() {
  return repository.getPostSlugs();
}
