import CourseCard from '@/components/CourseCard';
import type { CourseWithAccess } from '@/data/courses';
import styles from './styles.module.css';

interface CourseScrollerProps {
  title: string;
  /** Optional line under the title (e.g. "Because you're taking …"). */
  subtitle?: string;
  courses: CourseWithAccess[];
  bookmarkedIds: string[];
}

/**
 * A titled section of course cards in a wrapping grid. The grid grows
 * downward as more cards are added and the page scrolls vertically — no
 * horizontal strip, no prev/next buttons. Renders nothing when it has no
 * courses.
 */
export default function CourseScroller({ title, subtitle, courses, bookmarkedIds }: CourseScrollerProps): React.JSX.Element | null {
  if (courses.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <ul className={styles.grid}>
        {courses.map((course) => (
          <li key={course.id} className={styles.cell}>
            <CourseCard course={course} bookmarked={bookmarkedIds.includes(course.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
