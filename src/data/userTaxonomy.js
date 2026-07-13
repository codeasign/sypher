export async function getOwnSkills(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('user_skills')
    .select('skill_id, proficiency, years_experience')
    .eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load own skills:', error.message);
    return [];
  }
  return data;
}

export async function getOwnTechnologies(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('user_technologies')
    .select('technology_id, proficiency, years_experience')
    .eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load own technologies:', error.message);
    return [];
  }
  return data;
}

// skills: [{ skillId, proficiency, yearsExperience }] — full replace of the
// caller's own rows (delete-then-insert; both steps scoped to auth.uid()
// under RLS, so this can never touch another user's rows).
export async function setOwnSkills(supabase, userId, skills) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error: deleteError } = await supabase.from('user_skills').delete().eq('user_id', userId);
  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear existing skills:', deleteError.message);
    return { error: deleteError.message };
  }
  if (!skills.length) return { error: null };
  const rows = skills.map((s) => ({
    user_id: userId,
    skill_id: s.skillId,
    proficiency: s.proficiency ?? null,
    years_experience: s.yearsExperience ?? null,
  }));
  const { error: insertError } = await supabase.from('user_skills').insert(rows);
  if (insertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to save skills:', insertError.message);
    return { error: insertError.message };
  }
  return { error: null };
}

// technologies: [{ technologyId, proficiency, yearsExperience }]
export async function setOwnTechnologies(supabase, userId, technologies) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error: deleteError } = await supabase.from('user_technologies').delete().eq('user_id', userId);
  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear existing technologies:', deleteError.message);
    return { error: deleteError.message };
  }
  if (!technologies.length) return { error: null };
  const rows = technologies.map((t) => ({
    user_id: userId,
    technology_id: t.technologyId,
    proficiency: t.proficiency ?? null,
    years_experience: t.yearsExperience ?? null,
  }));
  const { error: insertError } = await supabase.from('user_technologies').insert(rows);
  if (insertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to save technologies:', insertError.message);
    return { error: insertError.message };
  }
  return { error: null };
}

export async function setOwnDesignation(supabase, designationId, seniority) {
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.rpc('update_own_designation', {
    p_designation_id: designationId,
    p_seniority: seniority,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update designation:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
