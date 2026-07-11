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
