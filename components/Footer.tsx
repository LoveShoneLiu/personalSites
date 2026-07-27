'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/app/layout.module.scss';

const Footer = () => {
  const [year, setYear] = useState<number>(2024);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className={styles.footer}>
      <div className="container">
        <p>
          ©
          {' '}
          {year}
          {' '}
          Shaofei Liu. Built with Next.js & Neon.
        </p>
        <p className={styles.footerLinks}>
          <Link href="/receiptly/privacy">Receiptly Privacy Policy</Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
