import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Footer from '@/components/Footer';
import GettingStartedModuleList from '@/components/GettingStartedModuleList';
import { getCachedGettingStartedModules } from '@/data/coursesCached';
import { isSignedIn } from '@/lib/courseAccess';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Setup & Dependencies',
  description: 'Find the guides for setting up the dependencies you need before starting your courses.',
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
          <h1 className={styles.pageTitle}>Setup & Dependencies</h1>
          <p className={styles.pageSubtitle}>
            Find the guides for setting up the dependencies you need before starting your courses.
          </p>
        </div>

        <GettingStartedModuleList modules={modules} />
      </div>
      <Footer />
    </div>
  );
}
