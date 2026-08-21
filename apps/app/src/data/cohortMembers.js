import { getAppOrigin } from '@sypher/auth-core/src/urls';

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

// Cohorts the caller can manage a roster for. No explicit filter needed --
// RLS on `cohorts` already scopes the result set: admin / anyone holding
// 'launch-cohort' nav access sees every cohort (existing "authorized roles
// manage cohorts" policy), a delegated non-admin manager sees only cohorts
// she's listed in cohort_managers for (see SupabaseSchema.md "Cohort Users"
// section 9's "cohort managers can read their assigned cohorts" policy).
export async function listManageableCohorts(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('cohorts')
    .select('id, slug, title, status, updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohorts:', error.message);
    return [];
  }
  return data ?? [];
}

// Active + removed members for a cohort. RLS-free by design --
// list_cohort_roster() is a security-definer RPC that re-checks
// can_manage_cohort_roster itself and never exposes a raw profiles grant
// (see SupabaseSchema.md "Cohort Users" for why -- same reasoning as
// hr_list_employees()).
export async function listCohortRoster(supabase, cohortId) {
  if (!supabase || !cohortId) return [];
  const { data, error } = await supabase.rpc('list_cohort_roster', { p_cohort_id: cohortId });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohort roster:', error.message);
    return [];
  }
  return data ?? [];
}

// Removing also revokes the member's course access for this cohort
// server-side (see the RPC) -- re-adding does not restore it, so callers
// should not assume cohort_member_course_access is unchanged after calling
// this with active=true.
export async function setCohortMemberStatus(supabase, cohortId, userId, active) {
  if (!supabase || !cohortId || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase.rpc('set_cohort_member_status', {
    p_cohort_id: cohortId,
    p_user_id: userId,
    p_active: active,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update member status:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function listCohortPendingInvites(supabase, cohortId) {
  if (!supabase || !cohortId) return [];
  const { data, error } = await supabase
    .from('pending_invites')
    .select('email, invited_at')
    .eq('cohort_id', cohortId)
    .eq('role', 'cohort_users');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load pending invites:', error.message);
    return [];
  }
  return data ?? [];
}

// Only handles brand-new emails -- an email already registered anywhere
// (any cohort/company/role) is rejected via the email_is_invited() pre-check
// rather than silently reassigned, mirrors hrInviteEmployee.
export async function inviteCohortMember(supabase, { cohortId, email, fullName, invitedBy }) {
  if (!supabase || !cohortId) return { outcome: 'error', error: 'Not authenticated' };
  const normalized = normalizeEmail(email);
  if (!normalized) return { outcome: 'error', error: 'Email is required' };

  const { data: alreadyKnown, error: checkError } = await supabase.rpc('email_is_invited', {
    check_email: normalized,
  });
  if (checkError) {
    // eslint-disable-next-line no-console
    console.error('Failed to check email:', checkError.message);
    return { outcome: 'error', error: checkError.message };
  }
  if (alreadyKnown) {
    return { outcome: 'error', error: 'This email is already registered — ask an admin if it needs to move to this cohort.' };
  }

  const name = (fullName ?? '').trim();
  const { error: insertError } = await supabase.from('pending_invites').insert({
    email: normalized,
    role: 'cohort_users',
    cohort_id: cohortId,
    invited_by: invitedBy ?? null,
    invited_at: new Date().toISOString(),
  });
  if (insertError) {
    const alreadyInvited = insertError.code === '23505';
    // eslint-disable-next-line no-console
    console.error(`Failed to invite ${normalized}:`, insertError.message);
    return { outcome: 'error', error: alreadyInvited ? 'An invite for this email is already pending.' : insertError.message };
  }

  const callbackUrl = new URL('/auth/callback', getAppOrigin());
  callbackUrl.searchParams.set('next', '/dashboard');

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl.toString(),
      data: name ? { full_name: name } : undefined,
    },
  });
  if (otpError) {
    // eslint-disable-next-line no-console
    console.error(`Failed to send magic link to ${normalized}:`, otpError.message);
    return { outcome: 'error', error: otpError.message };
  }

  return { outcome: 'invited', error: null };
}

