import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const corporateLinks = [
  { label: 'Corporate Training', to: '/corporate-training' },
  { label: 'Resume Review', to: '/resume-review' },
];

const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
];

export default function Footer() {
  const { siteConfig } = useDocusaurusContext();
  const year = new Date().getFullYear();

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
