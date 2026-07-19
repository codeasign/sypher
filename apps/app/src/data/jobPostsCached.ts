import { unstable_cache } from 'next/cache';
import { getSupabaseAnon } from '@/lib/supabaseAdmin';

// Public careers reads only -- getSupabaseAnon() has no cookies dependency,
// which unstable_cache requires. RLS already restricts these queries to
// open rows, so an anon client is the correct client here anyway.
// revalidate is a safety-net TTL; POST /api/careers/revalidate (called from
// jobPosts.js after any HR mutation) calls revalidateTag('careers') for
// near-immediate freshness.

async function listOpenJobPosts(supabase: ReturnType<typeof getSupabaseAnon>) {
  const { data, error } = await supabase
    .from('job_posts')
    .select('id, slug, title, company_name, location, employment_type, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load open job posts:', error.message);
    return [];
  }
  return data;
}

async function getOpenJobPostBySlug(supabase: ReturnType<typeof getSupabaseAnon>, slug: string) {
  const { data, error } = await supabase
    .from('job_posts')
    .select('id, slug, title, company_name, description, location, employment_type, experience_level, salary_min, salary_max, apply_url, apply_email, created_at')
    .eq('slug', slug)
    .eq('status', 'open')
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load job post:', error.message);
    return null;
  }
  return data;
}

export const getCachedOpenJobPosts = unstable_cache(
  async () => listOpenJobPosts(getSupabaseAnon()),
  ['job-posts-open'],
  { tags: ['careers'], revalidate: 3600 }
);

export const getCachedJobPostBySlug = unstable_cache(
  async (slug: string) => getOpenJobPostBySlug(getSupabaseAnon(), slug),
  ['job-post-by-slug'],
  { tags: ['careers'], revalidate: 3600 }
);
