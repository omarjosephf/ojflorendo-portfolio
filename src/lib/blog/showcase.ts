import type { BlogPost, BlogPostType } from "./types";

/** How many posts sit in the row under the featured card (ADR-0027). */
export const SHOWCASE_ROW_SIZE = 3;

export const POST_TYPE_LABELS: Record<BlogPostType, string> = {
  "case-study": "Case study",
  "build-notes": "Build notes",
  explainer: "Explainer",
};

/** A version 1 post has no type, so it shows no type label. */
export function postTypeOf(post: BlogPost): BlogPostType | null {
  return post.schemaVersion === 2 ? post.postType : null;
}

export interface BlogShowcase {
  featured: BlogPost | null;
  row: BlogPost[];
  older: BlogPost[];
}

function newestFirst(left: BlogPost, right: BlogPost) {
  return (
    (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "", "en-GB") ||
    left.slug.localeCompare(right.slug, "en-GB")
  );
}

/**
 * Orders the front page: the owner's featured post first (the newest post when
 * none is chosen, or when the choice is not among the posts), then the three
 * newest other posts, then every older post, so no post is ever hidden.
 */
export function arrangeShowcase(posts: readonly BlogPost[], featuredSlug: string | null): BlogShowcase {
  const sorted = [...posts].sort(newestFirst);
  const featured = sorted.find((post) => post.slug === featuredSlug) ?? sorted[0] ?? null;
  const others = sorted.filter((post) => post !== featured);
  return {
    featured,
    row: others.slice(0, SHOWCASE_ROW_SIZE),
    older: others.slice(SHOWCASE_ROW_SIZE),
  };
}
