async function listCourseAccess(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('course_access').select('course_slug, allowed_roles');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load course access:', error.message);
    return [];
  }
  return data;
}

export function hasCourseAccess(role, allowedRoles, ctx) {
  if (role === 'admin') return true;
  if (role === null) return (allowedRoles ?? []).includes('free_users');
  if ((allowedRoles ?? []).includes(role)) return true;
  if (role === 'company_employees' && ctx?.companyAllowedSlugs && ctx.slug) {
    return ctx.companyAllowedSlugs.has(ctx.slug);
  }
  return false;
}

let cachedRows = null;
let rowsPromise = null;

export function fetchCourseAccessRows(supabase) {
  if (cachedRows) return Promise.resolve(cachedRows);
  if (rowsPromise) return rowsPromise;
  rowsPromise = listCourseAccess(supabase).then((rows) => {
    cachedRows = rows;
    rowsPromise = null;
    return rows;
  });
  return rowsPromise;
}
