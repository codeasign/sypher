export async function fetchFeatureStatus(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.rpc('get_feature_status', { p_user_id: userId });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load feature status:', error.message);
    return null;
  }
  return data;
}

export async function consumeFeature(supabase, userId, feature) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase.rpc('consume_feature', { p_user_id: userId, p_feature: feature });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to consume feature:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
