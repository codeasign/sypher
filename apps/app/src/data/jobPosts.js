export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// /add-job-post writes go straight to Supabase from the browser (anon key +
// user session), which never touches Next's cache -- so without this, edits
// made here would sit stale on /careers for up to the 1h revalidate TTL.
// Best-effort: a failed revalidate shouldn't block the save.
async function revalidateCareersCache(supabase) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    await fetch('/api/careers/revalidate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to revalidate careers cache:', err.message);
  }
}

async function findAvailableSlug(supabase, baseSlug) {
  let slug = baseSlug || 'job';
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase.from('job_posts').select('id').eq('slug', slug).maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check slug availability:', error.message);
      return slug;
    }
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function listOpenJobPosts(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('job_posts')
    .select('slug, title, company_name, location, employment_type, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load open job posts:', error.message);
    return [];
  }
  return data;
}

export async function listJobPosts(supabase, companyName) {
  if (!supabase || !companyName) return [];
  const { data, error } = await supabase
    .from('job_posts')
    .select('id, slug, title, location, employment_type, status, updated_at, created_at')
    .eq('company_name', companyName)
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load job posts:', error.message);
    return [];
  }
  return data;
}

// For external_job_poster: they aren't scoped to one company_name, so their
// list is everything they personally created rather than a company match.
export async function listJobPostsByCreator(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('job_posts')
    .select('id, slug, title, company_name, location, employment_type, status, updated_at, created_at')
    .eq('created_by', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load job posts:', error.message);
    return [];
  }
  return data;
}

export async function getJobPostById(supabase, id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from('job_posts').select('*').eq('id', id).maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load job post:', error.message);
    return null;
  }
  return data;
}

export async function createJobPost(supabase, { companyName, title, description, location, employmentType, experienceLevel, salaryMin, salaryMax, applyUrl, applyEmail, createdBy }) {
  if (!supabase) return { error: 'Not authenticated', post: null };
  const slug = await findAvailableSlug(supabase, slugify(title));
  const { data, error } = await supabase
    .from('job_posts')
    .insert({
      company_name: companyName,
      slug,
      title,
      description,
      location: location ?? null,
      employment_type: employmentType ?? null,
      experience_level: experienceLevel ?? null,
      salary_min: salaryMin ?? null,
      salary_max: salaryMax ?? null,
      apply_url: applyUrl ?? null,
      apply_email: applyEmail ?? null,
      status: 'draft',
      created_by: createdBy ?? null,
    })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create job post:', error.message);
    return { error: error.message, post: null };
  }
  return { error: null, post: data };
}

export async function updateJobPost(supabase, id, fields) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('job_posts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update job post:', error.message);
    return { error: error.message };
  }
  await revalidateCareersCache(supabase);
  return { error: null };
}

export async function setJobPostStatus(supabase, id, status) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('job_posts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update job post status:', error.message);
    return { error: error.message };
  }
  await revalidateCareersCache(supabase);
  return { error: null };
}

export async function deleteJobPost(supabase, id) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase.from('job_posts').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete job post:', error.message);
    return { error: error.message };
  }
  await revalidateCareersCache(supabase);
  return { error: null };
}
