import { revalidateTag } from 'next/cache';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Authenticated counterpart to /api/courses/revalidate-external (which is
// Bearer-secret-gated for compose-authored-course.js). manage-courses' own
// mutations call this one directly -- via the user's Supabase session, same
// as api/blog/revalidate -- so an author's own edit doesn't have to wait on
// the 3600s coursesCached.ts TTL.
export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  revalidateTag('courses', { expire: 0 });

  return Response.json({ revalidated: true });
}
