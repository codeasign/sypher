import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import type { MockExamSummary } from '@/data/mockTests';
import MockExamList from '@/components/MockExamList';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Mock Test',
  description: 'Timed mock exams that mirror the real certification experience.',
};

interface MockExamSummaryPage {
  exams: MockExamSummary[];
  total: number;
}

const PAGE_SIZE = 20;

export default async function MockTestsPage(): Promise<React.JSX.Element> {
  // First page only (20, same pagination shape as /blog) — MockExamList
  // fetches subsequent pages itself on "Show more".
  const res = await serverApiFetch(`/mock-exams/page?limit=${PAGE_SIZE}&offset=0`);
  if (res.status === 401) {
    redirect('/login');
  }
  const page: MockExamSummaryPage = res.ok ? await res.json() : { exams: [], total: 0 };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Mock Test</h1>
          <p className={styles.pageSubtitle}>Timed mock exams that mirror the real certification experience.</p>
        </div>

        <MockExamList initialExams={page.exams} total={page.total} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}
