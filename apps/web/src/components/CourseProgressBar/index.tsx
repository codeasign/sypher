import styles from './styles.module.css';

interface CourseProgressBarProps {
  completed: number;
  total: number;
  /** Slimmer, label-less variant for dense list rows. */
  compact?: boolean;
}

/**
 * Per-course completion meter for the course cards on My Courses and
 * Browse Courses. Renders nothing for a course with no modules (nothing
 * to be a fraction of). A course the user hasn't started shows an empty
 * track at "Not started" rather than being hidden — the bar doubles as a
 * cue that progress IS tracked here.
 */
export default function CourseProgressBar({ completed, total, compact }: CourseProgressBarProps): React.JSX.Element | null {
  if (!total || total <= 0) return null;
  const safeCompleted = Math.max(0, Math.min(completed, total));
  const pct = Math.round((safeCompleted / total) * 100);
  const done = pct >= 100;

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={safeCompleted}
        aria-label={`${safeCompleted} of ${total} modules complete`}
      >
        <div className={`${styles.fill} ${done ? styles.fillDone : ''}`} style={{ width: `${pct}%` }} />
      </div>
      {!compact && (
        <span className={styles.label}>
          {done ? 'Completed' : safeCompleted === 0 ? 'Not started' : `${safeCompleted} / ${total} modules · ${pct}%`}
        </span>
      )}
    </div>
  );
}
