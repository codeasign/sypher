// Em-dash tooling. Prose + frontmatter only; never diagrams or fenced code.
//   node dash2.mjs --safe [--apply]            headings/frontmatter/bold-or-code labels -> ": "
//   node dash2.mjs --list [topic]              numbered remaining dashes with sentence context
//   node dash2.mjs --decide decisions.txt [--apply]   apply per-id codes
// decision line:  <id> <code>      codes: ,  .  :  ;  (  )  =TEXT  h(hyphen)  s(space) n(none/delete dash)
import fs from 'node:fs';
import { TOPICS, listFiles, read, write, segments } from './mdxlib.mjs';
const A = process.argv.slice(2);
const APPLY = A.includes('--apply');
const only = A.find((a) => TOPICS.includes(a));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function safeLine(line, ctx) {
  if (!line.includes('—')) return line;
  const isHeading = /^\s{0,3}#{1,6}\s/.test(line) || (ctx === 'front' && /^(title|sidebar_label|description):/.test(line));
  if (isHeading) return line.replace(/\s*—\s*/g, ': ');
  const lab = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)?(\*\*[^*]+\*\*|`[^`]+`)\s+—\s+(\S.*)$/);
  if (lab) {
    const inner = lab[2].replace(/\*\*|`/g, '');
    if (words(inner) <= 7 && !/[.!?:"”)]$/.test(inner)) return `${lab[1] || ''}${lab[2]}: ${lab[3]}`;
  }
  return line;
}

function processFile(rel, fn) {
  const src = read(rel);
  const segs = segments(src);
  let out = '';
  for (const sg of segs) {
    if (sg.type === 'diagram' || sg.type === 'code') { out += sg.text; continue; }
    out += fn(sg);
  }
  return { src, out };
}

if (A.includes('--safe')) {
  let n = 0;
  for (const t of TOPICS) for (const rel of listFiles(t)) {
    const { src, out } = processFile(rel, (sg) => sg.text.split('\n').map((l) => { const r = safeLine(l, sg.type); if (r !== l) n++; return r; }).join('\n'));
    if (out !== src && APPLY) write(rel, out);
  }
  console.log({ mode: APPLY ? 'APPLIED' : 'dry', safeLinesChanged: n });
  process.exit(0);
}

// enumerate dashes deterministically
function* dashes() {
  let id = 0;
  for (const t of TOPICS) {
    if (only && t !== only) continue;
    for (const rel of listFiles(t)) {
      const src = read(rel);
      for (const sg of segments(src)) {
        if (sg.type === 'diagram') continue;
        if (process.env.CODE ? sg.type !== 'code' : sg.type === 'code') continue;
        const lines = sg.text.split('\n');
        let off = 0;
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li];
          for (const m of line.matchAll(/—/g)) {
            yield { id: ++id, rel, line, col: m.index, abs: sg.start + off + m.index };
          }
          off += line.length + 1;
        }
      }
    }
  }
}

if (A.includes('--list')) {
  let last = '';
  for (const d of dashes()) {
    // context: whole sentence-ish window around the dash
    const L = d.line;
    const a = Math.max(0, d.col - 170), b = Math.min(L.length, d.col + 170);
    const ctx = (a > 0 ? '…' : '') + L.slice(a, d.col) + '⟦—⟧' + L.slice(d.col + 1, b) + (b < L.length ? '…' : '');
    if (d.rel !== last) { console.log('## ' + d.rel); last = d.rel; }
    console.log(`${d.id}| ${ctx}`);
  }
  process.exit(0);
}

const di = A.indexOf('--decide');
if (di !== -1) {
  const dec = new Map();
  for (const ln of fs.readFileSync(A[di + 1], 'utf8').split('\n')) {
    const m = ln.match(/^(\d+)\s+(\S+)(?:\s+(.*))?$/);
    if (m) dec.set(Number(m[1]), m[2] + (m[3] ? ' ' + m[3] : ''));
  }
  // group by file, apply from the end so offsets stay valid
  const byFile = new Map();
  for (const d of dashes()) if (dec.has(d.id)) { (byFile.get(d.rel) || byFile.set(d.rel, []).get(d.rel)).push(d); }
  let applied = 0; const missing = [];
  for (const [rel, list] of byFile) {
    let s = read(rel);
    for (const d of list.sort((x, y) => y.abs - x.abs)) {
      const code = dec.get(d.id);
      if (s[d.abs] !== '—') { missing.push(d.id); continue; }
      // surrounding spaces
      let a = d.abs, b = d.abs + 1;
      while (a > 0 && s[a - 1] === ' ') a--;
      while (b < s.length && s[b] === ' ') b++;
      let rep;
      const nextChar = s[b] || '';
      if (code === ',') rep = ', ';
      else if (code === '.') { rep = '. '; s = s.slice(0, b) + nextChar.toUpperCase() + s.slice(b + 1); }
      else if (code === ':') rep = ': ';
      else if (code === ';') rep = '; ';
      else if (code === '(') rep = ' (';
      else if (code === ')') rep = ') ';
      else if (code === '),') rep = '), ';
      else if (code === ').') rep = ').';
      else if (code === 'h') rep = '-';
      else if (code === 's') rep = ' ';
      else if (code === 'n') rep = '';
      else if (code.startsWith('=')) rep = code.slice(1).replace(/\\s/g, ' ');
      else { missing.push(d.id); continue; }
      // for ")" style codes, if the next char is punctuation drop the trailing space
      if ((code === ')' ) && /^[.,;:!?)]/.test(s[b] || '')) rep = ')';
      s = s.slice(0, a) + rep + s.slice(b);
      applied++;
    }
    if (APPLY) write(rel, s);
  }
  console.log({ mode: APPLY ? 'APPLIED' : 'dry', decisions: dec.size, applied, missing });
}
