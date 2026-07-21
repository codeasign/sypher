import React from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import styles from './styles.module.css';

const corporateLinks = [
  { label: 'Corporate Training', to: '/corporate-training' },
  { label: 'Resume Review', to: '/resume-review' },
];

const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
  { label: 'Refund Policy', to: '/refund-policy' },
];

// Only shown on these marketing-style pages (not on /docs/* lesson content)
// and only to logged-out visitors -- once someone's signed in they're using
// the product, not evaluating it, so the marketing footer no longer applies.
const FOOTER_PATHS = ['/corporate-training', '/resume-review', '/mock-interview'];

function isFooterPath(pathname) {
  return FOOTER_PATHS.some((path) => pathname === path || pathname === `${path}/`);
}

// useAuth() reads a browser-only Supabase client, so this whole check has to
// stay client-side -- BrowserOnly's fallback (nothing) is also what
// server-rendered/prerendered output shows, avoiding a hydration mismatch.
export default function Footer() {
  return <BrowserOnly>{() => <FooterInner />}</BrowserOnly>;
}

function FooterInner() {
  const { siteConfig } = useDocusaurusContext();
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const year = new Date().getFullYear();

  if (loading || user || !isFooterPath(pathname)) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brandColumn}>
            <span className={styles.brandTitle}>{siteConfig.title}</span>
            <p className={styles.brandTagline}>{siteConfig.tagline}</p>
          </div>

          <nav className={styles.linkColumn} aria-label="Corporate">
            <span className={styles.columnTitle}>Corporate</span>
            <ul className={styles.linkList}>
              {corporateLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.linkColumn} aria-label="Legal">
            <span className={styles.columnTitle}>Legal</span>
            <ul className={styles.linkList}>
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.bottomBar}>
          <span>© {year} {siteConfig.title}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
