import { createClient } from '@/lib/supabase/server';

export type CourseAccessStatus = 'granted' | 'unauthenticated' | 'forbidden';

// Getting-Started-flagged content now requires only a session, not a course
// grant (Phase 9 revision -- originally fully public, changed after
// explicit confirmation that a signed-out visitor should be redirected to
// /login rather than seeing gated-adjacent content with no session at
// all). Kept separate from getCourseAccessStatus so callers that only care
// about "signed in or not" skip the can_access_authored_course RPC
// entirely.
export async function isSignedIn(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

// Per-request server-side gate backing the public course routes (course
// home unconditionally, module pages when not show_in_getting_started).
// RLS's can_access_authored_course check is the real security boundary --
// this only decides redirect('/login') vs notFound() vs render, and is run
// identically from both generateMetadata and the page body so an
// unauthorized visitor never sees gated title/description either.
export async function getCourseAccessStatus(courseId: string): Promise<CourseAccessStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'unauthenticated';

  const { data, error } = await supabase.rpc('can_access_authored_course', { p_course_id: courseId });
  if (error) {
    console.error('can_access_authored_course RPC failed:', error.message);
    return 'forbidden';
  }
  return data ? 'granted' : 'forbidden';
}
