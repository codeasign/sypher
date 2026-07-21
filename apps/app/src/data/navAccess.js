export async function listNavAccess(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('nav_access').select('item_key, allowed_roles');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load nav access:', error.message);
    return [];
  }
  return data;
}

// Same in-memory-cache-per-session pattern as fetchCourseAccessRows in
// @sypher/course-catalog/src/courseAccess -- nav_access is read on every
// dashboard navigation (DashboardSidebar's permission gate) and every visit
// to the Manage Access "Sidebar Navigation" tab, so caching it avoids
// re-querying Supabase for data that only changes via setNavItemRoles.
let cachedRows = null;
let rowsPromise = null;

/** @returns {Promise<{ item_key: string, allowed_roles: string[] }[]>} */
export function fetchNavAccessRows(supabase) {
  if (cachedRows) return Promise.resolve(cachedRows);
  if (rowsPromise) return rowsPromise;
  rowsPromise = listNavAccess(supabase).then((rows) => {
    cachedRows = rows;
    rowsPromise = null;
    return rows;
  });
  return rowsPromise;
}

export function invalidateNavAccessCache() {
  cachedRows = null;
  rowsPromise = null;
}

export async function getNavItemAllowedRoles(supabase, itemKey) {
  if (!supabase || !itemKey) return [];
  const { data, error } = await supabase
    .from('nav_access')
    .select('allowed_roles')
    .eq('item_key', itemKey)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load nav access for item:', error.message);
    return [];
  }
  return data?.allowed_roles ?? [];
}

export async function setNavItemRoles(supabase, itemKey, roles) {
  if (!supabase || !itemKey) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('nav_access')
    .upsert({ item_key: itemKey, allowed_roles: roles, updated_at: new Date().toISOString() });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update nav access:', error.message);
    return { error: error.message };
  }
  invalidateNavAccessCache();
  return { error: null };
}

export function canSeeNavItem(role, allowedRoles, ctx) {
  if (role === 'admin') return true;
  if (allowedRoles && allowedRoles.includes(role)) return true;
  if (role === 'company_employees' && ctx?.companyAllowedItemKeys && ctx.itemKey) {
    return ctx.companyAllowedItemKeys.has(ctx.itemKey);
  }
  return false;
}
