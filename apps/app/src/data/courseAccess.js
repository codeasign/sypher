export {
  listCourseAccess,
  hasCourseAccess,
  buildCourseAccessMap,
  fetchCourseAccessRows,
  invalidateCourseAccessCache,
} from '@sypher/course-catalog/src/courseAccess';
import { invalidateCourseAccessCache } from '@sypher/course-catalog/src/courseAccess';

export async function setCourseRoles(supabase, slug, roles) {
  if (!supabase || !slug) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('course_access')
    .upsert({ course_slug: slug, allowed_roles: roles, updated_at: new Date().toISOString() });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update course access:', error.message);
    return { error: error.message };
  }
  invalidateCourseAccessCache();
  return { error: null };
}
