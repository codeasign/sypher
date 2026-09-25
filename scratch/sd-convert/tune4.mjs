// Usage: node tune4.mjs <fail-list.txt>   (PAIRS=1 adds pairwise flips)
// Direction-flip search: for each failing flowchart, flip `direction` of single subgraphs / whole depth levels / pairs,
// render each variant through the landscape gate, and keep the best passing one. Layout-only: no node/edge/label change.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const REPO = 'D:/jenny/sypher';
const S = 'C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/74c2c3fe-13e6-4765-bad9-06431cbcfc67/scratchpad';
const tmp = path.join(S, 'tune4'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const SP = process.env.SPLIST ? JSON.parse(process.env.SPLIST) : process.env.SP2 ? [[4, 4, 2], [30, 4, 2]] : [[4, 4, 2]];
const WW = 450;
const strip = (t) => t.replace(/^(%%\{init:.*\}%%\r?\n)+/, '');
const variants = [];
for (const f of files) {
  const base = path.basename(f, '.mmd');
  const src = strip(fs.readFileSync(f, 'utf8'));
  if (src.startsWith('sequenceDiagram')) continue;
  const lines = src.split('\n');
  // find (lineIndex, depth) of each subgraph-direction line
  const dirs = []; let depth = 0; const stack = [];
  lines.forEach((ln, i) => {
    if (/^\s*subgraph\b/.test(ln)) { stack.push(i); depth++; }
    else if (/^\s*end\s*$/.test(ln)) { stack.pop(); depth--; }
    else { const m = ln.match(/^(\s*)direction (TB|LR)\s*$/); if (m && stack.length) dirs.push({ i, depth, dir: m[2] }); }
  });
  const flipSets = []; // arrays of dir indexes
  if (!process.env.SPONLY) dirs.forEach((_, k) => flipSets.push([k]));
  const maxDepth = Math.max(0, ...dirs.map(d => d.depth));
  if (!process.env.SPONLY) for (let d = 1; d <= maxDepth; d++) { const ks = dirs.map((x, k) => x.depth === d ? k : -1).filter(k => k >= 0); if (ks.length > 1) flipSets.push(ks); }
  if (process.env.PAIRS && dirs.length <= 10) for (let a = 0; a < dirs.length; a++) for (let b = a + 1; b < dirs.length; b++) flipSets.push([a, b]);
  if (process.env.TRIPLES && dirs.length <= 9) for (let a = 0; a < dirs.length; a++) for (let b = a + 1; b < dirs.length; b++) for (let c = b + 1; c < dirs.length; c++) flipSets.push([a, b, c]);
  // also flip outer flowchart direction
  const topFlip = (t) => t.replace(/^flowchart (TB|LR)/, (_, x) => `flowchart ${x === 'TB' ? 'LR' : 'TB'}`);
  flipSets.push([]); // baseline w/ new spacing
  flipSets.forEach((set, si0) => {
    const L = lines.slice();
    set.forEach(k => { const d = dirs[k]; L[d.i] = L[d.i].replace(/(TB|LR)/, d.dir === 'TB' ? 'LR' : 'TB'); });
    const body = L.join('\n');
    for (const [j, bd] of [body, topFlip(body)].entries()) {
      SP.forEach(([ns, rs, pd], si) => {
        const init = `%%{init: {'flowchart': {'subGraphTitleMargin': {'top': 4, 'bottom': 18}, 'nodeSpacing': ${ns}, 'rankSpacing': ${rs}, 'padding': ${pd}, 'wrappingWidth': ${WW}}}}%%\n`;
        const name = `${base}__f${si0}t${j}s${si}.mmd`; fs.writeFileSync(path.join(tmp, name), init + bd);
        variants.push({ file: f, name, nflip: set.length + j, si });
      });
    }
  });
}
console.log('variants', variants.length);
fs.writeFileSync(path.join(tmp, 'list.txt'), variants.map(v => path.join(tmp, v.name)).join('\n'));
let out;
try {
  out = execFileSync('node', [`${REPO}/scripts/check-landscape-band-parallel.mjs`, '--workers', '8', '--batch', '1', '--json', '--list', path.join(tmp, 'list.txt')],
    { env: { ...process.env, DIAGRAM_OUT_DIR: path.join(tmp, 'svg') }, maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).toString();
} catch (e) { out = e.stdout ? e.stdout.toString() : ''; }
const res = JSON.parse(out.slice(out.indexOf('[')));
const pass = new Map(); for (const r of res) if (r.status === 'pass') pass.set(path.basename(r.mmdFile), r);
let fixed = 0; const unfixed = [];
for (const f of files) {
  const cand = variants.filter(v => v.file === f && pass.has(v.name)).map(v => ({ ...v, r: pass.get(v.name) }));
  if (!cand.length) { unfixed.push(f);
    const all = res.filter(r => path.basename(r.mmdFile).startsWith(path.basename(f, '.mmd') + '__') && r.attempts && r.attempts[0]).map(r => ({ n: path.basename(r.mmdFile).split('__')[1], w: r.attempts[0].w, h: r.attempts[0].h, ratio: r.attempts[0].ratio }));
    const score = x => (x.w > 1400 ? (x.w - 1400) / 1400 : 0) + (x.ratio < 1.3 ? (1.3 - x.ratio) / 1.3 : 0) + (x.ratio > 3.5 ? (x.ratio - 3.5) / 3.5 : 0);
    all.sort((a, b) => score(a) - score(b)); console.log('NEAR', path.basename(f).replace('system-design-fundamentals-', ''), all.slice(0, 3).map(x => `${x.n}:${Math.round(x.w)}x${Math.round(x.h)}`).join(' '));
    continue; }
  const g = x => (x.r.ratio >= 1.5 && x.r.ratio <= 3.2 ? 0 : 1);
  cand.sort((a, b) => a.nflip - b.nflip || g(a) - g(b) || b.r.w - a.r.w);
  const best = cand[0]; fs.copyFileSync(path.join(tmp, best.name), f); fixed++;
  console.log(`FIXED ${path.basename(f).replace('system-design-fundamentals-', '')} ${best.name.split('__')[1]} -> ${Math.round(best.r.w)}x${Math.round(best.r.h)} r=${best.r.ratio.toFixed(2)}`);
}
console.log(`\ntuned4 ${fixed}/${files.length}; still failing: ${unfixed.map(f => path.basename(f).replace('system-design-fundamentals-', '')).join(', ') || 'none'}`);
fs.writeFileSync(path.join(S, 'still-failing4.txt'), unfixed.join('\n'));
