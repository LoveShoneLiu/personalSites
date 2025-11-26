import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.scss";
import Header from "@/components/Header";

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
        <Header />
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
