'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/navItems';
import { roleLabel } from '@/lib/roleLabels';
import { roleColor } from '@/lib/roleColors';
import { apiFetch } from '@/lib/api';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import {
  DashboardIcon,
  LogoutIcon,
  CoursesIcon,
  ManageAccessIcon,
  LaunchCohortIcon,
  ManageCohortUsersIcon,
  ManageBlogIcon,
  ManageCoursesIcon,
  SetupGuidesIcon,
  BookmarksIcon,
  MockTestIcon,
  ProfileIcon,
  VideoIcon,
  PracticeCodingIcon,
  TestAccountsIcon,
} from '@/components/icons/SidebarIcons';
import styles from './styles.module.css';

const NAV_ICON_BY_KEY: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  'manage-access': ManageAccessIcon,
  'launch-cohort': LaunchCohortIcon,
  'manage-cohort-users': ManageCohortUsersIcon,
  'manage-blog-post': ManageBlogIcon,
  'manage-course-authoring': ManageCoursesIcon,
  'manage-videos': VideoIcon,
  'browse-videos': VideoIcon,
};

// Manage is split by what's being managed: who can get in (Access) vs.
// what they see once in (Content). course-audit isn't gated by a
// NavAccess key with its own icon today, so it falls into Content
// alongside the other authoring keys.
const ACCESS_MANAGE_KEYS = new Set(['manage-access', 'launch-cohort', 'manage-cohort-users']);

// Browse Videos and Browse Courses live in the Library section, alongside
// each other — they're both browsing pages, not "manage" actions. Manage
// Videos stays a normal "Manage" section item alongside the other manage-*
// keys.

interface Props {
  role: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  visibleKeys: string[];
  isPaidAndActive: boolean;
}

