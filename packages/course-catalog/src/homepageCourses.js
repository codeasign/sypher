import courses from './courses';

export { courses };

export function withCourseAccess(hasCourseAccess, role, accessRows, companyAllowedSlugs) {
  const accessByDocsSlug = new Map((accessRows ?? []).map((r) => [r.course_slug, r.allowed_roles]));
  return courses.map((course) => {
    const allowedRoles = accessByDocsSlug.get(course.docsSlug) ?? [];
    return {
      ...course,
      isFree: hasCourseAccess(role, allowedRoles, { slug: course.docsSlug, companyAllowedSlugs }),
    };
  });
}
