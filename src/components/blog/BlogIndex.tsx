import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { Container } from "@/components/ui/Container";
import styles from "./blog.module.css";

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

export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  return (
    <div className={styles.page}>
      <Container>
        <header className={styles.indexHeader}>
          <p className={styles.eyebrow}>Journal</p>
          <h1 className={styles.indexTitle}>Notes from building useful software.</h1>
          <p className={styles.indexIntro}>
            Practical writing about product decisions, responsible AI, and the
            evidence behind the systems I build.
          </p>
        </header>

        <section aria-labelledby="published-articles" className={styles.indexBody}>
          <h2 id="published-articles" className="sr-only">
            Published articles
          </h2>

          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyLabel}>No published articles yet</p>
              <p>
                New writing will appear here after it has been reviewed and
                approved for publication.
              </p>
            </div>
          ) : (
            <ol className={styles.postList}>
              {posts.map((post, index) => (
                <li key={post.slug}>
                  <article className={styles.postCard}>
                    <div className={styles.postNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className={styles.postMeta}>
                        {post.publishedAt ? (
                          <time dateTime={post.publishedAt}>
                            {formatDate(post.publishedAt)}
                          </time>
                        ) : null}
                        <span>{post.author.name}</span>
                      </div>
                      <h3 className={styles.postTitle}>
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className={styles.postExcerpt}>{post.excerpt}</p>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className={styles.readLink}
                      aria-label={`Read “${post.title}”`}
                    >
                      Read article
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>
      </Container>
    </div>
  );
}
