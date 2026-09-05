import Link from 'next/link';
import CourseProgressBar from '@/components/CourseProgressBar';
import CourseCover from '@/components/CourseCover';
import { CourseBookmarkButton } from '@/components/AuthoredBookmarkButton';
import { courseActionLabel, courseActionTone, type CourseCardData } from '@/data/courses';
import styles from './styles.module.css';

const ACTION_TONE_CLASS = {
  start: styles.actionStart,
  resume: styles.actionResume,
  preview: styles.actionPreview,
} as const;

/**
 * The vertical course card shared by the My Courses and Browse Courses
 * scrollers: cover (real or generic), title, blurb, the square tone-coded
 * action pill on the right (green Start / amber Resume / slate Preview),
 * a progress meter for courses the user can fully take, and the bookmark
 * toggle. Width is the parent's job (a scroller column, a grid cell, …).
 * When a course has no uploaded cover, CourseCover paints a deterministic
 * colourful gradient with the course initials.
 */
export default function CourseCard({
  course,
  bookmarked,
}: {
  course: CourseCardData;
  bookmarked: boolean;
}): React.JSX.Element {
  const toneClass = ACTION_TONE_CLASS[courseActionTone(course)];

  return (
    <div className={styles.wrapper}>
      <Link href={`/learn/${course.slug}`} className={styles.card}>
        <span className={styles.image}>
          <CourseCover name={course.name} src={course.coverImageUrl} seed={course.slug} />
        </span>
        <div className={styles.body}>
          <h3 className={styles.title}>{course.name}</h3>
          {course.description && <p className={styles.description}>{course.description}</p>}
          <div className={styles.tags}>
            <span className={`${styles.actionTag} ${toneClass}`}>{courseActionLabel(course)}</span>
          </div>
          {course.hasFullAccess && <CourseProgressBar completed={course.completedModules} total={course.totalModules} />}
        </div>
      </Link>
      <div className={styles.bookmarkSlot}>
        <CourseBookmarkButton courseId={course.id} initialBookmarked={bookmarked} />
      </div>
    </div>
  );
}
