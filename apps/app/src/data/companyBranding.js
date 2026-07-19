export async function listCompanyBrandings(supabase, createdBy) {
  if (!supabase || !createdBy) return [];
  const { data, error } = await supabase
    .from('company_branding')
    .select('*')
    .eq('created_by', createdBy)
    .order('company_name', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to list company brandings:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getCompanyBranding(supabase, companyName) {
  if (!supabase || !companyName) return null;
  const { data, error } = await supabase
    .from('company_branding')
    .select('*')
    .eq('company_name', companyName)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load company branding:', error.message);
    return null;
  }
  return data;
}

export async function upsertCompanyBranding(supabase, companyName, fields, createdBy) {
  if (!supabase || !companyName) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('company_branding')
    .upsert({
      company_name: companyName,
      ...fields,
      ...(createdBy ? { created_by: createdBy } : {}),
      updated_at: new Date().toISOString(),
    });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save company branding:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
