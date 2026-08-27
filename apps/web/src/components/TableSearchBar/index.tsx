'use client';

import styles from './styles.module.css';

/**
 * Client-side search input for the admin management tables (Manage
 * Courses, Manage Blog, Manage Cohort Users). Deliberately no network call
 * per keystroke — 2026-08-27, user's explicit call: the full row set is
 * already fetched once on load, so filtering happens in the browser
 * against that array. Callers own the actual filter logic and reset
 * pagination to page 1 on change.
 */
export default function TableSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}): React.JSX.Element {
  return (
    <div className={styles.wrap}>
      <svg className={styles.icon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.4" />
        <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" className={styles.clearBtn} aria-label="Clear search" onClick={() => onChange('')}>
          ×
        </button>
      )}
    </div>
  );
}
