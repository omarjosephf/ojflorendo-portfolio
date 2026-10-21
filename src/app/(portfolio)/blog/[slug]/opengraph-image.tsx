import { site } from "@/data/site";
import { getPostBySlug } from "@/lib/blog";
import { renderShareCard, shareCardContentType, shareCardSize } from "@/lib/og/share-card";

export const alt = `A blog post by ${site.name}`;
export const size = shareCardSize;
export const contentType = shareCardContentType;

/** Each post's card carries its own title, so new posts get one automatically. */
export default async function BlogPostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  // Drafts and unknown slugs get no card, as their pages return 404.
  if (post?.status !== "published") return new Response("Not found", { status: 404 });

  return renderShareCard({ eyebrow: `Blog · ${site.name}`, title: post.title });
}
