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
// Exception: classDiagram sources may render portrait (ratio < 1.3) —
// only the w<=1400 width cap still applies to them, not the aspect-ratio
// band. classDiagram's layout stacks sibling classes (interface
// implementers) perpendicular to `direction`, which naturally goes tall
// once there are 3+ implementers; forcing that into landscape previously
// drove real content compromises (downgrading to flowchart, or trimming
// class fields/methods just to shave width) — user decision 2026-08-24.
// If a classDiagram still can't fit under the width cap in either
// direction, split it into two connected classDiagram blocks rather than
// cutting content. All other diagram types keep the full landscape band.
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
//   node scripts/check-landscape-band.mjs <mmd-file> --no-type-check   (recorded exceptions only)
//
// Type check (runs before rendering): if classify-diagram-type.mjs has a
// clear-match, non-flowchart recommendation for the diagram this .mmd belongs
// to (looked up via the diagram manifests) and the .mmd declares a different
// Mermaid type, the gate FAILs without rendering. Ambiguous/default-flowchart
// classifications never block; ambiguous ones are surfaced as [type-review].
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

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { classifyFile } from './classify-diagram-type.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
// DIAGRAM_OUT_DIR lets pilots/tests render somewhere other than the tracked
// SVG store; unset, behavior is unchanged.
const IMG_OUT_DIR = process.env.DIAGRAM_OUT_DIR
  ? path.resolve(process.env.DIAGRAM_OUT_DIR)
  : path.join(REPO_ROOT, 'apps', 'docs', 'static', 'img', 'diagrams');

// Blackboard technical theme — ONE canonical look baked into every SVG so
// the same file reads correctly on dark AND light pages (user decision
// 2026-08-23; supersedes the old always-transparent-background rule — the
// board color below IS the background, no consumer-side card needed).
// Consumed identically by the bulk re-render path (render-mermaid-manifest*)
// so restyled re-renders overwrite existing hash-named SVGs in place.
const THEME_CONFIG = path.join(REPO_ROOT, 'scripts', 'mermaid-blackboard.config.json');
const BOARD_BG = '#0B0F14';

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
  // pid-suffixed so parallel workers (check-landscape-band-parallel.mjs) never share a temp file
  const tmpFile = path.join(os.tmpdir(), `${hash}-${process.pid}.mmd`);
  writeFileSync(tmpFile, mermaidCode, 'utf8');
  const outFile = path.join(IMG_OUT_DIR, `${hash}.svg`);
  const puppeteerConfig = path.join(os.tmpdir(), 'mmdc-puppeteer.json');
  if (!existsSync(puppeteerConfig)) {
    writeFileSync(puppeteerConfig, JSON.stringify({ args: ['--no-sandbox'] }), 'utf8');
  }
  const args = ['--no-install', 'mmdc', '-i', tmpFile, '-o', outFile, '-e', 'svg', '-b', BOARD_BG, '-c', THEME_CONFIG, '-p', puppeteerConfig];
  execFileSync('npx', args, { stdio: 'ignore', shell: true });
  fixIntrinsicSize(outFile);
  return outFile;
}

// mmdc emits width="100%" with no height on the SVG root — fine for inline
// embedding, but these SVGs are consumed as <img src> (AsciiDiagram), where
// a percentage width gives the browser no intrinsic size, so width:auto
// stretches the image to the full content column. Replace it with the real
// pixel dimensions from the viewBox (same fix as render-mermaid-manifest.mjs).
function fixIntrinsicSize(svgPath) {
  let svg = readFileSync(svgPath, 'utf8');
  if (!svg.includes('width="100%"')) return;
  const m = svg.match(/viewBox="[-0-9.]+ [-0-9.]+ ([0-9.]+) ([0-9.]+)"/);
  if (!m) return;
  const [, w, h] = m;
  svg = svg.replace('width="100%"', `width="${w}" height="${h}"`);
  writeFileSync(svgPath, svg, 'utf8');
}

// classDiagram's layout stacks sibling classes (interface implementers) on
// the axis perpendicular to `direction`, which naturally produces tall/
// narrow shapes once there are 3+ implementers. Forcing that into the
// landscape band is what drove real production compromises (downgrading
// to flowchart to dodge the sibling-stacking, or trimming class fields/
// methods just to shave width) — user decision 2026-08-24. So for
// classDiagram sources specifically, portrait is accepted outright: only
// the width cap applies, not the aspect-ratio band. Every other diagram
// type (flowchart, sequenceDiagram, stateDiagram-v2, erDiagram, ...)
// keeps the full landscape-band requirement.
function isClassDiagram(mermaidCode) {
  return /^\s*classDiagram\b/.test(mermaidCode);
}

