import { revalidateTag } from 'next/cache';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Authenticated counterpart, same shape as api/careers/revalidate and
// api/blog/revalidate -- launch-cohort's own mutations call this directly
// via the admin's Supabase session, so a publish/edit doesn't have to wait
// on any TTL.
export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  revalidateTag('cohorts', { expire: 0 });

  return Response.json({ revalidated: true });
}
