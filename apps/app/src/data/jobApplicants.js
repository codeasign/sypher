export async function listJobApplicants(supabase, jobId) {
  if (!supabase || !jobId) return [];
  const { data, error } = await supabase.rpc('get_job_applicants', { p_job_id: jobId });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load job applicants:', error.message);
    return [];
  }
  return data ?? [];
}
