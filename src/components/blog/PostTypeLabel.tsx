import type { BlogPostType } from "@/lib/blog";
import { POST_TYPE_LABELS } from "@/lib/blog/showcase";
import styles from "./blog.module.css";

const TYPE_CLASS: Record<BlogPostType, string> = {
  "case-study": styles.typeCaseStudy,
  "build-notes": styles.typeBuildNotes,
  explainer: styles.typeExplainer,
};

/** The post type as a small pill. The word is always shown, so meaning never rests on colour. */
export function PostTypeLabel({ type }: { type: BlogPostType }) {
  return <span className={`${styles.typeLabel} ${TYPE_CLASS[type]}`}>{POST_TYPE_LABELS[type]}</span>;
}
