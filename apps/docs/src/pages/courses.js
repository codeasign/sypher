import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppDashboardUrl } from '@sypher/auth-core/src/urls';
import styles from './courses.module.css';
import courses from '@sypher/course-catalog/src/courses';

// Curated display order for the "All" grid and the filter pills below --
// catalog order within each category is preserved from courses.js.
const CATEGORY_ORDER = [
  'AI Engineering',
  'Software Engineering Fundamentals',
  'Algorithms & Interview Prep',
  'Test Automation',
  'Programming Languages',
];

const ALL = 'All';

const orderedCourses = CATEGORY_ORDER.flatMap((category) =>
  courses.filter((course) => course.category === category),
);

const categories = [
  ALL,
  ...CATEGORY_ORDER.filter((category) => orderedCourses.some((course) => course.category === category)),
];

// Same visual language as the "Catalog" concept section (concepts/story/
// CourseShowcase) -- gradient-accented icon, tag, hook -- but static: no
// click-through, no CTA, no difficulty/level shown. Purely a scannable
// preview of the catalog.
function CourseTile({ course, showDuration }) {
  return (
    <div className={styles.card} style={{ '--course-gradient': course.gradient }}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>{course.icon}</span>
        <span className={styles.cardTag}>{course.tag}</span>
      </div>
      <Heading as="h3" className={styles.cardTitle}>
        {course.title}
      </Heading>
      <p className={styles.cardHook}>{course.hook}</p>
      {showDuration && (
        <div className={styles.cardMeta}>
          <span>{course.hours}</span>
        </div>
      )}
    </div>
  );
}

export default function Courses() {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnLanding } = siteConfig.customFields;
  const { user, loading } = useAuth();
  const [active, setActive] = useState(ALL);

  // Anyone already signed in has a dashboard — send them there instead of
  // the public marketing catalog. The catalog still renders first so
  // crawlers/anonymous visitors see full content immediately; this only
  // redirects once auth state resolves client-side.
  useEffect(() => {
    if (!loading && user) {
      window.location.href = getAppDashboardUrl();
    }
  }, [loading, user]);

  const filtered = useMemo(
    () => (active === ALL ? orderedCourses : orderedCourses.filter((course) => course.category === active)),
    [active],
  );

  return (
    <Layout
      title="All Courses"
      description="Browse all Sypher courses — hands-on, text-first courses in Python, AI engineering, system design, algorithms, and more. Pick a track and start building today.">
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>The Catalog</span>
            <Heading as="h1" className={styles.pageTitle}>
              Learn by building. Ship real work.
            </Heading>
            <p className={styles.pageSubtitle}>
              Hands-on, text-first courses built for real engineering growth — {courses.length}{' '}
              courses across {CATEGORY_ORDER.length} tracks. Filter by track to see what&apos;s here.
            </p>
          </div>

          <div className={styles.pills} role="tablist" aria-label="Filter courses by track">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active === category}
                className={`${styles.pill} ${active === category ? styles.pillActive : ''}`}
                onClick={() => setActive(category)}>
                {category}
              </button>
            ))}
          </div>

          <div className={styles.courseGrid}>
            {filtered.map((course) => (
              <CourseTile key={course.slug} course={course} showDuration={showDurationOnLanding} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
