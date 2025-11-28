'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDate, parseTags } from "@/lib/utils";
import styles from "./page.module.scss";

type Post = {
  id: number;
  title: string;
  description: string | null;
  content: string;
  imageUrl: string | null;
  tags: string | null;
  link: string | null;
  isPublished: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export default function BlogInfoPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/posts/${params.id}`);
        if (!response.ok) {
          throw new Error("Post not found");
        }
        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className={styles.blogInfoPage}>
        <div className="container">
          <div className={styles.backLinkSkeleton}></div>

          <article className={styles.article}>
            <header className={styles.header}>
              <div className={styles.featuredImageSkeleton}></div>

              <div className={styles.headerContent}>
                <div className={styles.titleSkeleton}></div>
                <div className={styles.titleSkeleton} style={{ width: "80%" }}></div>
                
                <div className={styles.descriptionSkeleton}></div>
                <div className={styles.descriptionSkeleton} style={{ width: "90%" }}></div>

                <div className={styles.metaSkeleton}>
                  <div className={styles.dateSkeleton}></div>
                  <div className={styles.tagsSkeleton}>
                    <div className={styles.tagSkeleton}></div>
                    <div className={styles.tagSkeleton}></div>
                    <div className={styles.tagSkeleton}></div>
                  </div>
                </div>
              </div>
            </header>

            <div className={styles.contentSkeleton}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className={styles.paragraphSkeleton}></div>
              ))}
            </div>
          </article>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>😕</div>
        <h2>Post Not Found</h2>
        <p>{error || "The post you're looking for doesn't exist."}</p>
        <Link href="/blog" className={styles.backButton}>
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const tags = parseTags(post.tags);

  return (
    <div className={styles.blogInfoPage}>
      <div className="container">
        <Link href="/blog" className={styles.backLink}>
          ← Back to Blog
        </Link>

        <article className={styles.article}>
          <header className={styles.header}>
            {post.imageUrl && (
              <div className={styles.featuredImage}>
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}

            <div className={styles.headerContent}>
              <h1 className={styles.title}>{post.title}</h1>
              
              {post.description && (
                <p className={styles.description}>{post.description}</p>
              )}

              <div className={styles.meta}>
                <span className={styles.date}>
                  📅 {formatDate(post.createdAt!)}
                </span>
                {tags.length > 0 && (
                  <div className={styles.tags}>
                    {tags.map((tag, idx) => (
                      <span key={idx} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  🔗 View External Link →
                </a>
              )}
            </div>
          </header>

          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
}

