import styles from '@/components/CourseModulePage/styles.module.css';

export default function LessonLoading(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.feedback} role="status" aria-live="polite">
        <h1 className={styles.feedbackTitle}>Loading lesson…</h1>
        <p className={styles.feedbackText}>Fetching the lesson and course navigation.</p>
      </div>
    </div>
  );
}
