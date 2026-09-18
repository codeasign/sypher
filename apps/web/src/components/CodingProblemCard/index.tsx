import Link from 'next/link';
import CodingProblemBookmarkButton from '@/components/CodingProblemBookmarkButton';
import type { CodingProblemSummary } from '@/data/codingProblems';
import styles from './styles.module.css';

// List row (not a card) — title + bookmark toggle only; category and
// difficulty are conveyed by the section heading above the list
// (CodingProblemsBoard groups by category or difficulty), so the per-row
// chips were redundant and have been removed. Whole row is clickable
// through to the problem's IDE/Solutions page, except the bookmark button,
// which stops propagation to toggle in place.
export default function CodingProblemCard({
  problem,
  bookmarked,
  index,
}: {
  problem: CodingProblemSummary;
  bookmarked: boolean;
  index?: number;
}): React.JSX.Element {
  return (
    <div className={styles.row}>
      <Link href={`/practice-coding/${problem.slug}`} className={styles.rowLink}>
        <div className={styles.topLine}>
          {index !== undefined && <span className={styles.index}>{index}</span>}
          <span className={styles.title}>{problem.title}</span>
          <span className={styles.bookmarkSlot}>
            <CodingProblemBookmarkButton problemId={problem.id} initialBookmarked={bookmarked} />
          </span>
        </div>
      </Link>
    </div>
  );
}
