import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CohortList from '@/components/CohortList';
import { getCachedLiveCohorts } from '@/data/cohortsCached';
import Footer from '@/components/Footer';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Cohorts',
  description: 'Live cohorts running now on Sypher.',
};

export default async function CohortsIndexPage() {
  // Hiding the navbar link isn't enough -- a direct URL guess would still
  // reach this page, so gate it on the same toggle, matching /careers.
  if (process.env.NAVBAR_SHOW_COHORTS === 'false') {
    redirect('/');
  }

  const cohorts = await getCachedLiveCohorts();

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Cohorts</h1>
            <p className={styles.pageSubtitle}>Live cohorts running now on Sypher.</p>
          </div>
          <CohortList initialCohorts={cohorts} />
        </div>
      </div>
      <Footer />
    </>
  );
}
