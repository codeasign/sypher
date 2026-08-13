import { getAppOrigin } from '@sypher/auth-core/src/urls';

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

// Active + deactivated employees for the caller's own company. RLS-free by
// design -- hr_list_employees() is a security-definer RPC that re-checks
// can_manage_company_content itself and never exposes a raw profiles grant
// (see SupabaseSchema.md "Manage Employees" for why).
export async function hrListEmployees(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('hr_list_employees');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load employees:', error.message);
    return [];
  }
  return data ?? [];
}

// Deactivating also revokes the employee's course access server-side (see the
// RPC) -- reactivating does not restore it, so callers should not assume
// employee_course_access is unchanged after calling this with active=true.
export async function hrSetEmployeeActive(supabase, email, active) {
  if (!supabase || !email) return { error: 'Not authenticated' };
  const { error } = await supabase.rpc('hr_set_employee_active', {
    p_email: normalizeEmail(email),
    p_active: active,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update employee status:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function hrListPendingInvites(supabase, companyName) {
  if (!supabase || !companyName) return [];
  const { data, error } = await supabase
    .from('pending_invites')
    .select('email, invited_at')
    .eq('company_name', companyName)
    .eq('role', 'company_employees');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load pending invites:', error.message);
    return [];
  }
  return data ?? [];
}

// Only handles brand-new emails -- an email already registered anywhere
// (any company/role) is rejected via the email_is_invited() pre-check rather
// than silently reassigned, since HR has no profiles-update grant to do that
// safely (see SupabaseSchema.md). Plain insert (not upsert) against
// pending_invites so a duplicate raises instead of overwriting someone else's
// pending invite.
export async function hrInviteEmployee(supabase, { companyName, email, fullName, invitedBy }) {
  if (!supabase || !companyName) return { outcome: 'error', error: 'Not authenticated' };
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
    return { outcome: 'error', error: 'This email is already registered — ask an admin if it needs to move to your company.' };
  }

  const name = (fullName ?? '').trim();
  const { error: insertError } = await supabase.from('pending_invites').insert({
    email: normalized,
    role: 'company_employees',
    company_name: companyName,
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

export async function hrRevokeInvite(supabase, email) {
  if (!supabase || !email) return { error: 'Not authenticated' };
  const { error } = await supabase.from('pending_invites').delete().eq('email', normalizeEmail(email));
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to revoke invite:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function hrListEmployeeCourseAccess(supabase, companyName) {
  if (!supabase || !companyName) return [];
  const { data, error } = await supabase
    .from('employee_course_access')
    .select('employee_email, course_slug')
    .eq('company_name', companyName);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load employee course access:', error.message);
    return [];
  }
  return data ?? [];
}

// RLS bounds this to courses already in the company's pool (company_course_access)
// and to an actual active company_employees profile under this company -- a
// request outside those bounds comes back as an RLS-denied error, surfaced here
// as a normal { error } result rather than thrown.
export async function hrSetEmployeeCourseAccess(supabase, companyName, employeeEmail, courseSlug, allowed) {
  if (!supabase || !companyName || !employeeEmail || !courseSlug) return { error: 'Not authenticated' };
  const email = normalizeEmail(employeeEmail);
  const { error } = allowed
    ? await supabase
        .from('employee_course_access')
        .upsert({ company_name: companyName, employee_email: email, course_slug: courseSlug, updated_at: new Date().toISOString() })
    : await supabase
        .from('employee_course_access')
        .delete()
        .eq('company_name', companyName)
        .eq('employee_email', email)
        .eq('course_slug', courseSlug);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update employee course access:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
