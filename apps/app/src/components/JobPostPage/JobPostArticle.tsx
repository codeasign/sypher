'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { WORK_MODE_LABEL } from '@/types/workMode';
import CourseDescriptionMarkdown from '@/components/CourseDescriptionMarkdown';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

interface JobPostArticleProps {
  slug: string;
  title: string;
  companyName: string;
  description: string;
  location: string | null;
  employmentType: string | null;
  workMode: string | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  applyUrl: string | null;
  applyEmail: string | null;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => n.toLocaleString('en-IN');
  if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
  return `₹${fmt(min ?? max ?? 0)}`;
}

export default function JobPostArticle({
  slug,
  title,
  companyName,
  description,
  location,
  employmentType,
  workMode,
  experienceLevel,
  salaryMin,
  salaryMax,
  applyUrl,
  applyEmail,
}: JobPostArticleProps): React.JSX.Element {
  const salary = formatSalary(salaryMin, salaryMax);

  useEffect(() => {
    trackEvent('careers_job_view', { slug });
  }, [slug]);

  return (
    <article className={styles.article}>
      <Link href="/careers" className={styles.backLink}>
        ← Back to Careers
      </Link>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.company}>{companyName}</p>
      <div className={styles.meta}>
        {location && <span className={styles.metaBadge}>Location: {location}</span>}
        {employmentType && (
          <span className={styles.metaBadge}>Type: {EMPLOYMENT_TYPE_LABEL[employmentType] ?? employmentType}</span>
        )}
        {workMode && (
          <span className={styles.metaBadge}>Mode: {WORK_MODE_LABEL[workMode] ?? workMode}</span>
        )}
        {experienceLevel && <span className={styles.metaBadge}>Experience: {experienceLevel}</span>}
        {salary && <span className={styles.metaBadge}>Salary: {salary}</span>}
      </div>
      <CourseDescriptionMarkdown text={description} className={styles.body} />
      {(applyUrl || applyEmail) && (
        <div className={styles.applySection}>
          <a
            className={styles.applyBtn}
            href={applyUrl || `mailto:${applyEmail}`}
            target={applyUrl ? '_blank' : undefined}
            rel={applyUrl ? 'noopener noreferrer' : undefined}
            onClick={() => trackEvent('careers_apply_click', { slug })}
          >
            Apply now
          </a>
        </div>
      )}
    </article>
  );
}
