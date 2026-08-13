// One-shot verification of the manage-employees migration against the real
// Supabase project -- disposable test users/companies, cleaned up in finally.
// Hits Supabase directly (not through apps/app's own proxy), same rationale
// as _audit-run.mjs: this is testing RLS/RPC behavior itself, not the proxy.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envSrc = readFileSync('D:/jenny/sypher/apps/app/.env.local', 'utf8');
const env = (key) => envSrc.match(new RegExp(`^${key}=(.+)$`, 'm'))[1].trim();
const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL');
const ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const admin = createClient(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const ts = Date.now();
const COMPANY = `verify-manage-employees-${ts}`;
const COMPANY_OTHER = `${COMPANY}-other`;
const COURSE_IN_POOL = 'python-for-ai-engineers';
const COURSE_NOT_IN_POOL = 'agentic-ai-fundamentals';

const results = [];
function report(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' -- ' + detail : ''}`);
}

async function createTestUser(label, { role, companyName }) {
  const email = `verify-${label}-${ts}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const password = `Test-${Math.random().toString(36).slice(2)}-${ts}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) throw new Error(`createUser(${label}) failed: ${createErr.message}`);
  const { error: profileErr } = await admin.from('profiles').update({ role, company_name: companyName }).eq('id', created.user.id);
  if (profileErr) throw new Error(`profile update(${label}) failed: ${profileErr.message}`);
  const { data: signedIn, error: signInErr } = await createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    .auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`signIn(${label}) failed: ${signInErr.message}`);
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  });
  return { id: created.user.id, email, client };
}

async function ensureNavAccessGranted() {
  const { data: row, error } = await admin.from('nav_access').select('allowed_roles').eq('item_key', 'manage-employees').maybeSingle();
  if (error) throw new Error(`nav_access read failed: ${error.message}`);
  const already = (row?.allowed_roles ?? []).includes('company_hr');
  if (already) {
    console.log('[SETUP] nav_access already grants company_hr on manage-employees (the manual /manage-access step is already done).');
    return;
  }
  const nextRoles = [...(row?.allowed_roles ?? []), 'company_hr'];
  const { error: upsertErr } = await admin.from('nav_access').upsert({ item_key: 'manage-employees', allowed_roles: nextRoles, updated_at: new Date().toISOString() });
  if (upsertErr) throw new Error(`nav_access grant failed: ${upsertErr.message}`);
  console.log('[SETUP] Granted company_hr on manage-employees via nav_access (same effect as the manual /manage-access step -- now done for you).');
}

async function main() {
  await ensureNavAccessGranted();

  const [hr, employee, otherCompanyEmployee, randomUser, adminUser] = await Promise.all([
    createTestUser('hr', { role: 'company_hr', companyName: COMPANY }),
    createTestUser('employee', { role: 'company_employees', companyName: COMPANY }),
    createTestUser('other-employee', { role: 'company_employees', companyName: COMPANY_OTHER }),
    createTestUser('random', { role: 'free_users', companyName: null }),
    createTestUser('admin', { role: 'admin', companyName: null }),
  ]);

  try {
    // Course pool: grant COURSE_IN_POOL to COMPANY, deliberately withhold COURSE_NOT_IN_POOL.
    const { error: poolErr } = await admin.from('company_course_access').insert({ company_name: COMPANY, course_slug: COURSE_IN_POOL });
    if (poolErr) throw new Error(`pool setup failed: ${poolErr.message}`);

    // --- T1: hr_list_employees() as HR -- should succeed and list the test employee ---
    {
      const { data, error } = await hr.client.rpc('hr_list_employees');
      const found = (data ?? []).some((r) => r.email === employee.email);
      report('T1 hr_list_employees() as HR sees her employee', !error && found, error?.message ?? `rows=${data?.length}`);
    }

    // --- T2: hr_list_employees() as an unrelated free_users caller -- should be rejected ---
    {
      const { data, error } = await randomUser.client.rpc('hr_list_employees');
      report('T2 hr_list_employees() as unauthorized caller rejected', !!error && /not authorized/i.test(error.message ?? ''), error?.message ?? `unexpectedly returned ${data?.length} rows`);
    }

    // --- T3: hr_list_employees() as admin with company_name = null -- must NOT be rejected (the bug we fixed) ---
    {
      const { data, error } = await adminUser.client.rpc('hr_list_employees');
      report('T3 hr_list_employees() as admin (null company_name) not rejected', !error, error?.message);
    }

    // --- T4: positive bounding -- course in pool, real active employee -- should succeed ---
    {
      const { error } = await hr.client.from('employee_course_access').insert({ company_name: COMPANY, employee_email: employee.email, course_slug: COURSE_IN_POOL });
      report('T4 grant course-in-pool to real employee succeeds', !error, error?.message);
    }

    // --- T5: negative -- course NOT in company's pool -- must be rejected by RLS ---
    {
      const { error } = await hr.client.from('employee_course_access').insert({ company_name: COMPANY, employee_email: employee.email, course_slug: COURSE_NOT_IN_POOL });
      report('T5 grant course-outside-pool rejected', !!error, error ? error.message : 'insert unexpectedly succeeded');
    }

    // --- T6: negative -- employee_email belongs to a different company -- must be rejected ---
    {
      const { error } = await hr.client.from('employee_course_access').insert({ company_name: COMPANY, employee_email: otherCompanyEmployee.email, course_slug: COURSE_IN_POOL });
      report('T6 grant to non-member employee rejected', !!error, error ? error.message : 'insert unexpectedly succeeded');
    }

    // --- T7: negative -- HR tries to write under a company that isn't her own -- must be rejected ---
    {
      const { error } = await hr.client.from('employee_course_access').insert({ company_name: COMPANY_OTHER, employee_email: otherCompanyEmployee.email, course_slug: COURSE_IN_POOL });
      report('T7 grant under a different company rejected', !!error, error ? error.message : 'insert unexpectedly succeeded');
    }

    // --- T8: deactivate revokes course access ---
    {
      const { error: deactivateErr } = await hr.client.rpc('hr_set_employee_active', { p_email: employee.email, p_active: false });
      const { data: profileRow } = await admin.from('profiles').select('deleted_at').eq('id', employee.id).single();
      const { data: remainingGrants } = await admin.from('employee_course_access').select('course_slug').eq('company_name', COMPANY).eq('employee_email', employee.email);
      const pass = !deactivateErr && profileRow?.deleted_at != null && (remainingGrants ?? []).length === 0;
      report('T8 deactivate sets deleted_at AND revokes course access', pass, deactivateErr?.message ?? `deleted_at=${profileRow?.deleted_at}, remaining_grants=${remainingGrants?.length}`);
    }

    // --- T9: reactivate does NOT restore course access ---
    {
      const { error: reactivateErr } = await hr.client.rpc('hr_set_employee_active', { p_email: employee.email, p_active: true });
      const { data: profileRow } = await admin.from('profiles').select('deleted_at').eq('id', employee.id).single();
      const { data: grants } = await admin.from('employee_course_access').select('course_slug').eq('company_name', COMPANY).eq('employee_email', employee.email);
      const pass = !reactivateErr && profileRow?.deleted_at === null && (grants ?? []).length === 0;
      report('T9 reactivate clears deleted_at but does NOT restore course access', pass, reactivateErr?.message ?? `deleted_at=${profileRow?.deleted_at}, grants=${grants?.length}`);
    }

    // --- T10: backfill correctness against real, already-applied data --
    // every company_course_access row must have a matching employee_course_access
    // row for every currently-active company_employees profile in that company.
    // Excludes THIS script's own disposable test companies -- T8/T9 deliberately
    // deactivate-then-reactivate the test employee without restoring her grant
    // (that's the correct, asserted T9 behavior), which would otherwise show up
    // here as a false-positive "backfill gap" that has nothing to do with the
    // one-time migration backfill this check actually cares about.
    {
      const [{ data: pool, error: poolReadErr }, { data: activeEmployees, error: empErr }, { data: grants, error: grantErr }] = await Promise.all([
        admin.from('company_course_access').select('company_name, course_slug').not('company_name', 'in', `(${COMPANY},${COMPANY_OTHER})`),
        admin.from('profiles').select('email, company_name').eq('role', 'company_employees').is('deleted_at', null).not('company_name', 'in', `(${COMPANY},${COMPANY_OTHER})`),
        admin.from('employee_course_access').select('company_name, employee_email, course_slug').not('company_name', 'in', `(${COMPANY},${COMPANY_OTHER})`),
      ]);
      if (poolReadErr || empErr || grantErr) {
        report('T10 backfill correctness', false, (poolReadErr ?? empErr ?? grantErr).message);
      } else {
        const grantSet = new Set(grants.map((g) => `${g.company_name}::${g.employee_email.toLowerCase()}::${g.course_slug}`));
        const missing = [];
        for (const row of pool) {
          for (const emp of activeEmployees.filter((e) => e.company_name === row.company_name)) {
            const key = `${row.company_name}::${emp.email.toLowerCase()}::${row.course_slug}`;
            if (!grantSet.has(key)) missing.push(key);
          }
        }
        report('T10 backfill: every pre-existing company_course_access row has a matching employee_course_access row', missing.length === 0, missing.length ? `${missing.length} missing, e.g. ${missing[0]}` : `checked ${pool.length} pool rows x active employees`);
      }
    }
  } finally {
    await admin.from('employee_course_access').delete().in('company_name', [COMPANY, COMPANY_OTHER]);
    await admin.from('company_course_access').delete().eq('company_name', COMPANY);
    await admin.from('pending_invites').delete().in('company_name', [COMPANY, COMPANY_OTHER]);
    for (const u of [hr, employee, otherCompanyEmployee, randomUser, adminUser]) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }

  console.log('\n=== SUMMARY ===');
  const passed = results.filter((r) => r.pass).length;
  console.log(`${passed}/${results.length} checks passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
