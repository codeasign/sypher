#!/usr/bin/env node
// Read-only diagram-type audit — single course, or every course at once.
// Thin, purely mechanical wrapper around classify-diagram-type.mjs plus
// the git-tracked diagram manifests — no LLM call, no file changes.
// Backs the /analyze-diagram-types command.
//
// For each already-converted <AsciiDiagram> (mermaidSrc wired to an
// existing SVG), reads the SVG's own aria-roledescription to find out
// what it was ACTUALLY rendered as, and compares that against what the
// classifier recommends today. Every comparison falls into one of four
// buckets:
//   match                 actual === recommended
//   genuine gap           clear-match recommendation for a SPECIFIC type
//                          (real structural evidence found) that disagrees
//                          with what's actually rendered — worth a look
//   semantic judgment call the classifier was "ambiguous", or its
//                          "flowchart" recommendation was the bare
//                          nothing-else-matched default (zero structural
//                          evidence either way) — the classifier has no
//                          structural basis to contradict whatever was
//                          actually chosen, so this isn't scored as wrong
//   unreadable             SVG missing or has no roledescription we
//                          recognize — not counted in any bucket
//
// Accuracy = matches / (matches + genuine gaps) — semantic judgment calls
// and unreadable entries are deliberately excluded from that denominator.
//
// Usage:
//   node scripts/analyze-diagram-types.mjs <course-slug>          single course, detailed
//   node scripts/analyze-diagram-types.mjs <course-slug> --json
//   node scripts/analyze-diagram-types.mjs --all                  every course, accuracy table
//   node scripts/analyze-diagram-types.mjs --all --json

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_DIR = path.join(REPO_ROOT, 'apps', 'docs', 'diagram-manifests');
const STATIC_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'static');

// Empirically verified against this repo's own rendered SVGs — see
// classify-diagram-type.mjs's RENDERED_ROLE_TO_TYPE for how these were
// confirmed (existing flowchart/sequenceDiagram output plus two throwaway
// mmdc probe renders for er/stateDiagram-v2, since neither exists in this
// repo yet).
const RENDERED_ROLE_TO_TYPE = {
  'flowchart-v2': 'flowchart',
  sequence: 'sequenceDiagram',
  class: 'classDiagram',
  er: 'erDiagram',
  stateDiagram: 'stateDiagram-v2',
};

