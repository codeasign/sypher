import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseExerciseFile, parseSolutionsFile } from './_audit-extract.mjs';
import { submitOne, LANGUAGE_IDS, supplementSolutionPreamble, ensureLeadingDataStruct } from './_audit-run.mjs';

const ROOT = 'D:/jenny/sypher/apps/docs/docs/coding-bootcamp';
const CONCURRENCY = 12;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function listProblems(category) {
  const dir = `${ROOT}/${category}/exercises`;
  const files = walk(dir);
  return files.map((fullPath) => {
    const rel = fullPath.replace(/\\/g, '/').replace(`${dir}/`, '');
    const [difficulty, filename] = rel.split('/');
    return { category, difficulty, slug: filename.replace('.mdx', '') };
  });
}

async function pool(items, worker, concurrency, onResult) {
  const results = new Array(items.length);
  let idx = 0;
  let completed = 0;
  async function runNext() {
    while (idx < items.length) {
      const my = idx++;
      results[my] = await worker(items[my], my);
      completed++;
      if (onResult) onResult(results[my], completed, items.length);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runNext));
  return results;
}

function summarizeForProgress(r) {
  if (r.status === 'CLEAN') return 'CLEAN';
  if (r.status === 'PARSE-ERROR') return `PARSE-ERROR (${r.detail})`;
  if (r.status === 'MISSING-TRAILING-NEWLINE') return `MISSING-TRAILING-NEWLINE (${r.detail})`;
  if (r.status === 'NO-SOLUTIONS-AT-ALL') return `NO-SOLUTIONS-AT-ALL (${r.detail})`;
  if (r.status === 'MISSING-SOLUTION-LANGS') return `MISSING-SOLUTION-LANGS (${r.detail})`;
  const flaggedLangs = Object.entries(r.perLang ?? {})
    .filter(([, info]) => info.status !== 'CLEAN' && info.status !== 'NO-SOLUTION-SOURCE')
    .map(([lang, info]) => `${lang}:${info.status}`);
  return `FLAGGED [${flaggedLangs.join(', ')}]`;
}

