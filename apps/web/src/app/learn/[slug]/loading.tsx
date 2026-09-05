import styles from './styles.module.css';

export default function CourseLoading(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.feedback} role="status" aria-live="polite">
        <h1 className={styles.feedbackTitle}>Loading course…</h1>
        <p className={styles.feedbackText}>Fetching the course topics and your progress.</p>
      </div>
    </div>
  );
}
