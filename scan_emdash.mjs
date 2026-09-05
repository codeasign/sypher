import fs from 'fs';
import path from 'path';

const root = 'd:/jenny/sypher/apps/docs/docs/playwright-test-automation';
const out = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) out.push(f);
  }
}
walk(root);

// Header for the table
const rows = [];
rows.push(['emDash', 'enDash', 'aihits', 'lines', 'words', 'emPer1000', 'file'].join('\t'));
const sorted = out.slice().sort((a, b) => {
  const ta = fs.readFileSync(a, 'utf8');
  const tb = fs.readFileSync(b, 'utf8');
  const ea = (ta.match(/—/g) || []).length;
  const eb = (tb.match(/—/g) || []).length;
  return eb / tb.split(/\s+/).length - ea / ta.split(/\s+/).length;
});
for (const f of sorted) {
  const t = fs.readFileSync(f, 'utf8');
  const words = t.split(/\s+/).length;
  const emd = (t.match(/—/g) || []).length;
  const end = (t.match(/–/g) || []).length;
  const hmm = (t.match(/\b(generally|simply|essentially|effectively|in essence|at the end of the day|delve|leverage|utilize|furthermore|moreover|additionally|seamless|robust|comprehensive|navigate|landscape|tapestry|testament|pivotal|underscore|vital|crucial|game-chang|cutting-edge|state-of-the-art|realm|dive into|nook and cranny|in the world of|unlock|empower)\b/gi) || []).length;
  const lines = t.split('\n').length;
  const rel = f.replace(root.replace(/\\/g, '/'), '').replace(/^\//, '');
  rows.push([emd, end, hmm, lines, words, Number((emd / words) * 1000).toFixed(2), rel].join('\t'));
}
fs.writeFileSync('d:/jenny/sypher/emdash_scan.txt', rows.join('\n'), 'utf8');
console.log('lines written: ' + rows.length);