/**
 * The blog front page's owner choice (ADR-0027): the post OJ chose to feature.
 * A unit test fails the build if this is not a published post. With `null`,
 * the newest post is featured.
 */
export const blogShowcase: { readonly featuredSlug: string | null } = {
  featuredSlug: "evaluating-retrieval-systems-refusal-testing-and-quote-integrity",
};
