import { revalidateTag } from 'next/cache';
import { getCachedLiveCohorts } from '@/data/cohortsCached';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Public counterpart to /api/cohorts/revalidate, same shape as
// api/careers/live-refresh and api/blog/live-refresh. CohortList's Realtime
// subscription hits this on any cohorts change so anonymous /cohorts
// visitors see the update through the shared 'cohorts' cache tag instead of
// each client running its own raw Supabase query.
//
// Unauthenticated by necessity (called from anon browser JS on a public
// page) -- rate limiting per-IP is the actual control, not a secret header,
// since any header sent from browser JS is visible in devtools.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`cohorts-live-refresh:${ip}`, 5, 60_000))) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  revalidateTag('cohorts', { expire: 0 });
  const cohorts = await getCachedLiveCohorts();
  return Response.json(cohorts);
}
