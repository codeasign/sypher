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

// ---------- CLI args ----------

const rawArgs = process.argv.slice(2);
const DRY_RUN = rawArgs.includes('--dry-run');
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
  const noisePattern = /[a-z]--[,.]--\?[a-z]|[?$%^&*]{4,}/i;
  return noisePattern.test(content);
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
  const m = tagText.match(/content=\{`([\s\S]*?)`\}/);
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

// ---------- rendering + landscape-band check ----------

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
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
  const tmpFile = path.join(os.tmpdir(), `${hash}.mmd`);
  writeFileSync(tmpFile, mermaidCode, 'utf8');
  const outFile = path.join(IMG_OUT_DIR, `${hash}.svg`);
  const puppeteerConfig = path.join(os.tmpdir(), 'mmdc-puppeteer.json');
  if (!existsSync(puppeteerConfig)) {
    writeFileSync(puppeteerConfig, JSON.stringify({ args: ['--no-sandbox'] }), 'utf8');
  }
  const args = ['--no-install', 'mmdc', '-i', tmpFile, '-o', outFile, '-e', 'svg', '-b', 'transparent', '-p', puppeteerConfig];
  try {
    execFileSync('npx', args, { stdio: 'ignore', shell: true });
  } catch {
    try {
      execFileSync('npx', args, { stdio: 'ignore', shell: true }); // one retry, per repo convention
    } catch (err) {
      throw new Error(`mmdc failed after retry: ${err.message}`);
    }
  }
  return outFile;
}

function checkLandscapeBand(svgPath) {
  const svg = readFileSync(svgPath, 'utf8');
  const m = svg.match(/viewBox="([^"]*)"/);
  if (!m) return { ok: false, reason: 'no viewBox found' };
  const [, , w, h] = m[1].split(/\s+/).map(Number);
  const ratio = w / h;
  const ok = w <= 1400 && ratio >= 1.3 && ratio <= 3.5;
  return { ok, w, h, ratio };
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

  const canRender = checkMmdc();
  if (!canRender) {
    console.warn('@mermaid-js/mermaid-cli not found — install with: npm install --save-dev @mermaid-js/mermaid-cli --prefix apps/docs');
  }
  if (!DRY_RUN) {
    mkdirSync(IMG_OUT_DIR, { recursive: true });
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  const files = statSync(scanDir).isDirectory() ? walk(scanDir) : [scanDir];
  let found = 0, alreadyDone = 0, autoConverted = 0, needsLlm = 0, corrupted = 0;
  const needsLlmList = [];

  for (const file of files) {
    let source = readFileSync(file, 'utf8');
    const tags = extractAsciiDiagramTags(source);
    if (tags.length === 0) continue;

    let diagramIndex = 0;
    const replacements = []; // { start, end, newTagText } bottom-up

    for (const tag of tags) {
      if (hasMermaidSrc(tag.text)) { alreadyDone++; continue; }
      const content = getContentValue(tag.text);
      if (content === null) continue; // not the expected shape, leave for manual review
      found++;
      diagramIndex++;

      const parsed = parseAsciiDiagram(content);

      if (!parsed) {
        needsLlm++;
        needsLlmList.push({ file: path.relative(DOCS_ROOT, file), index: diagramIndex, reason: 'unparseable (bent line, non-flowchart shape, or too few boxes)' });
        continue;
      }
      if (parsed.corrupted) {
        corrupted++;
        needsLlmList.push({ file: path.relative(DOCS_ROOT, file), index: diagramIndex, reason: 'corrupted content — needs reconstruction' });
        continue;
      }

      let direction = pickInitialDirection(parsed);
      let mermaidCode = generateMermaid(parsed, direction);
      const hash = hashContent(mermaidCode);

      if (DRY_RUN) { autoConverted++; continue; }
      if (!canRender) { needsLlm++; needsLlmList.push({ file: path.relative(DOCS_ROOT, file), index: diagramIndex, reason: 'mmdc unavailable' }); continue; }

      writeFileSync(path.join(CACHE_DIR, `${pageSlug(file)}-${diagramIndex}.mmd`), mermaidCode, 'utf8');

      let svgPath, band;
      try {
        svgPath = renderMermaid(mermaidCode, hash);
        band = checkLandscapeBand(svgPath);

        if (!band.ok) {
          // One retry: flip direction, per the documented direction heuristic.
          direction = direction === 'LR' ? 'TD' : 'LR';
          mermaidCode = generateMermaid(parsed, direction);
          const hash2 = hashContent(mermaidCode);
          svgPath = renderMermaid(mermaidCode, hash2);
          band = checkLandscapeBand(svgPath);
        }
      } catch (err) {
        needsLlm++;
        needsLlmList.push({ file: path.relative(DOCS_ROOT, file), index: diagramIndex, reason: `render failed: ${err.message}` });
        continue;
      }

      if (!band.ok) {
        needsLlm++;
        needsLlmList.push({
          file: path.relative(DOCS_ROOT, file), index: diagramIndex,
          reason: `renders outside landscape band (ratio=${band.ratio?.toFixed(2)}, w=${band.w}) — needs restructuring (split row, subgraphs, shorter labels)`,
        });
        continue;
      }

      const relSvg = `/img/diagrams/${path.basename(svgPath)}`;
      const newTagText = tag.text.replace('/>', ` mermaidSrc="${relSvg}" />`);
      replacements.push({ start: tag.start, end: tag.end, newTagText });
      autoConverted++;
    }

    if (replacements.length > 0 && !DRY_RUN) {
      replacements.sort((a, b) => b.start - a.start);
      for (const { start, end, newTagText } of replacements) {
        source = source.slice(0, start) + newTagText + source.slice(end);
      }
      writeFileSync(file, source, 'utf8');
    }
  }

  console.log(`\n=== ${slug} ===`);
  console.log(`Diagrams found (excl. already-converted): ${found}`);
  console.log(`Already had mermaidSrc (skipped): ${alreadyDone}`);
  console.log(`Auto-converted (zero tokens): ${autoConverted}`);
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
