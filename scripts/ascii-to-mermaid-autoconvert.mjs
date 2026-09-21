#!/usr/bin/env node
/**
 * ascii-to-mermaid-autoconvert.mjs
 *
 * Zero-token pre-pass for the AsciiDiagram → mermaidSrc pipeline described in
 * the "Convert ASCII diagrams to Mermaid" command. Deterministically parses
 * every <AsciiDiagram> whose ascii is a straight-line box-and-arrow diagram,
 * writes + renders the Mermaid, and wires mermaidSrc in — no LLM call.
 *
 * Anything it can't confidently parse (bent/elbowed connectors, sequence
 * diagrams, ER diagrams, junction-heavy trees, corrupted content) is left
 * completely untouched and listed in NEEDS_LLM.md — that's the only work
 * left for the existing Phase 2a/2b/2c reasoning pass.
 *
 * Rendering, band-check and type-check are delegated to the shared gate
 * (scripts/check-landscape-band-parallel.mjs) — nothing is rendered here.
 *
 * Hard rules preserved from the parent command:
 *   - `content` is NEVER touched, ever
 *   - background is ALWAYS transparent
 *   - a diagram only counts as converted with mermaidSrc + rendered SVG +
 *     intact content — this script only ever adds mermaidSrc, nothing else
 *   - no git add/commit/push
 *   - safe to re-run: skips anything with mermaidSrc already set
 *
 * Usage (run from repo root):
 *   node scripts/ascii-to-mermaid-autoconvert.mjs system-design-fundamentals
 *   node scripts/ascii-to-mermaid-autoconvert.mjs course-a course-b
 *   node scripts/ascii-to-mermaid-autoconvert.mjs system-design-fundamentals/grpc
 *   node scripts/ascii-to-mermaid-autoconvert.mjs system-design-fundamentals --dry-run
 *
 * Requires: @mermaid-js/mermaid-cli as a devDependency of apps/docs
 *   (npm install --save-dev @mermaid-js/mermaid-cli --prefix apps/docs)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { classifyFile } from './classify-diagram-type.mjs';

// ---------- CLI args ----------

const rawArgs = process.argv.slice(2);
const DRY_RUN = rawArgs.includes('--dry-run');
// SAFETY STOP (2026-09-19): this deterministic parser picks up only the boxes it can trace and
// silently drops the rest. In the first real run it wired three diagrams that passed the shape
// gate but were wrong — one showed 2 nodes out of ~12 (plus a literal "&lt;br/&gt;" in a label),
// one kept 5 of ~10 state transitions with a mangled label. The gate checks SHAPE, not content.
// Real runs therefore need an explicit override AND a manual comparison of every output against
// its source ASCII; the LLM path (convert-ascii-diagrams.md) + check-diagram-fidelity.mjs is the
// supported route. --dry-run (counting only) is always safe.
if (!DRY_RUN && !rawArgs.includes('--force-unverified')) {
  console.error('Refusing to run: autoconvert output is not content-verified. Use --dry-run to count, or pass --force-unverified and hand-check every result against its ASCII.');
  process.exit(1);
}
const SLUGS = rawArgs.filter((a) => !a.startsWith('--'));
if (SLUGS.length === 0) {
  console.error('Usage: node ascii-to-mermaid-autoconvert.mjs <course-slug> [more-slugs...] [--dry-run]');
  process.exit(1);
}

const DOCS_ROOT = path.resolve('apps/docs/docs');
const IMG_OUT_DIR = path.resolve('apps/docs/static/img/diagrams');
const CACHE_DIR = path.resolve('.cache/ascii-to-mermaid');
const RENDER_MANIFEST_SCRIPT = path.resolve('scripts/render-mermaid-manifest.mjs');

// ---------- Unicode box-drawing normalization ----------
// Internally normalize both ascii (+,-,|) and unicode box-drawing diagrams
// to the same +/-/| grid so one parser handles both. Junction characters
// (├┤┬┴┼) signal a more complex tree/merge topology we don't attempt —
// their presence inside a candidate box triggers a bail-out, same as an
// unexpected '+' does for the ascii case.
const CORNER_CHARS = new Set(['┌', '┐', '└', '┘']);
const HLINE_CHARS = new Set(['─']);
const VLINE_CHARS = new Set(['│']);
const JUNCTION_CHARS = new Set(['├', '┤', '┬', '┴', '┼']);
const ARROW_RIGHT = new Set(['>', '→']);
const ARROW_LEFT = new Set(['<', '←']);
const ARROW_DOWN = new Set(['v', 'V', '↓']);
const ARROW_UP = new Set(['^', '↑']);

function normalizeChar(ch) {
  if (CORNER_CHARS.has(ch)) return '+';
  if (HLINE_CHARS.has(ch)) return '-';
  if (VLINE_CHARS.has(ch)) return '|';
  if (JUNCTION_CHARS.has(ch)) return '#'; // marker: forces a bail-out if inside a box
  if (ARROW_RIGHT.has(ch)) return '>';
  if (ARROW_LEFT.has(ch)) return '<';
  if (ARROW_DOWN.has(ch)) return 'v';
  if (ARROW_UP.has(ch)) return '^';
  return ch;
}

// ---------- corrupted-content detection ----------
// Heuristic only — flags for the LLM-assisted reconstruction step, never
// attempted here. Signature: long runs of punctuation noise that aren't
// legitimate box-drawing/ascii-art characters.
function looksCorrupted(content) {
  // Only the documented encoding-corruption signature (f--,--?s...) or U+FFFD. The old
  // catch-all [?$%^&*]{4,} false-positived on legit art ($$, ****, ^^^^).
  const noisePattern = /[a-z]--[,.]--\?[a-z]/i;
  return noisePattern.test(content) || content.includes('\uFFFD');
}

// ---------- JSX <AsciiDiagram> extraction (brace/backtick-aware) ----------

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

function getContentValue(tagText) {
  const m = tagText.match(/content=\{\s*`([\s\S]*?)`\s*\}/); // tolerates multi-line content={ <newline> `...` <newline> }
  return m ? m[1] : null;
}

function hasMermaidSrc(tagText) {
  return /\bmermaidSrc=/.test(tagText);
}

// ---------- deterministic box/edge parser (ascii + normalized unicode) ----------

function toGrid(body) {
  const lines = body.replace(/\t/g, '    ').split('\n').map((l) => [...l].map(normalizeChar));
  const width = Math.max(0, ...lines.map((l) => l.length));
  return lines.map((l) => {
    const padded = l.slice();
    while (padded.length < width) padded.push(' ');
    return padded;
  });
}

function findBoxes(grid) {
  const rows = grid.length;
  const boxes = [];
  const topBorderRe = /\+-+\+/g;
  const topCandidates = [];
  for (let r = 0; r < rows; r++) {
    const line = grid[r].join('');
    let m;
    topBorderRe.lastIndex = 0;
    while ((m = topBorderRe.exec(line)) !== null) {
      topCandidates.push({ row: r, colStart: m.index, colEnd: m.index + m[0].length - 1 });
    }
  }
  for (const top of topCandidates) {
    for (let r2 = top.row + 1; r2 < rows; r2++) {
      const line = grid[r2].join('');
      const segment = line.slice(top.colStart, top.colEnd + 1);
      if (/^\+-+\+$/.test(segment)) {
        let valid = true;
        for (let r3 = top.row + 1; r3 < r2; r3++) {
          if (grid[r3][top.colStart] !== '|' || grid[r3][top.colEnd] !== '|') { valid = false; break; }
          const inner = grid[r3].slice(top.colStart + 1, top.colEnd).join('');
          if (inner.includes('+') || inner.includes('#')) { valid = false; break; } // nested divider or junction
        }
        if (valid && r2 > top.row + 1) {
          const textLines = [];
          for (let r3 = top.row + 1; r3 < r2; r3++) {
            const text = grid[r3].slice(top.colStart + 1, top.colEnd).join('').trim();
            if (text) textLines.push(text);
          }
          boxes.push({
            rowTop: top.row, rowBottom: r2, colStart: top.colStart, colEnd: top.colEnd,
            text: textLines.join('<br/>') || `box_${boxes.length + 1}`,
          });
        }
        break;
      }
    }
  }
  return boxes;
}

const GAP_LIMIT = 3;

function nearestLeftBox(boxes, row, beforeCol) {
  let best = null;
  for (const b of boxes) {
    if (row < b.rowTop || row > b.rowBottom) continue;
    const gap = beforeCol - b.colEnd;
    if (gap >= 1 && gap <= GAP_LIMIT && (!best || gap < beforeCol - best.colEnd)) best = b;
  }
  return best;
}
function nearestRightBox(boxes, row, afterCol) {
  let best = null;
  for (const b of boxes) {
    if (row < b.rowTop || row > b.rowBottom) continue;
    const gap = b.colStart - afterCol;
    if (gap >= 1 && gap <= GAP_LIMIT && (!best || gap < best.colStart - afterCol)) best = b;
  }
  return best;
}
function nearestAboveBox(boxes, col, beforeRow) {
  let best = null;
  for (const b of boxes) {
    if (col < b.colStart || col > b.colEnd) continue;
    const gap = beforeRow - b.rowBottom;
    if (gap >= 1 && gap <= GAP_LIMIT && (!best || gap < beforeRow - best.rowBottom)) best = b;
  }
  return best;
}
function nearestBelowBox(boxes, col, afterRow) {
  let best = null;
  for (const b of boxes) {
    if (col < b.colStart || col > b.colEnd) continue;
    const gap = b.rowTop - afterRow;
    if (gap >= 1 && gap <= GAP_LIMIT && (!best || gap < best.rowTop - afterRow)) best = b;
  }
  return best;
}

function findEdges(grid, boxes) {
  const edges = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const HORIZONTAL_CHARS = new Set(['-', '>', '<']);
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (HORIZONTAL_CHARS.has(grid[r][c])) {
        const start = c;
        while (c < cols && HORIZONTAL_CHARS.has(grid[r][c])) c++;
        const end = c - 1;
        const leftBox = nearestLeftBox(boxes, r, start);
        const rightBox = nearestRightBox(boxes, r, end);
        if (leftBox && rightBox && leftBox !== rightBox) {
          const runText = grid[r].slice(start, end + 1).join('');
          edges.push({ from: leftBox, to: rightBox, arrowForward: runText.endsWith('>'), arrowBack: runText.startsWith('<') });
        }
      } else { c++; }
    }
  }
  for (let c = 0; c < cols; c++) {
    const isOwnSide = boxes.some((b) => c === b.colStart || c === b.colEnd);
    if (isOwnSide) continue;
    let r = 0;
    while (r < rows) {
      const ch = grid[r][c];
      if (ch === '|' || ch === 'v' || ch === '^') {
        const start = r;
        while (r < rows && ['|', 'v', '^'].includes(grid[r][c])) r++;
        const end = r - 1;
        const aboveBox = nearestAboveBox(boxes, c, start);
        const belowBox = nearestBelowBox(boxes, c, end);
        if (aboveBox && belowBox && aboveBox !== belowBox) {
          const runText = grid.slice(start, end + 1).map((row) => row[c]).join('');
          edges.push({ from: aboveBox, to: belowBox, arrowForward: runText.endsWith('v'), arrowBack: runText.startsWith('^') });
        }
      } else { r++; }
    }
  }
  return edges;
}

function parseAsciiDiagram(rawContent) {
  if (looksCorrupted(rawContent)) return { corrupted: true };
  const grid = toGrid(rawContent);
  const boxes = findBoxes(grid);
  if (boxes.length < 2) return null;
  const edges = findEdges(grid, boxes);
  if (edges.length < boxes.length - 1) return null; // bent/untraceable connector
  return { boxes, edges };
}

// ---------- Mermaid generation ----------

function escapeLabel(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function overlapsRow(a, b) {
  return a.rowTop <= b.rowBottom && b.rowTop <= a.rowBottom;
}

function generateMermaid(parsed, direction) {
  const { boxes, edges } = parsed;
  const idOf = new Map(boxes.map((b, i) => [b, `n${i}`]));
  const lines = [`flowchart ${direction}`];
  for (const box of boxes) lines.push(`  ${idOf.get(box)}["${escapeLabel(box.text)}"]`);
  for (const edge of edges) {
    let arrow = '---';
    if (edge.arrowForward && edge.arrowBack) arrow = '<-->';
    else if (edge.arrowForward) arrow = '-->';
    else if (edge.arrowBack) arrow = '<--';
    lines.push(`  ${idOf.get(edge.from)} ${arrow} ${idOf.get(edge.to)}`);
  }
  return lines.join('\n');
}

function pickInitialDirection(parsed) {
  const horizontalEdges = parsed.edges.filter((e) => overlapsRow(e.from, e.to));
  return horizontalEdges.length >= parsed.edges.length / 2 ? 'LR' : 'TD';
}

// ---------- rendering + gating (delegated to the shared gate) ----------
// This script no longer renders or band-checks anything itself. Every generated
// .mmd goes through scripts/check-landscape-band-parallel.mjs ->
// check-landscape-band.mjs: the same blackboard theme (#0B0F14 board), 12-char
// hash, intrinsic-size fix, landscape band, direction-flip retry and
// classifier type check the manual/LLM path uses. (It used to call mmdc with
// -b transparent and no theme config, which produced off-theme SVGs.)

const GATE_RUNNER = path.resolve('scripts/check-landscape-band-parallel.mjs');

function runGate(mmdPaths) {
  const results = new Map();
  if (mmdPaths.length === 0) return results;
  const listFile = path.join(os.tmpdir(), `autoconvert-gate-${process.pid}.txt`);
  writeFileSync(listFile, mmdPaths.join('\n'), 'utf8');
  let out;
  try {
    out = execFileSync(process.execPath, [GATE_RUNNER, '--json', '--list', listFile], { encoding: 'utf8', maxBuffer: 1 << 29, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    out = err.stdout; // the runner exits 1 when any file failed; the JSON is still on stdout
    if (!out) throw new Error(`gate runner failed: ${err.message}`);
  }
  for (const r of JSON.parse(out)) results.set(path.resolve(r.mmdFile), r);
  return results;
}

// ---------- file walk ----------

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

// ---------- main ----------

async function processCourse(slug) {
  const scanDir = path.join(DOCS_ROOT, slug);
  if (!existsSync(scanDir)) {
    console.error(`Skipping "${slug}" — not found at ${scanDir}`);
    return;
  }

  if (!DRY_RUN) mkdirSync(CACHE_DIR, { recursive: true });

  const files = statSync(scanDir).isDirectory() ? walk(scanDir) : [scanDir];
  let found = 0, alreadyDone = 0, autoConverted = 0, needsLlm = 0, corrupted = 0;
  const needsLlmList = [];
  const candidates = []; // { file, tag, tagIdx, mmdPath }
  const relFile = (f) => path.relative(DOCS_ROOT, f);

  // Pass 1 — parse. tagIdx is the tag's position among ALL <AsciiDiagram> tags in
  // the file, which is exactly the manifest's diagramIndex, so the .mmd name here
  // equals the manifest's mmdFile (the gate's type check looks diagrams up by it).
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const tags = extractAsciiDiagramTags(source);
    // This script only ever emits flowcharts, so it must not decide a diagram the
    // classifier says is (or might be) another type — those go to the authoring step.
    const classByIdx = new Map(classifyFile(file).map((r) => [r.diagramIndex, r]));
    tags.forEach((tag, i) => {
      const tagIdx = i + 1;
      if (hasMermaidSrc(tag.text)) { alreadyDone++; return; }
      const content = getContentValue(tag.text);
      if (content === null) return; // not the expected shape, leave for manual review
      found++;

      const cls = classByIdx.get(tagIdx);
      if (cls && (cls.confidence === 'ambiguous' || cls.recommendedType !== 'flowchart')) {
        needsLlm++;
        needsLlmList.push({ file: relFile(file), index: tagIdx, reason: `type needs judgment (classifier: ${cls.confidence}, ${cls.recommendedType}) — this script only emits flowcharts` });
        return;
      }

      const parsed = parseAsciiDiagram(content);
      if (!parsed) {
        needsLlm++;
        needsLlmList.push({ file: relFile(file), index: tagIdx, reason: 'unparseable (bent line, non-flowchart shape, or too few boxes)' });
        return;
      }
      if (parsed.corrupted) {
        corrupted++;
        needsLlmList.push({ file: relFile(file), index: tagIdx, reason: 'corrupted content — needs reconstruction' });
        return;
      }
      if (DRY_RUN) { autoConverted++; return; }

      const mmdPath = path.join(CACHE_DIR, `${pageSlug(file)}-${tagIdx}.mmd`);
      writeFileSync(mmdPath, generateMermaid(parsed, pickInitialDirection(parsed)), 'utf8');
      candidates.push({ file, tag, tagIdx, mmdPath });
    });
  }

  // Pass 2 — gate every generated .mmd in one parallel run.
  const gateResults = runGate(candidates.map((c) => c.mmdPath));

  // Pass 3 — wire only what the gate passed.
  const wiring = new Map(); // file -> [{ start, end, text, relSvg }]
  for (const c of candidates) {
    const r = gateResults.get(path.resolve(c.mmdPath));
    if (!r || r.status !== 'pass') {
      needsLlm++;
      needsLlmList.push({ file: relFile(c.file), index: c.tagIdx, reason: r ? `gate FAIL: ${r.reason}` : 'gate returned no result' });
      continue;
    }
    if (!wiring.has(c.file)) wiring.set(c.file, []);
    wiring.get(c.file).push({ start: c.tag.start, end: c.tag.end, text: c.tag.text, relSvg: `/img/diagrams/${path.basename(r.svgPath)}` });
    autoConverted++;
  }
  for (const [file, reps] of wiring) {
    let source = readFileSync(file, 'utf8');
    reps.sort((a, b) => b.start - a.start); // bottom-up keeps earlier offsets valid
    for (const { start, end, text, relSvg } of reps) {
      // A tag always ends in "/>"; append at the END (a first-match replace could hit a "/>" inside the ASCII content).
      const close = text.lastIndexOf('/>');
      const newTag = text.slice(0, close).replace(/\s*$/, '') + ` mermaidSrc="${relSvg}" />`;
      source = source.slice(0, start) + newTag + source.slice(end);
    }
    writeFileSync(file, source, 'utf8');
  }

  console.log(`\n=== ${slug} ===`);
  console.log(`Diagrams found (excl. already-converted): ${found}`);
  console.log(`Already had mermaidSrc (skipped): ${alreadyDone}`);
  console.log(`Auto-converted (zero tokens): ${autoConverted}${DRY_RUN ? ' (dry-run: upper bound, before gate)' : ''}`);
  console.log(`Corrupted content flagged: ${corrupted}`);
  console.log(`Needs LLM-assisted conversion: ${needsLlm}`);

  if (!DRY_RUN && needsLlmList.length > 0) {
    const reportPath = path.join(CACHE_DIR, `${slug.replace(/[\\/]/g, '-')}-NEEDS_LLM.md`);
    const lines = [
      `# Diagrams needing LLM-assisted conversion — ${slug}`,
      '',
      'Auto-convert pre-pass could not handle these. Run the normal Phase 2a/2b/2c',
      'reasoning pass on just these diagrams (find by file + occurrence index).',
      '',
      ...needsLlmList.map((d) => `- \`${d.file}\` (diagram #${d.index}): ${d.reason}`),
    ];
    writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log(`Needs-LLM list: ${reportPath}`);
  }

  if (!DRY_RUN) {
    try {
      execFileSync('node', [path.resolve('scripts/update-diagram-manifest.mjs'), slug], { stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to update diagram manifest for "${slug}": ${err.message}`);
    }
  }
}

async function main() {
  for (const slug of SLUGS) {
    await processCourse(slug);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
