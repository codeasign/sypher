// usage: node split.mjs <bundle.txt>
// Bundle format:
//   @WORK <topic>                      (once, top: which work/<topic>.txt the @SRC line numbers refer to)
//   #### <mmd-basename>                (starts a diagram; body = mermaid source)
//   @SRC <nodeId> A-B [strip] [skip=i,j]   inside a body: emits nodeId["<verbatim lines A..B of work file, monospace>"]
//        strip = drop outer box border chars and top/bottom border lines; skip = comma list of work-file line numbers to omit
// Writes .cache/ascii-to-mermaid/<name>.mmd and lists/<bundle>.list
import fs from 'node:fs';
import path from 'node:path';
const REPO = 'D:/jenny/sypher';
const SP = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const f = process.argv[2];
let txt = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
let workTopic = null;
const wm = /^@WORK (\S+)\n/m.exec(txt);
if (wm) { workTopic = wm[1]; txt = txt.replace(wm[0], ''); }
let workLines = null;
if (workTopic) workLines = fs.readFileSync(`${SP}/work/${workTopic}.txt`, 'utf8').replace(/\r\n/g, '\n').split('\n');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/ /g, '&nbsp;');
function mono(id, rng, opts) {
  const ranges = rng.split(',').map((r) => r.split('-').map(Number));
  const a = ranges[0][0];
  let lines = []; const lnums = [];
  for (const [x, y] of ranges) for (let q = x; q <= y; q++) { lines.push(workLines[q - 1]); lnums.push(q); }
  const skip = new Set(); for (const o of opts) { const m = /^skip=(.*)$/.exec(o); if (m) m[1].split(',').forEach((x) => skip.add(Number(x))); }
  lines = lines.map((l, i) => [l, lnums[i]]).filter(([, n]) => !skip.has(n)).map(([l]) => l);
  if (opts.includes('strip') || opts.includes('strip2')) {
    const passes = opts.includes('strip2') ? 2 : 1;
    for (let pass = 0; pass < passes; pass++) {
    lines = lines.filter((l) => !/^\s*[┌└][─┬┴]*[┐┘]\s*$/.test(l));
    lines = lines.map((l) => { let t = l.replace(/\s+$/, ''); if (pass > 0) t = t.replace(/^\s+/, ''); if (t.startsWith('│')) t = t.slice(1); if (t.endsWith('│')) t = t.slice(0, -1); if (/^[├]/.test(t)) t = t.slice(1); if (/[┤]$/.test(t)) t = t.slice(0, -1); return t.replace(/\s+$/, ''); });
    }
    // remove common left indent
    const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    lines = lines.map((l) => l.slice(ind));
  } else {
    lines = lines.map((l) => l.replace(/\s+$/, ''));
    const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    lines = lines.map((l) => l.slice(ind));
  }
  if (opts.includes('lead') || opts.includes('lead2')) {
    const npass = opts.includes('lead2') ? 2 : 1;
    for (let pp = 0; pp < npass; pp++) lines = lines.filter((l) => !/^\s*[┌└][─┬┴]*[┐┘]\s*$/.test(l)).map((l) => l.replace(/\s+$/, '').replace(/^\s*[│|] ?/, '').replace(/\s*[│|]$/, ''));
    const ind2 = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    lines = lines.map((l) => l.slice(ind2));
  }
  const wlo = opts.find((o) => o.startsWith('wrapl='));
  if (wlo) {
    const N = Number(wlo.slice(6)); const outl = [];
    for (const l of lines) {
      if (l.length <= N) { outl.push(l); continue; }
      const lead = l.match(/^ */)[0]; let cur = lead;
      for (const w of l.trim().split(' ')) { if ((cur + ' ' + w).length > N && cur.trim()) { outl.push(cur); cur = lead + '    ' + w; } else cur = cur.trim() ? cur + ' ' + w : lead + w; }
      if (cur.trim()) outl.push(cur);
    }
    lines = outl;
  }
  const wm = opts.find((o) => o.startsWith('wrap='));
  if (wm) {
    const N = Number(wm.slice(5)); const paras = [];
    for (const l of lines) {
      const t = l.trim();
      if (!t) { paras.push(''); continue; }
      const startsNew = !paras.length || paras[paras.length - 1] === '' || /^(- |\d+\. |Step )/.test(t) || /:$/.test(paras[paras.length - 1]);
      if (startsNew) paras.push(t); else paras[paras.length - 1] += ' ' + t;
    }
    lines = [];
    for (const p of paras) {
      if (!p) { lines.push(''); continue; }
      let cur = '';
      const ind = /^(- |\d+\. )/.test(p) ? '   ' : '';
      for (const w of p.split(' ')) { if ((cur + ' ' + w).trim().length > N && cur) { lines.push(cur); cur = ind + w; } else cur = (cur + ' ' + w).trim() === w ? w : cur + ' ' + w; }
      if (cur) lines.push(cur);
    }
  }
  // trim leading/trailing blank lines
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return `${id}["<div style='text-align:left;white-space:nowrap'>${lines.map((l) => esc(l)).join('<br/>')}</div>"]`;
}

