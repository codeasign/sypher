// Context-aware em-dash replacement for PROSE and FRONTMATTER segments only (never diagrams or fenced code).
// usage: node dash.mjs [--apply] [topic] [--show N]
import { TOPICS, listFiles, read, write, segments } from './mdxlib.mjs';
const APPLY = process.argv.includes('--apply');
const only = process.argv.slice(2).find((a) => !a.startsWith('--') && TOPICS.includes(a));
const SHOW = process.argv.includes('--show') ? Number(process.argv[process.argv.indexOf('--show') + 1]) : 0;
const CONJ = new Set(['which', 'and', 'but', 'so', 'because', 'while', 'whereas', 'meaning', 'since', 'though', 'although', 'or', 'yet', 'then', 'not', 'without', 'with', 'including', 'unless', 'until', 'if', 'where', 'when', 'for', 'as', 'that', 'who', 'whose', 'such', 'especially', 'usually', 'typically', 'often', 'sometimes', 'plus', 'whether', 'once', 'after', 'before', 'no', 'even', 'only', 'making', 'causing', 'allowing', 'forcing', 'leaving', 'ensuring', 'giving', 'letting', 'preventing', 'so']);
const VERB = /(is|are|was|were|can|cannot|can't|will|would|may|might|must|should|has|have|had|does|do|did|need|needs|require|requires|make|makes|take|takes|becomes|become|remains|lets|means|provides|adds|causes|results|creates|produces|guarantees|ensures|loses|gets|holds|goes|grows|drops|stays|runs|sees|sends|receives|writes|reads|lags|fails|works|wins|loses|keeps|matters|hurts|costs|handles|expects|accepts|returns|breaks|survives|scales|breaks|appear|appears|happens|happen|exist|exists)/i;
const stats = {};
const bump = (k) => (stats[k] = (stats[k] || 0) + 1);
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function pairInner(inner) {
  const t = inner.trim();
  if (t.includes(',') || words(t) > 8) return { open: ' (', close: ')', text: t, kind: 'paren' };
  return { open: ', ', close: ',', text: t, kind: 'comma' };
}

function fixLine(line, ctx) {
  if (!line.includes('—')) return line;
  const isHeading = /^\s{0,3}#{1,6}\s/.test(line) || ctx === 'front';
  const isTable = /^\s*\|/.test(line);
  let s = line;
  if (isTable) {
    // lone dash cell
    s = s.replace(/\|\s*—\s*(?=\|)/g, () => { bump('table-empty'); return '| n/a '; });
    if (!s.includes('—')) return s;
  }
  if (isHeading) {
    s = s.replace(/\s*—\s*/g, () => { bump('heading'); return ': '; });
    return s;
  }
  // label at start of list item / bold label / code label
  const lab = s.match(/^(\s*(?:[-*+]|\d+\.)\s+)?((?:\*\*[^*]+\*\*|`[^`]+`|[A-Z][^.—:]{0,50}?))\s+—\s+(.*)$/);
  if (lab && (lab[1] || /^\*\*|^`/.test(lab[2]))) {
    const labelWords = words(lab[2].replace(/\*\*|`/g, ''));
    if (labelWords <= 7) {
      s = `${lab[1] || ''}${lab[2]}: ${lab[3]}`;
      bump('label-colon');
      if (!s.includes('—')) return s;
    }
  }
  // paired dashes
  let guard = 0;
  while ((s.match(/\s*—\s*/g) || []).length >= 2 && guard++ < 10) {
    const m = s.match(/^(.*?)\s*—\s*(.+?)\s*—\s*(.*)$/);
    if (!m) break;
    const [, a, inner, b] = m;
    const p = pairInner(inner);
    const tail = b.length && /^[.,;:!?)]/.test(b) ? b : (b.length ? ' ' + b : '');
    const head = a;
    if (p.kind === 'paren') { s = `${head}${p.open}${p.text}${p.close}${tail}`; bump('pair-paren'); }
    else {
      const closer = /^[.,;:!?)]/.test(b) ? '' : p.close;
      s = `${head}${p.open}${p.text}${closer}${tail}`;
      bump('pair-comma');
    }
  }
  if (s.includes('—')) {
    s = s.replace(/(\S)\s*—\s*(\S)/g, (m0, pre, post, off, full) => {
      const before = full.slice(0, off + 1);
      const after = full.slice(off + m0.length - 1);
      const firstWord = (after.match(/^[A-Za-z']+/) || [''])[0].toLowerCase();
      const bw = words(before.replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''));
      const upper = /^[A-Z]/.test(post);
      const afterSentence = after.split(/(?<=[.!?])\s/)[0];
      const aw = words(afterSentence);
      const head8 = afterSentence.split(/\s+/).slice(0, 9).join(' ').toLowerCase();
      const hasVerb = VERB.test(head8);
      const commas = (afterSentence.match(/,/g) || []).length;
      if (CONJ.has(firstWord) && !upper) { bump('single-conj'); return `${pre}, ${post}`; }
      if (bw <= 3 && !/[.!?]$/.test(pre)) { bump('single-short-colon'); return `${pre}: ${post}`; }
      if (upper && bw >= 4 && aw >= 4) { bump('single-period'); return `${pre}. ${post}`; }
      if (hasVerb && aw >= 5 && bw >= 3) { bump('single-period-clause'); return `${pre}. ${post.toUpperCase()}`; }
      if (!hasVerb && commas >= 2 && bw >= 3) { bump('single-colon-list'); return `${pre}: ${post}`; }
      if (!upper && bw >= 4) { bump('single-comma'); return `${pre}, ${post}`; }
      bump('single-colon');
      return `${pre}: ${post}`;
    });
  }
  return s;
}

let total = 0, files = 0;
const samples = [];
for (const t of TOPICS) {
  if (only && t !== only) continue;
  for (const rel of listFiles(t)) {
    const src = read(rel);
    const segs = segments(src);
    let out = '', changed = false;
    for (const sg of segs) {
      if (sg.type === 'diagram' || sg.type === 'code') { out += sg.text; continue; }
      const lines = sg.text.split('\n');
      const nl = lines.map((ln) => {
        const r = fixLine(ln, sg.type);
        if (r !== ln) { total++; if (samples.length < 4000) samples.push([rel, ln, r]); }
        return r;
      });
      const txt = nl.join('\n');
      if (txt !== sg.text) changed = true;
      out += txt;
    }
    if (changed) { files++; if (APPLY) write(rel, out); }
  }
}
console.log({ mode: APPLY ? 'APPLIED' : 'dry-run', filesChanged: files, linesChanged: total, stats });
if (SHOW) for (let i = 0; i < Math.min(SHOW, samples.length); i++) { const k = Math.floor((i * samples.length) / SHOW); const [rel, a, b] = samples[k]; console.log('\n' + rel + '\n- ' + a.slice(0, 400) + '\n+ ' + b.slice(0, 400)); }
