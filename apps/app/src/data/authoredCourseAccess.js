// Role/company grant CRUD for the new DB-backed course system's own access
// tables (authored_course_access / authored_company_course_access) -- kept
// separate from courseAccess.js/companyAccess.js's course_access /
// company_course_access, which gate the older Docusaurus-based courses and
// are keyed by slug instead of course_id (see SupabaseSchema.md "Course
// authoring" section). No client-side caching layer here: the real
// enforcement is the can_access_authored_course RPC (checked per-request by
// the public course pages), this file only backs the admin Access tab,
// scoped to a single course at a time.
export { distinctCompanyNames, fetchDistinctCompanyNames } from './pendingInvites';

export async function getAuthoredCourseAccess(supabase, courseId) {
  if (!supabase || !courseId) return null;
  const { data, error } = await supabase
    .from('authored_course_access')
    .select('course_id, allowed_roles, updated_at')
    .eq('course_id', courseId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load authored course access:', error.message);
    return null;
  }
  return data;
}

export async function setAuthoredCourseRoles(supabase, courseId, roles) {
  if (!supabase || !courseId) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('authored_course_access')
    .upsert({ course_id: courseId, allowed_roles: roles, updated_at: new Date().toISOString() });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update authored course access:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function listAuthoredCourseCompanyGrants(supabase, courseId) {
  if (!supabase || !courseId) return [];
  const { data, error } = await supabase
    .from('authored_company_course_access')
    .select('company_name')
    .eq('course_id', courseId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load authored company course access:', error.message);
    return [];
  }
  return data;
}

export async function setAuthoredCourseCompanyAccess(supabase, courseId, companyName, allowed) {
  if (!supabase || !courseId || !companyName) return { error: 'Not authenticated' };
  const { error } = allowed
    ? await supabase
        .from('authored_company_course_access')
        .upsert({ course_id: courseId, company_name: companyName, updated_at: new Date().toISOString() })
    : await supabase
        .from('authored_company_course_access')
        .delete()
        .eq('course_id', courseId)
        .eq('company_name', companyName);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update authored company course access:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
