import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './courses.module.css';
import courses from '@sypher/course-catalog/src/courses';

function CourseSection({ course, showDuration }) {
  return (
    <div className={styles.courseSection}>
      <div className={styles.courseHeader}>
        <div className={styles.courseHeaderLeft}>
          <span className={styles.courseIcon}>{course.icon}</span>
          <div>
            <div className={styles.courseTitleRow}>
              <Heading as="h2" className={styles.courseTitle}>{course.title}</Heading>
              <span className={styles.courseTag}>{course.tag}</span>
            </div>
            <div className={styles.courseMeta}>
              <span>{course.difficulty}</span>
              {showDuration && (
                <>
                  <span className={styles.metaDot}>·</span>
                  <span>{course.hours}</span>
                </>
              )}
            </div>
            <p className={styles.courseDesc}>{course.description}</p>
          </div>
        </div>
      </div>

      <div className={styles.curriculum}>
        <div className={styles.curriculumHeader}>
          <span className={styles.curriculumTitle}>Course Curriculum</span>
          <span className={styles.curriculumCount}>{course.modules.length} sections</span>
        </div>
        {course.modules.map((module, i) => (
          <details key={i} className={styles.module} open={i < 2}>
            <summary className={styles.moduleSummary}>
              <span className={styles.moduleLabel}>{module.label}</span>
              <span className={styles.moduleCount}>{module.topics.length} topics</span>
            </summary>
            <div className={styles.moduleTopics}>
              {module.topics.map((topic) => (
                <div key={topic} className={styles.topicItem}>
                  <span className={styles.topicDot}>●</span>
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function Courses() {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnLanding } = siteConfig.customFields;
  return (
    <Layout
      title="All Courses"
      description="Browse all Sypher courses — from Python for AI to system design, coding bootcamp, and production AI projects.">
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <Heading as="h1" className={styles.pageTitle}>All Courses</Heading>
            <p className={styles.pageSubtitle}>
              Browse our complete catalog. Each course is hands-on, text-first, and built for real engineering growth.
            </p>
          </div>
          <div className={styles.courseList}>
            {courses.map((course) => (
              <CourseSection key={course.slug} course={course} showDuration={showDurationOnLanding} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}