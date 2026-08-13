// Reproduces the user's real workflow: copy the solutions-page code AS-IS
// (no synthetic import preamble, no leading-struct hoist) and submit it
// through the same composeSourceCode + real-Judge0 path the audit uses,
// to see whether it diverges from the audit's "PASS" verdict (which uses
// supplementSolutionPreamble/ensureLeadingDataStruct -- audit-only helpers).
import { parseExerciseFile, parseSolutionsFile } from './_audit-extract.mjs';
import { submitOne, LANGUAGE_IDS, supplementSolutionPreamble, ensureLeadingDataStruct } from './_audit-run.mjs';

const [, , category, slug, difficulty] = process.argv;
const exercisePath = `../docs/docs/coding-bootcamp/${category}/exercises/${difficulty}/${slug}.mdx`;
const solutionsPath = `../docs/docs/coding-bootcamp/${category}/solutions/${difficulty}/${slug}.mdx`;
const ex = parseExerciseFile(exercisePath);
const sol = parseSolutionsFile(solutionsPath);
const langs = Object.keys(ex.harness).filter((l) => LANGUAGE_IDS[l] && sol[l]);
const meta = { cpuTimeLimit: 2, memoryLimit: 262144 };

for (const lang of langs) {
  const raw = await submitOne({
    languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: sol[lang],
    testCases: ex.testCases, cpuTimeLimit: meta.cpuTimeLimit, memoryLimit: meta.memoryLimit, language: lang,
  });
  const rawOk = raw.httpStatus === 200 && raw.passed === raw.total && raw.total === ex.testCases.length;
  console.log(`[RAW-PASTE  ${rawOk ? 'PASS' : 'FAIL'}] ${slug}/${lang} -- ${raw.passed}/${raw.total}`);
  if (!rawOk) {
    const bad = raw.results.find((r) => r.statusId !== 3);
    console.log(`  statusId=${bad?.statusId} desc=${bad?.statusDescription}`);
    if (bad?.compileOutput) console.log(`  compileOutput: ${bad.compileOutput.slice(0, 500)}`);
    if (bad?.stderr) console.log(`  stderr: ${bad.stderr.slice(0, 300)}`);
  }

  const solWithStruct = ensureLeadingDataStruct(ex.starterCode[lang], sol[lang], lang);
  const audited = await submitOne({
    languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: supplementSolutionPreamble(lang, solWithStruct, ex.harness[lang]),
    testCases: ex.testCases, cpuTimeLimit: meta.cpuTimeLimit, memoryLimit: meta.memoryLimit, language: lang,
  });
  const auditedOk = audited.httpStatus === 200 && audited.passed === audited.total && audited.total === ex.testCases.length;
  console.log(`[AUDIT-PREAMBLE ${auditedOk ? 'PASS' : 'FAIL'}] ${slug}/${lang} -- ${audited.passed}/${audited.total}`);
  console.log('');
}
