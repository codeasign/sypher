import { gradientFor, initialsOf } from '@/lib/palette';
import styles from './styles.module.css';

interface CourseCoverProps {
  name: string;
  src?: string | null;
  /** Key the generated gradient is derived from (default: name). */
  seed?: string;
  locked?: boolean;
  /** Extra class on the wrapper — the caller owns width/height/aspect. */
  className?: string;
}

/**
 * A course thumbnail that always has something to show: the real
 * coverImageUrl when present, otherwise a deterministic colourful gradient
 * with the course initials. Fills its parent — the parent sets the size.
 */
export default function CourseCover({ name, src, seed, locked, className }: CourseCoverProps): React.JSX.Element {
  return (
    <span className={`${styles.cover} ${className ?? ''}`}>
      {src ? (
        <img src={src} alt="" className={styles.img} />
      ) : (
        <span className={styles.generated} style={{ backgroundImage: gradientFor(seed ?? name) }} aria-hidden>
          <span className={styles.initials}>{initialsOf(name)}</span>
        </span>
      )}
      {locked && <span className={styles.lock}>Preview</span>}
    </span>
  );
}
