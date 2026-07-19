'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { listNavAccess, canSeeNavItem } from '@/data/navAccess';
import { fetchCompanyNavAccessRows } from '@/data/companyAccess';
import { NAV_SECTIONS } from '@/data/navItems';
import { ROLES } from '@/types/roles';
import type { Role } from '@/types/roles';
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

const ICONS_BY_KEY: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  'careers': CareersIcon,
  'resume-review': ResumeIcon,
  'mock-interview': InterviewIcon,
  'add-job-post': JobPostIcon,
  'manage-users': UsersIcon,
  'manage-access': ManageAccessIcon,
  'send-announcements': AnnouncementIcon,
  'create-blog-post': BlogIcon,
  'manage-blog-post': ManageBlogIcon,
  'add-company-branding': BrandingIcon,
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
];

const SECTIONS: NavSection[] = NAV_SECTIONS.map((section) => ({
  title: section.title,
  items: section.items.map((item) => ({
    key: item.key,
    href: item.href,
    label: item.label,
    comingSoon: item.comingSoon,
    icon: ICONS_BY_KEY[item.key] ?? DashboardIcon,
  })),
}));

const PROFILE_ITEM: NavItem = { href: '/profile', label: 'Profile', icon: ProfileIcon };

export default function DashboardSidebar({
  user,
  collapsed,
  onToggleCollapsed,
}: DashboardSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const { supabase, role, companyName, signOut } = useAuth();
  const email = user?.email ?? '';
  const metadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const displayName = metadata.full_name || metadata.name || email.split('@')[0] || 'Guest';
  const avatarUrl = metadata.avatar_url;

  const [navAccessLoading, setNavAccessLoading] = useState(true);
  const [allowedRolesByKey, setAllowedRolesByKey] = useState<Record<string, string[]>>({});
  const [companyAllowedItemKeys, setCompanyAllowedItemKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role === 'admin') {
      setNavAccessLoading(false);
      return;
    }
    let isMounted = true;
    listNavAccess(supabase).then((rows) => {
      if (!isMounted) return;
      const map: Record<string, string[]> = {};
      for (const row of rows) {
        map[row.item_key] = row.allowed_roles ?? [];
      }
      setAllowedRolesByKey(map);
      setNavAccessLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [supabase, role]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyNavAccessRows(supabase, companyName).then(setCompanyAllowedItemKeys);
  }, [supabase, role, companyName]);

  const visibleSections: NavSection[] =
    role === 'admin'
      ? SECTIONS
      : navAccessLoading
      ? []
      : SECTIONS.map((section) => ({
          title: section.title,
          items: section.items.filter((item) =>
            canSeeNavItem(role, item.key ? allowedRolesByKey[item.key] : [], {
              itemKey: item.key,
              companyAllowedItemKeys,
            }),
          ),
        })).filter((section) => section.items.length > 0);

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
            {role && (
              <span className={clsx(styles.roleBadge, styles[`role-${role}`])}>
                {getRoleLabel(role)}
              </span>
            )}
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(renderNavItem)}
        <div className={styles.sectionDivider} />
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

function DashboardIcon({ className }: { className?: string }): React.JSX.Element {
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

function BookmarkIcon({ className }: { className?: string }): React.JSX.Element {
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

function CareersIcon({ className }: { className?: string }): React.JSX.Element {
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
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }): React.JSX.Element {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }): React.JSX.Element {
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

function ResumeIcon({ className }: { className?: string }): React.JSX.Element {
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

function InterviewIcon({ className }: { className?: string }): React.JSX.Element {
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

function JobPostIcon({ className }: { className?: string }): React.JSX.Element {
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

function UsersIcon({ className }: { className?: string }): React.JSX.Element {
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

function ManageAccessIcon({ className }: { className?: string }): React.JSX.Element {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AnnouncementIcon({ className }: { className?: string }): React.JSX.Element {
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

function BlogIcon({ className }: { className?: string }): React.JSX.Element {
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

function ManageBlogIcon({ className }: { className?: string }): React.JSX.Element {
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

function BrandingIcon({ className }: { className?: string }): React.JSX.Element {
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