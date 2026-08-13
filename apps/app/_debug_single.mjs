import { parseExerciseFile, parseSolutionsFile } from './_audit-extract.mjs';
import { submitOne, LANGUAGE_IDS, supplementSolutionPreamble, ensureLeadingDataStruct } from './_audit-run.mjs';

const [,, category, slug, difficulty, lang] = process.argv;
const ROOT = 'D:/jenny/sypher/apps/docs/docs/coding-bootcamp';
const ex = parseExerciseFile(`${ROOT}/${category}/exercises/${difficulty}/${slug}.mdx`);
const sol = parseSolutionsFile(`${ROOT}/${category}/solutions/${difficulty}/${slug}.mdx`);

const solWithStruct = ensureLeadingDataStruct(ex.starterCode[lang], sol[lang], lang);
const correct = await submitOne({
  languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: supplementSolutionPreamble(lang, solWithStruct, ex.harness[lang]),
  testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
});
console.log('CORRECT passed:', correct.passed, '/', correct.total);
for (const r of correct.results) {
  if (r.statusId !== 3) {
    console.log('---');
    console.log('idx', r.index, 'statusId', r.statusId);
    console.log('stdin:', JSON.stringify(ex.testCases[r.index]?.stdin));
    console.log('expected:', JSON.stringify(ex.testCases[r.index]?.expectedOutput));
    console.log('stdout:', JSON.stringify(r.stdout));
    console.log('stderr:', JSON.stringify(r.stderr));
    console.log('compileOutput:', JSON.stringify(r.compileOutput));
  }
}

const wrong = await submitOne({
  languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: ex.starterCode[lang],
  testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
});
console.log('WRONG passed:', wrong.passed, '/', wrong.total, '(should be less than total)');
