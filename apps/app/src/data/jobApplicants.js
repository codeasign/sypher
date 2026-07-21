/**
 * @param {*} supabase
 * @param {string | null} status
 * @param {{ jobId?: string | null, page?: number, pageSize?: number }} [options]
 */
export async function listMyJobApplicants(supabase, status, { jobId = null, page = null, pageSize = null } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_my_job_applicants', {
    p_status: status ?? null,
    p_job_id: jobId ?? null,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load applicants:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * @param {*} supabase
 * @param {string | null} status
 * @param {string | null} [jobId]
 */
export async function countMyJobApplicants(supabase, status, jobId = null) {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('count_my_job_applicants', {
    p_status: status ?? null,
    p_job_id: jobId ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to count applicants:', error.message);
    return 0;
  }
  return data ?? 0;
}

export async function setApplicantStatus(supabase, jobId, applicantId, status) {
  const { error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('job_id', jobId)
    .eq('applicant_id', applicantId);
  return { error: error?.message ?? null };
}

export async function setApplicantNextAction(supabase, jobId, applicantId, nextAction) {
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.rpc('update_applicant_next_action', {
    p_job_id: jobId,
    p_applicant_id: applicantId,
    p_next_action: nextAction,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update next action:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
