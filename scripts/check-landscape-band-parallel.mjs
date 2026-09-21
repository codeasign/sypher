#!/usr/bin/env node
// Parallel driver for check-landscape-band.mjs. Same gate, same theme, same
// type check, same exit-code contract — it only fans the file list out across
// N worker processes so a large wave isn't rendered one mmdc launch at a time.
//
// Work is pulled from a shared queue in small batches, so a worker stuck on a
// diagram that needs a flip-retry doesn't stall the others. Each worker is a
// plain `node check-landscape-band.mjs --json <batch>` child, so gate logic
// exists in exactly one place.
//
// Safety notes:
//   - Callers must pass DISJOINT files (the gate can rewrite a .mmd when a
//     direction flip passes). Duplicate paths in one invocation are rejected.
//   - SVG output is hash-named; two workers only touch the same SVG if two
//     .mmd files have byte-identical content (same result either way).
//
// Usage:
//   node scripts/check-landscape-band-parallel.mjs [--workers N] [--batch N]
//        [--no-type-check] [--json] <mmd-file...>
//   node scripts/check-landscape-band-parallel.mjs --list files.txt [...]
//        (files.txt: one .mmd path per line)
//
// Exit code: 0 if every file passed, 1 if any failed (or a worker crashed).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const GATE = path.resolve(import.meta.dirname, 'check-landscape-band.mjs');
const REPO_ROOT = path.resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const flagVal = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};
const jsonOut = args.includes('--json');
const passThrough = args.includes('--no-type-check') ? ['--no-type-check'] : [];
const workers = Math.max(1, Number(flagVal('--workers', Math.min(6, Math.max(1, Math.floor(os.cpus().length / 2))))));
const batchSize = Math.max(1, Number(flagVal('--batch', 10)));

const valueFlags = new Set(['--workers', '--batch', '--list']);
let files = [];
for (let i = 0; i < args.length; i++) {
  if (valueFlags.has(args[i])) { i++; continue; }
  if (!args[i].startsWith('--')) files.push(args[i]);
}
const listPath = flagVal('--list', null);
if (listPath) {
  files.push(...readFileSync(listPath, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
}
files = files.map((f) => path.resolve(f));

if (files.length === 0) {
  console.error('Usage: node scripts/check-landscape-band-parallel.mjs [--workers N] [--batch N] [--no-type-check] [--json] <mmd-file...> | --list files.txt');
  process.exit(1);
}
const dupes = files.filter((f, i) => files.indexOf(f) !== i);
if (dupes.length) {
  console.error(`Duplicate input path(s) — workers must get disjoint files:\n  ${[...new Set(dupes)].join('\n  ')}`);
  process.exit(1);
}

// Create the shared puppeteer config once, up front, so workers never race on it.
const puppeteerConfig = path.join(os.tmpdir(), 'mmdc-puppeteer.json');
if (!existsSync(puppeteerConfig)) writeFileSync(puppeteerConfig, JSON.stringify({ args: ['--no-sandbox'] }), 'utf8');

const batches = [];
for (let i = 0; i < files.length; i += batchSize) batches.push(files.slice(i, i + batchSize));

const resultsByFile = new Map();
let next = 0;
let crashed = 0;

function runBatch(batch) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [GATE, '--json', ...passThrough, ...batch], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', () => {}); // DEP0190 noise etc.; real failures surface via exit/JSON
    child.on('close', () => {
      try {
        for (const r of JSON.parse(out)) resultsByFile.set(path.resolve(r.mmdFile), r);
      } catch {
        crashed += batch.length;
        for (const f of batch) resultsByFile.set(f, { mmdFile: f, status: 'fail', reason: 'worker crashed or produced unparseable output', attempts: [] });
      }
      resolve();
    });
  });
}

async function worker() {
  while (next < batches.length) await runBatch(batches[next++]);
}

const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(workers, batches.length) }, worker));
const secs = (Date.now() - t0) / 1000;

const results = files.map((f) => resultsByFile.get(f));
const failCount = results.filter((r) => r.status === 'fail').length;

if (jsonOut) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const r of results) {
    const rel = path.relative(REPO_ROOT, r.mmdFile).replaceAll(path.sep, '/');
    if (r.status === 'pass') {
      const flip = r.directionFlipped ? ' (direction flipped on retry)' : '';
      const t = r.typeCheck?.status === 'ambiguous'
        ? `  [type-review: classifier ambiguous${r.typeCheck.leading ? `, leans ${r.typeCheck.leading}` : ''}; declared ${r.typeCheck.declared}]`
        : '';
      console.log(`PASS  ${rel}  w=${Math.round(r.w)} h=${Math.round(r.h)} ratio=${r.ratio.toFixed(2)}  ->  ${r.svgPath}${flip}${t}`);
    } else {
      console.log(`FAIL  ${rel}  ${r.reason}`);
    }
  }
  console.log(`\n${results.length - failCount}/${results.length} passed  (${workers} workers, batch ${batchSize}, ${secs.toFixed(1)}s, ${(secs / results.length).toFixed(2)}s/diagram)`);
}
process.exit(failCount > 0 || crashed > 0 ? 1 : 0);