export async function revokeCohortInvite(supabase, email) {
  if (!supabase || !email) return { error: 'Not authenticated' };
  const { error } = await supabase.from('pending_invites').delete().eq('email', normalizeEmail(email));
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to revoke invite:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function listCohortCoursePool(supabase, cohortId) {
  if (!supabase || !cohortId) return [];
  const { data, error } = await supabase
    .from('cohort_course_access')
    .select('course_slug')
    .eq('cohort_id', cohortId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohort course pool:', error.message);
    return [];
  }
  return data ?? [];
}

// Admin-only write -- RLS on cohort_course_access rejects anyone else (see
// SupabaseSchema.md). Called from the Launch Cohort "Course Pool & Managers"
// modal, not from /manage-cohort-users.
export async function setCohortCourseAccess(supabase, cohortId, slug, allowed) {
  if (!supabase || !cohortId || !slug) return { error: 'Not authenticated' };
  const { error } = allowed
    ? await supabase
        .from('cohort_course_access')
        .upsert({ cohort_id: cohortId, course_slug: slug, updated_at: new Date().toISOString() })
    : await supabase
        .from('cohort_course_access')
        .delete()
        .eq('cohort_id', cohortId)
        .eq('course_slug', slug);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update cohort course pool:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function listCohortMemberCourseAccess(supabase, cohortId) {
  if (!supabase || !cohortId) return [];
  const { data, error } = await supabase
    .from('cohort_member_course_access')
    .select('user_id, course_slug')
    .eq('cohort_id', cohortId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load member course access:', error.message);
    return [];
  }
  return data ?? [];
}

// RLS bounds this to courses already in the cohort's pool
// (cohort_course_access) and to an actual active cohort_users member of this
// cohort -- a request outside those bounds comes back as an RLS-denied
// error, surfaced here as a normal { error } result rather than thrown.
export async function setCohortMemberCourseAccess(supabase, cohortId, userId, courseSlug, allowed) {
  if (!supabase || !cohortId || !userId || !courseSlug) return { error: 'Not authenticated' };
  const { error } = allowed
    ? await supabase
        .from('cohort_member_course_access')
        .upsert({ cohort_id: cohortId, user_id: userId, course_slug: courseSlug, updated_at: new Date().toISOString() })
    : await supabase
        .from('cohort_member_course_access')
        .delete()
        .eq('cohort_id', cohortId)
        .eq('user_id', userId)
        .eq('course_slug', courseSlug);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update member course access:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

// Admin-only (RLS on cohort_managers rejects any other write, see
// SupabaseSchema.md's "cohort managers can't grant themselves/others manager
// status" reasoning). Joins profiles in a second query rather than a
// PostgREST embed -- admin already has full profiles read access via the
// "admins read all" policy, so this needs no new RPC.
export async function listCohortManagers(supabase, cohortId) {
  if (!supabase || !cohortId) return [];
  const { data: managerRows, error } = await supabase
    .from('cohort_managers')
    .select('user_id, assigned_at')
    .eq('cohort_id', cohortId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cohort managers:', error.message);
    return [];
  }
  const userIds = (managerRows ?? []).map((r) => r.user_id);
  if (userIds.length === 0) return [];

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);
  if (profileError) {
    // eslint-disable-next-line no-console
    console.error('Failed to load manager profiles:', profileError.message);
    return [];
  }
  const profileById = new Map((profileRows ?? []).map((p) => [p.id, p]));
  return (managerRows ?? []).map((row) => ({
    ...row,
    email: profileById.get(row.user_id)?.email ?? null,
    full_name: profileById.get(row.user_id)?.full_name ?? null,
  }));
}

// Looks up a profile by email (admin-only caller, same "admins read all"
// access as listCohortManagers) so the admin can add a manager by typing an
// email rather than a raw user id.
export async function findProfileByEmail(supabase, email) {
  if (!supabase || !email) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', normalizeEmail(email))
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to look up profile:', error.message);
    return null;
  }
  return data;
}

export async function addCohortManager(supabase, cohortId, userId) {
  if (!supabase || !cohortId || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase.from('cohort_managers').insert({ cohort_id: cohortId, user_id: userId });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to add cohort manager:', error.message);
    return { error: error.code === '23505' ? 'Already a manager of this cohort.' : error.message };
  }
  return { error: null };
}

export async function removeCohortManager(supabase, cohortId, userId) {
  if (!supabase || !cohortId || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase.from('cohort_managers').delete().eq('cohort_id', cohortId).eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove cohort manager:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
