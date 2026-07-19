export async function listProfiles(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, signup_source, company_name, confirmed_at, created_at, paid_until')
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
    .select('role, deleted_at, company_name, paid_until, full_name, bio, current_status, notice_period, looking_for, education_status, experience_years, passing_year, resume_url, social_links, designation_id, designation_seniority, category_domain_id, category_role_id, current_location_id')
    .eq('id', userId)
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load own profile:', error.message);
    return null;
  }
  return data;
}

export async function updateOwnBio(
  supabase,
  bio,
  lookingFor,
  resumeUrl,
  educationStatus,
  experienceYears,
  currentStatus,
  noticePeriod,
  passingYear,
  socialLinks
) {
  if (!supabase) return { error: 'Not authenticated' };
  const cleanedSocialLinks = socialLinks
    ? Object.fromEntries(Object.entries(socialLinks).filter(([, url]) => url && url.trim()))
    : null;
  const { error } = await supabase.rpc('update_own_profile', {
    p_full_name: null,
    p_bio: bio,
    p_looking_for: lookingFor && lookingFor.length ? lookingFor : null,
    p_resume_url: resumeUrl ?? null,
    p_education_status: educationStatus ?? null,
    p_experience_years: educationStatus === 'experienced' ? (experienceYears ?? null) : null,
    p_current_status: currentStatus ?? null,
    p_notice_period: noticePeriod ?? null,
    p_passing_year: educationStatus === 'passed_out' ? (passingYear ?? null) : null,
    p_social_links: cleanedSocialLinks && Object.keys(cleanedSocialLinks).length ? cleanedSocialLinks : null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update profile:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
