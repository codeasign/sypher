#!/usr/bin/env node
// Enforced code-level landscape-band gate for the manual/LLM conversion
// path (/convert-ascii-diagrams, /wire-ascii-diagrams). Mirrors what
// ascii-to-mermaid-autoconvert.mjs already does automatically for its
// flowchart-only zero-token path — render, check width/aspect-ratio,
// retry once with a flipped direction, then abstain (never silently wire
// in a violation) — generalized here to work across every Mermaid type
// the manual path can produce (flowchart, classDiagram, sequenceDiagram,
// erDiagram, stateDiagram-v2).
//
// This exists because a real gap was found in production: 161 of 778
// already-wired diagrams (~21%) fell outside the documented band (w<=1400,
// ratio 1.3-3.5) — the old check was purely a documented step in
// convert-ascii-diagrams.md that depended on being followed each time,
// with no code enforcing it for anything except the auto-convert script's
// own flowchart-only path. This script is that enforcement, generalized.
//
// Direction retry: works for any diagram type with an explicit direction
// hint — `flowchart LR`/`graph TD`/etc. as the type declaration line, or
// a standalone `direction LR`/`direction TB` line (used by classDiagram,
// stateDiagram-v2). Diagrams with no such line (sequenceDiagram, erDiagram,
// or any diagram that never declared one) have nothing to mechanically
// flip — those get exactly one render+check, no retry, and a FAIL is
// reported as needing real restructuring (shorter labels, split rows/
// subgraphs), not a second automated attempt.
//
// Usage:
//   node scripts/check-landscape-band.mjs <mmd-file> [more-mmd-files...]
//   node scripts/check-landscape-band.mjs <mmd-file> --json
//
// Exit code: 0 if every input passed (after retry where applicable),
// 1 if any failed — safe to use as a real gate in a command's flow, not
// just informational output.
//
// A PASSing diagram's final .mmd (possibly direction-flipped) and its
// rendered SVG are left in place — .mmd overwritten in .cache/ (disposable
// build output per CLAUDE.md), SVG written to
// apps/docs/static/img/diagrams/<hash>.svg. Wire `mermaidSrc` in from the
// reported `svgPath`/`hash`. A FAILing diagram's .mmd is left untouched
// for manual restructuring — never wire it in.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const IMG_OUT_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'static', 'img', 'diagrams');

const MIN_RATIO = 1.3;
const MAX_RATIO = 3.5;
const MAX_WIDTH = 1400;

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

let mmdcChecked = false, mmdcAvailable = false;
function checkMmdc() {
  if (mmdcChecked) return mmdcAvailable;
  mmdcChecked = true;
  try {
    execFileSync('npx', ['--no-install', 'mmdc', '--version'], { stdio: 'ignore', shell: true });
    mmdcAvailable = true;
  } catch { mmdcAvailable = false; }
  return mmdcAvailable;
}

function renderMermaid(mermaidCode, hash) {
  mkdirSync(IMG_OUT_DIR, { recursive: true });
  const tmpFile = path.join(os.tmpdir(), `${hash}.mmd`);
  writeFileSync(tmpFile, mermaidCode, 'utf8');
  const outFile = path.join(IMG_OUT_DIR, `${hash}.svg`);
  const puppeteerConfig = path.join(os.tmpdir(), 'mmdc-puppeteer.json');
  if (!existsSync(puppeteerConfig)) {
    writeFileSync(puppeteerConfig, JSON.stringify({ args: ['--no-sandbox'] }), 'utf8');
  }
  const args = ['--no-install', 'mmdc', '-i', tmpFile, '-o', outFile, '-e', 'svg', '-b', 'transparent', '-p', puppeteerConfig];
  execFileSync('npx', args, { stdio: 'ignore', shell: true });
  return outFile;
}

function checkLandscapeBand(svgPath) {
  const svg = readFileSync(svgPath, 'utf8');
  const m = svg.match(/viewBox="([^"]*)"/);
  if (!m) return { ok: false, reason: 'no viewBox found in rendered SVG' };
  const [, , w, h] = m[1].split(/\s+/).map(Number);
  const ratio = w / h;
  const ok = w <= MAX_WIDTH && ratio >= MIN_RATIO && ratio <= MAX_RATIO;
  return { ok, w, h, ratio };
}

