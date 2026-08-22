import type { Metadata } from 'next';
import { serverApiFetch } from '@/lib/serverApi';
import CohortList from '@/components/CohortList';
import type { Cohort } from '@/data/cohorts';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Cohorts',
  description: 'Live cohorts running now on Sypher.',
};

export default async function CohortsIndexPage(): Promise<React.JSX.Element> {
  const res = await serverApiFetch('/cohorts');
  const cohorts: Cohort[] = res.ok ? await res.json() : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Cohorts</h1>
          <p className={styles.pageSubtitle}>Live cohorts running now on Sypher.</p>
        </div>
        <CohortList initialCohorts={cohorts} />
      </div>
    </div>
  );
}
