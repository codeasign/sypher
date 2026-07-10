import React from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

interface CourseCardProps {
  title: string;
  description: string;
  url: string;
  gradient: string;
  icon: string;
  tag: string;
  isFree: boolean;
  slug: string;
}

function DashboardCourseCard({
  title,
  description,
  url,
  gradient,
  icon,
  tag,
  isFree,
  slug,
}: CourseCardProps) {
  return (
    <article className={styles.card} style={{ '--card-gradient': gradient } as React.CSSProperties}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <div className={styles.cardHeaderRight}>
          {isFree ? (
            <span className={styles.freeTag}>Free</span>
          ) : (
            <span className={styles.cardTag}>{tag}</span>
          )}
        </div>
      </div>
      <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
      <p className={styles.cardDesc}>{description}</p>
      <div className={styles.cardActions}>
        <Link to={`/docs/${slug}/`} className={styles.btnPrimary}>
          Learn →
        </Link>
        <Link to={url} className={styles.btnSecondary}>
          View Course
        </Link>
      </div>
    </article>
  );
}

interface DashboardCourseListingProps {
  courses: Array<{
    title: string;
    description: string;
    url: string;
    gradient: string;
    icon: string;
    tag: string;
    isFree: boolean;
    slug: string;
  }>;
}

export default function DashboardCourseListing({
  courses,
}: DashboardCourseListingProps) {
  return (
    <div className={styles.courseGrid}>
      {courses.map((course) => (
        <DashboardCourseCard
          key={course.title}
          {...course}
        />
      ))}
    </div>
  );
}