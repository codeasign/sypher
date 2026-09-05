'use client';

import styles from '@/components/CourseModulePage/styles.module.css';

export default function LessonError({ reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.feedback} role="alert">
        <h1 className={styles.feedbackTitle}>We couldn’t load this lesson</h1>
        <p className={styles.feedbackText}>Please try again. Your progress has not been changed.</p>
        <button type="button" className={styles.retryButton} onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
