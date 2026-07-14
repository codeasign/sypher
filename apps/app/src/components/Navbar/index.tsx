'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import { useAuth } from '@/contexts/AuthContext';
import styles from './styles.module.css';

// Routes rendered inside DashboardLayout already have their own nav
// (DashboardSidebar: logo-less, but has user identity + Dashboard/Profile/
// logout links). Showing this public navbar on top of it would double up
// on "Dashboard" links and the user avatar, so it's hidden there.
const DASHBOARD_ROUTE_PREFIXES = [
  '/dashboard',
  '/profile',
  '/bookmarks',
  '/manage-access',
  '/manage-blog',
  '/manage-users',
  '/resume-review',
  '/mock-interview',
];

// Flat, always-visible top-level links rather than a dropdown: this navbar
// is part of the server-rendered layout, so a flat list costs nothing extra
// for SEO/crawlability and guarantees every link is a plain <a href> in the
// initial HTML -- no hover/JS-gated menu to get wrong. Corporate Training/
// Resume Review/Mock Interview only exist on docs.sypher, so they render as
// plain <a> tags (cross-domain, same pattern docs uses to link back to
// app.sypher) rather than next/link. Blog moved to this app in Phase 7, so
// it's a same-origin next/link alongside Courses instead of living here.
const DOCS_ORIGIN = getDocsOrigin();
const NAV_LINKS = [
  { key: 'corporate-training', href: `${DOCS_ORIGIN}/corporate-training`, label: 'Corporate Training' },
  { key: 'resume-review', href: `${DOCS_ORIGIN}/resume-review`, label: 'Resume Review' },
  { key: 'mock-interview', href: `${DOCS_ORIGIN}/mock-interview`, label: 'Mock Interview' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const inDashboardArea = DASHBOARD_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (inDashboardArea) {
    return null;
  }

  const metadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const displayName = metadata.full_name || metadata.name || user?.email?.split('@')[0] || '';
  const avatarUrl = metadata.avatar_url;

  return (
    <header className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          Sypher
        </Link>

        {/*
          Always rendered -- never conditionally mounted -- so every link
          is present in the server-rendered HTML regardless of viewport or
          menu state. Only `mobileOpen` toggles a CSS class; at >= 768px
          that class is ignored and .links is always visible via media query.
        */}
        <nav className={mobileOpen ? `${styles.links} ${styles.linksOpen}` : styles.links}>
          <Link href="/#courses" className={styles.link} onClick={() => setMobileOpen(false)}>
            Courses
          </Link>
          <Link href="/blog" className={styles.link} onClick={() => setMobileOpen(false)}>
            Blog
          </Link>
          {NAV_LINKS.map((item) => (
            <a key={item.key} href={item.href} className={styles.link}>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className={styles.hamburger}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>

        <div className={styles.right}>
          {/*
            Never gated on `loading` -- AuthProvider's session check only
            resolves client-side, so `loading` is always true during SSR.
            Gating on it would render an empty .right in the server HTML,
            which fails the "always present" requirement for this area.
            Default to the signed-out view; it swaps to the signed-in view
            once the client-side session check resolves.
          */}
          {user ? (
            <div className={styles.userArea}>
              <div className={styles.userIdentity}>
                <span className={styles.avatar}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className={styles.avatarImg} />
                  ) : (
                    displayName.slice(0, 1).toUpperCase() || '?'
                  )}
                </span>
                {displayName && <span className={styles.userName}>{displayName}</span>}
              </div>
              <Link href="/dashboard" className={styles.dashboardBtn}>
                Dashboard
              </Link>
            </div>
          ) : (
            <Link href="/login" className={styles.signInBtn}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
