import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { Course } from '@/data/courses';
import type { AuthoredModuleBookmarkEntry } from '@/data/bookmarks';
import BookmarksContent, { type BookmarkedModule } from './BookmarksContent';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Bookmarks',
  description: 'Courses and modules you’ve bookmarked on Sypher.',
};

export default async function BookmarksPage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }

  const [courseIdsRes, moduleBookmarksRes] = await Promise.all([
    serverApiFetch('/bookmarks/authored-courses'),
    serverApiFetch('/bookmarks/authored-modules'),
  ]);
  const courseIds: string[] = courseIdsRes.ok ? await courseIdsRes.json() : [];
  const moduleBookmarks: AuthoredModuleBookmarkEntry[] = moduleBookmarksRes.ok ? await moduleBookmarksRes.json() : [];
  const moduleIds = moduleBookmarks.map((b) => b.moduleId);

  const [coursesRes, modulesRes] = await Promise.all([
    courseIds.length > 0
      ? serverApiFetch('/courses/by-ids', { method: 'POST', body: JSON.stringify({ ids: courseIds }) })
      : Promise.resolve(null),
    moduleIds.length > 0
      ? serverApiFetch('/courses/modules/by-ids', { method: 'POST', body: JSON.stringify({ ids: moduleIds }) })
      : Promise.resolve(null),
  ]);
  const courses: Course[] = coursesRes?.ok ? await coursesRes.json() : [];
  const modules: BookmarkedModule[] = modulesRes?.ok ? await modulesRes.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Bookmarks</h1>
          <p className={styles.pageSubtitle}>Courses and modules you&apos;ve bookmarked.</p>
        </div>

        <BookmarksContent initialCourses={courses} initialModules={modules} />
      </div>
    </div>
  );
}
