import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

// Corporate Training/Resume Review (apps/app's original corporateLinks)
// deliberately dropped, not ported — both point at old-Sypher features that
// are either explicitly deferred (Resume Review) or outside Sypher Next's
// Phase 1 scope entirely (Corporate Training). Re-add here if/when either
// becomes real Sypher Next product surface, not before.
// Local pages now (apps/web/src/app/{privacy-policy,terms-and-conditions,
// refund-policy}/page.tsx), not a cross-domain link to docs.sypher.local —
// placeholder content pending, but the routes are real Sypher Next pages.
const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Refund Policy', href: '/refund-policy' },
];

// Ported from apps/app's Footer, minus the useAuth()-driven "hide once
// logged in" gate and trackEvent calls — apps/web has no AuthContext/
// analytics infra yet (out of scope for this port). Not a behavior loss on
// this page specifically: page.tsx already redirects logged-in visitors to
// /dashboard before Footer would ever render. If Footer gets reused on a
// page that doesn't redirect (e.g. a ported blog/careers page later), redo
// that gate server-side via the same serverApiFetch('/auth/me') pattern
// used elsewhere in apps/web, not a client AuthContext.
export default function Footer(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brandColumn}>
            <span className={styles.brandTitle}>Sypher</span>
            <p className={styles.brandTagline}>Learn by building</p>
          </div>

          <nav className={styles.linkColumn} aria-label="Legal">
            <span className={styles.columnTitle}>Legal</span>
            <ul className={styles.linkList}>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
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
