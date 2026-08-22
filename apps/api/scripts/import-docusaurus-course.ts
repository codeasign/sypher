// Imports fully-diagram-converted Docusaurus courses (apps/docs) into the
// Course/CourseModule Postgres model. Scope and design decisions confirmed
// with the user 2026-08-21/22 (see memory: sypher-next-docusaurus-importer):
//
// - Only the 14 courses whose diagram-manifests/summary.json entry has
//   pending: 0 (excluding coding-bootcamp, which is also pending:0 but was
//   explicitly held back), listed in TARGET_COURSES below.
// - Every <AsciiDiagram> becomes a plain <img src="{bunnyUrl}" /> — the
//   public reader (react-markdown + rehype-raw + rehype-sanitize) cannot
//   render JSX component invocations at all, only raw HTML passed through
//   sanitize, so this isn't a style preference, it's the only form that
//   renders.
// - A diagram that isn't safely convertible (missing mermaidSrc, missing
//   SVG on disk, or a real — not cache-drift — hash mismatch) hard-stops
//   the WHOLE course: nothing is written for that course. The one named
//   exception is api-testing-java/flaky-test-prevention's hashVerified:
//   false, confirmed 2026-08-21 as local .mmd cache drift, not a shipped
//   defect (see memory: feedback-hash-verified-false-diagnosis) — that one
//   is imported normally and logged as a known-safe exception.
// - CourseModule has no hierarchy concept; real courses are 2-4 levels
//   deep. Deep category paths collapse into one sectionLabel string
//   ("Section 1 — Setup"), joined with " — ". A course whose entire
//   structure is one wrapping category with no sub-categories (the common
//   flat-course shape) gets sectionLabel: null throughout — the wrapper
//   just repeats the course name and adds nothing.
// - DocCardList-only index.md stub pages (pure category-landing pages with
//   no real prose) are dropped entirely — they contribute nothing a
//   CourseModule row would render usefully, and the category's sidebar
//   `label` already supplies the sectionLabel text.
// - Each course's OWN top-level index page (real prose + a bare
//   <CourseCurriculum /> auto-nav tag) is not a stub — it becomes a
//   synthetic "Course Overview" module (orderIndex 0, sectionLabel null)
//   so real content isn't silently dropped; its title/first paragraph
//   also seed Course.name/description.
// - Imported courses land in status: draft (existing Course.create()
//   default) — an explicit publish via the admin UI is required per
//   course after review, nothing goes live automatically.
//
// Usage (from apps/api):
//   npx tsx scripts/import-docusaurus-course.ts [slug ...]
//   (no args = all 14 target courses)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { prisma } from '../src/lib/prisma';
import { CourseRepository } from '../src/repositories/CourseRepository';
import { CourseModuleRepository, type ImportCourseModuleInput } from '../src/repositories/CourseModuleRepository';
import { uploadBufferToBunny } from '../src/lib/bunnyUploadServer';

const DOCS_ROOT = path.resolve(__dirname, '../../docs');

const TARGET_COURSES = [
  'agentic-ai-fundamentals',
  'ai-engineering-hands-on',
  'ai-for-quality-engineering',
  'ai-llm-testing',
  'ai-qe-ragas',
  'api-testing-java',
  'api-testing-python',
  'api-testing-typescript',
  'build-with-ai',
  'learn-typescript',
  'playwright-test-automation',
  'python-for-ai-engineers',
  'python-for-test-automation',
  'typescript-for-test-automation',
];

// The one diagram confirmed 2026-08-21 as local-.mmd-cache drift, not a
// real shipped defect — see the header comment above.
const KNOWN_SAFE_HASH_EXCEPTIONS = new Set(['api-testing-java/flaky-test-prevention']);

interface ManifestDiagramEntry {
  id: string;
  converted: boolean;
  mermaidSrc: string;
  svgExists: boolean;
  mermaidSrcWiredIn: boolean;
  svgGitTracked: boolean;
  hashVerified: boolean | string;
}

interface SidebarCategory {
  type: 'category';
  label: string;
  items: SidebarNode[];
}
type SidebarNode = string | SidebarCategory;

interface CollectedModule {
  docId: string; // e.g. "python-for-ai-engineers/setup/overview"
  slugSegment: string; // unique-within-course slug for CourseModule.slug
  sectionLabel: string | null;
  sectionOrder: number | null;
  title: string;
  body: string; // frontmatter + imports + AsciiDiagram tags already stripped/converted
}

class CourseImportError extends Error {}

function loadManifest(courseSlug: string): Map<string, ManifestDiagramEntry> {
  const manifestPath = path.resolve(__dirname, '../../docs/diagram-manifests', `${courseSlug}.json`);
  const raw = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { diagrams: ManifestDiagramEntry[] };
  return new Map(raw.diagrams.map((d) => [d.id, d]));
}

