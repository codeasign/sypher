import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CourseWithAccess } from '@/data/courses';
import CourseSectionsBoard from '@/components/CourseSectionsBoard';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'My Courses',
  description: 'Pick up where you left off, see what to learn next, and revisit what you have finished.',
};

export default async function LearnIndexPage(): Promise<React.JSX.Element> {
  // The full published catalog with per-user access flags + progress, in
  // one request (same endpoint the /learn sidebar switcher uses). My
  // Courses is the full-access slice; the "Courses you might like" strip
  // also reaches into the no-access remainder, so the whole set is needed
  // here. All tab/section slicing happens client-side in CourseSectionsBoard.
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
          <h1 className={styles.pageTitle}>My Courses</h1>
          <p className={styles.pageSubtitle}>Pick up where you left off, see what to learn next, and revisit what you&rsquo;ve finished.</p>
        </div>

        <CourseSectionsBoard courses={courses} bookmarkedIds={bookmarkedIds} variant="my-courses" />
      </div>
    </div>
  );
}
