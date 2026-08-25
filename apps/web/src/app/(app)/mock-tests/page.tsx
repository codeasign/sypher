import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { Course } from '@/data/courses';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Mock Test',
  description: 'Courses you have fully completed on Sypher.',
};

interface MockTestEntry {
  course: Course;
  completedAt: string;
}

function formatCompletedOn(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function MockTestsPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/courses/mock-tests');
  if (res.status === 401) {
    redirect('/login');
  }
  const entries: MockTestEntry[] = res.ok ? await res.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Mock Test</h1>
          <p className={styles.pageSubtitle}>Courses you have fully completed.</p>
        </div>

        {entries.length === 0 ? (
          <p className={styles.emptyText}>
            Nothing here yet — finish every module of a course and it will show up here.{' '}
            <Link href="/learn" className={styles.emptyLink}>
              Go to My Courses
            </Link>
          </p>
        ) : (
          <div className={styles.grid}>
            {entries.map(({ course, completedAt }) => (
              <Link key={course.id} href={`/learn/${course.slug}`} className={styles.card}>
                {course.coverImageUrl && <img src={course.coverImageUrl} alt={course.name} className={styles.cardImage} />}
                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{course.name}</h2>
                  {course.description && <p className={styles.cardDescription}>{course.description}</p>}
                  <span className={styles.completedTag}>Completed on {formatCompletedOn(completedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
