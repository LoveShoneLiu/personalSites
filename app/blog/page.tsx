import styles from "./page.module.scss";
import { listPosts, type BlogPost } from "@/lib/posts";

const apiSnippet = `curl -X POST https://your-domain.com/api/posts \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Neon + Next.js 实战",
    "summary": "记录一次数据库建模与部署的过程",
    "content": "写下你的正文……"
  }'`;

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  let error: string | null = null;

  try {
    posts = await listPosts();
    console.log('posts', posts);
  } catch (err) {
    error = err instanceof Error ? err.message : "无法加载博客数据。";
  }

  return (
    <div className={styles.blog}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>Blog</p>
        <h1>写字是整理思路的最好方式</h1>
        <p>
          这里记录产品设计、技术实现以及团队协作的实战心得。所有文章都存储在
          Neon Postgres 中，通过 Next.js Route Handler 暴露统一 API。
        </p>
        <div className={styles.datasource}>
          <span>数据源：Neon Serverless Postgres</span>
          <code>GET /api/posts</code>
        </div>
      </section>

      <section className={styles.postsSection}>
        <div className={styles.sectionHeader}>
          <h2>全部文章</h2>
          <p>默认按发布时间倒序展示，可通过 API 自行分页。</p>
        </div>
        {error ? (
          <p className={styles.note}>{error}</p>
        ) : posts.length === 0 ? (
          <p className={styles.note}>还没有文章。使用下方 API 即可创建第一篇！</p>
        ) : (
          <div className={styles.postList}>
            {posts.map((post) => (
              <article key={post.id} className={styles.post}>
                <p className={styles.postDate}>
                  {new Date(post.publishedAt).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h3>{post.title}</h3>
                <p className={styles.postSummary}>{post.summary}</p>
                <p className={styles.postExcerpt}>
                  {post.content.slice(0, 220)}
                  {post.content.length > 220 ? "…" : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.apiSection}>
        <h2>接口使用说明</h2>
        <p>
          通过 Next.js Route Handler（`/api/posts`）可以读取与创建文章。默认启用
          JSON 请求体，并自动持久化到 Neon 数据库。
        </p>
        <div className={styles.codeBlock}>
          <pre>{apiSnippet}</pre>
        </div>
        <ul>
          <li>GET /api/posts —— 返回按时间排序的文章列表。</li>
          <li>POST /api/posts —— 传入 title、summary、content 创建新文章。</li>
          <li>数据库表结构：blog_posts（id, title, summary, content, published_at）。</li>
        </ul>
      </section>
    </div>
  );
}

