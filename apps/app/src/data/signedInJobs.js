const JOB_SELECT_COLUMNS =
  'id, slug, title, description, company_name, location, employment_type, work_mode, experience_level, salary_min, salary_max, apply_url, apply_email, include_branding, created_at, category_domain_id, category_role_id, required_experience_years, required_experience_months';

/**
 * @param {*} supabase
 * @param {{
 *   domainId?: string | null,
 *   roleId?: string | null,
 *   skillId?: string | null,
 *   employmentType?: string | null,
 *   search?: string,
 *   restrictToJobIds?: string[] | null,
 *   excludeJobIds?: string[],
 *   preferredDomainId?: string | null,
 *   page?: number,
 *   pageSize?: number,
 * }} [options]
 */
export async function listSignedInJobs(supabase, {
  domainId = null,
  roleId = null,
  skillId = null,
  employmentType = null,
  search = '',
  restrictToJobIds = null,
  excludeJobIds = [],
  preferredDomainId = null,
  page = 1,
  pageSize = 10,
} = {}) {
  if (!supabase) return { jobs: [], totalCount: 0 };
  if (restrictToJobIds && restrictToJobIds.length === 0) return { jobs: [], totalCount: 0 };

  let jobIdsForSkill = null;
  if (skillId) {
    const { data: skillRows } = await supabase.from('job_post_skills').select('job_id').eq('skill_id', skillId);
    jobIdsForSkill = (skillRows ?? []).map((r) => r.job_id);
    if (jobIdsForSkill.length === 0) return { jobs: [], totalCount: 0 };
  }

  function baseQuery({ head = false } = {}) {
    let query = supabase
      .from('job_posts')
      .select(JOB_SELECT_COLUMNS, { count: 'exact', head })
      .eq('status', 'open');

    if (domainId) query = query.eq('category_domain_id', domainId);
    if (roleId) query = query.eq('category_role_id', roleId);
    if (employmentType) query = query.eq('employment_type', employmentType);
    if (jobIdsForSkill) query = query.in('id', jobIdsForSkill);
    if (restrictToJobIds) query = query.in('id', restrictToJobIds);
    if (excludeJobIds.length > 0) query = query.not('id', 'in', `(${excludeJobIds.join(',')})`);
    const q = search.trim();
    if (q) query = query.or(`title.ilike.%${q}%,company_name.ilike.%${q}%,location.ilike.%${q}%`);
    return query;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let posts = [];
  let count = 0;

  if (preferredDomainId && !domainId) {
    // Preferred-domain jobs sort first (most recent within that group),
    // followed by everything else (most recent within that group) --
    // computed as two ordered buckets rather than a single ORDER BY,
    // since PostgREST can't express "match this id first" as a column sort.
    const { count: totalCount, error: totalError } = await baseQuery({ head: true });
    if (totalError) {
      // eslint-disable-next-line no-console
      console.error('Failed to load jobs:', totalError.message);
      return { jobs: [], totalCount: 0 };
    }
    const { count: preferredTotal, error: preferredCountError } = await baseQuery({ head: true }).eq(
      'category_domain_id',
      preferredDomainId
    );
    if (preferredCountError) {
      // eslint-disable-next-line no-console
      console.error('Failed to load jobs:', preferredCountError.message);
      return { jobs: [], totalCount: 0 };
    }

    count = totalCount ?? 0;
    const preferredCount = preferredTotal ?? 0;

    if (from < preferredCount) {
      const { data: preferredData, error: preferredError } = await baseQuery()
        .eq('category_domain_id', preferredDomainId)
        .order('created_at', { ascending: false })
        .range(from, Math.min(to, preferredCount - 1));
      if (preferredError) {
        // eslint-disable-next-line no-console
        console.error('Failed to load jobs:', preferredError.message);
        return { jobs: [], totalCount: 0 };
      }
      posts.push(...(preferredData ?? []));
    }
    if (to >= preferredCount) {
      const otherFrom = Math.max(0, from - preferredCount);
      const otherTo = to - preferredCount;
      const { data: otherData, error: otherError } = await baseQuery()
        .or(`category_domain_id.is.null,category_domain_id.neq.${preferredDomainId}`)
        .order('created_at', { ascending: false })
        .range(otherFrom, otherTo);
      if (otherError) {
        // eslint-disable-next-line no-console
        console.error('Failed to load jobs:', otherError.message);
        return { jobs: [], totalCount: 0 };
      }
      posts.push(...(otherData ?? []));
    }
  } else {
    const { data, error, count: totalCount } = await baseQuery()
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load jobs:', error.message);
      return { jobs: [], totalCount: 0 };
    }
    posts = data ?? [];
    count = totalCount ?? 0;
  }

  const brandedCompanyNames = Array.from(
    new Set(posts.filter((p) => p.include_branding && p.company_name).map((p) => p.company_name))
  );
  let brandingByCompany = {};
  if (brandedCompanyNames.length > 0) {
    const { data: brandings, error: brandingError } = await supabase
      .from('company_branding')
      .select('company_name, display_name, logo_url, tagline, about, employee_range, linkedin_url')
      .in('company_name', brandedCompanyNames);
    if (brandingError) {
      // eslint-disable-next-line no-console
      console.error('Failed to load company brandings:', brandingError.message);
    } else {
      brandingByCompany = Object.fromEntries((brandings ?? []).map((b) => [b.company_name, b]));
    }
  }

  let skillsByJobId = {};
  if (posts.length > 0) {
    const { data: skillRows, error: skillsError } = await supabase
      .from('job_post_skills')
      .select('job_id, skills(id, name)')
      .in('job_id', posts.map((p) => p.id));
    if (skillsError) {
      // eslint-disable-next-line no-console
      console.error('Failed to load job skills:', skillsError.message);
    } else {
      skillsByJobId = (skillRows ?? []).reduce((acc, row) => {
        if (!row.skills) return acc;
        (acc[row.job_id] ??= []).push(row.skills);
        return acc;
      }, {});
    }
  }

  return {
    jobs: posts.map((post) => ({
      ...post,
      branding: post.include_branding ? brandingByCompany[post.company_name] ?? null : null,
      skills: skillsByJobId[post.id] ?? [],
    })),
    totalCount: count ?? 0,
  };
}

export async function countAvailableJobs(supabase, excludeJobIds = []) {
  if (!supabase) return 0;
  let query = supabase.from('job_posts').select('id', { count: 'exact', head: true }).eq('status', 'open');
  if (excludeJobIds.length > 0) query = query.not('id', 'in', `(${excludeJobIds.join(',')})`);
  const { count, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to count available jobs:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function listAppliedJobIds(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.from('job_applications').select('job_id').eq('applicant_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load applied jobs:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.job_id);
}

export async function applyToJob(supabase, jobId) {
  if (!supabase || !jobId) return { error: 'Not authenticated' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase.from('job_applications').insert({ job_id: jobId, applicant_id: user.id });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to apply to job:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function listSavedJobIds(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.from('saved_jobs').select('job_id').eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load saved jobs:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.job_id);
}

export async function saveJob(supabase, jobId) {
  if (!supabase || !jobId) return { error: 'Not authenticated' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase.from('saved_jobs').insert({ job_id: jobId, user_id: user.id });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save job:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function unsaveJob(supabase, jobId) {
  if (!supabase || !jobId) return { error: 'Not authenticated' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('user_id', user.id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to unsave job:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
