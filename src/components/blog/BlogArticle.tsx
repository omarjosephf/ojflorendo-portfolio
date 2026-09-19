import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { Container } from "@/components/ui/Container";
import styles from "./blog.module.css";

type BlogContentBlock = BlogPost["blocks"][number];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : value;
  return dateFormatter.format(new Date(normalized));
}

function ContentBlock({
  block,
  headingIdPrefix,
}: {
  block: BlogContentBlock;
  headingIdPrefix: string;
}) {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2 id={`${headingIdPrefix}${block.id}`} className={styles.headingTwo}>
          {block.text}
        </h2>
      ) : (
        <h3 id={`${headingIdPrefix}${block.id}`} className={styles.headingThree}>
          {block.text}
        </h3>
      );
    case "paragraph":
      return <p className={styles.paragraph}>{block.text}</p>;
    case "list": {
      const List = block.style === "ordered" ? "ol" : "ul";
      return (
        <List
          className={
            block.style === "ordered" ? styles.orderedList : styles.unorderedList
          }
        >
          {block.items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </List>
      );
    }
    case "callout":
      return (
        <aside
          className={`${styles.callout} ${
            block.tone === "warning" ? styles.calloutWarning : ""
          }`}
          aria-label={block.title ?? (block.tone === "warning" ? "Important" : "Note")}
        >
          <p className={styles.calloutLabel}>
            {block.title ?? (block.tone === "warning" ? "Important" : "Note")}
          </p>
          <p>{block.text}</p>
        </aside>
      );
  }
}

export function BlogArticle({ post }: { post: BlogPost }) {
  const articleIdPrefix = `blog-${post.slug}`;

  return (
    <article className={styles.page}>
      <Container>
        <Link href="/blog" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" />
          Back to all articles
        </Link>

        <header className={styles.articleHeader}>
          <p className={styles.eyebrow}>Article</p>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          <p className={styles.articleExcerpt}>{post.excerpt}</p>
          <div className={styles.articleMeta}>
            <span>
              By <a href={post.author.url}>{post.author.name}</a>
            </span>
            {post.publishedAt ? (
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            ) : null}
            {post.updatedAt && post.updatedAt !== post.publishedAt ? (
              <span>
                Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </span>
            ) : null}
          </div>
          <aside className={styles.disclosure} aria-label="AI assistance disclosure">
            <span>How this was made</span>
            <p>{post.disclosure}</p>
          </aside>
        </header>

        <div className={styles.articleLayout}>
          <section className={styles.articleBody} aria-label="Article content">
            {post.blocks.map((block, index) => (
              <ContentBlock
                key={
                  block.type === "heading"
                    ? block.id
                    : `${block.type}-${index}`
                }
                block={block}
                headingIdPrefix={`${articleIdPrefix}-section-`}
              />
            ))}
          </section>

          <aside
            className={styles.sourcePanel}
            aria-labelledby={`${articleIdPrefix}-sources`}
          >
            <h2 id={`${articleIdPrefix}-sources`}>Sources</h2>
            {post.sources.length === 0 ? (
              <p>No external sources were cited for this article.</p>
            ) : (
              <ol>
                {post.sources.map((source) => (
                  <li
                    key={source.id}
                    id={`${articleIdPrefix}-source-${source.id}`}
                  >
                    <a href={source.url}>{source.title}</a>
                    {source.publisher ? <span>{source.publisher}</span> : null}
                    {source.accessedAt ? (
                      <span>
                        Accessed {formatDate(source.accessedAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </Container>
    </article>
  );
}