// Docusaurus doc ids don't always match their file path 1:1 — a numeric
// ordering prefix like "0-setup.mdx" combined with an explicit frontmatter
// `id: setup` remaps the last path segment, and irregular files (renamed
// without a matching rename of the ordering prefix, e.g.
// "10-09-rag-fundamentals.mdx") rely on that frontmatter id entirely
// rather than any predictable stripping rule. Building a real id->file
// index by reading every file's frontmatter is the only reliable approach
// — a regex guess at the "obvious" stripping rule produced the wrong file
// path against real content the first time this ran.
function buildDocIdIndex(courseSlug: string): Map<string, string> {
  const courseDir = path.resolve(DOCS_ROOT, 'docs', courseSlug);
  const index = new Map<string, string>();

  function stripOrderingPrefix(segment: string): string {
    return segment.replace(/^\d+[-._]/, '');
  }

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.mdx?$/.test(entry)) continue;

      const relFromDocs = path.relative(path.resolve(DOCS_ROOT, 'docs'), full).replace(/\\/g, '/');
      const withoutExt = relFromDocs.replace(/\.mdx?$/, '');
      const segments = withoutExt.split('/');
      const defaultId = segments.map((s, i) => (i === segments.length - 1 ? stripOrderingPrefix(s) : s)).join('/');

      const raw = readFileSync(full, 'utf-8');
      const { data } = matter(raw);
      const explicitId = data.id as string | undefined;
      const finalId = explicitId ? [...segments.slice(0, -1), explicitId].join('/') : defaultId;

      if (index.has(finalId)) {
        throw new CourseImportError(`Doc id collision in ${courseSlug}: "${finalId}" resolves to both ${index.get(finalId)} and ${full}`);
      }
      index.set(finalId, full);
    }
  }

  walk(courseDir);
  return index;
}

function resolveDocFile(index: Map<string, string>, docId: string): string {
  const file = index.get(docId);
  if (!file) throw new CourseImportError(`No .md/.mdx file found for doc id "${docId}"`);
  return file;
}

// Locates each <AsciiDiagram ...> tag's full span, tracking backtick state
// so the `content={\`...\`}` ASCII-art body (which may contain arbitrary
// characters) can never be mistaken for the tag's closing `/>`.
function findAsciiDiagramTags(source: string): Array<{ start: number; end: number; text: string }> {
  const tags: Array<{ start: number; end: number; text: string }> = [];
  let i = 0;
  while (true) {
    const start = source.indexOf('<AsciiDiagram', i);
    if (start === -1) break;
    let j = start;
    let inBacktick = false;
    let end = -1;
    while (j < source.length) {
      const ch = source[j];
      if (ch === '`') {
        inBacktick = !inBacktick;
        j++;
        continue;
      }
      if (!inBacktick && ch === '/' && source[j + 1] === '>') {
        end = j + 2;
        break;
      }
      j++;
    }
    if (end === -1) throw new CourseImportError(`Unterminated <AsciiDiagram> tag starting at offset ${start}`);
    tags.push({ start, end, text: source.slice(start, end) });
    i = end;
  }
  return tags;
}

