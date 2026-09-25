// Usage: WRAPN=14,18,22 node tune5.mjs <list>   label-wrap sweep: breaks over-long label lines (non-mono nodes) at spaces, then renders + picks passing variant
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const REPO = 'D:/jenny/sypher';
const S = 'C:/Users/admin/AppData/Local/Temp/claude/D--jenny-sypher/74c2c3fe-13e6-4765-bad9-06431cbcfc67/scratchpad';
const tmp = path.join(S, 'tune5'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const files = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const NS = (process.env.WRAPN || '14,18,22,28').split(',').map(Number);
const SPS = process.env.SPLIST ? JSON.parse(process.env.SPLIST) : [[1, 2, 1], [20, 2, 0]];
const wrapLine = (s, n) => { if (s.length <= n) return [s]; const mid = Math.floor(s.length / 2); let best = -1;
  for (let d = 0; d < s.length; d++) { for (const i of [mid - d, mid + d]) if (i > 0 && i < s.length && s[i] === ' ') { best = i; break; } if (best >= 0) break; }
  if (best < 0) return [s]; return [...wrapLine(s.slice(0, best), n), ...wrapLine(s.slice(best + 1), n)]; };
const wrapLabels = (src, n) => src.replace(/\["([^"]*)"\]/g, (m, lab) => { if (lab.includes('<div') || lab.includes('&nbsp;')) return m;
  const lines = lab.split('<br/>'); return '["' + lines.flatMap(l => l.includes('&') ? [l] : wrapLine(l, n)).join('<br/>') + '"]'; });
const strip = (t) => t.replace(/^(%%\{init:.*\}%%\r?\n)+/, '');
const variants = [];
for (const f of files) {
  const base = path.basename(f, '.mmd'); const src = strip(fs.readFileSync(f, 'utf8'));
  for (const n of NS) for (const [si, [ns, rs, pd]] of SPS.entries()) {
    const init = `%%{init: {'flowchart': {'subGraphTitleMargin': {'top': 4, 'bottom': 18}, 'nodeSpacing': ${ns}, 'rankSpacing': ${rs}, 'padding': ${pd}, 'wrappingWidth': 450}}}%%\n`;
    const name = `${base}__w${n}s${si}.mmd`; fs.writeFileSync(path.join(tmp, name), init + wrapLabels(src, n)); variants.push({ file: f, name, n });
  }
}
console.log('variants', variants.length);
fs.writeFileSync(path.join(tmp, 'list.txt'), variants.map(v => path.join(tmp, v.name)).join('\n'));
let out; try { out = execFileSync('node', [`${REPO}/scripts/check-landscape-band-parallel.mjs`, '--workers', '8', '--batch', '1', '--json', '--list', path.join(tmp, 'list.txt')], { env: { ...process.env, DIAGRAM_OUT_DIR: path.join(tmp, 'svg') }, maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { out = e.stdout ? e.stdout.toString() : ''; }
const res = JSON.parse(out.slice(out.indexOf('[')));
const pass = new Map(); for (const r of res) if (r.status === 'pass') pass.set(path.basename(r.mmdFile), r);
for (const f of files) {
  const cand = variants.filter(v => v.file === f && pass.has(v.name)).map(v => ({ ...v, r: pass.get(v.name) }));
  const nm = path.basename(f).replace('system-design-fundamentals-', '');
  if (!cand.length) { const all = res.filter(r => path.basename(r.mmdFile).startsWith(path.basename(f, '.mmd') + '__') && r.attempts && r.attempts[0]).map(r => ({ n: path.basename(r.mmdFile).split('__')[1], w: r.attempts[0].w, h: r.attempts[0].h, ratio: r.attempts[0].ratio }));
    const score = x => (x.w > 1400 ? (x.w - 1400) / 1400 : 0) + (x.ratio < 1.3 ? (1.3 - x.ratio) / 1.3 : 0) + (x.ratio > 3.5 ? (x.ratio - 3.5) / 3.5 : 0);
    all.sort((a, b) => score(a) - score(b)); console.log('NEAR', nm, all.slice(0, 3).map(x => `${x.n}:${Math.round(x.w)}x${Math.round(x.h)}`).join(' ')); continue; }
  cand.sort((a, b) => a.n - b.n || b.r.w - a.r.w); const best = cand[0]; fs.copyFileSync(path.join(tmp, best.name), f);
  console.log(`FIXED ${nm} ${best.name.split('__')[1]} -> ${Math.round(best.r.w)}x${Math.round(best.r.h)} r=${best.r.ratio.toFixed(2)}`);
}
