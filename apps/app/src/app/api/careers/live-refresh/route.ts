import { revalidateTag } from 'next/cache';
import { getCachedOpenJobPosts } from '@/data/jobPostsCached';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Public counterpart to /api/careers/revalidate (auth-gated for HR's own
// mutation flow). JobList's Realtime subscription hits this on any
// job_posts change so anonymous /careers visitors see the update through
// the same 'careers' cache tag instead of each client running its own raw
// Supabase query.
//
// Unauthenticated by necessity (called from anon browser JS on a public
// page) -- rate limiting per-IP is the actual control, not a secret header,
// since any header sent from browser JS is visible in devtools.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`careers-live-refresh:${ip}`, 5, 60_000))) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  revalidateTag('careers', { expire: 0 });
  const posts = await getCachedOpenJobPosts();
  return Response.json(posts);
}
