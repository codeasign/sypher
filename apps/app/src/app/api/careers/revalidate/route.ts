import { revalidateTag } from 'next/cache';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Authenticated counterpart to the blog's /api/blog/revalidate -- HR's own
// job-post mutations call this directly via the user's Supabase session, so
// an edit doesn't have to wait on a webhook.
export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  revalidateTag('careers', { expire: 0 });

  return Response.json({ revalidated: true });
}
