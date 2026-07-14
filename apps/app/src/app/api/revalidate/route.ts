import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

// No CORS guard: the Supabase Database Webhook on blog_posts calls this
// directly (server-to-server), not the browser. Supabase webhooks don't
// HMAC-sign payloads like Razorpay's do, so a Bearer-secret header
// (configured as a custom header on the webhook) is the verification
// mechanism here, mirroring cron/expire-paid-users's CRON_SECRET check.
export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.BLOG_REVALIDATE_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // { expire: 0 } for immediate expiration -- this is a webhook-triggered
  // revalidation, and the doc recommends immediate expiry over profile:
  // 'max' stale-while-revalidate for exactly this external-system case.
  revalidateTag('blog', { expire: 0 });

  return Response.json({ revalidated: true });
}
