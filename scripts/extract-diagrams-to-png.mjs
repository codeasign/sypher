/**
 * extract-diagrams-to-png.mjs
 *
 * Extracts every <AsciiDiagram> block (children AND content-prop syntax),
 * renders each as PNG via Puppeteer, stores in screen-images/<course>/<id>.png
 *
 * Usage:
 *   node scripts/extract-diagrams-to-png.mjs                          # all courses
 *   node scripts/extract-diagrams-to-png.mjs git-github-actions       # one course
 *   FORCE=true node scripts/extract-diagrams-to-png.mjs               # regenerate all
 */

import { globSync } from 'glob';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, relative, sep } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_DIR = join(ROOT, 'docs');
const OUTPUT_ROOT = join(ROOT, 'screen-images');
const MANIFEST_PATH = join(OUTPUT_ROOT, 'manifest.json');

const FORCE = process.env.FORCE === 'true';
const courseArg = process.argv[2];

// ── Extraction — two syntaxes ────────────────────────────────────────────────

// Syntax 1: children  <AsciiDiagram ...>{`...`}</AsciiDiagram>
const CHILDREN_RE = /<AsciiDiagram\b([\s\S]*?)>\s*\{`([\s\S]*?)`\}\s*<\/AsciiDiagram>/g;
// Syntax 2: prop  <AsciiDiagram ... content={`...`} ... />
const CONTENT_PROP_RE = /<AsciiDiagram\b([\s\S]*?)content\s*=\s*\{`([\s\S]*?)`\}([\s\S]*?)\/>/g;

const PROP_RE = (name) => new RegExp(`\\b${name}="([^"]*)"`);

function extractDiagrams(files) {
  const diagrams = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const rel = relative(DOCS_DIR, file);
    const course = rel.split(sep)[0];
    let indexInFile = 0;

    const pushDiagram = (props, ascii) => {
      indexInFile++;
      const trimmed = ascii.replace(/^\n+|\s+$/g, '');
      const idMatch = props.match(PROP_RE('id'));
      const titleMatch = props.match(PROP_RE('title'));
      const fileStem = rel.replace(/\.mdx$/, '').split(sep).slice(1).join('-');
      const id = idMatch ? idMatch[1] : `${fileStem}-${indexInFile}`;
      diagrams.push({
        course,
        id,
        title: titleMatch ? titleMatch[1] : id,
        ascii: trimmed,
        hash: createHash('md5').update(trimmed).digest('hex').slice(0, 10),
        sourceFile: rel,
      });
    };

    let match;
    while ((match = CHILDREN_RE.exec(content)) !== null) {
      pushDiagram(match[1], match[2]);
    }
    while ((match = CONTENT_PROP_RE.exec(content)) !== null) {
      pushDiagram(match[1] + ' ' + match[3], match[2]);
    }
  }
  return diagrams;
}

// ── Manifest ─────────────────────────────────────────────────────────────────

function loadManifest() {
  if (existsSync(MANIFEST_PATH)) {
    try { return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')); }
    catch { return {}; }
  }
  return {};
}

function saveManifest(manifest) {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

// ── Rendering ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPageHtml(ascii, title) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #0D1117; }
  body { display: inline-block; padding: 24px; }
  .frame {
    background: #0D1117;
    border: 1px solid #30363D;
    border-radius: 8px;
    padding: 16px 20px 20px;
  }
  .title {
    color: #8B949E;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #21262D;
  }
  pre {
    font-family: 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.45;
    color: #C9D1D9;
    white-space: pre;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="title">${escapeHtml(title)}</div>
    <pre>${escapeHtml(ascii)}</pre>
  </div>
</body>
</html>`;
}

async function renderPng(page, diagram) {
  await page.setContent(buildPageHtml(diagram.ascii, diagram.title), {
    waitUntil: 'domcontentloaded',
  });
  const body = await page.$('body');
  return body.screenshot({ type: 'png' });
}

function outputPathFor(diagram) {
  const safeId = diagram.id.replace(/[^a-zA-Z0-9/_-]/g, '_');
  return join(OUTPUT_ROOT, diagram.course, ...safeId.split('/')) + '.png';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const pattern = courseArg
    ? join(DOCS_DIR, courseArg, '**/*.mdx')
    : join(DOCS_DIR, '**/*.mdx');

  const files = globSync(pattern.replace(/\\/g, '/'));
  if (files.length === 0) {
    console.error(`No .mdx files found for pattern: ${pattern}`);
    process.exit(1);
  }

  const diagrams = extractDiagrams(files);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Diagrams found: ${diagrams.length}`);

  if (diagrams.length === 0) {
    console.log('Nothing to render.');
    return;
  }

  const manifest = loadManifest();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 });

  let generated = 0, skipped = 0, failed = 0;
  const failures = [];

  for (const diagram of diagrams) {
    const outPath = outputPathFor(diagram);
    const manifestKey = `${diagram.course}/${diagram.id}`;

    if (!FORCE && manifest[manifestKey] === diagram.hash && existsSync(outPath)) {
      skipped++;
      continue;
    }

    try {
      mkdirSync(dirname(outPath), { recursive: true });
      const png = await renderPng(page, diagram);
      writeFileSync(outPath, png);
      manifest[manifestKey] = diagram.hash;
      generated++;
      process.stdout.write(`  ✓ ${manifestKey}\n`);
    } catch (err) {
      failed++;
      failures.push({ id: manifestKey, error: err.message, source: diagram.sourceFile });
      process.stderr.write(`  ✗ ${manifestKey}: ${err.message}\n`);
    }
  }

  await browser.close();
  saveManifest(manifest);

  console.log(`\nGenerated: ${generated}`);
  console.log(`Skipped (unchanged): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output: screen-images/`);

  if (failures.length > 0) {
    const failLog = join(OUTPUT_ROOT, 'failures.json');
    writeFileSync(failLog, JSON.stringify(failures, null, 2), 'utf8');
    console.log(`Failure details: ${relative(ROOT, failLog)}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});