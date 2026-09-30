import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { getPublishedPosts } from "@/lib/blog";

const title = "Blog";
const description =
  "Evidence-led notes from OJ Florendo about building useful software, responsible AI systems and clear digital products.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", url: "/blog", title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function BlogPage() {
  return <BlogIndex posts={getPublishedPosts()} />;
}
