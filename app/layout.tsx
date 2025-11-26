import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "Shaofei Liu - Full Stack Developer",
  description: "Personal portfolio and blog of Shaofei Liu, a full-stack developer seeking opportunities in New Zealand.",
  keywords: ["Full Stack Developer", "Frontend Developer", "React", "Next.js", "TypeScript", "New Zealand"],
  authors: [{ name: "Shaofei Liu" }],
  openGraph: {
    title: "Shaofei Liu - Full Stack Developer",
    description: "Personal portfolio and blog",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className={styles.header}>
          <div className="container">
            <div className={styles.headerContent}>
              <Link href="/" className={styles.logo}>
                <span className={styles.logoDot}></span>
                <span className={styles.logoText}>Shaofei Liu</span>
              </Link>
              <nav className={styles.nav}>
                <Link href="/" className={styles.navLink}>Home</Link>
                <Link href="/blog" className={styles.navLink}>Blog</Link>
                <Link href="/manage" className={styles.navLink}>Admin</Link>
              </nav>
            </div>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <div className="container">
            <p>© {new Date().getFullYear()} Shaofei Liu. Built with Next.js & Neon.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