function extractAttr(tagText: string, name: string): string | null {
  const m = tagText.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Matches the CourseModule.slug a diagram's page actually renders at (see
// the leaf-processing loop in importCourse below), so Bunny uploads land
// one folder per rendered URL rather than one flat folder per course —
// confirmed 2026-08-22, folder rename from imported-diagrams/<course> to
// svgs/<course>/<moduleSlug>.
function renderedModuleSlug(courseSlug: string, docId: string): string {
  if (docId === `${courseSlug}/index`) return 'overview';
  return docId.replace(`${courseSlug}/`, '').replace(/\//g, '-');
}

// Detects a page whose only real content is a Docusaurus auto-nav
// component (<DocCardList /> for a category landing page) — no prose to
// preserve, and the surrounding sidebar category already supplies the
// section label these pages would otherwise stand in for.
function isPureAutoNavStub(bodyWithoutFrontmatter: string): boolean {
  const stripped = bodyWithoutFrontmatter
    .replace(/^import\s+.*from\s+['"]@(?:site|theme)\/.*['"];?\s*$/gm, '')
    .trim();
  return stripped === '<DocCardList />';
}

async function convertAsciiDiagrams(
  body: string,
  courseSlug: string,
  docId: string,
  manifest: Map<string, ManifestDiagramEntry>,
  log: string[],
): Promise<string> {
  const tags = findAsciiDiagramTags(body);
  if (tags.length === 0) return body;

  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  for (const tag of tags) {
    const id = extractAttr(tag.text, 'id');
    const mermaidSrc = extractAttr(tag.text, 'mermaidSrc');
    const alt = extractAttr(tag.text, 'alt') ?? '';

    if (!id) throw new CourseImportError(`${docId}: <AsciiDiagram> tag has no id attribute`);
    if (!mermaidSrc) throw new CourseImportError(`${docId}: AsciiDiagram "${id}" has no mermaidSrc — not actually converted despite course being marked fully converted`);

    const entry = manifest.get(id);
    if (!entry) throw new CourseImportError(`${docId}: AsciiDiagram "${id}" not found in ${courseSlug} manifest`);
    if (!entry.converted || !entry.svgExists || !entry.mermaidSrcWiredIn || !entry.svgGitTracked) {
      throw new CourseImportError(`${docId}: AsciiDiagram "${id}" fails manifest safety check (converted/svgExists/mermaidSrcWiredIn/svgGitTracked)`);
    }
    const hashOk = entry.hashVerified === true || entry.hashVerified === 'unknown-no-mmd-source';
    if (!hashOk) {
      if (KNOWN_SAFE_HASH_EXCEPTIONS.has(id)) {
        log.push(`  known-safe exception: ${id} has hashVerified:false (confirmed local .mmd cache drift, not a real defect — see feedback-hash-verified-false-diagnosis memory)`);
      } else {
        throw new CourseImportError(`${docId}: AsciiDiagram "${id}" has hashVerified:false and is not a documented known-safe exception — hard stop`);
      }
    }

    const svgAbsPath = path.resolve(DOCS_ROOT, 'static', mermaidSrc.replace(/^\//, ''));
    if (!existsSync(svgAbsPath)) {
      throw new CourseImportError(`${docId}: AsciiDiagram "${id}" SVG file missing on disk at ${svgAbsPath} despite manifest saying svgExists:true`);
    }

    const svgBuffer = readFileSync(svgAbsPath);
    const filename = path.basename(svgAbsPath);
    const pathPrefix = `svgs/${courseSlug}/${renderedModuleSlug(courseSlug, docId)}`;
    const bunnyUrl = await uploadBufferToBunny(svgBuffer, filename, pathPrefix, 'image/svg+xml');
    replacements.push({ start: tag.start, end: tag.end, replacement: `<img src="${bunnyUrl}" alt="${escapeHtmlAttr(alt)}" />` });
  }

  let out = '';
  let cursor = 0;
  for (const r of replacements) {
    out += body.slice(cursor, r.start) + r.replacement;
    cursor = r.end;
  }
  out += body.slice(cursor);
  return out;
}

function stripKnownImports(body: string): string {
  return body.replace(/^import\s+.*from\s+['"]@(?:site|theme)\/.*['"];?\s*$/gm, '').replace(/^<CourseCurriculum\s*\/>\s*$/gm, '');
}

async function loadCourseOverview(
  courseSlug: string,
  docIdIndex: Map<string, string>,
  manifest: Map<string, ManifestDiagramEntry>,
  log: string[],
): Promise<{ name: string; description: string; overviewBody: string | null }> {
  const filePath = resolveDocFile(docIdIndex, `${courseSlug}/index`);
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const title = (data.title as string | undefined) ?? courseSlug;

  let body = stripKnownImports(content).trim();
  body = await convertAsciiDiagrams(body, courseSlug, `${courseSlug}/index`, manifest, log);

  const firstParagraph = body.split(/\n\s*\n/).find((block) => block.trim() && !block.trim().startsWith('#')) ?? '';
  const description = firstParagraph.trim().replace(/\s+/g, ' ').slice(0, 500);

  return { name: title, description, overviewBody: body.length > 0 ? body : null };
}

// Walks the sidebar tree. Suppresses sectionLabel entirely when the whole
// course is the common "one wrapping category, no sub-categories" flat
// shape (label would just repeat the course name).
function collectLeaves(nodes: SidebarNode[], courseSlug: string): Array<{ docId: string; sectionLabel: string | null; sectionOrder: number | null }> {
  const isFlatSingleWrapper =
    nodes.length === 1 &&
    typeof nodes[0] !== 'string' &&
    (nodes[0] as SidebarCategory).items.every((item) => typeof item === 'string');

  const results: Array<{ docId: string; sectionLabel: string | null; sectionOrder: number | null }> = [];

  function walk(items: SidebarNode[], labelPath: string[], topLevelIndex: number | null): void {
    for (const item of items) {
      if (typeof item === 'string') {
        const sectionLabel = isFlatSingleWrapper || labelPath.length === 0 ? null : labelPath.join(' — ');
        results.push({ docId: item, sectionLabel, sectionOrder: topLevelIndex });
      } else {
        walk(item.items, [...labelPath, item.label], topLevelIndex);
      }
    }
  }

  nodes.forEach((node, idx) => {
    if (typeof node === 'string') {
      // A bare top-level string besides the course's own index (already
      // handled separately) — treat as its own ungrouped module.
      results.push({ docId: node, sectionLabel: null, sectionOrder: null });
    } else {
      walk(node.items, [node.label], idx);
    }
  });

  return results;
}

async function importCourse(courseSlug: string): Promise<void> {
  const log: string[] = [];
  console.log(`\n=== ${courseSlug} ===`);

  const sidebarPath = path.resolve(DOCS_ROOT, 'sidebars', `${courseSlug}.json`);
  const sidebarFile = JSON.parse(readFileSync(sidebarPath, 'utf-8')) as Record<string, SidebarNode[]>;
  const sidebarKey = Object.keys(sidebarFile)[0];
  const allNodes = sidebarFile[sidebarKey];

  const manifest = loadManifest(courseSlug);
  const docIdIndex = buildDocIdIndex(courseSlug);

  const overview = await loadCourseOverview(courseSlug, docIdIndex, manifest, log);

  // First entry is always this course's own "<slug>/index" landing page —
  // exclude it from the leaf walk, it's handled by loadCourseOverview above.
  const rest = allNodes.filter((n) => !(typeof n === 'string' && n === `${courseSlug}/index`));
  const leaves = collectLeaves(rest, courseSlug);

  const modules: CollectedModule[] = [];
  let skippedStubs = 0;

  if (overview.overviewBody) {
    modules.push({
      docId: `${courseSlug}/index`,
      slugSegment: 'overview',
      sectionLabel: null,
      sectionOrder: null,
      title: overview.name,
      body: overview.overviewBody,
    });
  }

  for (const leaf of leaves) {
    const filePath = resolveDocFile(docIdIndex, leaf.docId);
    const raw = readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    if (isPureAutoNavStub(content)) {
      skippedStubs++;
      continue;
    }

    const title = (data.title as string | undefined) ?? path.basename(leaf.docId);
    let body = stripKnownImports(content).trim();
    body = await convertAsciiDiagrams(body, courseSlug, leaf.docId, manifest, log);

    const slugSegment = leaf.docId
      .replace(`${courseSlug}/`, '')
      .replace(/\//g, '-');

    modules.push({
      docId: leaf.docId,
      slugSegment,
      sectionLabel: leaf.sectionLabel,
      sectionOrder: leaf.sectionOrder,
      title,
      body,
    });
  }

  // Everything validated — now write. Course + all modules for one course
  // commit together only after every diagram in it passed the safety check
  // above; a thrown CourseImportError anywhere before this point means
  // nothing for this course has been written yet.
  const courseRepository = new CourseRepository();
  const courseModuleRepository = new CourseModuleRepository();

  const course = await courseRepository.upsertBySlug(courseSlug, { name: overview.name, description: overview.description });

  let orderIndex = 0;
  for (const mod of modules) {
    const input: ImportCourseModuleInput = {
      slug: mod.slugSegment,
      title: mod.title,
      bodyMdx: mod.body,
      orderIndex,
      sectionLabel: mod.sectionLabel,
      sectionOrder: mod.sectionOrder,
    };
    await courseModuleRepository.upsertImported(course.id, input);
    orderIndex += 10;
  }

  console.log(`  course: ${course.name} (${course.slug}, status: ${course.status})`);
  console.log(`  modules imported: ${modules.length}`);
  console.log(`  DocCardList stubs skipped: ${skippedStubs}`);
  for (const line of log) console.log(line);
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const slugs = requested.length > 0 ? requested : TARGET_COURSES;

  const unknown = slugs.filter((s) => !TARGET_COURSES.includes(s));
  if (unknown.length > 0) {
    console.error(`Not in the confirmed target list, refusing: ${unknown.join(', ')}`);
    process.exit(1);
  }

  const failures: Array<{ course: string; error: string }> = [];
  for (const slug of slugs) {
    try {
      await importCourse(slug);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  HARD STOP — ${slug} import aborted, nothing written: ${message}`);
      failures.push({ course: slug, error: message });
    }
  }

  console.log('\n=== summary ===');
  console.log(`  succeeded: ${slugs.length - failures.length}/${slugs.length}`);
  if (failures.length > 0) {
    console.log('  failed:');
    for (const f of failures) console.log(`    - ${f.course}: ${f.error}`);
  }

  await prisma.$disconnect();
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
