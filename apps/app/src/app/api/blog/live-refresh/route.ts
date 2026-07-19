import { revalidateTag } from 'next/cache';
import { getCachedPublishedBlogPosts } from '@/data/blogPostsCached';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Public counterpart to /api/blog/revalidate (which is auth-gated for the
// manage-blog mutation flow). BlogList's Realtime subscription hits this on
// any blog_posts change so anonymous /blog visitors see the update without
// each client running its own raw Supabase query -- this revalidates the
// same 'blog' tag and returns the freshly-repopulated cached result in one
// round trip, so any client racing this call reads the same cache entry
// instead of re-querying Supabase itself.
//
// Unauthenticated by necessity (called from anon browser JS on a public
// page), so a secret header would be visible in devtools and wouldn't gate
// anything -- rate limiting per-IP is the actual control here, capping how
// often a single caller can force revalidation + a fresh Supabase query.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`blog-live-refresh:${ip}`, 5, 60_000))) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  revalidateTag('blog', { expire: 0 });
  const posts = await getCachedPublishedBlogPosts();
  return Response.json(posts);
}
