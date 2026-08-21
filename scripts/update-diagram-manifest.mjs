#!/usr/bin/env node
// Rebuilds the git-tracked diagram-conversion manifest for one or more
// courses, plus the aggregate summary.json. Run from repo root.
//
// Location is deliberate: apps/docs/diagram-manifests/ is git-tracked.
// The earlier .cache/-based approach caused a real data-loss incident
// (untracked, silently overwritten, unrecoverable) — this manifest is the
// durable record. The .mmd files under .cache/ascii-to-mermaid/ remain
// disposable, regenerable build output, never the source of truth.
//
// Each run fully re-scans the course's .mdx/.md source and current disk
// state, so the output is always a fresh, exact snapshot: newly-added
// <AsciiDiagram> tags appear automatically, tags removed from source
// disappear automatically, and converted/mermaidSrcWiredIn are always
// derived from what's actually on disk right now — never carried over
// from a stale previous run.
//
// Usage:
//   node scripts/update-diagram-manifest.mjs <course-slug> [more-slugs...]
//   node scripts/update-diagram-manifest.mjs --all

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'docs');
const STATIC_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'static');
const MMD_CACHE_DIR = path.join(REPO_ROOT, '.cache', 'ascii-to-mermaid');
const MANIFEST_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'diagram-manifests');
const SUMMARY_PATH = path.join(MANIFEST_DIR, 'summary.json');

// ---------- JSX <AsciiDiagram> extraction (brace/backtick-aware) ----------
// Same scanner used by ascii-to-mermaid-autoconvert.mjs / wire-mermaid-src*.mjs,
// kept in sync deliberately rather than imported, since these are standalone
// CLI scripts with no shared module today.

function extractAsciiDiagramTags(source) {
  const tags = [];
  const OPEN = '<AsciiDiagram';
  let i = 0;
  while (true) {
    const start = source.indexOf(OPEN, i);
    if (start === -1) break;
    let j = start + OPEN.length;
    let braceDepth = 0;
    let inBacktick = false;
    let end = -1;
    while (j < source.length) {
      const ch = source[j];
      if (inBacktick) {
        if (ch === '\\') { j += 2; continue; }
        if (ch === '`') inBacktick = false;
        j++;
        continue;
      }
      if (ch === '`') { inBacktick = true; j++; continue; }
      if (ch === '{') { braceDepth++; j++; continue; }
      if (ch === '}') { braceDepth--; j++; continue; }
      if (braceDepth === 0 && ch === '/' && source[j + 1] === '>') { end = j + 2; break; }
      j++;
    }
    if (end === -1) { i = start + OPEN.length; continue; } // malformed tag, skip
    tags.push({ start, end, text: source.slice(start, end) });
    i = end;
  }
  return tags;
}

function getAttr(tagText, name) {
  const m = tagText.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx') || entry.endsWith('.md')) out.push(full);
  }
  return out;
}

function pageSlug(file) {
  return path.relative(DOCS_ROOT, file).replace(/\.(mdx|md)$/, '').replace(/[\\/]/g, '-');
}

function listCourseSlugs() {
  return readdirSync(DOCS_ROOT)
    .filter((e) => statSync(path.join(DOCS_ROOT, e)).isDirectory())
    .sort();
}

// ---------- per-course manifest ----------

function buildCourseManifest(slug) {
  const courseDir = path.join(DOCS_ROOT, slug);
  if (!existsSync(courseDir)) return null;

  const files = walk(courseDir).sort();
  const diagrams = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const tags = extractAsciiDiagramTags(source);
    if (tags.length === 0) continue;

    const relFile = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const slugForFile = pageSlug(file);

    tags.forEach((tag, idx) => {
      const n = idx + 1; // 1-based source-order position, counting ALL tags
      const id = getAttr(tag.text, 'id');
      if (!id) return; // no stable identity to key on — leave for fix-mdx-errors

      const mermaidSrc = getAttr(tag.text, 'mermaidSrc');
      const converted = mermaidSrc !== null && mermaidSrc !== '';

      let svgExists = false;
      if (converted) {
        svgExists = existsSync(path.join(STATIC_ROOT, mermaidSrc.replace(/^\//, '')));
      }

      // Best-effort only: several generations of wiring scripts used
      // different .mmd naming conventions, so a false mmdExists on an
      // older, already-converted diagram is expected, not a problem.
      // mermaidSrcWiredIn (below) is the flag that actually matters.
      const mmdFileName = `${slugForFile}-${n}.mmd`;
      const mmdExists = existsSync(path.join(MMD_CACHE_DIR, mmdFileName));

      diagrams.push({
        id,
        file: relFile,
        diagramIndex: n,
        converted,
        mermaidSrc: mermaidSrc || null,
        svgExists,
        mermaidSrcWiredIn: converted && svgExists,
        mmdFile: `.cache/ascii-to-mermaid/${mmdFileName}`,
        mmdExists,
      });
    });
  }

  diagrams.sort((a, b) => a.file.localeCompare(b.file) || a.diagramIndex - b.diagramIndex);
  const converted = diagrams.filter((d) => d.mermaidSrcWiredIn).length;

  return {
    course: slug,
    totalDiagrams: diagrams.length,
    converted,
    pending: diagrams.length - converted,
    diagrams,
  };
}

function writeJsonIfChanged(filePath, obj) {
  const next = JSON.stringify(obj, null, 2) + '\n';
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === next) return false;
  writeFileSync(filePath, next, 'utf8');
  return true;
}

// ---------- summary roll-up ----------

function regenerateSummary() {
  const courseFiles = readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'summary.json')
    .sort();

  const courses = [];
  let totalDiagrams = 0, totalConverted = 0, totalPending = 0;
  for (const f of courseFiles) {
    const m = JSON.parse(readFileSync(path.join(MANIFEST_DIR, f), 'utf8'));
    courses.push({ course: m.course, totalDiagrams: m.totalDiagrams, converted: m.converted, pending: m.pending });
    totalDiagrams += m.totalDiagrams;
    totalConverted += m.converted;
    totalPending += m.pending;
  }

  const summary = { courses, totalDiagrams, totalConverted, totalPending };
  const changed = writeJsonIfChanged(SUMMARY_PATH, summary);
  return { summary, changed };
}

// ---------- main ----------

function main() {
  const rawArgs = process.argv.slice(2);
  const all = rawArgs.includes('--all');
  const slugs = all ? listCourseSlugs() : rawArgs.filter((a) => !a.startsWith('--'));

  if (slugs.length === 0) {
    console.error('Usage: node scripts/update-diagram-manifest.mjs <course-slug> [more-slugs...] | --all');
    process.exit(1);
  }

  mkdirSync(MANIFEST_DIR, { recursive: true });

  for (const slug of slugs) {
    const manifest = buildCourseManifest(slug);
    if (!manifest) { console.warn(`Skipping "${slug}" — not found at ${path.join(DOCS_ROOT, slug)}`); continue; }
    const filePath = path.join(MANIFEST_DIR, `${slug}.json`);
    const changed = writeJsonIfChanged(filePath, manifest);
    console.log(
      `${changed ? 'UPDATED ' : 'unchanged'} ${slug}: total=${manifest.totalDiagrams} converted=${manifest.converted} pending=${manifest.pending}`
    );
  }

  const { summary, changed: summaryChanged } = regenerateSummary();
  console.log(
    `${summaryChanged ? 'UPDATED ' : 'unchanged'} summary.json: total=${summary.totalDiagrams} converted=${summary.totalConverted} pending=${summary.totalPending}`
  );
}

main();
