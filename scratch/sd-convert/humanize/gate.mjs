// Usage: node gate.mjs <list.txt> <failOutFile> [--no-type-check]
// Runs the real parallel landscape gate (default SVG store) and writes the failing mmd paths.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [list, failOut, ...rest] = process.argv.slice(2);
const args = [`D:/jenny/sypher/scripts/check-landscape-band-parallel.mjs`, '--workers', '8', '--batch', '1', '--json', '--list', list, ...rest];
let out; const t0 = Date.now();
try { out = execFileSync('node', args, { cwd: 'D:/jenny/sypher', maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
catch (e) { out = e.stdout ? e.stdout.toString() : ''; }
const res = JSON.parse(out.slice(out.indexOf('[')));
const fails = res.filter(r => r.status !== 'pass');
const flipped = res.filter(r => r.status === 'pass' && r.directionFlipped).length;
fs.writeFileSync(failOut, fails.map(r => r.mmdFile.replace(/\\/g, '/')).join('\n'));
fs.writeFileSync(failOut + '.json', JSON.stringify(res.map(r => ({ f: path.basename(r.mmdFile), s: r.status, w: r.w, h: r.h, ratio: r.ratio, hash: r.hash, flipped: r.directionFlipped || false, why: r.reason || '', tc: r.typeCheck && r.typeCheck.status })), null, 1));
console.log(`gate: ${res.length - fails.length}/${res.length} pass (${flipped} via direction flip), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
for (const r of fails) console.log('  FAIL', path.basename(r.mmdFile).replace('system-design-fundamentals-', ''), (r.reason || '').replace(/ — needs manual.*/, ''));