async function auditOne({ category, difficulty, slug }) {
  const exercisePath = `${ROOT}/${category}/exercises/${difficulty}/${slug}.mdx`;
  const solutionsPath = `${ROOT}/${category}/solutions/${difficulty}/${slug}.mdx`;
  const label = `${category}/${slug}`;
  let ex, sol;
  try {
    ex = parseExerciseFile(exercisePath);
  } catch (e) {
    return { label, status: 'PARSE-ERROR', detail: e.message };
  }
  try {
    sol = parseSolutionsFile(solutionsPath);
  } catch (e) {
    sol = {};
  }

  // Free, static pre-check (no RapidAPI calls): grading is an exact string
  // match, and every harness's print call appends a trailing newline, so an
  // expectedOutput authored without one fails 100% of that problem's cases
  // in every language. Catch this before burning API calls per-language.
  // Exclude '' (empty string): a harness whose output is built by iterating
  // a possibly-empty result (`for x in result: print(x)`) prints *nothing*
  // when the result is empty -- no marker-adjacent newline at all -- so ''
  // is the legitimately-correct expectedOutput for that case, not a miss.
  const missingNewlineIdx = ex.testCases
    .map((tc, i) => (typeof tc.expectedOutput === 'string' && tc.expectedOutput !== '' && !tc.expectedOutput.endsWith('\n') ? i : -1))
    .filter((i) => i !== -1);
  if (missingNewlineIdx.length > 0) {
    return {
      label,
      status: 'MISSING-TRAILING-NEWLINE',
      detail: `${missingNewlineIdx.length}/${ex.testCases.length} expectedOutput values missing trailing \\n (indices: ${missingNewlineIdx.slice(0, 10).join(',')}${missingNewlineIdx.length > 10 ? ',...' : ''})`,
    };
  }

  const langs = Object.keys(ex.harness).filter((l) => LANGUAGE_IDS[l]);
  const perLang = {};
  for (const lang of langs) {
    if (!sol[lang]) {
      perLang[lang] = { status: 'NO-SOLUTION-SOURCE' };
      continue;
    }
    try {
      const solWithStruct = ensureLeadingDataStruct(ex.starterCode[lang], sol[lang], lang);
      const correct = await submitOne({
        languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: supplementSolutionPreamble(lang, solWithStruct, ex.harness[lang]),
        testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
      });
      const compileError = correct.results.some((r) => r.statusId === 6);
      const correctOk = correct.httpStatus === 200 && correct.passed === correct.total && correct.total === ex.testCases.length;

      const wrong = await submitOne({
        languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: ex.starterCode[lang],
        testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
      });
      const wrongOk = wrong.httpStatus === 200 && wrong.passed < wrong.total;

      let status;
      if (compileError) status = 'COMPILE-ERROR';
      else if (!correctOk) status = 'CONTENT-MISMATCH';
      else if (!wrongOk) status = 'SHADOW-SUSPECT'; // wrong stub passed everything -- possible shadow bug or trivial test data
      else status = 'CLEAN';

      perLang[lang] = {
        status,
        correct: `${correct.passed}/${correct.total}`,
        wrong: `${wrong.passed}/${wrong.total}`,
        compileOutput: compileError ? correct.results.find((r) => r.statusId === 6)?.compileOutput?.slice(0, 300) : undefined,
      };
    } catch (e) {
      perLang[lang] = { status: 'ERROR', detail: e.message };
    }
  }
  // A problem where every language is NO-SOLUTION-SOURCE was never actually
  // tested against anything -- that must never report as CLEAN (it did,
  // silently, for 22 problems across this course before this check existed).
  const testedCount = Object.values(perLang).filter((r) => r.status !== 'NO-SOLUTION-SOURCE').length;
  if (langs.length > 0 && testedCount === 0) {
    return { label, status: 'NO-SOLUTIONS-AT-ALL', detail: `solutions.mdx has no usable solution for any of: ${langs.join(', ')}`, perLang };
  }
  // A partial gap is just as dangerous as a total one: a harness language
  // with NO solutions-page entry is never compiled or run by anything,
  // yet the file still read as CLEAN as long as >=1 other language had a
  // solution -- found via independent-solution testing after this exact
  // gap let a broken (missing-trailing-newline) Go harness ship undetected
  // in sliding-window/maximum-average-subarray. Only the legacy variant
  // keys below are exempt (python27/kotlin/c_gcc7/c_gcc8/cpp14/cpp83 --
  // not part of this course's 9-language solutions convention); any of
  // the 9 main languages missing a solutions-page tab now flags the file.
  const LEGACY_VARIANT_LANGS = new Set(['python27', 'kotlin', 'c_gcc7', 'c_gcc8', 'cpp14', 'cpp83']);
  const missingRequiredLangs = Object.entries(perLang)
    .filter(([lang, r]) => r.status === 'NO-SOLUTION-SOURCE' && !LEGACY_VARIANT_LANGS.has(lang))
    .map(([lang]) => lang);
  if (missingRequiredLangs.length > 0) {
    return { label, status: 'MISSING-SOLUTION-LANGS', detail: `solutions.mdx has no entry for: ${missingRequiredLangs.join(', ')}`, perLang };
  }
  const allClean = Object.values(perLang).every((r) => r.status === 'CLEAN' || r.status === 'NO-SOLUTION-SOURCE');
  return { label, status: allClean ? 'CLEAN' : 'FLAGGED', perLang };
}

const EXCLUDE = new Set([]);

const category = process.argv[2];
if (!category) {
  console.error('Usage: node _audit-batch.mjs <category1,category2,...>');
  process.exit(1);
}
const categories = category.split(',');
let allProblems = [];
for (const c of categories) allProblems = allProblems.concat(listProblems(c));
allProblems = allProblems.filter((p) => !EXCLUDE.has(`${p.category}/${p.slug}`));

console.log(`Auditing ${allProblems.length} problems across categories: ${categories.join(', ')}`);
const startTime = Date.now();

const results = await pool(allProblems, auditOne, CONCURRENCY, (r, completed, total) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`[${completed}/${total}] (${elapsed}s) ${r.label}: ${summarizeForProgress(r)}`);
});

const clean = results.filter((r) => r.status === 'CLEAN');
const flagged = results.filter((r) => r.status !== 'CLEAN');

console.log(`\n=== SUMMARY ===`);
console.log(`Clean: ${clean.length}/${results.length}`);
console.log(`Flagged: ${flagged.length}/${results.length}`);
for (const r of flagged) {
  console.log(`\n--- ${r.label} [${r.status}] ---`);
  if (r.detail) console.log(`  ${r.detail}`);
  if (r.perLang) {
    for (const [lang, info] of Object.entries(r.perLang)) {
      if (info.status !== 'CLEAN' && info.status !== 'NO-SOLUTION-SOURCE') {
        console.log(`  [${lang}] ${info.status} -- correct:${info.correct} wrong:${info.wrong}`);
        if (info.compileOutput) console.log(`    ${info.compileOutput.replace(/\n/g, ' ')}`);
        if (info.detail) console.log(`    detail: ${info.detail}`);
      }
    }
  }
}
