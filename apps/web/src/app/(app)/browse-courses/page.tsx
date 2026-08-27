import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import CourseListView from '@/components/CourseListView';
import { AUDIENCE_ROLES, type CoursePage } from '@/data/courses';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Browse Courses',
  description: 'Every course on Sypher — enroll in what you have access to, preview the rest.',
};

const PAGE_SIZE = 20;

function roleLabel(value: string): string {
  return AUDIENCE_ROLES.find((r) => r.value === value)?.label ?? value;
}

// Sidebar's "Browse Courses" — the real DB-backed catalog (all published
// courses, Enroll/Resume/Preview per card). Deliberately separate from the
// navbar's "Explore Courses" (apps/web/src/app/courses/page.tsx, the
// pre-signup static marketing catalog) — confirmed with the user
// 2026-08-27, two different pages on purpose, not one route for both
// audiences. Living inside the (app) route group means it gets the shared
// sidebar automatically via (app)/layout.tsx, unlike /courses.
export default async function BrowseCoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const activeRole = typeof params.role === 'string' && params.role !== '' ? params.role : undefined;
  const roleQs = activeRole ? `&role=${encodeURIComponent(activeRole)}` : '';

  const res = await serverApiFetch(`/courses/browse?limit=${PAGE_SIZE}&offset=0${roleQs}`);
  if (res.status === 401) {
    redirect('/login');
  }
  const page: CoursePage = res.ok ? await res.json() : { courses: [], total: 0 };

  // Role chips always reflect the full unfiltered set, same reasoning as
  // /learn's page (a second, cheap fetch rather than hiding chips whenever
  // a filter narrows the current page).
  const allRes = activeRole || page.total > page.courses.length ? await serverApiFetch('/courses/browse?limit=200') : null;
  const allCourses: CoursePage | null = allRes?.ok ? await allRes.json() : null;
  const roleSource = allCourses?.courses ?? page.courses;
  const found = [...new Set(roleSource.map((c) => c.audienceRole).filter((r): r is string => Boolean(r)))];
  const canonical = AUDIENCE_ROLES.map((r) => r.value).filter((v) => found.includes(v));
  const roles = [...canonical, ...found.filter((r) => !canonical.includes(r)).sort()];

  const bookmarksRes = await serverApiFetch('/bookmarks/authored-courses');
  const bookmarkedIds: string[] = bookmarksRes.ok ? await bookmarksRes.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Browse Courses</h1>
          <p className={styles.pageSubtitle}>Every course on Sypher — enroll in what you have access to, preview the rest.</p>
        </div>

        {roles.length > 0 && (
          <div className={styles.roleFilters}>
            <Link href="/browse-courses" className={activeRole ? styles.roleChip : `${styles.roleChip} ${styles.roleChipActive}`}>
              All
            </Link>
            {roles.map((role) => (
              <Link
                key={role}
                href={`/browse-courses?role=${encodeURIComponent(role)}`}
                className={activeRole === role ? `${styles.roleChip} ${styles.roleChipActive}` : styles.roleChip}
              >
                {roleLabel(role)}
              </Link>
            ))}
          </div>
        )}

        <CourseListView
          initialCourses={page.courses}
          total={page.total}
          pageSize={PAGE_SIZE}
          source="browse"
          role={activeRole}
          storageKey="browse-courses-view-mode"
          bookmarkedIds={bookmarkedIds}
          emptyText={activeRole ? `No ${roleLabel(activeRole)} courses yet.` : 'No courses available yet.'}
        />
      </div>
    </div>
  );
}