function checkLandscapeBand(svgPath, portraitAllowed) {
  const svg = readFileSync(svgPath, 'utf8');
  const m = svg.match(/viewBox="([^"]*)"/);
  if (!m) return { ok: false, reason: 'no viewBox found in rendered SVG' };
  const [, , w, h] = m[1].split(/\s+/).map(Number);
  const ratio = w / h;
  const ok = portraitAllowed
    ? w <= MAX_WIDTH
    : w <= MAX_WIDTH && ratio >= MIN_RATIO && ratio <= MAX_RATIO;
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

// ---------- type-check (classifier vs declared Mermaid type) ----------
// Blocks ONLY when classify-diagram-type.mjs has real structural evidence for
// a specific non-flowchart type (confidence "clear-match", recommendedType !=
// flowchart) and the .mmd declares something else. Deliberately NOT blocking:
//   - flowchart "clear-match" — that is the zero-signal default, not evidence
//   - "ambiguous" — the classifier itself defers to authoring judgment
// (same scoring rule analyze-diagram-types.mjs uses for "genuine gap").
// The .mmd is matched to its diagram via the git-tracked manifests' mmdFile
// field; a .mmd not in any manifest (ad hoc / scratch) skips the check.
// Opt out for a deliberate, recorded exception with --no-type-check.

const MANIFEST_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'diagram-manifests');
let manifestIndex = null;
const classifiedFiles = new Map();

function loadManifestIndex() {
  if (manifestIndex) return manifestIndex;
  manifestIndex = new Map(); // .mmd basename -> { file, diagramIndex, id }
  for (const f of readdirSync(MANIFEST_DIR)) {
    if (!f.endsWith('.json') || f === 'summary.json') continue;
    let m;
    try { m = JSON.parse(readFileSync(path.join(MANIFEST_DIR, f), 'utf8')); } catch { continue; }
    for (const d of m.diagrams || []) {
      if (d.mmdFile) manifestIndex.set(path.basename(d.mmdFile), { file: d.file, diagramIndex: d.diagramIndex, id: d.id });
    }
  }
  return manifestIndex;
}

// First real declaration line, skipping blank lines, %% directives/comments
// and a leading --- front-matter block.
function declaredType(mermaidCode) {
  let lines = mermaidCode.split(/\r?\n/);
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (end !== -1) lines = lines.slice(end + 1);
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) continue;
    const word = line.split(/[\s;]/)[0];
    if (word === 'flowchart' || word === 'graph') return 'flowchart';
    return word;
  }
  return null;
}

function typeCheck(mmdPath, mermaidCode) {
  const entry = loadManifestIndex().get(path.basename(mmdPath));
  if (!entry) return { status: 'skipped', note: 'not in any manifest' };
  const abs = path.join(REPO_ROOT, entry.file);
  if (!classifiedFiles.has(abs)) {
    try { classifiedFiles.set(abs, classifyFile(abs)); } catch { classifiedFiles.set(abs, []); }
  }
  const rec = classifiedFiles.get(abs).find((r) => r.diagramIndex === entry.diagramIndex);
  if (!rec) return { status: 'skipped', note: 'diagram has no parseable content to classify' };
  const declared = declaredType(mermaidCode);
  const base = { declared, recommended: rec.recommendedType, confidence: rec.confidence, id: entry.id };
  if (rec.confidence === 'clear-match' && rec.recommendedType !== 'flowchart') {
    return declared === rec.recommendedType
      ? { status: 'ok', ...base }
      : { status: 'mismatch', ...base };
  }
  if (rec.confidence === 'ambiguous') {
    const top = Object.entries(rec.scores).sort((a, b) => b[1] - a[1])[0];
    return { status: 'ambiguous', ...base, leading: top[1] > 0 ? top[0] : null };
  }
  return { status: 'ok', ...base }; // zero-signal flowchart default: nothing to contradict
}

