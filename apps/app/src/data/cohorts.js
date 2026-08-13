export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// launch-cohort writes go straight to Supabase from the browser (anon key +
// user session), which never touches Next's cache -- mirrors
// revalidateBlogCache in blogPosts.js. Best-effort: a failed revalidate
// shouldn't block the save, since the 1h TTL in cohortsCached.ts is still a
// backstop.
async function revalidateCohortsCache(supabase) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    await fetch('/api/cohorts/revalidate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to revalidate cohorts cache:', err.message);
  }
}

async function findAvailableSlug(supabase, baseSlug) {
  let slug = baseSlug || 'cohort';
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase.from('cohorts').select('id').eq('slug', slug).maybeSingle();
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

export async function listCohorts(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('cohorts')
    .select('id, slug, title, description, cover_image_url, start_date, duration_weeks, seats_total, price_label, status, updated_at, created_at')
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohorts:', error.message);
    return [];
  }
  return data;
}

export async function listLiveCohorts(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('cohorts')
    .select('slug, title, description, cover_image_url, start_date, duration_weeks, seats_total, price_label')
    .eq('status', 'live')
    .order('start_date', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load live cohorts:', error.message);
    return [];
  }
  return data;
}

export async function getCohortBySlug(supabase, slug) {
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from('cohorts')
    .select('id, slug, title, description, content, cover_image_url, start_date, duration_weeks, seats_total, price_label')
    .eq('slug', slug)
    .eq('status', 'live')
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohort:', error.message);
    return null;
  }
  return data;
}

export async function getCohortById(supabase, id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from('cohorts').select('*').eq('id', id).maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohort:', error.message);
    return null;
  }
  return data;
}

export async function createCohort(supabase, { title, description, content, coverImageUrl, startDate, durationWeeks, seatsTotal, priceLabel, createdBy }) {
  if (!supabase) return { error: 'Not authenticated', cohort: null };
  const slug = await findAvailableSlug(supabase, slugify(title));
  const { data, error } = await supabase
    .from('cohorts')
    .insert({
      slug,
      title,
      description,
      content: content ?? '',
      cover_image_url: coverImageUrl ?? null,
      start_date: startDate ?? null,
      duration_weeks: durationWeeks ?? null,
      seats_total: seatsTotal ?? null,
      price_label: priceLabel ?? null,
      status: 'draft',
      created_by: createdBy ?? null,
    })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create cohort:', error.message);
    return { error: error.message, cohort: null };
  }
  return { error: null, cohort: data };
}

export async function updateCohort(supabase, id, fields) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('cohorts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update cohort:', error.message);
    return { error: error.message };
  }
  await revalidateCohortsCache(supabase);
  return { error: null };
}

export async function setCohortStatus(supabase, id, status) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('cohorts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update cohort status:', error.message);
    return { error: error.message };
  }
  await revalidateCohortsCache(supabase);
  return { error: null };
}

export async function deleteCohort(supabase, id) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase.from('cohorts').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete cohort:', error.message);
    return { error: error.message };
  }
  await revalidateCohortsCache(supabase);
  return { error: null };
}
