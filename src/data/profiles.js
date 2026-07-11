export async function listProfiles(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, signup_source, company_name, confirmed_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load profiles:', error.message);
    return [];
  }
  return data;
}

export async function updateProfileRole(supabase, userId, role) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update role:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function updateProfileRoleAndCompany(supabase, userId, role, companyName, fullName) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const update = { role, company_name: companyName };
  if (fullName) update.full_name = fullName;
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update role/company:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function softDeleteProfile(supabase, userId) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete user:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function getOwnProfile(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role, deleted_at, company_name')
    .eq('id', userId)
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load own profile:', error.message);
    return null;
  }
  return data;
}
