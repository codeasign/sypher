'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import { useAuth } from '@/contexts/AuthContext';
import { useColorMode } from '@/hooks/useColorMode';
import { NAV_SECTIONS } from '@/data/navItems';
import styles from './styles.module.css';

// Same icon paths as Docusaurus's stock @theme/Icon/{LightMode,DarkMode},
// reused so the toggle matches docs.sypher's pixel-for-pixel.
function LightModeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"
      />
    </svg>
  );
}

function DarkModeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"
      />
    </svg>
  );
}

function ColorModeToggle() {
  const { colorMode, setColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={() => setColorMode(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <DarkModeIcon /> : <LightModeIcon />}
    </button>
  );
}

// Routes rendered inside DashboardLayout already have their own nav
// (DashboardSidebar: logo-less, but has user identity + Dashboard/Profile/
// logout links). Showing this public navbar on top of it would double up
// on "Dashboard" links and the user avatar, so it's hidden there. Derived
// from NAV_SECTIONS (the same source DashboardSidebar renders from) plus
// the three top-level dashboard routes that aren't part of any section --
// a hardcoded list here previously went stale every time a new sidebar
// item (e.g. add-job-post, add-company-branding) was added. '/careers' is
// excluded even though it's a NAV_SECTIONS entry: unlike every other item
// there, it's a public page (not wrapped in DashboardLayout) and needs
// this navbar rather than DashboardSidebar.
const DASHBOARD_EXCLUDED_HREFS = new Set(['#', '/careers']);
const DASHBOARD_ROUTE_PREFIXES = [
  '/dashboard',
  '/profile',
  '/bookmarks',
  ...NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href)),
].filter((href) => !DASHBOARD_EXCLUDED_HREFS.has(href));

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
            Explore Courses
          </Link>
          <Link
            href="/blog"
            className={pathname === '/blog' ? `${styles.link} ${styles.linkActive}` : styles.link}
            onClick={() => setMobileOpen(false)}
          >
            Blog
          </Link>
          <Link
            href="/careers"
            className={pathname === '/careers' ? `${styles.link} ${styles.linkActive}` : styles.link}
            onClick={() => setMobileOpen(false)}
          >
            Careers
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
          <ColorModeToggle />
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