function checkOne(mmdPath, opts = {}) {
  const original = readFileSync(mmdPath, 'utf8');
  const attempts = [];
  const portraitAllowed = isClassDiagram(original);

  let tc = { status: 'skipped', note: '--no-type-check' };
  if (opts.typeCheck !== false) tc = typeCheck(mmdPath, original);
  if (tc.status === 'mismatch') {
    return {
      mmdFile: mmdPath, status: 'fail', typeCheck: tc, attempts,
      reason: `type mismatch: classifier clear-match recommends ${tc.recommended} for "${tc.id}", but the .mmd declares ${tc.declared} — rewrite as ${tc.recommended} (or, for a deliberate exception, re-run with --no-type-check and record why)`,
    };
  }

  if (!checkMmdc()) {
    return { mmdFile: mmdPath, status: 'fail', reason: '@mermaid-js/mermaid-cli (mmdc) not available', attempts };
  }

  let code = original;
  let hash = hashContent(code);
  let svgPath, band;
  try {
    svgPath = renderMermaid(code, hash);
    band = checkLandscapeBand(svgPath, portraitAllowed);
  } catch (err) {
    return { mmdFile: mmdPath, status: 'fail', reason: `render failed: ${err.message}`, attempts };
  }
  attempts.push({ attempt: 1, direction: 'original', hash, w: band.w, h: band.h, ratio: band.ratio, ok: band.ok });

  if (band.ok) {
    return { mmdFile: mmdPath, status: 'pass', hash, svgPath: path.relative(REPO_ROOT, svgPath).replace(/\\/g, '/'), w: band.w, h: band.h, ratio: band.ratio, attempts, typeCheck: tc, ...(portraitAllowed ? { portraitAllowed: true } : {}) };
  }

  const flipped = flipDirection(code);
  if (flipped === null) {
    return {
      mmdFile: mmdPath, status: 'fail',
      reason: portraitAllowed
        ? `classDiagram exceeds the ${MAX_WIDTH}px width cap (w=${Math.round(band.w)}) and no direction hint to retry with — split into two connected classDiagram blocks rather than trimming content`
        : `outside landscape band (w=${Math.round(band.w)}, ratio=${band.ratio?.toFixed(2)}) and no direction hint to retry with — needs manual restructuring (shorten labels, split rows/subgraphs)`,
      attempts,
    };
  }

  hash = hashContent(flipped);
  try {
    svgPath = renderMermaid(flipped, hash);
    band = checkLandscapeBand(svgPath, portraitAllowed);
  } catch (err) {
    return { mmdFile: mmdPath, status: 'fail', reason: `retry render failed: ${err.message}`, attempts };
  }
  attempts.push({ attempt: 2, direction: 'flipped', hash, w: band.w, h: band.h, ratio: band.ratio, ok: band.ok });

  if (band.ok) {
    // The flipped direction is now the authored diagram — persist it back
    // to the .mmd cache file so the source of truth matches what was
    // actually rendered and wired in.
    writeFileSync(mmdPath, flipped, 'utf8');
    return { mmdFile: mmdPath, status: 'pass', hash, svgPath: path.relative(REPO_ROOT, svgPath).replace(/\\/g, '/'), w: band.w, h: band.h, ratio: band.ratio, attempts, typeCheck: tc, directionFlipped: true, ...(portraitAllowed ? { portraitAllowed: true } : {}) };
  }

  return {
    mmdFile: mmdPath, status: 'fail',
    reason: portraitAllowed
      ? `classDiagram exceeds the ${MAX_WIDTH}px width cap in both directions (best w=${Math.round(band.w)}) — split into two connected classDiagram blocks rather than trimming content`
      : `outside landscape band after direction-flip retry (w=${Math.round(band.w)}, ratio=${band.ratio?.toFixed(2)}) — needs manual restructuring (shorten labels, split rows/subgraphs, reconsider diagram type)`,
    attempts,
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const typeCheckOn = !args.includes('--no-type-check');
  const files = args.filter((a) => !a.startsWith('--'));

  if (files.length === 0) {
    console.error('Usage: node scripts/check-landscape-band.mjs <mmd-file> [more-mmd-files...] [--json]');
    process.exit(1);
  }

  const results = files.map((f) => checkOne(path.resolve(f), { typeCheck: typeCheckOn }));

  if (jsonOut) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      const rel = path.relative(REPO_ROOT, r.mmdFile).replace(/\\/g, '/');
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
    const failCount = results.filter((r) => r.status === 'fail').length;
    console.log(`\n${results.length - failCount}/${results.length} passed.`);
  }

  process.exit(results.some((r) => r.status === 'fail') ? 1 : 0);
}

main();
