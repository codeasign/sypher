'use client';

import type { ListViewMode } from '@/hooks/usePaginatedListView';
import styles from './styles.module.css';

// Bare glyph icons — simple shape primitives (not a memorized Material
// Symbols path string) so they're guaranteed to render correctly, same
// "currentColor, no background" convention as components/icons/ActionIcons.
function GridIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function ListIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="14" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="1" y="6.8" width="14" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="1" y="11.6" width="14" height="2.4" rx="1.2" fill="currentColor" />
    </svg>
  );
}

interface ListViewToolbarProps {
  shown: number;
  total: number;
  itemLabelSingular: string;
  itemLabelPlural: string;
  viewMode: ListViewMode;
  onChangeView: (mode: ListViewMode) => void;
  ariaLabel: string;
  // Default true (unchanged behavior everywhere else). MockExamList
  // passes false — "9 of 9 mock tests" was redundant with the section
  // headings the role-grouping pass added above it (2026-09-06 request).
  showCount?: boolean;
}

/** Count label + Card/List segmented toggle. Shared across every learner-facing listing page — see usePaginatedListView for the state this drives. */
export function ListViewToolbar({
  shown,
  total,
  itemLabelSingular,
  itemLabelPlural,
  viewMode,
  onChangeView,
  ariaLabel,
  showCount = true,
}: ListViewToolbarProps): React.JSX.Element {
  return (
    <div className={styles.toolbar}>
      {showCount ? (
        <span className={styles.countLabel}>
          {shown} of {total} {total === 1 ? itemLabelSingular : itemLabelPlural}
        </span>
      ) : (
        <span />
      )}
      <div className={styles.viewToggle} role="group" aria-label={ariaLabel}>
        <button
          type="button"
          className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.viewToggleBtnActive : ''}`}
          aria-pressed={viewMode === 'card'}
          onClick={() => onChangeView('card')}
        >
          <GridIcon />
          Card
        </button>
        <button
          type="button"
          className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
          aria-pressed={viewMode === 'list'}
          onClick={() => onChangeView('list')}
        >
          <ListIcon />
          List
        </button>
      </div>
    </div>
  );
}