function actualRenderedType(mermaidSrc) {
  const svgPath = path.join(STATIC_ROOT, mermaidSrc.replace(/^\//, ''));
  if (!existsSync(svgPath)) return '(svg missing)';
  const head = readFileSync(svgPath, 'utf8').slice(0, 2000);
  const m = head.match(/aria-roledescription="([^"]*)"/);
  if (!m) return '(no roledescription)';
  return RENDERED_ROLE_TO_TYPE[m[1]] || `unknown-role:${m[1]}`;
}

function categorize(cls, actual) {
  if (actual === '(svg missing)' || actual === '(no roledescription)' || actual.startsWith('unknown-role:')) {
    return 'unreadable';
  }
  if (actual === cls.recommendedType) return 'match';
  // A "flowchart" recommendation is always the bare default here (see
  // classify-diagram-type.mjs — it's the only path that produces it, and
  // only when every specialized-type score is 0) — zero structural
  // evidence either way, so it can't structurally contradict whatever
  // was actually chosen.
  if (cls.confidence === 'ambiguous' || cls.recommendedType === 'flowchart') return 'semantic-judgment-call';
  return 'genuine-gap';
}

// Runs the full comparison for one course. Returns null if there's no
// manifest for it yet.
function analyzeCourse(courseSlugArg) {
  const courseSlug = courseSlugArg.split('/')[0]; // manifest is always per top-level course
  const manifestPath = path.join(MANIFEST_DIR, `${courseSlug}.json`);
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const classifyRaw = execFileSync('node', [path.join(REPO_ROOT, 'scripts', 'classify-diagram-type.mjs'), courseSlugArg], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
  });
  const classifications = JSON.parse(classifyRaw);
  const byId = new Map(classifications.filter((c) => c.id).map((c) => [c.id, c]));

  const typeCounts = {};
  const entries = [];
  let converted = 0, notConverted = 0, missingClassification = 0;

  for (const entry of manifest.diagrams) {
    const cls = byId.get(entry.id);
    if (!cls) { missingClassification++; continue; }

    typeCounts[cls.recommendedType] = (typeCounts[cls.recommendedType] || 0) + 1;

    if (entry.mermaidSrcWiredIn) {
      converted++;
      const actual = actualRenderedType(entry.mermaidSrc);
      const category = categorize(cls, actual);
      entries.push({ id: entry.id, file: entry.file, recommended: cls.recommendedType, confidence: cls.confidence, actual, category });
    } else {
      notConverted++;
    }
  }

  const matches = entries.filter((e) => e.category === 'match').length;
  const genuineGaps = entries.filter((e) => e.category === 'genuine-gap');
  const semanticCalls = entries.filter((e) => e.category === 'semantic-judgment-call');
  const unreadable = entries.filter((e) => e.category === 'unreadable').length;
  const accuracyDenominator = matches + genuineGaps.length;
  const accuracy = accuracyDenominator > 0 ? (matches / accuracyDenominator) * 100 : null;

  return {
    course: courseSlugArg,
    totalDiagrams: manifest.diagrams.length,
    converted,
    notConverted,
    missingClassification,
    typeCounts,
    entries,
    matches,
    genuineGaps,
    semanticCalls,
    unreadable,
    accuracy,
  };
}

