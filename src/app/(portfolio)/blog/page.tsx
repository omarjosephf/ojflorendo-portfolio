import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { StarSkyLazy } from "@/components/stars/StarSkyLazy";
import { blogShowcase } from "@/data/blog-showcase";
import { getPublishedPosts } from "@/lib/blog";

const title = "Blog";
const description =
  "Evidence-led notes from Joseph Florendo about building useful software, responsible AI systems and clear digital products.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", url: "/blog", title, description },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * The blog front page over the home page's star sky (ADR-0027, ADR-0030): the
 * galaxy sits at the foot of the header, and the stars dim behind every card.
 * Post pages keep no canvas.
 */
export default function BlogPage() {
  return (
    <>
      <StarSkyLazy anchor="#blog-intro" dimSelector="[data-sky-dim], .jf-footer" />
      <BlogIndex posts={getPublishedPosts()} featuredSlug={blogShowcase.featuredSlug} />
    </>
  );
}
