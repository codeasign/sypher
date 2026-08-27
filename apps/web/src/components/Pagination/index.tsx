'use client';

import styles from './styles.module.css';

interface PaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

// Page numbers to render: first, last, current ±1, collapsing runs longer
// than that into a single "…" — never renders more than ~7 controls
// regardless of how many pages exist.
function pageItems(page: number, totalPages: number): (number | 'ellipsis')[] {
  const items: (number | 'ellipsis')[] = [];
  const window = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...window].sort((a, b) => a - b);
  let prev: number | null = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) items.push('ellipsis');
    items.push(p);
    prev = p;
  }
  return items;
}

/**
 * Previous/Next + page-number pagination for the logged-in app's listing
 * and management tables — replaces the earlier "Show more" (cumulative
 * append) pattern there per the user's explicit preference 2026-08-27.
 * Paired with usePaginatedListView's page-based mode.
 */
export default function Pagination({ page, totalPages, onPageChange, disabled }: PaginationProps): React.JSX.Element | null {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.navBtn}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        ‹ Previous
      </button>
      <div className={styles.pages}>
        {pageItems(page, totalPages).map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`e${i}`} className={styles.ellipsis}>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={item === page ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              disabled={disabled}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className={styles.navBtn}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        Next ›
      </button>
    </nav>
  );
}
