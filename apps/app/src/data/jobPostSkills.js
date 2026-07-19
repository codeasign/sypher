export async function getJobPostSkills(supabase, jobId) {
  if (!supabase || !jobId) return [];
  const { data, error } = await supabase
    .from('job_post_skills')
    .select('skill_id')
    .eq('job_id', jobId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load job post skills:', error.message);
    return [];
  }
  return data;
}

// skillIds: string[] — full replace of the job post's skill rows
// (delete-then-insert; both steps authorized via job_post_skills RLS,
// which re-derives ownership through a join back to job_posts).
export async function setJobPostSkills(supabase, jobId, skillIds) {
  if (!supabase || !jobId) return { error: 'Not authenticated' };
  const { error: deleteError } = await supabase.from('job_post_skills').delete().eq('job_id', jobId);
  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear existing job post skills:', deleteError.message);
    return { error: deleteError.message };
  }
  if (!skillIds.length) return { error: null };
  const rows = skillIds.map((skillId) => ({ job_id: jobId, skill_id: skillId }));
  const { error: insertError } = await supabase.from('job_post_skills').insert(rows);
  if (insertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to save job post skills:', insertError.message);
    return { error: insertError.message };
  }
  return { error: null };
}
