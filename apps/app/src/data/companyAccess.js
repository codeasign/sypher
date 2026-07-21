export { distinctCompanyNames, fetchDistinctCompanyNames } from './pendingInvites';

export async function listCompanyCourseAccess(supabase, companyName) {
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

export async function listCompanyNavAccess(supabase, companyName) {
  if (!supabase || !companyName) return [];
  const { data, error } = await supabase
    .from('company_nav_access')
    .select('item_key')
    .eq('company_name', companyName);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load company nav access:', error.message);
    return [];
  }
  return data;
}

export async function setCompanyCourseAccess(supabase, companyName, slug, allowed) {
  if (!supabase || !companyName || !slug) return { error: 'Not authenticated' };
  const { error } = allowed
    ? await supabase
        .from('company_course_access')
        .upsert({ company_name: companyName, course_slug: slug, updated_at: new Date().toISOString() })
    : await supabase
        .from('company_course_access')
        .delete()
        .eq('company_name', companyName)
        .eq('course_slug', slug);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update company course access:', error.message);
    return { error: error.message };
  }
  invalidateCompanyCourseAccessCache(companyName);
  return { error: null };
}

export async function setCompanyNavAccess(supabase, companyName, itemKey, allowed) {
  if (!supabase || !companyName || !itemKey) return { error: 'Not authenticated' };
  const { error } = allowed
    ? await supabase
        .from('company_nav_access')
        .upsert({ company_name: companyName, item_key: itemKey, updated_at: new Date().toISOString() })
    : await supabase
        .from('company_nav_access')
        .delete()
        .eq('company_name', companyName)
        .eq('item_key', itemKey);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update company nav access:', error.message);
    return { error: error.message };
  }
  invalidateCompanyNavAccessCache(companyName);
  return { error: null };
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

export function invalidateCompanyCourseAccessCache(companyName) {
  if (companyName) {
    courseCache.delete(companyName);
    coursePromises.delete(companyName);
  } else {
    courseCache.clear();
    coursePromises.clear();
  }
}

const navCache = new Map();
const navPromises = new Map();

export function fetchCompanyNavAccessRows(supabase, companyName) {
  if (!companyName) return Promise.resolve(new Set());
  if (navCache.has(companyName)) return Promise.resolve(navCache.get(companyName));
  if (navPromises.has(companyName)) return navPromises.get(companyName);
  const promise = listCompanyNavAccess(supabase, companyName).then((rows) => {
    const set = new Set(rows.map((r) => r.item_key));
    navCache.set(companyName, set);
    navPromises.delete(companyName);
    return set;
  });
  navPromises.set(companyName, promise);
  return promise;
}

export function invalidateCompanyNavAccessCache(companyName) {
  if (companyName) {
    navCache.delete(companyName);
    navPromises.delete(companyName);
  } else {
    navCache.clear();
    navPromises.clear();
  }
}
