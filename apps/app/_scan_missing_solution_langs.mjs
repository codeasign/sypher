import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseExerciseFile, parseSolutionsFile } from './_audit-extract.mjs';

const ROOT = 'D:/jenny/sypher/apps/docs/docs/coding-bootcamp';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const categories = readdirSync(ROOT).filter((f) => statSync(join(ROOT, f)).isDirectory());
let flagged = 0;
let total = 0;

for (const category of categories) {
  const exDir = `${ROOT}/${category}/exercises`;
  let files;
  try {
    files = walk(exDir);
  } catch {
    continue;
  }
  for (const exercisePath of files) {
    const rel = exercisePath.replace(/\\/g, '/').replace(`${exDir}/`, '');
    const [difficulty, filename] = rel.split('/');
    const slug = filename.replace('.mdx', '');
    const solutionsPath = `${ROOT}/${category}/solutions/${difficulty}/${slug}.mdx`;
    total++;
    let ex, sol;
    try {
      ex = parseExerciseFile(exercisePath);
    } catch (e) {
      console.log(`PARSE-ERROR (exercise) ${category}/${slug}: ${e.message}`);
      continue;
    }
    try {
      sol = parseSolutionsFile(solutionsPath);
    } catch {
      sol = {};
    }
    const harnessLangs = Object.keys(ex.harness || {});
    const solLangs = new Set(Object.keys(sol || {}));
    const missing = harnessLangs.filter((l) => !solLangs.has(l));
    if (missing.length > 0 && harnessLangs.length > 0) {
      flagged++;
      console.log(`${category}/${slug}: harness has [${harnessLangs.join(',')}], solutions missing [${missing.join(',')}]`);
    }
  }
}
console.log(`\n=== SUMMARY: ${flagged}/${total} files have a harness language missing from solutions ===`);
