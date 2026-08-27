'use client';

import Link from 'next/link';
import { fetchMockExamPage, type MockExamSummary } from '@/data/mockTests';
import { usePaginatedListView } from '@/hooks/usePaginatedListView';
import { ListViewToolbar } from '@/components/ListViewToolbar';
import Pagination from '@/components/Pagination';
import styles from './styles.module.css';

// Page-based navigation (Previous/Next + page numbers) fetches exactly
// one page from the API — same pattern as BlogList/CourseListView.
export default function MockExamList({
  initialExams,
  total,
  pageSize,
}: {
  initialExams: MockExamSummary[];
  total: number;
  pageSize: number;
}) {
  const { items: exams, total: liveTotal, page, totalPages, loading, loadError, goToPage, viewMode, setViewMode } = usePaginatedListView({
    initialItems: initialExams,
    total,
    pageSize,
    storageKey: 'mock-tests-view-mode',
    defaultView: 'card',
    fetchPage: async (limit, offset) => {
      const page = await fetchMockExamPage(limit, offset);
      return { items: page.exams, total: page.total };
    },
  });

  if (liveTotal === 0) {
    return <p className={styles.emptyText}>No mock tests available yet — check back soon.</p>;
  }

  return (
    <>
      <ListViewToolbar
        shown={exams.length}
        total={liveTotal}
        itemLabelSingular="mock test"
        itemLabelPlural="mock tests"
        viewMode={viewMode}
        onChangeView={setViewMode}
        ariaLabel="Mock test display"
      />

      {viewMode === 'card' ? (
        <div className={styles.grid}>
          {exams.map((exam) => (
            <Link key={exam.id} href={`/mock-tests/${exam.slug}`} className={styles.card}>
              <div className={styles.cardBody}>
                <span className={styles.examCode}>{exam.examCode}</span>
                <h2 className={styles.cardTitle}>{exam.title}</h2>
                {exam.description && <p className={styles.cardDescription}>{exam.description}</p>}
                <div className={styles.metaRow}>
                  <span className={styles.chip}>{exam.durationMinutes} min</span>
                  <span className={styles.chip}>{exam.liveQuestionCount} questions</span>
                  <span className={styles.chip}>{exam.easyCount} easy</span>
                  <span className={styles.chip}>{exam.mediumCount} medium</span>
                  <span className={styles.chip}>{exam.hardCount} hard</span>
                </div>
                <span className={styles.startTag}>Start mock test →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.rowList}>
          {exams.map((exam) => (
            <Link key={exam.id} href={`/mock-tests/${exam.slug}`} className={styles.row}>
              <div className={styles.rowBody}>
                <div className={styles.rowTop}>
                  <span className={styles.examCode}>{exam.examCode}</span>
                  <h2 className={styles.rowTitle}>{exam.title}</h2>
                </div>
                {exam.description && <p className={styles.cardDescription}>{exam.description}</p>}
                <div className={styles.metaRow}>
                  <span className={styles.chip}>{exam.durationMinutes} min</span>
                  <span className={styles.chip}>{exam.liveQuestionCount} questions</span>
                  <span className={styles.chip}>{exam.easyCount} easy</span>
                  <span className={styles.chip}>{exam.mediumCount} medium</span>
                  <span className={styles.chip}>{exam.hardCount} hard</span>
                </div>
              </div>
              <span className={styles.rowStartTag}>Start →</span>
            </Link>
          ))}
        </div>
      )}

      {loadError && <p className={styles.loadErrorText}>{loadError}</p>}
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />
    </>
  );
}
