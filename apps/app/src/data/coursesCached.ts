import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  listPublishedCourseSlugs,
  getCourseBySlug,
  listCourseModules,
  getCourseModuleBySlug,
} from '@/data/courses';

// Unlike blog_posts, courses/course_modules are gated -- RLS alone can't
// back these reads, so this cache goes through the service-role client
// (bypasses RLS) and every page that consumes it must still run its own
// per-request can_access_authored_course check before rendering gated
// content (see SupabaseSchema.md "Course authoring" + the plan's Design
// note 1). This cache only saves the DB round-trip; it is never the
// security boundary. revalidate is a safety-net TTL; courses.js's mutators
// call POST /api/courses/revalidate for near-immediate freshness.

export const getCachedPublishedCourseSlugs = unstable_cache(
  async () => listPublishedCourseSlugs(getSupabaseAdmin()),
  ['courses-published-slugs'],
  { tags: ['courses'], revalidate: 3600 }
);

export const getCachedCourseBySlug = unstable_cache(
  async (slug: string) => getCourseBySlug(getSupabaseAdmin(), slug),
  ['course-by-slug'],
  { tags: ['courses'], revalidate: 3600 }
);

export const getCachedCourseModules = unstable_cache(
  async (courseId: string) => listCourseModules(getSupabaseAdmin(), courseId),
  ['course-modules-by-course'],
  { tags: ['courses'], revalidate: 3600 }
);

export const getCachedCourseModuleBySlug = unstable_cache(
  async (courseId: string, moduleSlug: string) => getCourseModuleBySlug(getSupabaseAdmin(), courseId, moduleSlug),
  ['course-module-by-slug'],
  { tags: ['courses'], revalidate: 3600 }
);

// Getting-Started-flagged modules require a session but no course access
// (Phase 9 revision -- originally fully public/anon-readable, changed
// after explicit confirmation that signed-out visitors should be
// redirected to /login). RLS's OR-branches now require
// `auth.uid() is not null`, so an anon-key client would always get zero
// rows -- this reads through the service role instead, same as every
// other cached read in this file, relying on isSignedIn() in
// src/lib/courseAccess.ts (called from getting-started/page.tsx and the
// [moduleSlug] route) as the actual per-request gate.
export const getCachedGettingStartedModules = unstable_cache(
  async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('course_modules')
      .select('id, slug, title, getting_started_order, course:courses!inner(slug, status)')
      .eq('show_in_getting_started', true)
      .eq('module_type', 'content')
      .eq('courses.status', 'published')
      .order('getting_started_order', { ascending: true });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load getting-started modules:', error.message);
      return [];
    }
    return data;
  },
  ['getting-started-modules'],
  { tags: ['courses'], revalidate: 3600 }
);
