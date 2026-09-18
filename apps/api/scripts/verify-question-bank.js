#!/usr/bin/env node
/* Verify question-bank tiers: counts, duplicate IDs, required keys, master structure.
   Skips files that fail to parse, reporting them as errors instead of crashing. */
const fs = require('node:fs');
const path = require('node:path');

const BANK = 'D:/jenny/sypher/apps/web/question-bank';
const TIERS = ['easy', 'medium', 'hard'];
const QKEYS = ['id', 'difficulty', 'type', 'domain', 'question', 'options', 'correct_answer', 'explanation'];

let problems = 0;
for (const exam of fs.readdirSync(BANK, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const rows = [];
  for (const tier of TIERS) {
    const dir = path.join(BANK, exam);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f.includes(tier));
    if (files.length === 0) { rows.push(`${tier}=0`); continue; }
    let total = 0;
    const seen = new Map();
    for (const f of files) {
      let data;
      try {
        data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch (err) {
        console.log(`  UNPARSEABLE ${exam}/${f}: ${err.message}`);
        problems += 1;
        continue;
      }
      for (const q of data.questions) {
        total += 1;
        for (const k of QKEYS) if (!(k in q)) { console.log(`  MISSING ${k} in ${exam}/${f} q=${q.id}`); problems += 1; }
        if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) { console.log(`  BAD correct_answer ${exam}/${f} q=${q.id}`); problems += 1; }
        if (q.difficulty !== tier) { console.log(`  BAD difficulty ${exam}/${f} q=${q.id} = ${q.difficulty}`); problems += 1; }
        if (seen.has(q.id)) { console.log(`  DUP id ${exam} ${q.id} in ${f} and ${seen.get(q.id)}`); problems += 1; }
        seen.set(q.id, f);
        const opts = Object.keys(q.options || {});
        if (opts.length !== 4) { console.log(`  BAD options ${exam}/${f} q=${q.id} (${opts.length})`); problems += 1; }
        for (const a of q.correct_answer) if (!opts.includes(a)) { console.log(`  ANSWER not in options ${exam}/${f} q=${q.id}`); problems += 1; }
      }
    }
    rows.push(`${tier}=${total}`);
  }
  console.log(`${exam.padEnd(42)} ${rows.join('  ')}`);
}
console.log(problems === 0 ? '\nOK: no structural problems found.' : `\n${problems} problem(s) found.`);