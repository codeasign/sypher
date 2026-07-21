'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useDocBookmarks } from '@/hooks/useDocBookmarks';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import { useVisibleNavSections } from '@/hooks/useVisibleNavSections';
import { fetchCourseAccessRows, hasCourseAccess } from '@/data/courseAccess';
import { fetchUserCountsByRole, fetchRecentActiveUsers } from '@/data/adminAnalytics';
import { withCourseAccess } from '@sypher/course-catalog/src/homepageCourses';
import allCourses from '@sypher/course-catalog/src/courses';
import DashboardCourseListing from '@/components/DashboardCourseListing';
import EmptySection from '@/components/EmptySection';
import { FULL_DASHBOARD_ROLES, ROLES } from '@/types/roles';
import { DashboardIcon, BookmarkIcon, CoursesIcon, PlanIcon, UsersIcon, NAV_ICONS_BY_KEY } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import styles from './dashboard.module.css';

interface RoleCount {
  role: string;
  user_count: number;
}

interface ActiveUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  last_sign_in_at: string;
}

function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Free/paid users and branders get the full course-browsing dashboard below.
// Everyone else (admin, HR roles, company_employees, external_job_poster)
// gets EmptyDashboardSection instead -- they work through their own tools
// (Manage Access, Applicants, Add Job Post, ...), not this learner view.
function LearnerDashboardContent(): React.JSX.Element {
  const { supabase, role, paidUntil, fullName } = useAuth();
  const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid('dashboard');
  const { bookmarkedSlugs, loading: courseBookmarksLoading } = useBookmarks();
  const { bookmarks: docBookmarks, loading: docBookmarksLoading } = useDocBookmarks();
  const { sections: visibleNavSections } = useVisibleNavSections();
  const [accessRows, setAccessRows] = useState<{ course_slug: string; allowed_roles: string[] }[]>([]);

  useEffect(() => {
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [supabase]);

  const courses = withCourseAccess(hasCourseAccess, role, accessRows, new Set<string>());
  const freeCoursesList = courses.filter((c) => c.isFree);
  const premiumCoursesList = courses.filter((c) => !c.isFree);

  // Client-side treats a past paid_until as expired regardless of `role`
  // -- the daily cron may not have caught up yet.
  const isPaidAndActive = role === 'paid_users' && !!paidUntil && new Date(paidUntil) > new Date();
  const firstName = fullName?.trim().split(' ')[0];
  const bookmarksLoading = courseBookmarksLoading || docBookmarksLoading;
  const totalBookmarks = bookmarkedSlugs.size + docBookmarks.length;

  // Same items the sidebar shows this user, minus the ones they can't
  // actually click through to yet -- keeps the shortcuts here from ever
  // pointing somewhere the sidebar itself would hide.
  const quickLinks = visibleNavSections
    .flatMap((section) => section.items)
    .filter((item) => !item.comingSoon);

  useEffect(() => {
    trackEvent('dashboard_view');
  }, []);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <DashboardIcon />
        </div>
        <div>
          <h1 className={styles.heading}>{firstName ? `Welcome back, ${firstName}` : 'Dashboard'}</h1>
          <p className={styles.subtitle}>Your courses, progress, and quick links in one place.</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <PlanIcon />
            <span className={styles.statCardLabel}>Plan</span>
          </div>
          <span className={`${styles.statCardValue} ${isPaidAndActive ? styles.statCardValuePaid : ''}`}>
            {isPaidAndActive ? 'Paid' : 'Free'}
          </span>
          {!isPaidAndActive && (
            <button
              type="button"
              className={styles.statCardAction}
              disabled={isProcessing}
              onClick={() => {
                trackEvent('plan_card_go_pro_click');
                handleUpgrade();
              }}
            >
              {isProcessing ? 'Processing…' : 'Go Pro'}
            </button>
          )}
          {errorMessage && <span className={styles.statCardError}>{errorMessage}</span>}
        </div>

        <Link
          href="/bookmarks"
          className={styles.statCardLink}
          onClick={() => trackEvent('bookmarks_card_click')}
        >
          <div className={styles.statCardTop}>
            <BookmarkIcon />
            <span className={styles.statCardLabel}>Bookmarks</span>
          </div>
          <span className={styles.statCardValue}>{bookmarksLoading ? '—' : totalBookmarks}</span>
        </Link>

        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <CoursesIcon />
            <span className={styles.statCardLabel}>Courses available</span>
          </div>
          <span className={styles.statCardValue}>{courses.length}</span>
        </div>
      </div>

      {quickLinks.length > 0 && (
        <div className={styles.quickLinksRow}>
          {quickLinks.map((item) => {
            const Icon = (item.key ? NAV_ICONS_BY_KEY[item.key] : undefined) ?? DashboardIcon;
            return (
              <Link key={item.key ?? item.href} href={item.href} className={styles.quickLinkBtn}>
                <Icon className={styles.quickLinkIcon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {freeCoursesList.length > 0 && (
        <>
          <div className={styles.subsectionHeader}>
            <h2 className={styles.coursesHeading}>Free Courses</h2>
            <span className={styles.subsectionCount}>{freeCoursesList.length}</span>
          </div>
          <DashboardCourseListing
            courses={freeCoursesList}
          />
        </>
      )}

      {premiumCoursesList.length > 0 && (
        <>
          <div className={styles.subsectionHeader}>
            <h2 className={styles.coursesHeading}>Premium Courses</h2>
            <span className={styles.subsectionCount}>{premiumCoursesList.length}</span>
          </div>
          <DashboardCourseListing
            courses={premiumCoursesList}
          />
        </>
      )}
    </>
  );
}

// Admin gets a platform-analytics view instead of the learner dashboard --
// courses/users are stats to monitor, not content to browse. roleCounts and
// recentUsers are both cheap, aggregate queries (not full table scans) --
// see the "Admin dashboard analytics" section in SupabaseSchema.md.
function AdminDashboardContent(): React.JSX.Element {
  const { supabase } = useAuth();
  const { data: roleCounts = [] } = useSWR<RoleCount[]>(
    supabase ? (['adminUserCountsByRole'] as const) : null,
    () => fetchUserCountsByRole(supabase)
  );
  const { data: recentUsers = [], isLoading: recentUsersLoading } = useSWR<ActiveUser[]>(
    supabase ? (['adminRecentActiveUsers'] as const) : null,
    () => fetchRecentActiveUsers(supabase, 10)
  );

  const totalUsers = roleCounts.reduce((sum, r) => sum + Number(r.user_count), 0);

  useEffect(() => {
    trackEvent('admin_dashboard_view');
  }, []);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <DashboardIcon />
        </div>
        <div>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.subtitle}>Platform analytics and recent activity.</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <CoursesIcon />
            <span className={styles.statCardLabel}>Total Courses</span>
          </div>
          <span className={styles.statCardValue}>{allCourses.length}</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardTop}>
            <UsersIcon />
            <span className={styles.statCardLabel}>Total Users</span>
          </div>
          <span className={styles.statCardValue}>{totalUsers}</span>
        </div>
      </div>

      <div className={styles.subsectionHeader}>
        <h2 className={styles.coursesHeading}>Users by Role</h2>
      </div>
      <div className={styles.roleBreakdownGrid}>
        {roleCounts.map((r) => (
          <div key={r.role} className={styles.roleBreakdownCard}>
            <span className={styles.roleBreakdownLabel}>{roleLabel(r.role)}</span>
            <span className={styles.roleBreakdownValue}>{r.user_count}</span>
          </div>
        ))}
      </div>

      <div className={styles.subsectionHeader}>
        <h2 className={styles.coursesHeading}>Recently Active Users</h2>
      </div>
      {recentUsersLoading ? (
        <p className={styles.subtitle}>Loading…</p>
      ) : recentUsers.length === 0 ? (
        <p className={styles.subtitle}>No sign-ins recorded yet.</p>
      ) : (
        <div className={styles.activeUsersList}>
          {recentUsers.map((u) => (
            <div key={u.id} className={styles.activeUserRow}>
              <span className={styles.activeUserAvatar}>
                {(u.full_name || u.email || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className={styles.activeUserMain}>
                <span className={styles.activeUserName}>{u.full_name || 'Unnamed user'}</span>
                <span className={styles.activeUserEmail}>{u.email}</span>
              </div>
              <div className={styles.activeUserMeta}>
                <span className={styles.activeUserRoleBadge}>{roleLabel(u.role)}</span>
                <span className={styles.activeUserTime}>{formatRelativeTime(u.last_sign_in_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function EmptyDashboardSection(): React.JSX.Element {
  useEffect(() => {
    trackEvent('empty_dashboard_view');
  }, []);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <DashboardIcon />
        </div>
        <div>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.subtitle}>Your courses, progress, and quick links in one place.</p>
        </div>
      </div>
      <EmptySection
        icon={DashboardIcon}
        title="Nothing here yet"
        message="This role doesn't use the learner dashboard. Use the sidebar to get to the tools for your role."
      />
    </>
  );
}

export default function DashboardPage(): React.JSX.Element {
  const { role, loading } = useAuth();
  const hasFullAccess = role !== null && FULL_DASHBOARD_ROLES.includes(role);

  return (
    <DashboardLayout title="Dashboard" description="Your Sypher dashboard">
      {loading ? (
        <p role="status">Loading…</p>
      ) : role === 'admin' ? (
        <AdminDashboardContent />
      ) : hasFullAccess ? (
        <LearnerDashboardContent />
      ) : (
        <EmptyDashboardSection />
      )}
    </DashboardLayout>
  );
}
