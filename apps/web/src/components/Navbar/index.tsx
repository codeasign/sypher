'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useColorMode } from '@/hooks/useColorMode';
import { DashboardIcon, ManageCoursesIcon } from '@/components/icons/SidebarIcons';
import styles from './styles.module.css';

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
}

// Theme toggle glyphs (Lucide Sun / Moon).
function LightModeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <Sun className={className} size={20} />
  );
}

function DarkModeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <Moon className={className} size={20} />
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
          <Image src="/sypher-logo.png" alt="" width={36} height={36} className={styles.brandLogo} priority />
          Sypher Next
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
              <Link href="/learn" className={styles.myCoursesBtn}>
                <ManageCoursesIcon className={styles.navBtnIcon} />
                My Courses
              </Link>
              <Link href="/dashboard" className={styles.dashboardBtn}>
                <DashboardIcon className={styles.navBtnIcon} />
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
