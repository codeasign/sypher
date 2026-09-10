import CourseCard from '@/components/CourseCard';
import type { CourseWithAccess } from '@/data/courses';
import { NEW_COURSE_SLUG_SET } from '@/lib/newCourses';
import styles from './styles.module.css';

interface CourseScrollerProps {
  /** Section heading. Omit to render just the card grid (e.g. the Bookmarks tabs). */
  title?: string;
  /** Optional line under the title (e.g. "Because you're taking …"). */
  subtitle?: string;
  courses: CourseWithAccess[];
  bookmarkedIds: string[];
  showNewBadges?: boolean;
}

/**
 * A titled section of course cards in a wrapping grid. The grid grows
 * downward as more cards are added and the page scrolls vertically — no
 * horizontal strip, no prev/next buttons. Renders nothing when it has no
 * courses. With no title/subtitle the header is dropped and only the grid
 * renders.
 */
export default function CourseScroller({
  title,
  subtitle,
  courses,
  bookmarkedIds,
  showNewBadges = false,
}: CourseScrollerProps): React.JSX.Element | null {
  if (courses.length === 0) return null;

  return (
    <section className={styles.section}>
      {(title || subtitle) && (
        <div className={styles.header}>
          <div className={styles.heading}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
      )}

      <ul className={styles.grid}>
        {courses.map((course) => (
          <li key={course.id} className={styles.cell}>
            <CourseCard
              course={course}
              bookmarked={bookmarkedIds.includes(course.id)}
              isNew={showNewBadges && NEW_COURSE_SLUG_SET.has(course.slug)}
              variant="catalog"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
