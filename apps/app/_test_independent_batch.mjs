import { readFileSync, readdirSync } from 'node:fs';
import { parseExerciseFile } from './_audit-extract.mjs';
import { submitOne, LANGUAGE_IDS, supplementSolutionPreamble, ensureLeadingDataStruct } from './_audit-run.mjs';

// Usage: node _test_independent_batch.mjs <category> <slug> <difficulty> <solutionsDir>
// solutionsDir must contain one file per language: python.txt, java.txt, cpp.txt, etc.
const [,, category, slug, difficulty, solutionsDir] = process.argv;
const ROOT = 'D:/jenny/sypher/apps/docs/docs/coding-bootcamp';
const ex = parseExerciseFile(`${ROOT}/${category}/exercises/${difficulty}/${slug}.mdx`);

const files = readdirSync(solutionsDir);
const langs = files.filter((f) => f.endsWith('.txt')).map((f) => f.replace('.txt', ''));

console.log(`########## ${category}/${slug} (independent) ##########`);
for (const lang of langs) {
  if (!LANGUAGE_IDS[lang] || !ex.harness[lang]) {
    console.log(`--- ${lang} --- SKIP (no harness/language id)`);
    continue;
  }
  const customSolution = readFileSync(`${solutionsDir}/${lang}.txt`, 'utf8');
  try {
    const solWithStruct = ensureLeadingDataStruct(ex.starterCode[lang], customSolution, lang);
    const correct = await submitOne({
      languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: supplementSolutionPreamble(lang, solWithStruct, ex.harness[lang]),
      testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
    });
    const wrong = await submitOne({
      languageId: LANGUAGE_IDS[lang], harness: ex.harness[lang], solution: ex.starterCode[lang],
      testCases: ex.testCases, cpuTimeLimit: 2, memoryLimit: 262144, language: lang,
    });
    console.log(`--- ${lang} ---`);
    console.log(`CORRECT passed: ${correct.passed} / ${correct.total}`);
    for (const r of correct.results) {
      if (r.statusId !== 3) {
        console.log(`  idx ${r.index} statusId ${r.statusId} ${r.statusDescription}`);
        console.log(`  stdin: ${JSON.stringify(ex.testCases[r.index]?.stdin)}`);
        console.log(`  expected: ${JSON.stringify(ex.testCases[r.index]?.expectedOutput)}`);
        console.log(`  stdout: ${JSON.stringify(r.stdout)}`);
        console.log(`  stderr: ${JSON.stringify(r.stderr)}`);
        console.log(`  compileOutput: ${JSON.stringify(r.compileOutput)}`);
      }
    }
    console.log(`WRONG passed: ${wrong.passed} / ${wrong.total} (should be less than total)`);
  } catch (e) {
    console.log(`--- ${lang} --- ERROR: ${e.message}`);
  }
}