// Finds a flippable direction token and returns the flipped source, or
// null if nothing flippable was found (sequenceDiagram, erDiagram, or a
// diagram of any type that never declared a direction).
function flipDirection(mermaidCode) {
  const normalize = (d) => (d.toUpperCase() === 'TD' || d.toUpperCase() === 'BT' ? 'TB' : d.toUpperCase() === 'RL' ? 'LR' : d.toUpperCase());
  const flip = (d) => (normalize(d) === 'LR' ? 'TB' : 'LR');

  // Case 1: `flowchart LR` / `graph TD` as the type-declaration line.
  const declRe = /^(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/im;
  const declMatch = mermaidCode.match(declRe);
  if (declMatch) {
    const flipped = flip(declMatch[2]);
    return mermaidCode.replace(declRe, `${declMatch[1]} ${flipped}`);
  }

  // Case 2: a standalone `direction LR`/`direction TB` line (classDiagram,
  // stateDiagram-v2).
  const dirRe = /^(\s*)direction\s+(TD|TB|LR|RL|BT)\s*$/im;
  const dirMatch = mermaidCode.match(dirRe);
  if (dirMatch) {
    const flipped = flip(dirMatch[2]);
    return mermaidCode.replace(dirRe, `${dirMatch[1]}direction ${flipped}`);
  }

  return null; // nothing to flip — sequenceDiagram, erDiagram, or no direction hint present
}

function checkOne(mmdPath) {
  const original = readFileSync(mmdPath, 'utf8');
  const attempts = [];

  if (!checkMmdc()) {
    return { mmdFile: mmdPath, status: 'fail', reason: '@mermaid-js/mermaid-cli (mmdc) not available', attempts };
  }

  let code = original;
  let hash = hashContent(code);
  let svgPath, band;
  try {
    svgPath = renderMermaid(code, hash);
    band = checkLandscapeBand(svgPath);
  } catch (err) {
    return { mmdFile: mmdPath, status: 'fail', reason: `render failed: ${err.message}`, attempts };
  }
  attempts.push({ attempt: 1, direction: 'original', hash, w: band.w, h: band.h, ratio: band.ratio, ok: band.ok });

  if (band.ok) {
    return { mmdFile: mmdPath, status: 'pass', hash, svgPath: path.relative(REPO_ROOT, svgPath).replace(/\\/g, '/'), w: band.w, h: band.h, ratio: band.ratio, attempts };
  }

  const flipped = flipDirection(code);
  if (flipped === null) {
    return {
      mmdFile: mmdPath, status: 'fail',
      reason: `outside landscape band (w=${Math.round(band.w)}, ratio=${band.ratio?.toFixed(2)}) and no direction hint to retry with — needs manual restructuring (shorten labels, split rows/subgraphs)`,
      attempts,
    };
  }

  hash = hashContent(flipped);
  try {
    svgPath = renderMermaid(flipped, hash);
    band = checkLandscapeBand(svgPath);
  } catch (err) {
    return { mmdFile: mmdPath, status: 'fail', reason: `retry render failed: ${err.message}`, attempts };
  }
  attempts.push({ attempt: 2, direction: 'flipped', hash, w: band.w, h: band.h, ratio: band.ratio, ok: band.ok });

  if (band.ok) {
    // The flipped direction is now the authored diagram — persist it back
    // to the .mmd cache file so the source of truth matches what was
    // actually rendered and wired in.
    writeFileSync(mmdPath, flipped, 'utf8');
    return { mmdFile: mmdPath, status: 'pass', hash, svgPath: path.relative(REPO_ROOT, svgPath).replace(/\\/g, '/'), w: band.w, h: band.h, ratio: band.ratio, attempts, directionFlipped: true };
  }

  return {
    mmdFile: mmdPath, status: 'fail',
    reason: `outside landscape band after direction-flip retry (w=${Math.round(band.w)}, ratio=${band.ratio?.toFixed(2)}) — needs manual restructuring (shorten labels, split rows/subgraphs, reconsider diagram type)`,
    attempts,
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const files = args.filter((a) => !a.startsWith('--'));

  if (files.length === 0) {
    console.error('Usage: node scripts/check-landscape-band.mjs <mmd-file> [more-mmd-files...] [--json]');
    process.exit(1);
  }

  const results = files.map((f) => checkOne(path.resolve(f)));

  if (jsonOut) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      const rel = path.relative(REPO_ROOT, r.mmdFile).replace(/\\/g, '/');
      if (r.status === 'pass') {
        const flip = r.directionFlipped ? ' (direction flipped on retry)' : '';
        console.log(`PASS  ${rel}  w=${Math.round(r.w)} h=${Math.round(r.h)} ratio=${r.ratio.toFixed(2)}  ->  ${r.svgPath}${flip}`);
      } else {
        console.log(`FAIL  ${rel}  ${r.reason}`);
      }
    }
    const failCount = results.filter((r) => r.status === 'fail').length;
    console.log(`\n${results.length - failCount}/${results.length} passed.`);
  }

  process.exit(results.some((r) => r.status === 'fail') ? 1 : 0);
}

main();
