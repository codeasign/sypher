export async function getOwnRoleAndCompany(supabase, userId) {
  if (!supabase || !userId) return { role: null, companyName: null };
  const { data, error } = await supabase
    .from('profiles')
    .select('role, company_name')
    .eq('id', userId)
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load profile role/company:', error.message);
    return { role: null, companyName: null };
  }
  return { role: data?.role ?? null, companyName: data?.company_name ?? null };
}
