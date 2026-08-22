'use client';

import Link from 'next/link';
import { useShowMore } from '@/hooks/useShowMore';
import type { Cohort } from '@/data/cohorts';
import styles from './styles.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function titleColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 58%, 42%)`;
}

// Presentational only — the server component that renders this
// (apps/web/src/app/cohorts/page.tsx) fetches with `cache: 'no-store'`
// (see serverApiFetch), so every page visit already gets a fresh list. The
// old version subscribed to Supabase Realtime for live cross-tab updates
// without a refresh; that infra doesn't exist here, so this is a real
// behavior change — a currently-open /cohorts tab won't update itself
// if an admin publishes a new cohort elsewhere, only a fresh navigation
// will show it. Flagged, not silently dropped.
export default function CohortList({ initialCohorts }: { initialCohorts: Cohort[] }): React.JSX.Element {
  const { visible, hasMore, showAll } = useShowMore(initialCohorts);

  if (initialCohorts.length === 0) {
    return <p className={styles.statusText}>No cohorts running right now. Check back soon.</p>;
  }

  return (
    <>
      <span className={styles.countLabel}>
        {initialCohorts.length} {initialCohorts.length === 1 ? 'cohort' : 'cohorts'} running
      </span>
      <div className={styles.grid}>
        {visible.map((cohort) => (
          <Link key={cohort.slug} href={`/cohorts/${cohort.slug}`} className={styles.card}>
            {cohort.coverImageUrl ? (
              <img src={cohort.coverImageUrl} alt={cohort.title} className={styles.cardImage} />
            ) : (
              <div className={styles.cardImagePlaceholder} style={{ background: titleColor(cohort.title) }}>
                {cohort.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{cohort.title}</h3>
              {cohort.description && <p className={styles.cardDescription}>{cohort.description}</p>}
              <div className={styles.cardMeta}>
                {cohort.startDate && <span className={styles.metaBadge}>Starts {formatDate(cohort.startDate)}</span>}
                {cohort.durationWeeks && <span className={styles.metaBadge}>{cohort.durationWeeks} weeks</span>}
                {cohort.seatsTotal && <span className={styles.metaBadge}>{cohort.seatsTotal} seats</span>}
              </div>
              {cohort.priceLabel && <span className={styles.cardPrice}>{cohort.priceLabel}</span>}
            </div>
          </Link>
        ))}
      </div>
      {hasMore && (
        <div className={styles.showMoreWrap}>
          <button type="button" className={styles.showMoreBtn} onClick={showAll}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}
