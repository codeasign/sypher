'use client';

import { useMemo, useState } from 'react';
import courses from '@sypher/course-catalog/src/courses';
import styles from './styles.module.css';

type Course = (typeof courses)[number];

// Curated display order, ported from apps/docs/src/pages/courses.js —
// catalog order within each category is preserved from courses.js.
const CATEGORY_ORDER = [
  'AI Engineering',
  'Software Engineering Fundamentals',
  'Algorithms & Interview Prep',
  'Test Automation',
  'Programming Languages',
];

const ALL = 'All';

const orderedCourses = CATEGORY_ORDER.flatMap((category) => courses.filter((course) => course.category === category));

const categories = [ALL, ...CATEGORY_ORDER.filter((category) => orderedCourses.some((course) => course.category === category))];

function CourseTile({ course }: { course: Course }): React.JSX.Element {
  return (
    <div className={styles.card} style={{ '--course-gradient': course.gradient } as React.CSSProperties}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>{course.icon}</span>
        <span className={styles.cardTag}>{course.tag}</span>
      </div>
      <h3 className={styles.cardTitle}>{course.title}</h3>
      <p className={styles.cardHook}>{course.hook}</p>
      <div className={styles.cardMeta}>
        <span>{course.hours}</span>
      </div>
    </div>
  );
}

export default function CoursesCatalog(): React.JSX.Element {
  const [active, setActive] = useState(ALL);

  const filtered = useMemo(
    () => (active === ALL ? orderedCourses : orderedCourses.filter((course) => course.category === active)),
    [active],
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className={styles.pageEyebrow}>The Catalog</span>
          <h1 className={styles.pageTitle}>Learn by building. Ship real work.</h1>
          <p className={styles.pageSubtitle}>
            Hands-on, text-first courses built for real engineering growth — {courses.length} courses across{' '}
            {CATEGORY_ORDER.length} tracks. Filter by track to see what&apos;s here.
          </p>
        </div>

        <div className={styles.pills} role="tablist" aria-label="Filter courses by track">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active === category}
              className={active === category ? `${styles.pill} ${styles.pillActive}` : styles.pill}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className={styles.courseGrid}>
          {filtered.map((course) => (
            <CourseTile key={course.slug} course={course} />
          ))}
        </div>
      </div>
    </div>
  );
}
