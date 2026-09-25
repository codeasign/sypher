// Splits _src/<slug>.txt (=== title | order blocks) into scratch/<slug>/NN-*.mdx and lints every module.
const fs = require('fs');
const path = require('path');
const slug = process.argv[2];
const write = !process.argv.includes('--lint-only');
const SRC = path.join(__dirname, slug + '.txt');
const OUT = path.join(__dirname, '..', slug);
const raw = fs.readFileSync(SRC, 'utf8').replace(/\r/g, '');
const blocks = raw.split(/^=== /m).filter((b) => b.trim());
const mods = blocks.map((b) => {
  const nl = b.indexOf('\n');
  const head = b.slice(0, nl).trim();
  const [title, order] = head.split('|').map((s) => s.trim());
  return { title, order: +order, body: b.slice(nl + 1).replace(/^\n+/, '').replace(/\n+$/, '') + '\n' };
});
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EM = String.fromCharCode(0x2014), EN = String.fromCharCode(0x2013);
const BANNED = [/in today['\u2019]s/i, /fast-paced/i, /essential skill/i, /let['\u2019]s dive/i, /it is important to (understand|note|remember)/i, /whether you['\u2019]re/i, /\bin conclusion\b/i, /happy [a-z]+ing!/i, /\bdelve/i, /\bleverag/i, /\bunlock/i, /\bjourney\b/i, /game[- ]chang/i, /\bseamless/i, /\brobust\b/i, /\bin order to\b/i, /\bhowever, it is worth/i, /\bit['\u2019]s worth noting/i, /\bthe key takeaway/i, /\bat the end of the day/i, /\bremember:/i, /\bgood luck\b/i, /\bhappy (learning|communicating|thinking)/i, /\bwelcome to\b/i, /\bimagine (this|a world)/i];
const issues = [];
const firstWords = new Map();
const stats = [];
mods.forEach((m, idx) => {
  const t = m.title + ' | ' + m.body;
  const tag = `${slug}#${m.order} ${m.title}`;
  if (t.includes(EM) || t.includes(EN)) issues.push(tag + ': dash character found');
  if (/[\u201C\u201D\u2018\u2019]/.test(t)) issues.push(tag + ': curly quotes found');
  if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(t)) issues.push(tag + ': emoji found');
  if (/^#\s/m.test(m.body)) issues.push(tag + ': H1 in body');
  if (/<details|<summary|import |<[A-Z][a-zA-Z]+/.test(m.body)) issues.push(tag + ': jsx/details/import');
  for (const re of BANNED) if (re.test(m.body)) issues.push(tag + ': banned phrase ' + re);
  const fw = m.body.trim().split(/\s+/).slice(0, 4).join(' ').toLowerCase();
  if (firstWords.has(fw)) issues.push(tag + ': same opening as module ' + firstWords.get(fw));
  firstWords.set(fw, m.order);
  if (/(Happy|Good luck|Enjoy|Keep going|You've got this|You can do it)[^.]*[.!]\s*$/i.test(m.body.trim())) issues.push(tag + ': send-off ending');
  // headings: sentence case
  for (const h of m.body.match(/^#{2,4} .*/gm) || []) {
    const txt = h.replace(/^#+\s/, '');
    if (txt === 'TRY IT') continue;
    const words = txt.split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]/.test(w) && !/^(I|A|The)$/.test(w));
    if (words.length >= 1 && !/^[A-Z]{2,}/.test(words[0])) issues.push(tag + ': heading not sentence case: ' + txt);
  }
  // TRY IT structure (all modules except overview when it has none)
  const hasTry = /^## TRY IT/m.test(m.body);
  const isLesson = idx > 0;
  if (isLesson && !hasTry) issues.push(tag + ': missing TRY IT');
  if (hasTry) {
    const tryPart = m.body.slice(m.body.search(/^## TRY IT/m));
    const ex = (tryPart.match(/^Exercise \d+\./gm) || []).length;
    const ans = (tryPart.match(/^\*\*Suggested answer:\*\*/gm) || []).length;
    if (ex < 2 || ex > 3) issues.push(tag + ': exercises=' + ex + ' (need 2-3)');
    if (ans !== ex) issues.push(tag + ': answers=' + ans + ' exercises=' + ex);
    // each Exercise must be immediately followed (next non-empty line) by an answer, in order
    const lines = tryPart.split('\n').filter((l) => l.trim());
    lines.forEach((l, i) => { if (/^Exercise \d+\./.test(l) && !/^\*\*Suggested answer:\*\*/.test(lines[i + 1] || '')) issues.push(tag + ': exercise not followed by suggested answer: ' + l.slice(0, 40)); });
    // dialogue: a line with a colon-introduced speech but no quotes is hard to detect; check answers that start with a sentence meant as speech
    for (const l of lines) if (/^\*\*Suggested answer:\*\* [A-Z][^"]*\?$/.test(l) && l.length < 120) issues.push(tag + ': answer looks like unquoted speech: ' + l.slice(0, 70));
  }
  const boldOutside = (m.body.replace(/\*\*Suggested answer:\*\*/g, '').match(/\*\*[^*]+\*\*/g) || []).length;
  if (boldOutside > 3) issues.push(tag + ': too much bold (' + boldOutside + ')');
  const words = m.body.split(/\s+/).length;
  stats.push({ order: m.order, title: m.title, words });
  if (isLesson && (words < 280 || words > 700)) issues.push(tag + ': length ' + words + ' words');
});
if (write) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  mods.forEach((m) => {
    const fm = `---\ntitle: "${m.title.replace(/"/g, '\\"')}"\norder: ${m.order}\n---\n\n`;
    fs.writeFileSync(path.join(OUT, String(m.order).padStart(2, '0') + '-' + slugify(m.title) + '.mdx'), fm + m.body);
  });
}
console.log(slug, 'modules', mods.length, 'words', stats.reduce((a, s) => a + s.words, 0), stats.map((s) => s.words).join(','));
console.log(issues.length ? issues.join('\n') : 'LINT CLEAN');
