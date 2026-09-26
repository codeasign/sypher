#!/usr/bin/env node
/* Reorder keys in *_extra.json files to match the master tier file's key order. */
const fs = require('node:fs');
const path = require('node:path');

const BANK = path.resolve(__dirname, '../../web/question-bank');
const TIERS = ['easy', 'medium', 'hard'];

/** Rebuild an object so its keys follow the given order, keeping any extras at the end. */
function reorder(obj, order) {
  const out = {};
  for (const k of order) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k];
  return out;
}

try {
  for (const exam of fs.readdirSync(BANK, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const dir = path.join(BANK, exam);
    for (const tier of TIERS) {
      const master = path.join(dir, `${tier}.json`);
      const extra = path.join(dir, `${tier}_extra.json`);
      if (!fs.existsSync(master) || !fs.existsSync(extra)) continue;

      const m = JSON.parse(fs.readFileSync(master, 'utf8'));
      const x = JSON.parse(fs.readFileSync(extra, 'utf8'));
      const headerOrder = Object.keys(m);
      const qOrder = Object.keys(m.questions[0]);

      const out = reorder(x, headerOrder);
      out.questions = x.questions.map((q) => reorder(q, qOrder));
      fs.writeFileSync(extra, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
      console.log(`normalized ${exam}/${tier}_extra.json`);
    }
  }
} catch (err) {
  console.error(`reorder failed: ${err.message}`);
  process.exit(1);
}