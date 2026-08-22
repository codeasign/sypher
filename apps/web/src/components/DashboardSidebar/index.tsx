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
  ProfileIcon,
} from '@/components/icons/SidebarIcons';
import styles from './styles.module.css';

const NAV_ICON_BY_KEY: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  'manage-access': ManageAccessIcon,
  'launch-cohort': LaunchCohortIcon,
  'manage-cohort-users': ManageCohortUsersIcon,
  'manage-blog-post': ManageBlogIcon,
  'manage-course-authoring': ManageCoursesIcon,
};

interface Props {
  role: string;
  email: string;
  fullName: string | null;
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
export default function DashboardSidebar({ role, email, fullName, visibleKeys, isPaidAndActive }: Props): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_ITEMS.filter((item) => visibleKeys.includes(item.key));
  const displayName = fullName || email.split('@')[0] || 'User';
  const { handleUpgrade, isProcessing } = useUpgradeToPaid(email, () => router.refresh());

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout(): Promise<void> {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.userSection}>
        <span className={styles.avatar}>{displayName.slice(0, 1).toUpperCase()}</span>
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
          <Link href="/courses" className={isActive('/courses') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <CoursesIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Browse Courses</span>
          </Link>
          <Link href="/learn" className={isActive('/learn') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <ManageCoursesIcon className={styles.navIcon} />
            <span className={styles.navLabel}>My Courses</span>
          </Link>
          <Link
            href="/getting-started"
            className={isActive('/getting-started') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            <SetupGuidesIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Setup & Dependencies</span>
          </Link>
          <Link href="/bookmarks" className={isActive('/bookmarks') ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <BookmarksIcon className={styles.navIcon} />
            <span className={styles.navLabel}>Bookmarks</span>
          </Link>
        </div>

        {items.length > 0 && (
          <div className={`${styles.section} ${styles.sectionDivider}`}>
            <span className={styles.sectionHeader}>Manage</span>
            {items.map((item) => {
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
