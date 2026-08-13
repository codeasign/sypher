// Reproduces the user's exact browser action -- paste solutions-page code,
// click "Run (samples)" -- through the REAL /api/judge0/batch proxy
// (auth, rate limit, cache, server-side grading), not the direct-RapidAPI
// bypass _audit-run.mjs uses. Mirrors CoreEditor/Index.tsx's runTests('run')
// exactly: only isSample-tagged testCases, same composeSourceCode.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseExerciseFile, parseSolutionsFile } from './_audit-extract.mjs';
import { composeSourceCode, LANGUAGE_IDS, ensureLeadingDataStruct } from './_audit-run.mjs';

const envSrc = readFileSync('D:/jenny/sypher/apps/app/.env.local', 'utf8');
const env = (key) => envSrc.match(new RegExp(`^${key}=(.+)$`, 'm'))[1].trim();
const admin = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const anon = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
const PROXY_BASE = 'http://localhost:3001';

async function withTestUser(fn) {
  const email = `judge0-repro-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const password = `Test-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) throw createErr;
  try {
    const { data: signedIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    return await fn(signedIn.session.access_token);
  } finally {
    await admin.auth.admin.deleteUser(created.user.id);
  }
}

const [, , category, slug, difficulty, onlyLang] = process.argv;
const exercisePath = `../docs/docs/coding-bootcamp/${category}/exercises/${difficulty}/${slug}.mdx`;
const solutionsPath = `../docs/docs/coding-bootcamp/${category}/solutions/${difficulty}/${slug}.mdx`;
const ex = parseExerciseFile(exercisePath);
const sol = parseSolutionsFile(solutionsPath);
const langs = onlyLang ? [onlyLang] : Object.keys(ex.harness).filter((l) => LANGUAGE_IDS[l] && sol[l]);
const sampleCases = ex.testCases.filter((tc) => tc.isSample);
console.log(`${slug}: ${sampleCases.length} sample case(s) of ${ex.testCases.length} total`);

for (const lang of langs) {
  await withTestUser(async (token) => {
    // Exactly what a user pastes: raw solutions-page code, no audit-only
    // supplementSolutionPreamble/ensureLeadingDataStruct massaging.
    const sourceCode = composeSourceCode(ex.harness[lang], sol[lang], lang);
    const res = await fetch(`${PROXY_BASE}/api/judge0/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: 'run', languageId: LANGUAGE_IDS[lang], sourceCode,
        testCases: sampleCases.map((tc) => ({ stdin: tc.stdin, expectedOutput: tc.expectedOutput })),
        cpuTimeLimit: 2, memoryLimit: 262144,
      }),
    });
    const body = await res.json().catch(() => ({}));
    const results = body.results ?? [];
    const passed = results.filter((r) => r.statusId === 3).length;
    const ok = res.status === 200 && passed === results.length && results.length === sampleCases.length;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${slug}/${lang} -- HTTP ${res.status}, ${passed}/${results.length}, cached=${body.cached}`);
    if (!ok) {
      console.log('  error field:', body.error);
      console.log('  composed sourceCode:\n' + sourceCode.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('  results:', JSON.stringify(results, null, 2));
    }
  });
}