const escT = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const NL = '\n';
const lbl = (x) => x.split(';;').map((y) => escT(y.trim())).join('<br/>');
function stepsFlat(id, per, rows) {
  const raw = rows.map((r) => r[0].startsWith('@SRC '));
  const nodes = rows.map(([t, b, a], i) => {
    if (raw[i]) return t;
    const box = b.split(' >> ').map((x) => '[' + x.split(';;').map((y) => y.trim()).join(' ') + ']').join(' ──> ');
    const al = a ? a.split(';;').map((y) => y.trim()) : [];
    const parts = ['<b>' + escT(t) + '</b>', escT(box)];
    if (al.length) { parts.push('──&gt; ' + escT(al[0])); for (const x of al.slice(1)) parts.push('&nbsp;&nbsp;&nbsp;' + escT(x)); }
    return `${id}${i}["<div style='text-align:left'>${parts.join('<br/>')}</div>"]`;
  });
  let out = ''; const rowsN = Math.ceil(rows.length / per);
  for (let r = 0; r < rowsN; r++) {
    out += 'subgraph ' + id + 'R' + r + '[" "]' + NL + '  direction LR' + NL;
    for (let i = r * per; i < Math.min(rows.length, r * per + per); i++) out += '  ' + nodes[i] + NL;
    for (let i = r * per + 1; i < Math.min(rows.length, r * per + per); i++) if (!raw[i] && !raw[i - 1]) out += '  ' + id + (i - 1) + ' --> ' + id + i + NL;
    out += 'end' + NL;
  }
  for (let r = 1; r < rowsN; r++) out += id + 'R' + (r - 1) + ' --> ' + id + 'R' + r + NL;
  return out.trimEnd();
}
function steps(id, per, dir, rows) {
  // rows: [title, boxText, annText]; ';;' = line break; boxText may chain boxes with ' >> '
  const step = rows.map(([t, b, a], i) => {
    const boxes = b.split(' >> ').map((x, j) => `${id}${i}b${j}["${lbl(x)}"]`);
    let out = `subgraph ${id}${i}["${escT(t)}"]${NL}  direction ${dir}${NL}  ` + boxes.join(NL + '  ') + NL;
    for (let j = 1; j < boxes.length; j++) out += `  ${id}${i}b${j - 1} --> ${id}${i}b${j}${NL}`;
    if (a) out += `  ${id}${i}a["<div style='text-align:left'>${lbl(a)}</div>"]${NL}  ${id}${i}b${boxes.length - 1} --> ${id}${i}a${NL}`;
    return out + 'end' + NL;
  });
  let out = '';
  const rowsN = Math.ceil(rows.length / per);
  for (let r = 0; r < rowsN; r++) {
    out += `subgraph ${id}R${r}[" "]${NL}  direction LR${NL}` + step.slice(r * per, r * per + per).join('');
    for (let i = r * per + 1; i < Math.min(rows.length, r * per + per); i++) out += `  ${id}${i - 1} --> ${id}${i}${NL}`;
    out += 'end' + NL;
  }
  for (let r = 1; r < rowsN; r++) out += `${id}${r * per - 1} --> ${id}${r * per}${NL}`;
  return out.trimEnd();
}

const parts = txt.split(/^#### (\S+)\n/m);
const names = [];
for (let i = 1; i < parts.length; i += 2) {
  const name = parts[i];
  let body = parts[i + 1];
  { // @STEPS blocks
    const lines = body.split('\n'); const outL = []; let k = 0;
    while (k < lines.length) {
      const m = /^@STEPS (\S+) per=(\d+)(?: dir=(TB|LR))?( flat)?\s*$/.exec(lines[k]);
      if (!m) { outL.push(lines[k++]); continue; }
      k++; const rows = [];
      while (k < lines.length && lines[k].trim() && !lines[k].startsWith('@END')) { rows.push(lines[k].split(' || ').map((x) => x.trim())); k++; }
      if (lines[k] && lines[k].startsWith('@END')) k++;
      outL.push(m[4] ? stepsFlat(m[1], Number(m[2]), rows) : steps(m[1], Number(m[2]), m[3] || 'TB', rows));
    }
    body = outL.join('\n');
  }
  body = body.split('\n').map((l) => {
    const ml = /^\s*@L (\S+) (.*)$/.exec(l);
    if (ml) return `${ml[1]}["<div style='text-align:left'>${lbl(ml[2])}</div>"]`;
    const m = /^\s*@SRC (\S+) ([\d,-]+)(.*)$/.exec(l);
    if (!m) return l;
    return mono(m[1], m[2], m[3].trim().split(/\s+/).filter(Boolean));
  }).join('\n').replace(/\n+$/, '') + '\n';
  const out = `${REPO}/.cache/ascii-to-mermaid/${name}.mmd`;
  const done = fs.existsSync(`${SP}/done.txt`) ? new Set(fs.readFileSync(`${SP}/done.txt`, 'utf8').split(String.fromCharCode(10))) : new Set();
  if (process.env.ONLY && !name.includes(process.env.ONLY)) { names.push(out); continue; }
  if (done.has(name) && !process.env.FORCE && !process.env.ONLY) { console.log('skip (done):', name); names.push(out); continue; }
  fs.writeFileSync(out, body);
  names.push(out);
}
fs.mkdirSync(`${SP}/lists`, { recursive: true });
const lst = `${SP}/lists/${path.basename(f, '.txt')}.list`;
fs.writeFileSync(lst, names.join('\n') + '\n');
console.log('wrote', names.length, 'mmd; list', lst);
