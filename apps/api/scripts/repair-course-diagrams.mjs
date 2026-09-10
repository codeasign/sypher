// Targeted, idempotent repair of imported diagrams in apps/web courses.
//
//   node scripts/repair-course-diagrams.mjs [--apply] [--course <slug>]... \
//       [--report <path>] [--backup <path>]
//
// Without --apply it is a dry run: it fetches + normalises the 13 defective
// SVGs (to prove the fix) but uploads nothing and writes no course bodies.
//
// What it does per course:
//   * wraps every bare <img src=".../svgs/*.svg"> in <figure>...</figure>
//   * keeps an existing "<p><em>caption</em></p>" that trails the image, moving
//     that exact text into <figcaption>
//   * otherwise restores the caption from the Docusaurus source manifest
//     (caption attr, then title attr; alt is never used as a visible caption)
//   * for the 13 audited grey-label SVGs: re-normalises the CURRENT CDN bytes
//     with the shared blackboard-v4 helper, uploads under a new content-hashed
//     filename in the same folder, and swaps only those image URLs
//   * leaves every other image URL, all prose, titles, slugs, order, sections,
//     access and published status untouched
//
// Safety: every module is re-fetched immediately before its write and its
// current body must still match the plan's preflight snapshot, or the course
// aborts. Re-running after a completed pass makes zero changes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./register-typescript.cjs');
const { readableBlackboardSvg, diagramSvgFilename } = require('../src/lib/diagramSvg.ts');
const { renderDiagramFigure, diagramCaption, decodeDiagramText, assertImportedDiagramCaptions } = require('../src/lib/diagramMarkup.ts');
const { uploadBufferToBunny } = require('../src/lib/bunnyUploadServer.ts');

const REPO = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const API_URL = process.env.IMPORT_API_URL || 'http://localhost:4000';
const APPLY = process.argv.includes('--apply');

function argList(flag) {
  const out = [];
  for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === flag) out.push(process.argv[++i]);
  return out;
}
const oneArg = flag => argList(flag)[0];

// Gray-label defect SVGs from Course-Diagram-Audit.md (decoded URLs).
const GRAY_SVGS = new Set([
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/typescript-for-test-automation/functions-and-imports/30a550fa8062.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/typescript-for-test-automation/typing-test-data-and-fixtures/c1621a60c0a1.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/typescript-for-test-automation/just-enough-typescript-to-read-a-test/dd259cce813b.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/api-testing-typescript/test-framework-architecture/9d447be8763e.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/api-testing-typescript/requirements-to-test-design/f4772ede9d67.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/api-testing-python/pytest-httpx-setup/04e5845d45b2.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/playwright-test-automation/fixtures-overview/00c163e21136.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/python-for-test-automation/fixtures-and-pytest-conventions/97e059f9c90f.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/python-for-test-automation/type-hints-for-test-data/1a3331cdb764.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/python-for-test-automation/setting-up-pytest/0c212902aadf.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/python-for-test-automation/calling-apis-and-understanding-responses/0d887b699f6b.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/python-for-test-automation/setup/65375dff68f6.svg',
  'https://syhpher-next-datastore-gvaf.b-cdn.net/svgs/python-for-test-automation/functions-and-imports/f5030b7499ef.svg',
]);

// Staged order: the 5 grey-defect courses first, then caption-only, then the
// ones that already carry <p><em> captions, then git-github-actions.
const DEFAULT_ORDER = [
  'typescript-for-test-automation', 'api-testing-typescript', 'api-testing-python',
  'playwright-test-automation', 'python-for-test-automation',
  'build-with-ai', 'ai-for-quality-engineering', 'learn-typescript', 'api-testing-java',
  'ai-qe-ragas', 'ai-llm-testing',
  'agentic-ai-fundamentals', 'design-patterns', 'python-for-ai-engineers',
  'search-algorithms', 'solid-principles', 'sorting-algorithms',
  'git-github-actions',
];

