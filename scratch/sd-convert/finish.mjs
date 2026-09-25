// usage: node finish.mjs <topic>[,<topic>...]
// 1) gate every pending diagram's mmd for the topic(s) (real SVG store) 2) fidelity check 3) write map + wire 4) refresh manifest
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const REPO = 'D:/jenny/sypher';
const SP = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const topics = process.argv[2].split(',');
const mp = `${REPO}/apps/docs/diagram-manifests/system-design-fundamentals.json`;
const man = JSON.parse(fs.readFileSync(mp, 'utf8'));
const ents = man.diagrams.filter((d) => !d.converted && topics.some((t) => d.file.includes(`/system-design-fundamentals/${t}/`)));
const have = ents.filter((e) => fs.existsSync(`${REPO}/${e.mmdFile}`));
const missing = ents.filter((e) => !fs.existsSync(`${REPO}/${e.mmdFile}`));
console.log(`pending ${ents.length}; mmd present ${have.length}; missing ${missing.length}`);
for (const m of missing) console.log('  MISSING', path.basename(m.mmdFile));
const list = `${SP}/lists/finish.list`;
fs.writeFileSync(list, have.map((e) => `${REPO}/${e.mmdFile}`).join('\n') + '\n');
let out;
try { out = execFileSync('node', [`${REPO}/scripts/check-landscape-band-parallel.mjs`, '--workers', '8', '--batch', '1', '--json', '--list', list], { cwd: REPO, maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
catch (e) { out = e.stdout ? e.stdout.toString() : ''; }
const res = JSON.parse(out.slice(out.indexOf('[')));
const byFile = new Map(res.map((r) => [path.basename(r.mmdFile), r]));
const passes = []; const fails = [];
for (const e of have) { const r = byFile.get(path.basename(e.mmdFile)); if (r && r.status === 'pass') passes.push({ id: e.id, hash: r.hash, f: path.basename(e.mmdFile), w: r.w, h: r.h, ratio: r.ratio, tc: r.typeCheck && r.typeCheck.status }); else fails.push(path.basename(e.mmdFile) + ' ' + (r ? r.reason : 'no result')); }
console.log(`gate pass ${passes.length}/${have.length}`); for (const f of fails) console.log('  FAIL', f.slice(0, 160));
const ratios = passes.map((p) => p.ratio); const ws = passes.map((p) => p.w);
console.log(`max w ${Math.round(Math.max(...ws))}, ratio ${Math.min(...ratios).toFixed(2)}-${Math.max(...ratios).toFixed(2)}; type-check:`, JSON.stringify(passes.reduce((a, p) => { a[p.tc] = (a[p.tc] || 0) + 1; return a; }, {})));
fs.writeFileSync(`${SP}/lists/finish-map.json`, JSON.stringify(passes.map((p) => ({ id: p.id, hash: p.hash })), null, 1));
fs.writeFileSync(`${SP}/lists/finish-pass.list`, passes.map((p) => `${REPO}/.cache/ascii-to-mermaid/${p.f}`).join('\n') + '\n');
fs.writeFileSync(`${SP}/lists/finish-fail.list`, have.filter((e) => !passes.some((p) => p.f === path.basename(e.mmdFile))).map((e) => `${REPO}/${e.mmdFile}`).join('\n') + '\n');
