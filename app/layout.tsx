import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { inter } from "./fonts";

export const metadata: Metadata = {
  title: "Personal Site | Neon + Next.js",
  description: "A personal homepage and blog powered by Next.js and Neon Postgres.",
};

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "博客" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <div className="brand">
              <span className="brand__dot" />
              <div>
                <p className="brand__title">Shaofei Liu</p>
                <p className="brand__subtitle">Full-stack Developer</p>
              </div>
            </div>
            <nav className="site-nav">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="site-nav__link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Shaofei Liu. Crafted with Next.js & Neon.</p>
        </footer>
      </body>
    </html>
  );
}