// Redesigned to match apps/app's DashboardSidebar (avatar/name/email card,
// sectioned nav with icons + active-link highlighting, footer logout) —
// same visual language, ported onto Sypher Next's actual data shape. Data
// (role, email, visible nav keys) is still resolved server-side in
// (app)/layout.tsx and passed in as props, same as before, so there's no
// flash of a different link set — this component only owns presentation
// and the client-only active-link/logout behavior.
export default function DashboardSidebar({ role, email, fullName, avatarUrl, visibleKeys, isPaidAndActive }: Props): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const allItems = NAV_ITEMS.filter((item) => visibleKeys.includes(item.key));
  const browseVideosItem = allItems.find((item) => item.key === 'browse-videos') ?? null;
  const items = allItems.filter((item) => item.key !== 'browse-videos');
  const accessItems = items.filter((item) => ACCESS_MANAGE_KEYS.has(item.key));
  const contentItems = items.filter((item) => !ACCESS_MANAGE_KEYS.has(item.key));
  const displayName = fullName || email.split('@')[0] || 'User';
  const { handleUpgrade, isProcessing } = useUpgradeToPaid(email, () => router.refresh(), 'dashboard_sidebar');

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout(): Promise<void> {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  // Pinned everywhere in the (app) group now — was /dashboard-only
  // (2026-08-23 request), reversed 2026-08-27: user reported the rail
  // drifting up while scrolling a long list on /browse-courses and asked
  // for it to stay put consistently instead of page-by-page.
  return (
    <aside className={`${styles.sidebar} ${styles.sidebarPinned}`}>
      <div className={styles.userSection}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatar}>{displayName.slice(0, 1).toUpperCase()}</span>
        )}
        <div className={styles.userInfo}>
          <span className={styles.name}>{displayName}</span>
          <div className={styles.badgeRow}>
            <span className={styles.roleBadge} style={{ background: `${roleColor(role)}1a`, color: roleColor(role) }}>
              {roleLabel(role)}
            </span>
            {!isPaidAndActive && (
              <button type="button" className={styles.goProBadge} disabled={isProcessing} onClick={() => void handleUpgrade()}>
                {isProcessing ? '…' : 'Go Pro'}
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.section}>
          <span className={styles.sectionHeader}>Overview</span>
          <Link href="/dashboard" className={isActive('/dashboard') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <DashboardIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Dashboard</span>
          </Link>
          <Link
            href="/getting-started"
            className={isActive('/getting-started') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            <SetupGuidesIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Resources & Guides</span>
          </Link>
        </div>

        <div className={`${styles.section} ${styles.sectionDivider}`}>
          <span className={styles.sectionHeader}>My Learning</span>
          <Link href="/learn" className={isActive('/learn') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <ManageCoursesIcon className={styles.navIcon} />
            <span className={styles.navLabel}>My Courses</span>
          </Link>
          <Link href="/bookmarks" className={isActive('/bookmarks') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <BookmarksIcon className={styles.navIcon} />
            <span className={styles.navLabel}>My Bookmarks</span>
          </Link>
        </div>

        <div className={`${styles.section} ${styles.sectionDivider}`}>
          <span className={styles.sectionHeader}>Library</span>
          {browseVideosItem && (
            <Link
              href={browseVideosItem.href}
              className={isActive(browseVideosItem.href) ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
            >
              <VideoIcon className={styles.navIcon} />
              <span className={styles.navLabel}>{browseVideosItem.label}</span>
            </Link>
          )}
          <Link
            href="/browse-courses"
            className={isActive('/browse-courses') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            <CoursesIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Browse Courses</span>
          </Link>
        </div>

        <div className={`${styles.section} ${styles.sectionDivider}`}>
          <span className={styles.sectionHeader}>Practice</span>
          <Link
            href="/mock-tests"
            className={
              isActive('/mock-tests')
                ? `${styles.navItem} ${styles.navItemActive} ${styles.navItemWrap}`
                : `${styles.navItem} ${styles.navItemWrap}`
            }
          >
            <MockTestIcon className={`${styles.navIcon} ${styles.navIconWrap}`} />
            <span className={`${styles.navLabel} ${styles.navLabelWrap}`}>Certification Practice Exam</span>
          </Link>
          <Link
            href="/practice-coding"
            className={isActive('/practice-coding') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            <PracticeCodingIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Practice Coding</span>
          </Link>
        </div>

        {accessItems.length > 0 && (
          <div className={`${styles.section} ${styles.sectionDivider}`}>
            <span className={styles.sectionHeader}>Manage Access</span>
            {accessItems.map((item) => {
              const Icon = NAV_ICON_BY_KEY[item.key] ?? DashboardIcon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={isActive(item.href) ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {contentItems.length > 0 && (
          <div className={`${styles.section} ${styles.sectionDivider}`}>
            <span className={styles.sectionHeader}>Manage Content</span>
            {contentItems.map((item) => {
              const Icon = NAV_ICON_BY_KEY[item.key] ?? DashboardIcon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={isActive(item.href) ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {role === 'ADMIN' && (
          <div className={`${styles.section} ${styles.sectionDivider}`}>
            <span className={styles.sectionHeader}>Test Accounts</span>
            <Link
              href="/test-accounts"
              className={isActive('/test-accounts') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
            >
              <TestAccountsIcon className={styles.navIcon} />
              <span className={styles.navLabel}>Reset Test Accounts</span>
            </Link>
          </div>
        )}
      </nav>

      <div className={styles.footer}>
        <div className={styles.profileRow}>
          <Link
            href="/profile"
            className={isActive('/profile') ? `${styles.navItem} ${styles.navItemActive} ${styles.profileLink}` : `${styles.navItem} ${styles.profileLink}`}
          >
            <ProfileIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Profile</span>
          </Link>
          {!isPaidAndActive && (
            <button type="button" className={styles.goProBadge} disabled={isProcessing} onClick={() => void handleUpgrade()}>
              {isProcessing ? '…' : 'Go Pro'}
            </button>
          )}
        </div>
        <button type="button" className={`${styles.navItem} ${styles.logoutButton}`} onClick={handleLogout}>
          <LogoutIcon className={styles.navIcon} />
          <span className={styles.navLabel}>Log out</span>
        </button>
      </div>
    </aside>
  );
}
