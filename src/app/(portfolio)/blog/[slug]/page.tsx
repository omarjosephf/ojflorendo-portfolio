import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { JsonLd } from "@/components/ui/JsonLd";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import {
  buildBlogPostMetadata,
  buildBlogPostingJsonLd,
} from "@/lib/blog/presentation";

type Params = { params: Promise<{ slug: string }> };

// The portfolio is intentionally request-rendered so each response can carry
// its CSP nonce. Stating that contract here also keeps an empty post repository
// from being misclassified as a fully static dynamic route by Next.js.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

function publishedPost(slug: string) {
  const post = getPostBySlug(slug);
  return post?.status === "published" ? post : undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = publishedPost(slug);
  if (!post) notFound();

  return buildBlogPostMetadata(post);
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = publishedPost(slug);
  if (!post) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <BlogArticle post={post} />
      <JsonLd data={buildBlogPostingJsonLd(post)} nonce={nonce} />
    </>
  );
}
