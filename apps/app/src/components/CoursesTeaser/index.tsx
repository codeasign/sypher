import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import styles from './styles.module.css';

// Public homepage teaser -- links out to the canonical course catalog on
// docs.sypher (docs.sypher.local/courses) instead of rendering an inline
// listing here. Keeps course curriculum detail off the logged-out homepage
// rather than duplicating it via DashboardCourseListing's slide panel.
export default function CoursesTeaser() {
  return (
    <section className={styles.teaser}>
      <div className={styles.container}>
        <h2 className={styles.title}>Explore Our Courses</h2>
        <p className={styles.subtitle}>
          From Python fundamentals to production AI systems — hands-on, text-first courses built for
          real engineering growth.
        </p>
        <a href={`${getDocsOrigin()}/courses`} className={styles.cta}>
          Browse All Courses →
        </a>
      </div>
    </section>
  );
}
