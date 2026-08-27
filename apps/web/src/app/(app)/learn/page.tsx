import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import { AUDIENCE_ROLES, type CoursePage } from '@/data/courses';
import CourseListView from '@/components/CourseListView';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'My Courses',
  description: 'Courses you have full access to on Sypher.',
};

const PAGE_SIZE = 20;

function roleLabel(value: string): string {
  return AUDIENCE_ROLES.find((r) => r.value === value)?.label ?? value;
}

export default async function LearnIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  // ?role=developer — a chip filter over the audience-role column, applied
  // server-side by GET /courses itself now (not a client-side .filter()),
  // so it composes correctly with pagination. Still a deep-linkable URL
  // param, no client state needed for the chips themselves.
  const activeRole = typeof params.role === 'string' && params.role !== '' ? params.role : undefined;

  const roleQs = activeRole ? `&role=${encodeURIComponent(activeRole)}` : '';
  const res = await serverApiFetch(`/courses?limit=${PAGE_SIZE}&offset=0${roleQs}`);
  if (res.status === 401) {
    redirect('/login');
  }
  const page: CoursePage = res.ok ? await res.json() : { courses: [], total: 0 };

  // The role-chip list itself always reflects the FULL unfiltered set, not
  // just the current page/filter, so switching roles never hides a chip —
  // a second, unpaginated fetch (courses are still few enough for this to
  // be cheap; cached alongside the page-1 fetch inside apps/api anyway).
  const allRes = activeRole || page.total > page.courses.length ? await serverApiFetch('/courses?limit=200') : null;
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
          <h1 className={styles.pageTitle}>My Courses</h1>
          <p className={styles.pageSubtitle}>Courses you have full access to on Sypher.</p>
        </div>

        {roles.length > 0 && (
          <div className={styles.roleFilters}>
            <Link href="/learn" className={activeRole ? styles.roleChip : `${styles.roleChip} ${styles.roleChipActive}`}>
              All
            </Link>
            {roles.map((role) => (
              <Link
                key={role}
                href={`/learn?role=${encodeURIComponent(role)}`}
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
          source="my-courses"
          role={activeRole}
          storageKey="my-courses-view-mode"
          bookmarkedIds={bookmarkedIds}
          emptyText={activeRole ? `No ${roleLabel(activeRole)} courses yet.` : 'No courses available yet.'}
        />
      </div>
    </div>
  );
}
