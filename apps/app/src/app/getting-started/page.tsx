import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { getCachedGettingStartedModules } from '@/data/coursesCached';
import { isSignedIn } from '@/lib/courseAccess';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Getting Started',
  description: 'Setup guides and getting-started material for signed-in users -- no course access required.',
};

interface GettingStartedModule {
  id: string;
  slug: string;
  title: string;
  getting_started_order: number | null;
  course: { slug: string; status: string; name: string } | { slug: string; status: string; name: string }[];
}

export default async function GettingStartedPage() {
  // Phase 9 revision: originally fully public (no session needed at all),
  // now requires a session but still no course grant -- see
  // src/lib/courseAccess.ts's isSignedIn() and the matching change in the
  // [moduleSlug] route for flagged modules.
  if (!(await isSignedIn())) redirect('/login');

  const modules = (await getCachedGettingStartedModules()) as GettingStartedModule[];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Getting Started</h1>
          <p className={styles.pageSubtitle}>
            Setup guides and orientation material — no course access required, just a signed-in account.
          </p>
        </div>

        {modules.length === 0 ? (
          <p className={styles.empty}>No getting-started guides published yet.</p>
        ) : (
          <div className={styles.moduleGrid}>
            {modules.map((m) => {
              // Supabase's !inner embed types as an array in some client
              // versions, a single object in others -- normalize both.
              const course = Array.isArray(m.course) ? m.course[0] : m.course;
              if (!course) return null;
              return (
                <Link key={m.id} href={`/courses/${course.slug}/${m.slug}`} className={styles.moduleCard}>
                  <span className={styles.moduleCardIcon}>📘</span>
                  <span className={styles.moduleCardTitle}>{m.title}</span>
                  <span className={styles.moduleCardCourse}>{course.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
