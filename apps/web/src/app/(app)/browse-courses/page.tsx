import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import CourseSectionsBoard from '@/components/CourseSectionsBoard';
import type { CourseWithAccess } from '@/data/courses';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Browse Courses',
  description: 'Every course on Sypher — pick up what you started, and find what to learn next.',
};

// Sidebar's "Browse Courses" — the real DB-backed catalog, now the same
// category-tabbed scroller layout as My Courses (/learn) minus the
// Completed strip: Continue where you left off, then the rest of the
// catalog under "Courses you might like" (uncapped here). Deliberately
// separate from the navbar's "Explore Courses"
// (apps/web/src/app/courses/page.tsx, the pre-signup static marketing
// catalog) — two different pages on purpose. Living inside the (app) route
// group means it gets the shared sidebar automatically via (app)/layout.tsx.
export default async function BrowseCoursesPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/courses/sidebar-list');
  if (res.status === 401) {
    redirect('/login');
  }
  const courses: CourseWithAccess[] = res.ok ? await res.json() : [];

  const bookmarksRes = await serverApiFetch('/bookmarks/authored-courses');
  const bookmarkedIds: string[] = bookmarksRes.ok ? await bookmarksRes.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Browse Courses</h1>
          <p className={styles.pageSubtitle}>Every course on Sypher — pick up what you started, and find what to learn next.</p>
        </div>

        <CourseSectionsBoard courses={courses} bookmarkedIds={bookmarkedIds} variant="browse" showRoleFilter />
      </div>
    </div>
  );
}
