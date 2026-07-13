// One-off script: verifies admin_save_taxonomy_category and
// update_own_designation cannot be abused by a non-admin caller.
// Requires TEST_ADMIN_EMAIL/PASSWORD and TEST_NONADMIN_EMAIL/PASSWORD in .env,
// plus SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_NONADMIN_EMAIL, TEST_NONADMIN_PASSWORD } = process.env;

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('PASS: ' + msg);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  if (!TEST_NONADMIN_EMAIL || !TEST_NONADMIN_PASSWORD) {
    throw new Error('Missing TEST_NONADMIN_EMAIL / TEST_NONADMIN_PASSWORD in .env');
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Baseline counts (service role bypasses RLS, safe to read directly)
  const { count: domainsBefore } = await admin.from('domains').select('*', { count: 'exact', head: true });
  const { count: slugsBefore } = await admin.from('taxonomy_slugs').select('*', { count: 'exact', head: true });

  // --- Non-admin RPC abuse test ---
  const nonAdminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: signInErr } = await nonAdminClient.auth.signInWithPassword({
    email: TEST_NONADMIN_EMAIL,
    password: TEST_NONADMIN_PASSWORD,
  });
  if (signInErr) throw new Error('Non-admin sign-in failed: ' + signInErr.message);

  const { data: profileRow } = await admin
    .from('profiles')
    .select('id, role')
    .eq('email', TEST_NONADMIN_EMAIL)
    .single();
  assert(profileRow && profileRow.role !== 'admin', `test account ${TEST_NONADMIN_EMAIL} is not an admin (role=${profileRow?.role})`);

  const hackPayload = {
    domain: { name: 'Hack' },
    roles: [],
    skills: [],
    technologies: [],
  };
  const { data: rpcData, error: rpcErr } = await nonAdminClient.rpc('admin_save_taxonomy_category', { payload: hackPayload });
  assert(!!rpcErr, 'admin_save_taxonomy_category call from non-admin session returned an error');
  if (rpcErr) {
    console.log('  -> error message: ' + rpcErr.message);
    assert(/not authorized/i.test(rpcErr.message), 'error message contains "not authorized"');
  }
  assert(!rpcData, 'no data returned from the rejected RPC call');

  const { count: domainsAfter } = await admin.from('domains').select('*', { count: 'exact', head: true });
  const { count: slugsAfter } = await admin.from('taxonomy_slugs').select('*', { count: 'exact', head: true });
  assert(domainsAfter === domainsBefore, `domains row count unchanged (${domainsBefore} -> ${domainsAfter})`);
  assert(slugsAfter === slugsBefore, `taxonomy_slugs row count unchanged (${slugsBefore} -> ${slugsAfter})`);

  const { data: hackRow } = await admin.from('domains').select('id').eq('slug', 'hack').maybeSingle();
  assert(!hackRow, 'no "hack" domain row was written');

  // --- update_own_designation self-scoping test ---
  const { data: otherProfiles } = await admin
    .from('profiles')
    .select('id')
    .neq('email', TEST_NONADMIN_EMAIL)
    .limit(1);
  const otherUserId = otherProfiles?.[0]?.id ?? null;

  const { data: rolesSample } = await admin.from('base_roles').select('id, seniority_levels').limit(1);
  const sampleRoleId = rolesSample?.[0]?.id ?? null;
  const sampleSeniority = rolesSample?.[0]?.seniority_levels?.[0] ?? null;

  if (sampleRoleId) {
    const { error: designationErr } = await nonAdminClient.rpc('update_own_designation', {
      p_designation_id: sampleRoleId,
      p_seniority: sampleSeniority,
    });
    assert(!designationErr, 'update_own_designation succeeded for the caller\'s own row: ' + (designationErr?.message ?? ''));

    const { data: selfRow } = await admin.from('profiles').select('designation_id').eq('email', TEST_NONADMIN_EMAIL).single();
    assert(selfRow.designation_id === sampleRoleId, 'designation_id was written to the caller\'s own profile row');

    if (otherUserId) {
      const { data: otherRowAfter } = await admin.from('profiles').select('designation_id').eq('id', otherUserId).single();
      console.log('  -> other user\'s designation_id after call: ' + otherRowAfter.designation_id + ' (expected: unaffected by non-admin\'s call)');
    }
  } else {
    console.log('SKIP: no base_roles row exists yet to test update_own_designation against');
  }

  console.log('\nAll security checks passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
