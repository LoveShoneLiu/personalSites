import Link from "next/link";
import Image from "next/image";
import { db, posts } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { parseTags, formatDate } from "@/lib/utils";
import styles from "./page.module.scss";

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

const PAGE_SIZE = 6;

async function getPaginatedPosts(page: number, pageSize: number) {
  try {
    const offset = (page - 1) * pageSize;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(posts)
        .where(eq(posts.isPublished, true))
        .orderBy(desc(posts.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.isPublished, true)),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { items, total };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { items: [], total: 0 };
  }
}

type BlogPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentPage = Math.max(1, Number(resolvedSearchParams.page) || 1);
  const { items: blogPosts, total } = await getPaginatedPosts(
    currentPage,
    PAGE_SIZE
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.blogPage}>
      <section className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>
            Thoughts, tutorials, and insights about web development and technology
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className="container">
          {blogPosts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <h2>No posts yet</h2>
              <p>Check back soon for new content!</p>
            </div>
          ) : (
            <>
              <div className={styles.masonry}>
                {blogPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/bloginfo/${post.id}`}
                    className={styles.card}
                  >
                    {post.imageUrl && (
                      <div className={styles.cardImage}>
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <div className={styles.cardContent}>
                      <h2 className={styles.cardTitle}>{post.title}</h2>
                      {post.description && (
                        <p className={styles.cardDescription}>
                          {post.description}
                        </p>
                      )}
                      <div className={styles.cardMeta}>
                        <span className={styles.cardDate}>
                          {formatDate(post.createdAt!)}
                        </span>
                        {post.tags && parseTags(post.tags).length > 0 && (
                          <div className={styles.cardTags}>
                            {parseTags(post.tags)
                              .slice(0, 3)
                              .map((tag, idx) => (
                                <span key={idx} className={styles.tag}>
                                  {tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      {post.link && (
                        <div className={styles.cardLink}>
                          <span>🔗 External Link</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  {currentPage > 1 ? (
                    <Link
                      href={
                        currentPage === 2
                          ? "/blog"
                          : `/blog?page=${currentPage - 1}`
                      }
                      className={styles.pageButton}
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span
                      className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
                    >
                      ← Previous
                    </span>
                  )}

                  <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </span>

                  {currentPage < totalPages ? (
                    <Link
                      href={`/blog?page=${currentPage + 1}`}
                      className={styles.pageButton}
                    >
                      Next →
                    </Link>
                  ) : (
                    <span
                      className={`${styles.pageButton} ${styles.pageButtonDisabled}`}
                    >
                      Next →
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
