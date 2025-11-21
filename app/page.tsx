import Link from "next/link";
import styles from "./page.module.scss";
import { listPosts, type BlogPost } from "@/lib/posts";
import { checkDbConnection } from "./db";

const experiences = [
  {
    company: "Neon • 资深前端工程师",
    duration: "2023 - 至今",
    highlights: [
      "负责 Vercel Marketplace 集成，为开发者提供一键接入 Neon 数据库的体验。",
      "搭建多租户 UI 基础设施，推动团队组件库统一。",
    ],
  },
  {
    company: "Vercel • 全栈工程师",
    duration: "2020 - 2023",
    highlights: [
      "为 Next.js 模板生态贡献 20+ 个示例，涵盖数据可视化、实时协作等场景。",
      "主导 Turbopack 预览阶段的性能监控平台，缩短问题定位时间 40%。",
    ],
  },
  {
    company: "自由职业者",
    duration: "2017 - 2020",
    highlights: [
      "帮助多家初创团队搭建 MVP，并交付数据驱动的管理后台。",
      "与设计师、产品紧密协作，提供端到端的体验优化。",
    ],
  },
];

const skills = [
  "TypeScript",
  "Next.js",
  "React Server Components",
  "Neon Postgres",
  "Drizzle ORM",
  "Node.js",
  "SCSS / CSS Modules",
  "Edge Functions",
];

const contact = [
  { label: "邮箱", value: "hello@shaofeiliu.dev" },
  { label: "所在地", value: "上海 · Remote" },
  { label: "当前状态", value: "接收远程合作 / 技术顾问" },
];

export default async function HomePage() {
  let recentPosts: BlogPost[] = [];
  let postsError: string | null = null;

  try {
    recentPosts = await listPosts(3);
  } catch (error) {
    postsError =
      error instanceof Error
        ? error.message
        : "暂时无法加载最新文章，请稍后再试。";
  }

  const dbStatus = await checkDbConnection();

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>个人主页 · 简历</p>
        <h1>刘少飞 · 全栈工程师</h1>
        <p className={styles.heroIntro}>
          擅长以产品视角构建前后端一体化体验。专注 Next.js、Neon
          Postgres 以及现代数据层，喜欢把复杂需求拆解成清晰、可扩展的模块。
        </p>
        <div className={styles.heroMeta}>
          <div>
            <span className={styles.metaLabel}>职业定位</span>
            <strong>Senior Full-stack / Tech Lead</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>关注方向</span>
            <strong>开发者平台 · 数据应用 · SaaS</strong>
          </div>
          <div className={styles.metaActions}>
            <Link href="/blog">查看博客</Link>
            <a href="mailto:hello@shaofeiliu.dev">联系我</a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>经历</h2>
          <p>打造稳定、可维护且可观测的产品体验。</p>
        </div>
        <div className={styles.timeline}>
          {experiences.map((exp) => (
            <article key={exp.company} className={styles.timelineItem}>
              <header>
                <h3>{exp.company}</h3>
                <span>{exp.duration}</span>
              </header>
              <ul>
                {exp.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>技能与工具</h2>
          <p>偏好类型安全、自动化测试与 CI/CD 全流程。</p>
        </div>
        <div className={styles.skillGrid}>
          {skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <div className={styles.contactCard}>
          <h3>联系信息</h3>
          <dl>
            {contact.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <div
            className={`${styles.statusChip} ${
              dbStatus === "Database connected"
                ? styles.statusSuccess
                : styles.statusDanger
            }`}
          >
            数据库：{dbStatus}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>最新博文</h2>
          <Link href="/blog">查看全部文章 →</Link>
        </div>
        {postsError ? (
          <p className={styles.note}>{postsError}</p>
        ) : recentPosts.length === 0 ? (
          <p className={styles.note}>暂无文章，敬请期待。</p>
        ) : (
          <div className={styles.postGrid}>
            {recentPosts.map((post) => (
              <article key={post.id} className={styles.postCard}>
                <p className={styles.postDate}>
                  {new Date(post.publishedAt).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <Link href="/blog">阅读全文 →</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
