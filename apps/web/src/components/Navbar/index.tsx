'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useColorMode } from '@/hooks/useColorMode';
import styles from './styles.module.css';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
}

// Same icon paths as Docusaurus's stock @theme/Icon/{LightMode,DarkMode},
// reused (via apps/app's ColorModeToggle) so the toggle matches
// docs.sypher's pixel-for-pixel.
function LightModeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"
      />
    </svg>
  );
}

function DarkModeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"
      />
    </svg>
  );
}

function ColorModeToggle(): React.JSX.Element {
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

// Simplified port of apps/app's Navbar. Deliberately dropped, not silently
// carried over:
// - The DashboardLayout-hiding logic (NAV_SECTIONS/DASHBOARD_ROUTE_PREFIXES)
//   — apps/web has no separate dashboard-sidebar chrome yet, so this navbar
//   renders on every page, dashboard included, which is the more correct
//   behavior for the current state of the app, not a corner cut.
// - The docs-cross-domain NAV_LINKS (Corporate Training, Resume Review,
//   Mock Interview, Hire with Us, Team Access) — all point at old-Sypher
//   features that are either explicitly deferred or outside Sypher Next's
//   Phase 1 scope. Same exclusion just applied to Footer.
// Explore Courses now points at apps/web's own /courses page (recreated
// natively from apps/docs/src/pages/courses.js, same @sypher/course-catalog
// data) rather than cross-linking to docs.sypher.local — Docusaurus stays
// the course-authoring source of truth in Phase 1, but browsing the catalog
// no longer requires leaving Sypher Next.
//
// Auth state is a local, component-owned client fetch (apiFetch('/auth/me')
// on mount) rather than a shared AuthContext/provider — this is the only
// consumer of "am I logged in" so far; worth promoting to a real context if
// a second client component ever needs the same state.
export default function Navbar(): React.JSX.Element | null {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
    // Re-checks on every route change, not just once on mount. Navbar
    // lives in the root layout, which does NOT remount on a client-side
    // router.push() (e.g. the login form's redirect to /dashboard) — an
    // empty dependency array here meant Navbar froze on whatever auth
    // state was true when the layout first mounted and never noticed a
    // same-session login/logout that happened via client-side navigation
    // instead of a full page load. `pathname` is a reliable proxy for
    // "something navigation-worthy just happened."
  }, [pathname]);

  // The corporate portal (corporate.sypher.local -> /corporate/*) is a
  // standalone gated entrance — no main-site nav. Middleware redirects
  // that host into /corporate, so this prefix check is reliable.
  if (pathname?.startsWith('/corporate')) return null;

  return (
    <header className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          Sypher
        </Link>

        <nav className={mobileOpen ? `${styles.links} ${styles.linksOpen}` : styles.links}>
          <Link
            href="/courses"
            className={pathname === '/courses' ? `${styles.link} ${styles.linkActive}` : styles.link}
            onClick={() => setMobileOpen(false)}
          >
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
            href="/cohorts"
            className={pathname === '/cohorts' ? `${styles.link} ${styles.linkActive}` : styles.link}
            onClick={() => setMobileOpen(false)}
          >
            Cohorts
          </Link>
          <Link
            href="/contact"
            className={pathname === '/contact' ? `${styles.link} ${styles.linkActive}` : styles.link}
            onClick={() => setMobileOpen(false)}
          >
            Contact
          </Link>
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
          {user ? (
            <div className={styles.userArea}>
              <Link href="/dashboard" className={styles.dashboardBtn}>
                Dashboard
              </Link>
            </div>
          ) : (
            <div className={styles.authButtons}>
              {/* One CTA, not two — Sign Up/Sign In as separate buttons splits
                  clicks and makes a visitor choose before they've decided
                  anything. A single, benefit-specific, low-friction CTA
                  ("free") converts better than a generic "Sign Up"; existing
                  users land on /login (defaulted to sign-up mode) and reach
                  sign-in in one click via that page's own toggle. */}
              <Link href="/login?mode=signup" className={styles.signUpBtn}>
                Start Learning Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
