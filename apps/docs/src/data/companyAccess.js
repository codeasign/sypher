async function listCompanyCourseAccess(supabase, companyName) {
  if (!supabase || !companyName) return [];
  const { data, error } = await supabase
    .from('company_course_access')
    .select('course_slug')
    .eq('company_name', companyName);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load company course access:', error.message);
    return [];
  }
  return data;
}

const courseCache = new Map();
const coursePromises = new Map();

export function fetchCompanyCourseAccessRows(supabase, companyName) {
  if (!companyName) return Promise.resolve(new Set());
  if (courseCache.has(companyName)) return Promise.resolve(courseCache.get(companyName));
  if (coursePromises.has(companyName)) return coursePromises.get(companyName);
  const promise = listCompanyCourseAccess(supabase, companyName).then((rows) => {
    const set = new Set(rows.map((r) => r.course_slug));
    courseCache.set(companyName, set);
    coursePromises.delete(companyName);
    return set;
  });
  coursePromises.set(companyName, promise);
  return promise;
}
