import { unstable_cache } from 'next/cache';
import { getSupabaseAnon } from '@/lib/supabaseAdmin';
import { listPublishedBlogPosts, getBlogPostBySlug } from '@/data/blogPosts';

// Public blog reads only -- getSupabaseAnon() has no cookies dependency,
// which unstable_cache requires (cookies()/headers() can't be called
// inside its cached function scope). RLS already restricts these queries
// to published rows, so an anon client is the correct client here anyway.
// revalidate is a safety-net TTL; POST /api/revalidate (Supabase DB
// webhook) calls revalidateTag('blog') for near-immediate freshness.

export const getCachedPublishedBlogPosts = unstable_cache(
  async () => listPublishedBlogPosts(getSupabaseAnon()),
  ['blog-posts-published'],
  { tags: ['blog'], revalidate: 3600 }
);

export const getCachedBlogPostBySlug = unstable_cache(
  async (slug: string) => getBlogPostBySlug(getSupabaseAnon(), slug),
  ['blog-post-by-slug'],
  { tags: ['blog'], revalidate: 3600 }
);
