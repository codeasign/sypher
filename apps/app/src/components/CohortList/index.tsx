'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useShowMore } from '@/hooks/useShowMore';
import styles from './styles.module.css';

interface CohortSummary {
  slug: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  start_date: string | null;
  duration_weeks: number | null;
  seats_total: number | null;
  price_label: string | null;
}

// Explicit locale -- see BlogList/index.tsx for why `undefined` would cause
// a server/client hydration mismatch in this Client Component.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Deterministic per-cohort accent color so the same cohort always gets the
// same tint across renders/tabs, without needing a stored color field --
// same approach as BlogList/JobList's avatar color.
function titleColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 58%, 42%)`;
}

// Seeds from the server-rendered `initialCohorts` (real SEO/link-preview
// HTML). On any cohorts change, hits /api/cohorts/live-refresh -- which
// revalidates the shared 'cohorts' cache tag and returns the fresh list --
// instead of running its own raw Supabase query, so N open tabs share one
// cache repopulation rather than issuing N parallel queries. Mirrors
// JobList/BlogList's Realtime-subscribe pattern exactly; only the markup
// below differs (a card grid instead of link rows).
export default function CohortList({ initialCohorts }: { initialCohorts: CohortSummary[] }) {
  const { supabase } = useAuth();
  const [cohorts, setCohorts] = useState<CohortSummary[]>(initialCohorts);

  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase
      .channel('cohorts_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cohorts' }, () => {
        fetch('/api/cohorts/live-refresh', { method: 'POST' })
          .then((res) => res.json())
          .then((data) => setCohorts(data));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const { visible, hasMore, showAll } = useShowMore(cohorts);

  if (cohorts.length === 0) {
    return <p className={styles.statusText}>No cohorts running right now. Check back soon.</p>;
  }

  return (
    <>
      <span className={styles.countLabel}>
        {cohorts.length} {cohorts.length === 1 ? 'cohort' : 'cohorts'} running
      </span>
      <div className={styles.grid}>
        {visible.map((cohort) => (
          <Link key={cohort.slug} href={`/cohorts/${cohort.slug}`} className={styles.card}>
            {cohort.cover_image_url ? (
              <img src={cohort.cover_image_url} alt={cohort.title} className={styles.cardImage} />
            ) : (
              <div className={styles.cardImagePlaceholder} style={{ background: titleColor(cohort.title) }}>
                {cohort.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{cohort.title}</h3>
              {cohort.description && <p className={styles.cardDescription}>{cohort.description}</p>}
              <div className={styles.cardMeta}>
                {cohort.start_date && <span className={styles.metaBadge}>Starts {formatDate(cohort.start_date)}</span>}
                {cohort.duration_weeks && <span className={styles.metaBadge}>{cohort.duration_weeks} weeks</span>}
                {cohort.seats_total && <span className={styles.metaBadge}>{cohort.seats_total} seats</span>}
              </div>
              {cohort.price_label && <span className={styles.cardPrice}>{cohort.price_label}</span>}
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
