'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import LoginModal from "./LoginModal";
import styles from "@/app/layout.module.scss";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 读取登录状态（sessionStorage）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const loggedIn = sessionStorage.getItem("adminLoggedIn") === "true";
    const name = sessionStorage.getItem("adminUsername");
    setIsLoggedIn(loggedIn);
    setUsername(name);
  }, []);

  const handleLoginSuccess = () => {
    const name = sessionStorage.getItem("adminUsername");
    setIsLoggedIn(true);
    setUsername(name);
  };

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("adminLoggedIn");
    sessionStorage.removeItem("adminUsername");
    setIsLoggedIn(false);
    setUsername(null);
  };

  return (
    <>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoDot}></span>
              <span className={styles.logoText}>Shaofei Liu</span>
            </Link>

            <div className={styles.headerRight}>
              <nav className={styles.nav}>
                <Link href="/" className={styles.navLink}>
                  Home
                </Link>
                <Link href="/blog" className={styles.navLink}>
                  Blog
                </Link>
                {isLoggedIn && (
                  <Link href="/manage" className={styles.navLink}>
                    Manage
                  </Link>
                )}
              </nav>

              {isLoggedIn ? (
                <button
                  type="button"
                  className={styles.authButtonSecondary}
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.authButton}
                  onClick={() => setShowLoginModal(true)}
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}


