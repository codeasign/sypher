const INVITABLE_ROLES = ['company_hr', 'company_employees'];

export async function distinctCompanyNames(supabase) {
  if (!supabase) return [];
  const [profilesRes, invitesRes] = await Promise.all([
    supabase.from('profiles').select('company_name').not('company_name', 'is', null),
    supabase.from('pending_invites').select('company_name'),
  ]);
  const names = new Set();
  for (const row of profilesRes.data ?? []) {
    if (row.company_name) names.add(row.company_name);
  }
  for (const row of invitesRes.data ?? []) {
    if (row.company_name) names.add(row.company_name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

export async function bulkInviteFromCsv(supabase, { rows, companyName, adminUserId }) {
  if (!supabase) return [];

  const seen = new Set();
  const parsedRows = [];
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const role = (row.role ?? '').trim().toLowerCase();
    const name = (row.name ?? '').trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (!INVITABLE_ROLES.includes(role)) {
      parsedRows.push({ email, outcome: 'error', error: `Invalid role "${row.role}"` });
      continue;
    }
    parsedRows.push({ email, role, name, outcome: null, error: null });
  }

  const validRows = parsedRows.filter((r) => r.outcome === null);
  const emails = validRows.map((r) => r.email);

  const { data: existingProfiles, error: lookupError } = emails.length
    ? await supabase
        .from('profiles')
        .select('id, email, role')
        .in('email', emails)
        .is('deleted_at', null)
    : { data: [], error: null };

  if (lookupError) {
    // eslint-disable-next-line no-console
    console.error('Failed to look up existing profiles:', lookupError.message);
  }

  const existingByEmail = new Map(
    (existingProfiles ?? []).map((p) => [normalizeEmail(p.email), p])
  );

  const results = [...parsedRows.filter((r) => r.outcome === 'error')];

  for (const row of validRows) {
    try {
      const existing = existingByEmail.get(row.email);
      if (existing) {
        const update = { role: row.role, company_name: companyName };
        if (row.name) update.full_name = row.name;
        const { error } = await supabase.from('profiles').update(update).eq('id', existing.id);
        if (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to update existing profile for ${row.email}:`, error.message);
        }
        results.push({
          email: row.email,
          outcome: error ? 'error' : 'updated_existing',
          error: error?.message ?? null,
        });
        continue;
      }

      const { error: upsertError } = await supabase.from('pending_invites').upsert(
        {
          email: row.email,
          role: row.role,
          company_name: companyName,
          invited_by: adminUserId ?? null,
          invited_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

      if (upsertError) {
        // eslint-disable-next-line no-console
        console.error(`Failed to upsert pending invite for ${row.email}:`, upsertError.message);
        results.push({ email: row.email, outcome: 'error', error: upsertError.message });
        continue;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: row.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: row.name ? { full_name: row.name } : undefined,
        },
      });

      if (otpError) {
        // eslint-disable-next-line no-console
        console.error(`Failed to send magic link to ${row.email}:`, otpError.message);
      }

      results.push({
        email: row.email,
        outcome: otpError ? 'error' : 'invited',
        error: otpError?.message ?? null,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Unexpected error inviting ${row.email}:`, err);
      results.push({
        email: row.email,
        outcome: 'error',
        error: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }

  return results;
}
