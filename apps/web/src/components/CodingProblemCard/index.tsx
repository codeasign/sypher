import Link from 'next/link';
import CodingProblemBookmarkButton from '@/components/CodingProblemBookmarkButton';
import type { CodingProblemSummary } from '@/data/codingProblems';
import styles from './styles.module.css';

// List row (not a card) — number + title, with an optional bookmark toggle;
// category and difficulty are conveyed by the section heading above the list
// (CodingProblemsBoard groups by category or difficulty), so the per-row
// chips were redundant and have been removed. Whole row is clickable
// through to the problem's IDE/Solutions page, except the bookmark button,
// which stops propagation to toggle in place.
//
// The bookmark toggle lives on the problem/IDE page itself
// (CodingProblemDetail). Practice Coding rows hide it (showBookmark=false);
// the Bookmarks -> Coding Problems tab keeps it so a bookmark can be removed
// from the list.
export default function CodingProblemCard({
  problem,
  bookmarked = false,
  index,
  showBookmark = true,
  onBookmarkChange,
}: {
  problem: CodingProblemSummary;
  /** Initial bookmark state; only used when the bookmark button is shown. */
  bookmarked?: boolean;
  index?: number;
  /** Set false to render the row without the bookmark button. Default true. */
  showBookmark?: boolean;
  /** Optional: see CodingProblemBookmarkButton's onChange. */
  onBookmarkChange?: (problemId: string, bookmarked: boolean) => void;
}): React.JSX.Element {
  return (
    <div className={styles.row}>
      <Link href={`/practice-coding/${problem.slug}`} className={styles.rowLink}>
        <div className={styles.topLine}>
          {index !== undefined && <span className={styles.index}>{index}</span>}
          <span className={styles.title}>{problem.title}</span>
          {showBookmark && (
            <span className={styles.bookmarkSlot}>
              <CodingProblemBookmarkButton
                problemId={problem.id}
                initialBookmarked={bookmarked}
                onChange={onBookmarkChange ? (next) => onBookmarkChange(problem.id, next) : undefined}
              />
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
