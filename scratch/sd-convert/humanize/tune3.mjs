// Usage: node tune3.mjs <fail-list.txt>
// Like tune2 but also tries layout variants from .cache/variants/<name>__vN.mmd for each failing file.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const REPO = 'D:/jenny/sypher';
const S = 'C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/3391a65d-3f53-4640-9990-906472278e2e/scratchpad';
const tmp = path.join(S, 'tune3'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const WW = process.env.WWLIST ? process.env.WWLIST.split(',').map(Number) : process.env.FAST ? [110, 320, 450] : process.env.FULL ? [110, 160, 230, 320, 450] : [110, 230, 450];
const SP = process.env.FAST ? [[4, 4, 2], [30, 4, 2], [1, 2, 1]] : process.env.FULL ? [[4, 4, 2], [6, 10, 4], [8, 16, 6], [30, 4, 2], [50, 6, 4], [70, 8, 4]] : [[4, 4, 2], [8, 16, 6], [30, 4, 2], [50, 6, 4]];
const VD = REPO + '/.cache/variants/';
const variants = [];
const strip = (t) => t.replace(/^%%\{init:.*\}%%\r?\n/, '');
for (const f of files) {
  const base = path.basename(f, '.mmd');
  const srcs = [strip(fs.readFileSync(f, 'utf8'))];
  const raws = [fs.readFileSync(f, "utf8")];
  if (fs.existsSync(VD)) for (const v of fs.readdirSync(VD).filter(x => x.startsWith(base + "__v")).sort()) { srcs.push(strip(fs.readFileSync(VD + v, "utf8"))); raws.push(fs.readFileSync(VD + v, "utf8")); }
  const autoLR = (t) => { const m = t.match(/(subgraph \w+\[[^\n]*\]\n\s*)direction TB/); return m ? t.replace(m[0], m[1] + 'direction LR') : null; };
  if (!srcs[0].includes('sequenceDiagram')) { const base0 = srcs.length; for (let i = 0; i < base0; i++) { const a = autoLR(srcs[i]); if (a) { srcs.push(a); raws.push(a); } } }
  const isSeq = srcs[0].includes('sequenceDiagram');
  srcs.forEach((src, vi) => {
    if (isSeq) { // sequence diagrams keep their own init
      const name = `${base}__x${vi}.mmd`;
      fs.writeFileSync(path.join(tmp, name), raws[vi]); variants.push({ file: f, name, ww: 0, si: 0, vi }); return;
    }
    (srcs[vi].includes('white-space:nowrap') ? [1000] : WW).forEach(ww => SP.forEach(([ns, rs, pd], si) => {
      const init = `%%{init: {'flowchart': {'subGraphTitleMargin': {'top': 4, 'bottom': ${process.env.MB || 18}}, 'nodeSpacing': ${ns}, 'rankSpacing': ${rs}, 'padding': ${pd}, 'wrappingWidth': ${ww}}}}%%\n`;
      const name = `${base}__x${vi}w${ww}s${si}.mmd`; fs.writeFileSync(path.join(tmp, name), init + src); variants.push({ file: f, name, ww, si, vi });
    }));
  });
}
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
  if (!cand.length) { unfixed.push(f); continue; }
  cand.sort((a, b) => { const g = x => (x.r.ratio >= 1.5 && x.r.ratio <= 3.2 ? 0 : 1); return a.vi - b.vi || g(a) - g(b) || b.ww - a.ww || a.r.w - b.r.w; });
  const best = cand[0]; fs.copyFileSync(path.join(tmp, best.name), f); fixed++;
  console.log(`FIXED ${path.basename(f).replace('system-design-fundamentals-', '')} variant ${best.vi} ww=${best.ww} -> ${Math.round(best.r.w)}x${Math.round(best.r.h)} r=${best.r.ratio.toFixed(2)}${best.r.directionFlipped ? ' flipped' : ''}`);
}
console.log(`\ntuned ${fixed}/${files.length}; still failing: ${unfixed.map(f => path.basename(f).replace('system-design-fundamentals-', '')).join(', ') || 'none'}`);
fs.writeFileSync(path.join(S, 'still-failing.txt'), unfixed.join('\n'));
