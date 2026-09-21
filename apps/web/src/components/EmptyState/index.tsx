import { ILLUSTRATIONS, type EmptyIllustrationName } from './illustrations';
import styles from './styles.module.css';

interface EmptyStateProps {
  /** Which drawing to show above the message. */
  illustration: EmptyIllustrationName;
  title: string;
  description?: string;
  /** Smaller variant for panels/sections inside a page (default: full-screen height). */
  compact?: boolean;
}

/**
 * Centered empty state: an illustration, a title and a short message.
 * Same look as the original Bookmarks (Courses / Modules) and Getting
 * Started empty screens, shared so every empty list reads the same.
 */
export default function EmptyState({ illustration, title, description, compact = false }: EmptyStateProps): React.JSX.Element {
  const Art = ILLUSTRATIONS[illustration];
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`}>
      <svg className={styles.art} viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <Art />
      </svg>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
