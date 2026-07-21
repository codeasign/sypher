'use client';

import React from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import { useVisibleNavSections } from '@/hooks/useVisibleNavSections';
import { ROLES } from '@/types/roles';
import type { Role } from '@/types/roles';
import { DashboardIcon, BookmarkIcon, LogoutIcon, ProfileIcon, NAV_ICONS_BY_KEY } from '@/components/NavIcons';
import styles from './styles.module.css';

function getRoleLabel(role: Role | null): string {
  if (!role) return '';
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

interface DashboardSidebarProps {
  user?: User | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface NavItem {
  key?: string;
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  comingSoon?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const OVERVIEW_SECTION: NavSection = {
  title: 'Overview',
  items: [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { href: '/bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
  ],
};

const PROFILE_ITEM: NavItem = { href: '/profile', label: 'Profile', icon: ProfileIcon };

export default function DashboardSidebar({
  user,
  collapsed,
  onToggleCollapsed,
}: DashboardSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const { role, paidUntil, signOut } = useAuth();
  const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid();
  const { sections: accessGatedSections } = useVisibleNavSections();
  const email = user?.email ?? '';
  const metadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const displayName = metadata.full_name || metadata.name || email.split('@')[0] || 'Guest';
  const avatarUrl = metadata.avatar_url;
  // Client-side treats a past paid_until as expired regardless of `role`
  // — the daily cron may not have caught up yet.
  const isPaidAndActive = role === 'paid_users' && !!paidUntil && new Date(paidUntil) > new Date();

  const visibleSections: NavSection[] = [
    OVERVIEW_SECTION,
    ...accessGatedSections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        key: item.key,
        href: item.href,
        label: item.label,
        comingSoon: item.comingSoon,
        icon: (item.key ? NAV_ICONS_BY_KEY[item.key] : undefined) ?? DashboardIcon,
      })),
    })),
  ];

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNavItem({ key, href, label, icon: Icon, comingSoon }: NavItem): React.JSX.Element {
    return (
      <Link
        key={key ?? href}
        href={href}
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

  function renderSection({ title, items }: NavSection): React.JSX.Element {
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
            <div className={styles.badgeRow}>
              {role && (
                <span className={clsx(styles.roleBadge, styles[`role-${role}`])}>
                  {getRoleLabel(role)}
                </span>
              )}
              <span className={clsx(styles.planBadge, isPaidAndActive ? styles.planPaid : styles.planFree)}>
                {isPaidAndActive ? 'Paid plan' : 'Free plan'}
              </span>
            </div>
            {!isPaidAndActive && (
              <button
                type="button"
                className={styles.goProBtn}
                disabled={isProcessing}
                onClick={handleUpgrade}
              >
                {isProcessing ? 'Processing…' : 'Go Pro'}
              </button>
            )}
            {errorMessage && <span className={styles.upgradeError}>{errorMessage}</span>}
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {visibleSections.map(renderSection)}
      </nav>

      <div className={styles.footer}>
        {renderNavItem(PROFILE_ITEM)}
        <button
          type="button"
          className={clsx(styles.navItem, styles.logoutButton)}
          onClick={async () => {
            await signOut();
            window.location.href = '/login';
          }}
        >
          <LogoutIcon className={styles.navIcon} />
          {!collapsed && <span className={styles.navLabel}>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
