'use client';

import React from 'react';
import Link from 'next/link';
import CourseDescriptionMarkdown from '@/components/CourseDescriptionMarkdown';
import CohortInterestForm from '@/components/CohortInterestForm';
import styles from './styles.module.css';

interface CohortArticleProps {
  slug: string;
  title: string;
  content: string;
  coverImageUrl: string | null;
  startDate: string | null;
  durationWeeks: number | null;
  seatsTotal: number | null;
  priceLabel: string | null;
  showBackLink?: boolean;
  showInterestForm?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function CohortArticle({
  slug: _slug,
  title,
  content,
  coverImageUrl,
  startDate,
  durationWeeks,
  seatsTotal,
  priceLabel,
  showBackLink = true,
  showInterestForm = true,
}: CohortArticleProps): React.JSX.Element {
  return (
    <article className={styles.article}>
      {showBackLink && (
        <Link href="/cohorts" className={styles.backLink}>
          ← Back to Cohorts
        </Link>
      )}
      {coverImageUrl && <img src={coverImageUrl} alt={title} className={styles.coverImage} />}
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.meta}>
        {startDate && <span className={styles.metaBadge}>Starts {formatDate(startDate)}</span>}
        {durationWeeks && <span className={styles.metaBadge}>{durationWeeks} weeks</span>}
        {seatsTotal && <span className={styles.metaBadge}>{seatsTotal} seats</span>}
        {priceLabel && <span className={styles.metaBadge}>{priceLabel}</span>}
      </div>
      {content && <CourseDescriptionMarkdown text={content} className={styles.body} />}
      {showInterestForm && (
        <div className={styles.interestSection}>
          <h2 className={styles.interestHeading}>Interested in this cohort?</h2>
          <CohortInterestForm cohortTitle={title} />
        </div>
      )}
    </article>
  );
}