function listAllCourseSlugs() {
  return readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'summary.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

// ---------- single-course report ----------

function printSingleCourseReport(result) {
  console.log(`=== Diagram type analysis: ${result.course} ===\n`);
  console.log(`Total diagrams:     ${result.totalDiagrams}`);
  console.log(`Converted:          ${result.converted}`);
  console.log(`Not yet converted:  ${result.notConverted}`);
  if (result.missingClassification) console.log(`(${result.missingClassification} manifest entries had no matching classification — id mismatch, investigate)`);

  console.log('\nRecommended type breakdown (all diagrams, converted or not):');
  for (const [t, c] of Object.entries(result.typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(16)} ${c}`);
  }

  console.log(`\nOf ${result.converted} converted diagrams checked against their actual rendered type:`);
  console.log(`  Matches:                ${result.matches}`);
  console.log(`  Genuine gaps:           ${result.genuineGaps.length}`);
  console.log(`  Semantic judgment calls: ${result.semanticCalls.length}`);
  if (result.unreadable) console.log(`  Unreadable:             ${result.unreadable}`);
  console.log(`  Accuracy (matches / (matches + genuine gaps)): ${result.accuracy === null ? 'n/a' : result.accuracy.toFixed(1) + '%'}`);

  if (result.genuineGaps.length) {
    console.log(`\nGenuine gaps (worth a look):`);
    for (const g of result.genuineGaps) {
      console.log(`  - ${g.id}`);
      console.log(`      rendered as ${g.actual}, classifier says ${g.recommended}  |  ${g.file}`);
    }
  }
  if (result.semanticCalls.length) {
    console.log(`\nSemantic judgment calls (not counted against accuracy):`);
    for (const s of result.semanticCalls) {
      console.log(`  - ${s.id}`);
      console.log(`      rendered as ${s.actual}, classifier says ${s.recommended} (${s.confidence})  |  ${s.file}`);
    }
  }
}

// ---------- cross-course report ----------

function printAllCoursesReport(results) {
  const withDenominator = results.filter((r) => r.accuracy !== null);
  const withoutDenominator = results.filter((r) => r.accuracy === null && r.converted > 0);
  withDenominator.sort((a, b) => a.accuracy - b.accuracy);

  console.log('=== Diagram type accuracy — all courses ===\n');
  const headers = ['Course', 'Converted', 'Matches', 'Genuine gaps', 'Semantic calls', 'Accuracy'];
  const rows = [...withDenominator, ...withoutDenominator].map((r) => [
    r.course,
    String(r.converted),
    String(r.matches),
    String(r.genuineGaps.length),
    String(r.semanticCalls.length),
    r.accuracy === null ? 'n/a' : r.accuracy.toFixed(1) + '%',
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const printRow = (cells) => console.log(cells.map((c, i) => c.padEnd(widths[i])).join('  '));
  printRow(headers);
  printRow(widths.map((w) => '-'.repeat(w)));
  for (const row of rows) printRow(row);

  const totalConverted = results.reduce((s, r) => s + r.converted, 0);
  const totalMatches = results.reduce((s, r) => s + r.matches, 0);
  const totalGenuineGaps = results.reduce((s, r) => s + r.genuineGaps.length, 0);
  const totalSemanticCalls = results.reduce((s, r) => s + r.semanticCalls.length, 0);
  const totalUnreadable = results.reduce((s, r) => s + r.unreadable, 0);
  const overallDenominator = totalMatches + totalGenuineGaps;
  const overallAccuracy = overallDenominator > 0 ? (totalMatches / overallDenominator) * 100 : null;

  console.log('\n=== Overall ===');
  console.log(`Courses checked:          ${results.length}`);
  console.log(`Total converted diagrams: ${totalConverted}`);
  console.log(`Matches:                  ${totalMatches}`);
  console.log(`Genuine gaps:             ${totalGenuineGaps}`);
  console.log(`Semantic judgment calls:  ${totalSemanticCalls}`);
  if (totalUnreadable) console.log(`Unreadable:               ${totalUnreadable}`);
  console.log(`Overall accuracy:         ${overallAccuracy === null ? 'n/a' : overallAccuracy.toFixed(1) + '%'} (matches / (matches + genuine gaps))`);

  const allGaps = results.flatMap((r) => r.genuineGaps.map((g) => ({ ...g, course: r.course })));
  console.log(`\n=== Genuine gaps (${allGaps.length}) — worth a look ===`);
  if (allGaps.length === 0) console.log('(none)');
  for (const g of allGaps) {
    console.log(`  - [${g.course}] ${g.id}`);
    console.log(`      rendered as ${g.actual}, classifier says ${g.recommended}  |  ${g.file}`);
  }

  const allSemantic = results.flatMap((r) => r.semanticCalls.map((s) => ({ ...s, course: r.course })));
  console.log(`\n=== Semantic judgment calls (${allSemantic.length}) — not counted against accuracy ===`);
  if (allSemantic.length === 0) console.log('(none)');
  for (const s of allSemantic) {
    console.log(`  - [${s.course}] ${s.id}`);
    console.log(`      rendered as ${s.actual}, classifier says ${s.recommended} (${s.confidence})  |  ${s.file}`);
  }
}

// ---------- main ----------

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const all = args.includes('--all') || args.includes('all');

  if (all) {
    const slugs = listAllCourseSlugs();
    const results = slugs.map((s) => analyzeCourse(s)).filter((r) => r && r.converted > 0);

    if (jsonOut) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    printAllCoursesReport(results);
    return;
  }

  const slug = args.find((a) => !a.startsWith('--'));
  if (!slug) {
    console.error('Usage: node scripts/analyze-diagram-types.mjs <course-slug> [--json] | --all [--json]');
    process.exit(1);
  }

  const result = analyzeCourse(slug);
  if (!result) {
    console.error(`No manifest for "${slug}" — run: node scripts/update-diagram-manifest.mjs ${slug.split('/')[0]}`);
    process.exit(1);
  }

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  printSingleCourseReport(result);
}

main();
