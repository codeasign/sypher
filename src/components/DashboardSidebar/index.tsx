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
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
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

  function renderNavItem({ href, label, icon: Icon }: NavItem): JSX.Element {
    return (
      <Link
        key={href}
        to={href}
        className={clsx(styles.navItem, isActive(href) && styles.navItemActive)}
      >
        <Icon className={styles.navIcon} />
        {!collapsed && <span className={styles.navLabel}>{label}</span>}
      </Link>
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

      <nav className={styles.nav}>{NAV_ITEMS.map(renderNavItem)}</nav>

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
