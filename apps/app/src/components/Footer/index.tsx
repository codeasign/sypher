'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

const corporateLinks = [
  { label: 'Corporate Training', href: '/corporate-training' },
  { label: 'Resume Review', href: '/resume-review' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Refund Policy', href: '/refund-policy' },
];

// Same brand/corporate/legal footer as docs.sypher.local (apps/docs/src/theme/Footer),
// shown only to logged-out visitors on the marketing-style pages here
// (home, blog, careers) -- once a user is signed in they're in the app, not
// evaluating it, so the marketing footer no longer applies.
export default function Footer(): React.JSX.Element | null {
  const { user, loading } = useAuth();
  const year = new Date().getFullYear();

  if (loading || user) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brandColumn}>
            <span className={styles.brandTitle}>Sypher</span>
            <p className={styles.brandTagline}>Learn by building</p>
          </div>

          <nav className={styles.linkColumn} aria-label="Corporate">
            <span className={styles.columnTitle}>Corporate</span>
            <ul className={styles.linkList}>
              {corporateLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={`${getDocsOrigin()}${link.href}`}
                    className={styles.link}
                    onClick={() => trackEvent('footer_link_click', { label: link.label, destination: link.href })}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.linkColumn} aria-label="Legal">
            <span className={styles.columnTitle}>Legal</span>
            <ul className={styles.linkList}>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={`${getDocsOrigin()}${link.href}`}
                    className={styles.link}
                    onClick={() => trackEvent('footer_link_click', { label: link.label, destination: link.href })}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.bottomBar}>
          <span>© {year} Sypher. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
