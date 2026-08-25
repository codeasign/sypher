#!/usr/bin/env node
// Closes the title-vs-id gap: some legacy pages wrote <AsciiDiagram title="...">
// instead of the required id prop. The component drops unknown props, so those
// tags were invisible to update-diagram-manifest.mjs (keys on id) and unwirable
// by the wire scripts (match \bid="...").
//
// Adds id="<course>/<path-slug>" to every AsciiDiagram tag that lacks one,
// suffixing -2, -3… when a file carries several such tags. The dead title prop
// is left in place — it renders nothing and removing it is separate churn.
//
// Usage:
//   node scripts/add-missing-diagram-ids.mjs            # dry-run report
//   node scripts/add-missing-diagram-ids.mjs --fix      # apply

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'docs');
const FIX = process.argv.includes('--fix');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(mdx|md)$/.test(e.name)) out.push(full);
  }
  return out;
}

// Attribute tests must ignore the content={`...`} template literal, where the
// strings id=/title= can legitimately appear inside ASCII art or code samples.
// Each tag has exactly one template literal — cut from first backtick to last.
function skeleton(chunk) {
  const b1 = chunk.indexOf('`');
  if (b1 === -1) return chunk;
  const b2 = chunk.lastIndexOf('`');
  return b2 > b1 ? chunk.slice(0, b1) + chunk.slice(b2 + 1) : chunk;
}

function chunkByTag(src) {
  const OPEN = '<AsciiDiagram';
  const positions = [];
  let i = src.indexOf(OPEN);
  while (i !== -1) {
    // word boundary: <AsciiDiagram must be followed by whitespace/>/EOL
    const next = src[i + OPEN.length];
    if (next === undefined || /\s/.test(next)) positions.push(i);
    i = src.indexOf(OPEN, i + OPEN.length);
  }
  return positions.map((start, p) => ({
    start,
    end: p + 1 < positions.length ? positions[p + 1] : src.length,
  }));
}

const files = walk(DOCS_ROOT);

// Pass 1: collect every id already in use so assigned ids can't collide.
const usedIds = new Set();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const { start, end } of chunkByTag(src)) {
    const m = skeleton(src.slice(start, end)).match(/\bid\s*=\s*"([^"]+)"/);
    if (m) usedIds.add(m[1]);
  }
}

// Pass 2: assign and (with --fix) insert.
let fixedTags = 0, touchedFiles = 0;
const perCourse = {};
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const chunks = chunkByTag(src);
  if (!chunks.length) continue;

  const rel = path.relative(DOCS_ROOT, file).replace(/\\/g, '/').replace(/\.(mdx|md)$/, '');
  const course = rel.split('/')[0];
  // Match the file's own convention: some courses prefix ids with the course
  // slug (playwright-test-automation/fixtures/overview), others are
  // course-relative (codeowners-required-reviewers/pattern-matching-flow).
  const siblingIds = [];
  for (const { start, end } of chunks) {
    const m = skeleton(src.slice(start, end)).match(/\bid\s*=\s*"([^"]+)"/);
    if (m) siblingIds.push(m[1]);
  }
  const courseRelative = siblingIds.length > 0 && siblingIds.every((s) => !s.startsWith(`${course}/`));
  const relWithinCourse = rel.slice(course.length + 1);
  const baseId = courseRelative ? relWithinCourse : `${course}/${relWithinCourse}`;
  let edits = [];

  chunks.forEach(({ start, end }) => {
    const raw = src.slice(start, end);
    const skel = skeleton(raw);
    if (/\bid\s*=\s*"/.test(skel)) return;
    let id = baseId;
    let n = 2;
    while (usedIds.has(id)) id = `${baseId}-${n++}`;
    usedIds.add(id);
    console.log(`  ${path.relative(REPO_ROOT, file).replace(/\\/g, '/')} -> ${id}`);
    // Insert right after the opening tag name; works for one-line and
    // multi-line prop layouts alike.
    edits.push({ at: start + '<AsciiDiagram'.length, text: ` id="${id}"`, id });
    fixedTags++;
    perCourse[course] = (perCourse[course] || 0) + 1;
  });

  if (!edits.length || !FIX) continue;
  let out = src;
  for (let k = edits.length - 1; k >= 0; k--) {
    const e = edits[k];
    out = out.slice(0, e.at) + e.text + out.slice(e.at);
  }
  writeFileSync(file, out, 'utf8');
  touchedFiles++;
}

console.log(`AsciiDiagram tags missing id: ${fixedTags}${FIX ? '' : ' (dry-run)'}`);
if (FIX && touchedFiles) console.log(`Files updated: ${touchedFiles}`);
for (const c of Object.keys(perCourse).sort()) console.log(`  ${c}: ${perCourse[c]}`);
