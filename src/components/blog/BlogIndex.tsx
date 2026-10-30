import Link from "next/link";
import type { BlogPost } from "@/lib/blog";
import { arrangeShowcase, postTypeOf } from "@/lib/blog/showcase";
import { Container } from "@/components/ui/Container";
import { BlogCover } from "./BlogCover";
import { CoverMotion } from "./CoverMotion";
import { PostTypeLabel } from "./PostTypeLabel";
import { formatDate } from "./format-date";
import styles from "./blog.module.css";

/**
 * The blog front page (ADR-0027): the owner's featured post as one large card,
 * then a row of up to three newer posts, then every older post as a plain
 * list, so no post is ever hidden. Each card is one link, named by its title:
 * the title's link stretches over the whole card. Blocks marked
 * `data-sky-dim` dim the star sky behind them (ADR-0030).
 */
export function BlogIndex({ posts, featuredSlug = null }: { posts: BlogPost[]; featuredSlug?: string | null }) {
  const { featured, row, older } = arrangeShowcase(posts, featuredSlug);
  const featuredType = featured ? postTypeOf(featured) : null;

  return (
    <div className={styles.page}>
      <Container>
        {/* The galaxy shows behind the large heading; only the smaller intro
            dims the stars behind it, so its straight edge stays out of the way. */}
        <header id="blog-intro" className={styles.showcaseHeader}>
          <p className={styles.eyebrow}>Blog</p>
          <h1 className={styles.showcaseTitle}>Notes from building AI automation.</h1>
          <p className={styles.showcaseIntro} data-sky-dim="">
            What I build, how I test it, and what I learn, written up as I go.
          </p>
        </header>

        {featured ? (
          <article className={styles.featured} data-sky-dim="">
            <BlogCover post={featured} variant="featured" />
            <div className={styles.featuredBody}>
              <p className={styles.featuredLabel}>Featured</p>
              <h2 className={styles.featuredTitle}>
                <Link href={`/blog/${featured.slug}`} className={styles.cardLink}>
                  {featured.title}
                </Link>
              </h2>
              <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
              <div className={styles.cardMeta}>
                <span>By {featured.author.name}</span>
                {featured.publishedAt ? (
                  <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt)}</time>
                ) : null}
                {featuredType ? <PostTypeLabel type={featuredType} /> : null}
              </div>
            </div>
          </article>
        ) : (
          <div className={styles.emptyState} data-sky-dim="">
            <p className={styles.emptyLabel}>No published articles yet</p>
            <p>New writing will appear here after it has been reviewed and approved for publication.</p>
          </div>
        )}

        {row.length > 0 ? (
          <section aria-labelledby="blog-more-posts" className={styles.rowSection}>
            <h2 id="blog-more-posts" className="sr-only">
              More posts
            </h2>
            <ul className={styles.cardRow}>
              {row.map((post) => {
                const type = postTypeOf(post);
                return (
                  <li key={post.slug}>
                    <article className={styles.card} data-sky-dim="">
                      <BlogCover post={post} variant="card" />
                      <div className={styles.cardBody}>
                        <h3 className={styles.cardTitle}>
                          <Link href={`/blog/${post.slug}`} className={styles.cardLink}>
                            {post.title}
                          </Link>
                        </h3>
                        <p className={styles.cardExcerpt}>{post.excerpt}</p>
                        {type ? (
                          <div className={styles.cardMeta}>
                            <PostTypeLabel type={type} />
                          </div>
                        ) : null}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {older.length > 0 ? (
          <section aria-labelledby="blog-older-posts" className={styles.olderSection} data-sky-dim="">
            <h2 id="blog-older-posts" className={styles.olderHeading}>
              Older posts
            </h2>
            <ul className={styles.olderList}>
              {older.map((post) => {
                const type = postTypeOf(post);
                return (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className={styles.olderLink}>
                      {post.title}
                    </Link>
                    <span className={styles.olderMeta}>
                      {post.publishedAt ? (
                        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                      ) : null}
                      {type ? <PostTypeLabel type={type} /> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </Container>
      <CoverMotion />
    </div>
  );
}
