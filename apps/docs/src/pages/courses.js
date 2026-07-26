import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppDashboardUrl } from '@sypher/auth-core/src/urls';
import styles from './courses.module.css';
import courses from '@sypher/course-catalog/src/courses';

// Curated display order for the category sections below -- catalog order
// within each category is preserved from courses.js.
const CATEGORY_ORDER = [
  'AI Engineering',
  'Software Engineering Fundamentals',
  'Algorithms & Interview Prep',
  'Test Automation',
  'Programming Languages',
];

const coursesByCategory = CATEGORY_ORDER.map((category) => ({
  category,
  courses: courses.filter((course) => course.category === category),
})).filter((group) => group.courses.length > 0);

function CheckGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.checkGlyph}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CourseCard({ course, showDuration }) {
  return (
    <article className={styles.card} style={{ '--course-gradient': course.gradient }}>
      <div className={styles.cardAccent} />
      <div className={styles.cardBody}>
        <Heading as="h3" className={styles.cardTitle}>
          {course.title}
        </Heading>
        <p className={styles.cardHook}>{course.hook}</p>
        {showDuration && (
          <div className={styles.cardMeta}>
            <span>{course.hours}</span>
          </div>
        )}
        <ul className={styles.outcomeList}>
          {course.outcomes.slice(0, 4).map((outcome) => (
            <li key={outcome} className={styles.outcomeItem}>
              <CheckGlyph />
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Courses() {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnLanding } = siteConfig.customFields;
  const { user, loading } = useAuth();

  // Anyone already signed in has a dashboard — send them there instead of
  // the public marketing catalog. The catalog still renders first so
  // crawlers/anonymous visitors see full content immediately; this only
  // redirects once auth state resolves client-side.
  useEffect(() => {
    if (!loading && user) {
      window.location.href = getAppDashboardUrl();
    }
  }, [loading, user]);

  return (
    <Layout
      title="All Courses"
      description="Browse all Sypher courses — hands-on, text-first courses in Python, AI engineering, system design, algorithms, and more. Pick a track and start building today.">
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Sypher</span>
            <Heading as="h1" className={styles.pageTitle}>
              Learn by building. Ship real work.
            </Heading>
            <p className={styles.pageSubtitle}>
              Hands-on, text-first courses built for real engineering growth — {courses.length}{' '}
              courses across {coursesByCategory.length} tracks.
            </p>
          </div>

          {coursesByCategory.map((group) => (
            <section key={group.category} className={styles.categorySection}>
              <Heading as="h2" className={styles.categoryTitle}>
                {group.category}
              </Heading>
              <div className={styles.courseGrid}>
                {group.courses.map((course) => (
                  <CourseCard key={course.slug} course={course} showDuration={showDurationOnLanding} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}
