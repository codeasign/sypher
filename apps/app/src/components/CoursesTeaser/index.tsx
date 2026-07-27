import courses from '@sypher/course-catalog/src/courses';
import styles from './styles.module.css';

type Course = (typeof courses)[number];

// Static grid, no links and no buttons -- purely a preview of the catalog.
// "Browse All Courses" lived here before; the founder wants this section to
// just be a plain, scannable list with nothing to click, so there is no
// click-through target here at all (courses are browsed from docs.sypher.local
// directly, not from this teaser).
function CourseCard({ course }: { course: Course }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardIcon}>{course.icon}</span>
      <h3 className={styles.cardTitle}>{course.title}</h3>
      <p className={styles.cardHook}>{course.hook}</p>
    </div>
  );
}

export default function CoursesTeaser() {
  return (
    <section className={styles.teaser}>
      <div className={styles.header}>
        <h2 className={styles.title}>Explore Our Courses</h2>
        <p className={styles.subtitle}>
          {courses.length} hands-on, text-first courses — from Python fundamentals to production
          AI systems.
        </p>
      </div>

      <div className={styles.grid}>
        {courses.map((course) => (
          <CourseCard key={course.slug} course={course} />
        ))}
      </div>
    </section>
  );
}
