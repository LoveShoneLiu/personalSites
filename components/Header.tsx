'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/app/layout.module.scss';
import LoginModal from './LoginModal';

const Header = () => {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 读取登录状态（sessionStorage）
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    // 初始读取登录状态
    const checkLoginStatus = () => {
      const loggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
      // eslint-disable-next-line no-console
      console.log('Header: Checking login status:', loggedIn);
      setIsLoggedIn(loggedIn);
    };

    checkLoginStatus();

    // 监听 storage 事件（当其他标签页或窗口修改 sessionStorage 时）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminLoggedIn') {
        checkLoginStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 监听自定义事件（当同一窗口内修改 sessionStorage 时）
    const handleCustomStorageChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('sessionStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sessionStorageChange', handleCustomStorageChange);
    };
  }, []);

  const handleLoginSuccess = () => {
    // eslint-disable-next-line no-console
    console.log('Header: Login success, updating state');
    setIsLoggedIn(true);
    // 触发自定义事件，通知其他组件登录状态已改变
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sessionStorageChange'));
    }
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminUsername');
    setIsLoggedIn(false);
    // 触发自定义事件，通知其他组件登录状态已改变
    window.dispatchEvent(new Event('sessionStorageChange'));
  };

  return (
    <>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoDot} />
              <span className={styles.logoText}>Shaofei Liu</span>
            </Link>

            <div className={styles.headerRight}>
              <nav className={styles.nav}>
                <Link
                  href="/"
                  className={`${styles.navLink} ${pathname === '/' ? styles.navLinkActive : ''}`}
                >
                  Home
                </Link>
                <Link
                  href="/blog"
                  className={`${styles.navLink} ${pathname?.startsWith('/blog') ? styles.navLinkActive : ''}`}
                >
                  Blog
                </Link>
                {isLoggedIn ? (
                  <button
                    type="button"
                    className={`${styles.navLink} ${pathname === '/manage' ? styles.navLinkActive : ''}`}
                    onClick={() => {
                      // eslint-disable-next-line no-console
                      console.log('Manage button clicked, navigating to /manage');
                      // 直接使用 window.location.href 进行导航
                      window.location.href = '/manage';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    Manage
                  </button>
                ) : null}
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
};

export default Header;
