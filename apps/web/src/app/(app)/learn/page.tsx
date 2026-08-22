import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { CourseWithAccess } from '@/data/courses';
import { CourseBookmarkButton } from '@/components/AuthoredBookmarkButton';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'My Courses',
  description: 'Courses you have access to on Sypher.',
};

export default async function LearnIndexPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/courses');
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
          <p className={styles.pageSubtitle}>Courses you have access to on Sypher.</p>
        </div>

        {courses.length === 0 ? (
          <p className={styles.emptyText}>No courses available yet.</p>
        ) : (
          <div className={styles.grid}>
            {courses.map((course) => (
              <div key={course.id} className={styles.cardWrapper}>
                <Link href={`/learn/${course.slug}`} className={styles.card}>
                  {course.coverImageUrl && <img src={course.coverImageUrl} alt={course.name} className={styles.cardImage} />}
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{course.name}</h2>
                    {course.description && <p className={styles.cardDescription}>{course.description}</p>}
                    {!course.hasFullAccess && <span className={styles.previewTag}>Preview only</span>}
                  </div>
                </Link>
                <div className={styles.bookmarkSlot}>
                  <CourseBookmarkButton courseId={course.id} initialBookmarked={bookmarkedIds.includes(course.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
