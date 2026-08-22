import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { GettingStartedModuleEntry } from '@/data/courses';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Setup & Dependencies',
  description: 'Find the guides for setting up the dependencies you need before starting your courses.',
};

export default async function GettingStartedPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/courses/getting-started');
  if (res.status === 401) {
    redirect('/login');
  }
  const modules: GettingStartedModuleEntry[] = res.ok ? await res.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Setup & Dependencies</h1>
          <p className={styles.pageSubtitle}>
            Find the guides for setting up the dependencies you need before starting your courses.
          </p>
        </div>

        {modules.length === 0 ? (
          <p className={styles.emptyText}>No setup guides published yet.</p>
        ) : (
          <ul className={styles.list}>
            {modules.map((mod) => (
              <li key={mod.id}>
                <Link href={`/learn/${mod.course.slug}/${mod.slug}`} className={styles.item}>
                  <span className={styles.itemTitle}>{mod.title}</span>
                  <span className={styles.itemCourse}>{mod.course.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
