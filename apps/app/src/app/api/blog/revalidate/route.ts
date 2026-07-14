import { revalidateTag } from 'next/cache';
import { getUserFromAuthHeader } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Authenticated counterpart to /api/revalidate (which is Bearer-secret-gated
// for the Supabase Database Webhook). manage-blog's own mutations call this
// one directly -- via the user's Supabase session, same as
// api/razorpay/verify-payment -- so an admin's own edit doesn't have to wait
// on the webhook (which also can't reach localhost in dev at all).
export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  revalidateTag('blog', { expire: 0 });

  return Response.json({ revalidated: true });
}
