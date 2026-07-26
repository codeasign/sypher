import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppDashboardUrl } from '@sypher/auth-core/src/urls';
import styles from './courses.module.css';
import courses from '@sypher/course-catalog/src/courses';

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
    <Link to={course.url} className={styles.card} style={{ '--course-gradient': course.gradient }}>
      <div className={styles.cardGlow} />
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>{course.icon}</span>
        <span className={styles.cardTag}>{course.tag}</span>
      </div>
      <Heading as="h2" className={styles.cardTitle}>{course.title}</Heading>
      <p className={styles.cardHook}>{course.hook}</p>
      <div className={styles.cardMeta}>
        <span>{course.difficulty}</span>
        {showDuration && (
          <>
            <span className={styles.metaDot}>·</span>
            <span>{course.hours}</span>
          </>
        )}
      </div>
      <ul className={styles.outcomeList}>
        {course.outcomes.slice(0, 4).map((outcome) => (
          <li key={outcome} className={styles.outcomeItem}>
            <CheckGlyph />
            <span>{outcome}</span>
          </li>
        ))}
      </ul>
      <span className={styles.cardCta}>Explore course <span aria-hidden="true">→</span></span>
    </Link>
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
      description="Browse all Sypher courses — from Python for AI to system design, coding bootcamp, and production AI projects.">
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <Heading as="h1" className={styles.pageTitle}>Learn by building. Ship real work.</Heading>
            <p className={styles.pageSubtitle}>
              Hands-on, text-first courses built for real engineering growth. Pick a track, see what you&apos;ll
              walk away with, and start today.
            </p>
          </div>
          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} showDuration={showDurationOnLanding} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
