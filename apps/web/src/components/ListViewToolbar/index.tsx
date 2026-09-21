'use client';

import { LayoutGrid, List } from 'lucide-react';
import type { ListViewMode } from '@/hooks/usePaginatedListView';
import styles from './styles.module.css';

// Bare Lucide glyph icons — "currentColor, no background", same convention
// as components/icons/ActionIcons.
function GridIcon(): React.JSX.Element {
  return (
    <LayoutGrid size={16} />
  );
}

function ListIcon(): React.JSX.Element {
  return (
    <List size={16} />
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

