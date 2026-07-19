export async function getOwnOpenToLocations(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('user_open_to_locations')
    .select('location_id')
    .eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load open-to locations:', error.message);
    return [];
  }
  return data;
}

// locationIds: string[] — full replace of the caller's own rows
// (delete-then-insert; both steps scoped to auth.uid() under RLS, so this
// can never touch another user's rows).
export async function setOwnOpenToLocations(supabase, userId, locationIds) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error: deleteError } = await supabase.from('user_open_to_locations').delete().eq('user_id', userId);
  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear existing open-to locations:', deleteError.message);
    return { error: deleteError.message };
  }
  if (!locationIds.length) return { error: null };
  const rows = locationIds.map((locationId) => ({ user_id: userId, location_id: locationId }));
  const { error: insertError } = await supabase.from('user_open_to_locations').insert(rows);
  if (insertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to save open-to locations:', insertError.message);
    return { error: insertError.message };
  }
  return { error: null };
}

export async function setOwnLocationAndCategory(supabase, categoryDomainId, categoryRoleId, currentLocationId) {
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.rpc('update_own_location_and_category', {
    p_category_domain_id: categoryDomainId,
    p_category_role_id: categoryRoleId,
    p_current_location_id: currentLocationId,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update location/category:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
