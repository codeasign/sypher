import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import type { User } from '@supabase/supabase-js';
import styles from './styles.module.css';

interface DashboardSidebarProps {
  user?: User | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  comingSoon?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
];

const SECTIONS: NavSection[] = [
  {
    title: 'Career Tools',
    items: [
      { href: '#', label: 'Resume Review', icon: ResumeIcon, comingSoon: true },
      { href: '#', label: 'Mock Interview', icon: InterviewIcon, comingSoon: true },
    ],
  },
  {
    title: 'Job Management',
    items: [
      { href: '#', label: 'Add Job Post', icon: JobPostIcon, comingSoon: true },
      { href: '/manage-users', label: 'Manage Users', icon: UsersIcon },
      { href: '#', label: 'Send Announcements', icon: AnnouncementIcon, comingSoon: true },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '#', label: 'Create Blog Post', icon: BlogIcon, comingSoon: true },
      { href: '#', label: 'Manage Blog Post', icon: ManageBlogIcon, comingSoon: true },
    ],
  },
  {
    title: 'Branding',
    items: [
      { href: '#', label: 'Add Company Branding', icon: BrandingIcon, comingSoon: true },
    ],
  },
];

const PROFILE_ITEM: NavItem = { href: '/profile', label: 'Profile', icon: ProfileIcon };

export default function DashboardSidebar({
  user,
  collapsed,
  onToggleCollapsed,
}: DashboardSidebarProps): JSX.Element {
  const { pathname } = useLocation();
  const email = user?.email ?? '';
  const metadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const displayName = metadata.full_name || metadata.name || email.split('@')[0] || 'Guest';
  const avatarUrl = metadata.avatar_url;

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNavItem({ href, label, icon: Icon, comingSoon }: NavItem): JSX.Element {
    return (
      <Link
        key={href}
        to={comingSoon ? undefined : href}
        className={clsx(
          styles.navItem,
          isActive(href) && !comingSoon && styles.navItemActive,
          comingSoon && styles.navItemComingSoon,
        )}
        onClick={comingSoon ? (e) => e.preventDefault() : undefined}
        role={comingSoon ? 'link' : undefined}
        aria-disabled={comingSoon ? true : undefined}
      >
        <Icon className={styles.navIcon} />
        {!collapsed && (
          <>
            <span className={styles.navLabel}>{label}</span>
            {comingSoon && <span className={styles.comingSoonBadge}>Soon</span>}
          </>
        )}
      </Link>
    );
  }

  function renderSection({ title, items }: NavSection): JSX.Element {
    return (
      <div key={title} className={styles.section}>
        {!collapsed && <span className={styles.sectionHeader}>{title}</span>}
        {items.map(renderNavItem)}
      </div>
    );
  }

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '▶' : '◀'}
      </button>

      <div className={styles.userSection}>
        <span className={styles.avatar}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.avatarImg} />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.name}>{displayName}</span>
            <span className={styles.email}>{email}</span>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(renderNavItem)}
        <div className={styles.sectionDivider} />
        {SECTIONS.map(renderSection)}
      </nav>

      <div className={styles.footer}>{renderNavItem(PROFILE_ITEM)}</div>
    </aside>
  );
}

function DashboardIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function ResumeIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function InterviewIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function JobPostIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AnnouncementIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function BlogIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ManageBlogIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BrandingIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  );
}