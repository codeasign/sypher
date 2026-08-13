import { readFileSync } from 'node:fs';
import { parseExerciseFile } from './_audit-extract.mjs';
import { submitOne, LANGUAGE_IDS, supplementSolutionPreamble, ensureLeadingDataStruct } from './_audit-run.mjs';

const [,, category, slug, difficulty, lang, solutionFilePath] = process.argv;
const ROOT = 'D:/jenny/sypher/apps/docs/docs/coding-bootcamp';
const ex = parseExerciseFile(`${ROOT}/${category}/exercises/${difficulty}/${slug}.mdx`);
const customSolution = readFileSync(solutionFilePath, 'utf8');

const solWithStruct = ensureLeadingDataStruct(ex.starterCode[lang], customSolution, lang);
const result = await submitOne({
  languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: supplementSolutionPreamble(lang, solWithStruct, ex.harness[lang]),
  testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
});
console.log('passed:', result.passed, '/', result.total);
for (const r of result.results) {
  if (r.statusId !== 3) {
    console.log('---');
    console.log('idx', r.index, 'statusId', r.statusId, r.statusDescription);
    console.log('stdin:', JSON.stringify(ex.testCases[r.index]?.stdin));
    console.log('expected:', JSON.stringify(ex.testCases[r.index]?.expectedOutput));
    console.log('stdout:', JSON.stringify(r.stdout));
    console.log('stderr:', JSON.stringify(r.stderr));
    console.log('compileOutput:', JSON.stringify(r.compileOutput));
  }
}
