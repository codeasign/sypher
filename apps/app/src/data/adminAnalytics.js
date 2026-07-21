export async function fetchUserCountsByRole(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_user_counts_by_role');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load user counts by role:', error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchRecentActiveUsers(supabase, limit = 10) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_recent_active_users', { p_limit: limit });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load recently active users:', error.message);
    return [];
  }
  return data ?? [];
}
