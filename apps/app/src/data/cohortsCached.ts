import { unstable_cache } from 'next/cache';
import { getSupabaseAnon } from '@/lib/supabaseAdmin';
import { listLiveCohorts, getCohortBySlug } from '@/data/cohorts';

// Public cohorts reads only -- getSupabaseAnon() has no cookies dependency,
// which unstable_cache requires. RLS already restricts these queries to
// live rows, so an anon client is the correct client here anyway.
// revalidate is a safety-net TTL; POST /api/cohorts/revalidate (called from
// cohorts.js after any admin mutation) calls revalidateTag('cohorts') for
// near-immediate freshness.

export const getCachedLiveCohorts = unstable_cache(
  async () => listLiveCohorts(getSupabaseAnon()),
  ['cohorts-live'],
  { tags: ['cohorts'], revalidate: 3600 }
);

export const getCachedCohortBySlug = unstable_cache(
  async (slug: string) => getCohortBySlug(getSupabaseAnon(), slug),
  ['cohort-by-slug'],
  { tags: ['cohorts'], revalidate: 3600 }
);
