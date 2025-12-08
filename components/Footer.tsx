'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/layout.module.scss';

export default function Footer() {
  const [year, setYear] = useState<number>(2024);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className={styles.footer}>
      <div className="container">
        <p>© {year} Shaofei Liu. Built with Next.js & Neon.</p>
      </div>
    </footer>
  );
}