let cookie = '';
async function login() {
  const r = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.IMPORT_ADMIN_EMAIL || 'admin@sypher.local',
      password: process.env.IMPORT_ADMIN_PASSWORD || 'devpassword123',
    }),
  });
  if (!r.ok) throw new Error(`login ${r.status}`);
  cookie = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('login returned no cookie');
}
async function api(method, route, body) {
  const r = await fetch(`${API_URL}${route}`, {
    method, headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${route}: ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : undefined;
}
async function findCourse(slug) {
  for (let offset = 0; ; offset += 100) {
    const page = await api('GET', `/courses/manage/list?limit=100&offset=${offset}`);
    const hit = page.courses.find(c => c.slug === slug);
    if (hit) return hit;
    if (offset + page.courses.length >= page.total || !page.courses.length) return undefined;
  }
}

// ---- source manifest ------------------------------------------------------
// Backtick-aware <AsciiDiagram> extraction (identical to
// scripts/audit-course-diagrams.mjs): a naive /.../ regex truncates on the
// "/>" that appears inside content={`...`} ASCII art.
function extractTags(text) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf('<AsciiDiagram', i)) >= 0) {
    const start = i;
    let backtick = false;
    for (; i < text.length; i++) {
      if (text[i] === '`') backtick = !backtick;
      if (!backtick && (text.startsWith('/>', i) || text.startsWith('</AsciiDiagram>', i))) {
        i += text.startsWith('/>', i) ? 2 : 15;
        out.push(text.slice(start, i));
        break;
      }
    }
  }
  return out;
}
const attrOf = (s, k) => s.match(new RegExp('\\b' + k + '="([^"]*)"'))?.[1] ?? null;

function manifestMaps(slug) {
  const p = path.join(REPO, 'apps/docs/diagram-manifests', `${slug}.json`);
  const byHash = new Map(), byAlt = new Map();
  if (!fs.existsSync(p)) return { byHash, byAlt };
  const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
  const fileTags = new Map();
  for (const d of manifest.diagrams) {
    if (!fileTags.has(d.file)) {
      const abs = path.join(REPO, d.file);
      fileTags.set(d.file, fs.existsSync(abs) ? extractTags(fs.readFileSync(abs, 'utf8')) : []);
    }
    const tag = fileTags.get(d.file).find(t => attrOf(t, 'id') === d.id);
    if (!tag || !d.mermaidSrc) continue;
    const entry = { id: d.id, file: d.file, caption: attrOf(tag, 'caption'), title: attrOf(tag, 'title'), alt: attrOf(tag, 'alt') };
    byHash.set(path.basename(d.mermaidSrc), entry);
    if (entry.alt) { const a = byAlt.get(entry.alt) || []; a.push(entry); byAlt.set(entry.alt, a); }
  }
  return { byHash, byAlt };
}

// ---- SVG repair pre-pass -------------------------------------------------
async function repairGraySvgs(urls, log) {
  const map = new Map();
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch defective SVG ${url}: ${res.status}`);
    const original = Buffer.from(await res.arrayBuffer());
    const normalized = readableBlackboardSvg(original);
    const text = normalized.toString('utf8');
    if (!text.includes('data-sypher-theme="blackboard-v4"')) throw new Error(`normalise produced no v4 marker for ${url}`);
    const u = new URL(url);
    const prefix = path.posix.dirname(u.pathname).replace(/^\/+/, '');       // svgs/<course>/<module>
    const filename = diagramSvgFilename(path.basename(u.pathname), normalized);
    let newUrl = `${u.origin}/${prefix}/${filename}`;
    if (APPLY) {
      newUrl = await uploadBufferToBunny(normalized, filename, prefix, 'image/svg+xml');
      const check = await fetch(newUrl);
      const checkText = await check.text();
      if (!check.ok || !checkText.includes('data-sypher-theme="blackboard-v4"')) {
        throw new Error(`verify uploaded SVG ${newUrl}: status ${check.status}`);
      }
      // The nested edge-label paragraph must now be overridden.
      if (/class="edgeLabel"[^>]*>\s*<p\b/.test(checkText) &&
          !/#[\w-]+ \.edgeLabel \*\{background:#0B0F14!important/.test(checkText)) {
        throw new Error(`uploaded SVG ${newUrl} still lacks the edge-label paragraph override`);
      }
    }
    log.push({ from: url, to: newUrl, bytes: original.length, normalizedBytes: normalized.length, uploaded: APPLY });
    map.set(url, newUrl);
  }
  return map;
}

// ---- body transform ---------------------------------------------------
// Matches a bare imported diagram image plus an optional trailing legacy
// "<p><em>caption</em></p>". Bodies use a single, uniform shape:
//   <img src="URL" alt="ALT" />
const IMG_RE = /<img\s+src="([^"]*\/svgs\/[^"]*\.svg[^"]*)"\s+alt="([^"]*)"\s*\/>(\n\n<p><em>([^\n]*?)<\/em><\/p>)?/g;

function transformBody(body, slug, maps, urlSwap, stats) {
  const { byHash, byAlt } = maps;
  let unresolved = null;
  const out = body.replace(IMG_RE, (whole, rawUrl, rawAlt, legacyBlock, legacyText, offset) => {
    // Idempotence: already wrapped in a <figure> -> leave exactly as-is.
    const before = body.slice(Math.max(0, offset - 120), offset);
    if (/<figure[^>]*>\s*$/.test(before)) return whole;

    const url = decodeDiagramText(rawUrl);
    const finalUrl = urlSwap.get(url) || url;

    let caption;
    if (legacyText !== undefined) {
      caption = decodeDiagramText(legacyText);
      stats.legacy++;
    } else {
      const hash = path.basename(new URL(url).pathname);
      const altHits = byAlt.get(rawAlt) || byAlt.get(decodeDiagramText(rawAlt)) || [];
      const src = (altHits.length === 1 ? altHits[0] : undefined) || byHash.get(hash);
      if (!src) { unresolved = { hash, alt: decodeDiagramText(rawAlt).slice(0, 80) }; return whole; }
      caption = diagramCaption(src.caption, src.title);
      if (src.caption) stats.fromCaption++;
      else if (src.title) stats.fromTitle++;
      else stats.captionless++;
    }
    if (finalUrl !== url) stats.urlSwapped++;
    stats.wrapped++;
    return renderDiagramFigure(finalUrl, rawAlt, caption);
  });
  return { out, unresolved };
}

// ---- per course -----------------------------------------------------
async function repairCourse(slug, graySwap) {
  const course = await findCourse(slug);
  if (!course) throw new Error(`course not found: ${slug}`);
  const modules = await api('GET', `/courses/${course.id}/manage/modules`);
  const maps = manifestMaps(slug);
  const plan = [];
  const stats = { wrapped: 0, legacy: 0, fromCaption: 0, fromTitle: 0, captionless: 0, urlSwapped: 0, skipped: 0 };

  for (const m of modules) {
    if (!m.bodyMdx.includes('/svgs/')) continue;
    const { out, unresolved } = transformBody(m.bodyMdx, slug, maps, graySwap, stats);
    if (unresolved) throw new Error(`${slug}/${m.slug}: unresolved diagram (hash ${unresolved.hash}, alt "${unresolved.alt}") — aborting course, nothing written`);
    if (out === m.bodyMdx) { stats.skipped++; continue; }
    assertImportedDiagramCaptions(out);                 // fail fast, before any write
    plan.push({ id: m.id, slug: m.slug, title: m.title, preflight: m.bodyMdx, next: out });
  }

  const result = { slug, courseId: course.id, status: course.status, modulesChanged: plan.length, stats, applied: false, writes: [] };
  const outDir = oneArg('--out-dir');
  if (outDir) {
    for (const p of plan) {
      const dir = path.join(outDir, slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${p.slug}.before.md`), p.preflight);
      fs.writeFileSync(path.join(dir, `${p.slug}.after.md`), p.next);
    }
  }
  if (!APPLY || plan.length === 0) {
    result.modulesTouched = plan.map(p => p.slug);
    return result;
  }

  for (const p of plan) {
    const fresh = await api('GET', `/courses/${course.id}/manage/modules`);
    const now = fresh.find(x => x.id === p.id);
    if (!now || now.bodyMdx !== p.preflight) throw new Error(`${slug}/${p.slug}: body changed under us since planning — aborting, ${result.writes.length} module(s) already written`);
    await api('PUT', `/courses/${course.id}/modules/${p.id}`, { title: p.title, bodyMdx: p.next });
    result.writes.push(p.slug);
  }
  result.applied = true;
  return result;
}

// ---- main -----------------------------------------------------------
async function main() {
  const requested = argList('--course');
  const slugs = requested.length ? requested : DEFAULT_ORDER;
  const unknown = slugs.filter(s => !DEFAULT_ORDER.includes(s));
  if (unknown.length) throw new Error(`unknown course slug(s): ${unknown.join(', ')}`);

  await login();

  // Only fetch/normalise/upload the grey SVGs that belong to a course in scope.
  const grayInScope = [...GRAY_SVGS].filter(u => slugs.some(s => u.includes(`/svgs/${s}/`)));
  const svgLog = [];
  const graySwap = grayInScope.length ? await repairGraySvgs(grayInScope, svgLog) : new Map();

  const report = { startedAt: new Date().toISOString(), apply: APPLY, api: API_URL, courses: [], svgRepairs: svgLog };
  for (const slug of slugs) {
    const r = await repairCourse(slug, graySwap);
    report.courses.push(r);
    console.error(`${APPLY ? 'APPLIED' : 'PLANNED'} ${slug}: ${r.modulesChanged} module(s), ${JSON.stringify(r.stats)}`);
  }
  report.finishedAt = new Date().toISOString();

  const reportPath = oneArg('--report');
  if (reportPath) { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)); console.error(`report -> ${reportPath}`); }
  console.log(JSON.stringify({
    apply: APPLY,
    svgRepairs: svgLog.length,
    totalModulesChanged: report.courses.reduce((a, c) => a + c.modulesChanged, 0),
    perCourse: report.courses.map(c => ({ slug: c.slug, changed: c.modulesChanged, applied: c.applied, stats: c.stats })),
  }, null, 2));
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
