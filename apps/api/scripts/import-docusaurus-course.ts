// Imports fully-diagram-converted Docusaurus courses (apps/docs) into the
// Course/CourseModule Postgres model. Scope and design decisions confirmed
// with the user 2026-08-21/22 (see memory: sypher-next-docusaurus-importer):
//
// - Only courses whose diagram-manifests/summary.json entry has pending: 0
//   and hashMismatches: 0, listed in TARGET_COURSES below.
// - 2026-09-05: extended to 6 more courses (sorting-algorithms,
//   search-algorithms, solid-principles, design-patterns,
//   git-github-actions, coding-bootcamp), all confirmed pending:0/
//   hashMismatches:0 in summary.json. coding-bootcamp was previously held
//   back deliberately (it depends on apps/docs's separate Judge0/Supabase
//   auth stack for its interactive code-execution exercises, which this
//   importer does not carry over — plain content only) — added to the
//   allowlist per this session's request, but not yet actually imported;
//   flag the Judge0 gap again before running it for real.
//   solid-principles/design-patterns structurally spot-checked (per-language
//   leaf docs under a DocCardList-stub category index, course-level index
//   with <CourseCurriculum/>) — both match patterns this script already
//   handles, no code changes needed for them.
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
//   npx tsx scripts/import-docusaurus-course.ts --verify [slug ...]
// Verification compares stored content against source without uploading or writing.
// All course/module writes use the seeded admin's authenticated management API.
//   (no args = all 20 target courses)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { ImportCourseModuleInput } from '../src/repositories/CourseModuleRepository';
import { uploadBufferToBunny } from '../src/lib/bunnyUploadServer';
import { env } from '../src/lib/env';
import { readableBlackboardSvg, diagramSvgFilename } from '../src/lib/diagramSvg';
import { diagramCaption, renderDiagramFigure } from '../src/lib/diagramMarkup';

const DOCS_ROOT = path.resolve(__dirname, '../../docs');
const API_URL = process.env.IMPORT_API_URL || 'http://localhost:4000';
let sessionCookie = '';
const VERIFY_ONLY = process.argv.includes('--verify');

async function findCourse(slug: string): Promise<any> {
  for (let offset = 0; ; offset += 100) {
    const page = await api('GET', `/courses/manage/list?limit=100&offset=${offset}`);
    const found = page.courses.find((c: { slug: string }) => c.slug === slug);
    if (found) return found;
    if (offset + page.courses.length >= page.total || !page.courses.length) return undefined;
  }
}

async function api<T = any>(method: string, route: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${route}: HTTP ${response.status}`);
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

async function login(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.IMPORT_ADMIN_EMAIL || 'admin@sypher.local',
      password: process.env.IMPORT_ADMIN_PASSWORD || 'devpassword123',
    }),
  });
  if (!response.ok) throw new Error(`Admin login failed: HTTP ${response.status}`);
  sessionCookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  if (!sessionCookie) throw new Error('Admin login returned no session cookie');
}

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
  // Added 2026-09-05 (see header comment above):
  'sorting-algorithms',
  'search-algorithms',
  'solid-principles',
  'design-patterns',
  'git-github-actions',
  'coding-bootcamp',
  // Added 2026-09-20: virtual course carved out of system-design-fundamentals Section 14.
  'ai-system-design',
];

// A "virtual" course is a slice of a larger Docusaurus course: it reads the docs, manifest and
// sidebar of `docsCourse`, but only the sidebar category named `sidebarSection`, and lands in the
// database under its own slug/name/category. Each topic (sidebar sub-category) becomes a section.
// There is no course-level index page to seed a Course Overview from, so none is created.
const VIRTUAL_COURSES: Record<string, { docsCourse: string; sidebarSection: string; name: string; description: string; category: string }> = {
  'ai-system-design': {
    docsCourse: 'system-design-fundamentals',
    sidebarSection: 'Section 14 - AI System Design',
    name: 'AI System Design',
    description: 'Nine topics on designing AI-powered systems: LLM serving, embeddings, vector databases, RAG architecture, AI agent architecture, model routing, prompt caching, AI observability and AI cost optimization.',
    category: 'System Design',
  },
};

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
// characters) can never be mistaken for either a self-closing `/>` or a
// paired `</AsciiDiagram>` close.
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
      if (!inBacktick && source.startsWith('</AsciiDiagram>', j)) {
        end = j + '</AsciiDiagram>'.length;
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
function renderedModuleSlug(docsSlug: string, docId: string): string {
  if (docId === `${docsSlug}/index`) return 'overview';
  return docId.replace(`${docsSlug}/`, '').replace(/\//g, '-');
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
  docsSlug: string,
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
    const caption = diagramCaption(extractAttr(tag.text, 'caption'), extractAttr(tag.text, 'title'));

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

    const svgBuffer = readableBlackboardSvg(readFileSync(svgAbsPath));
    const filename = diagramSvgFilename(path.basename(svgAbsPath), svgBuffer);
    const pathPrefix = `svgs/${courseSlug}/${renderedModuleSlug(docsSlug, docId)}`;
    const bunnyUrl = VERIFY_ONLY
      ? `${env.bunny.pullZoneUrl.replace(/\/+$/, '')}/${pathPrefix}/${filename}`
      : await uploadBufferToBunny(svgBuffer, filename, pathPrefix, 'image/svg+xml');
    replacements.push({ start: tag.start, end: tag.end, replacement: renderDiagramFigure(bunnyUrl, alt, caption) });
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

// Mermaid emits different selectors and inline colours for each diagram type.
// This final, high-specificity palette makes the exported SVG itself the source
// of truth, so the same asset stays consistent in both app themes and when it is
// opened directly from Bunny.

function stripKnownImports(body: string): string {
  return body.replace(/^import\s+.*from\s+['"]@(?:site|theme)\/.*['"];?\s*$/gm, '').replace(/^<CourseCurriculum\s*\/>\s*$/gm, '');
}

// The reader renders <h1>{module.title}</h1> itself (Course-Creation-
// Guide.md's "no leading # H1" rule) — but that's a hand-authoring
// convention, not something Docusaurus source respects. A doc whose body
// leads with its own "# <title>" (common Docusaurus authoring habit,
// usually restating the frontmatter title verbatim) would otherwise render
// that heading twice. Only strips a genuine leading H1 (the very first
// line of the trimmed body), never a "# " that happens to appear inside a
// code fence further down.
function stripLeadingH1(body: string): string {
  return body.replace(/^#\s+.+(?:\r?\n)*/, '');
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

  let body = stripLeadingH1(stripKnownImports(content).trim()).trim();
  body = await convertAsciiDiagrams(body, courseSlug, courseSlug, `${courseSlug}/index`, manifest, log);

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
  console.log(`
=== ${courseSlug} ===`);

  const virtual = VIRTUAL_COURSES[courseSlug];
  const docsSlug = virtual ? virtual.docsCourse : courseSlug;

  const sidebarPath = path.resolve(DOCS_ROOT, 'sidebars', `${docsSlug}.json`);
  const sidebarFile = JSON.parse(readFileSync(sidebarPath, 'utf-8')) as Record<string, SidebarNode[]>;
  const sidebarKey = Object.keys(sidebarFile)[0];
  let allNodes = sidebarFile[sidebarKey];
  if (virtual) {
    const section = allNodes.find((n): n is SidebarCategory => typeof n !== 'string' && n.label === virtual.sidebarSection);
    if (!section) throw new CourseImportError(`Sidebar section "${virtual.sidebarSection}" not found in ${docsSlug}`);
    allNodes = section.items;
  }

  const manifest = loadManifest(docsSlug);
  const docIdIndex = buildDocIdIndex(docsSlug);

  // A virtual course has no course-level index page, hence no synthetic Course Overview module.
  const overview = virtual
    ? { name: virtual.name, description: virtual.description, overviewBody: null as string | null }
    : await loadCourseOverview(courseSlug, docIdIndex, manifest, log);

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
    let body = stripLeadingH1(stripKnownImports(content).trim()).trim();
    body = await convertAsciiDiagrams(body, courseSlug, docsSlug, leaf.docId, manifest, log);

    const slugSegment = leaf.docId
      .replace(`${docsSlug}/`, '')
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

  // All content converted before database writes. Each authenticated request
  // commits independently; reruns resume by stable course/module slug.
  let course = await findCourse(courseSlug);
  if (VERIFY_ONLY) {
    if (!course) throw new Error(`Course missing: ${courseSlug}`);
    const stored = await api('GET', `/courses/${course.id}/manage/modules`);
    if (stored.length !== modules.length) throw new Error(`Module count differs: ${stored.length} vs ${modules.length}`);
    for (const [index, mod] of modules.entries()) {
      const actual = stored[index];
      if (actual.slug !== mod.slugSegment || actual.title !== mod.title || actual.bodyMdx !== mod.body ||
          actual.orderIndex !== index * 10 || actual.sectionLabel !== mod.sectionLabel || actual.sectionOrder !== mod.sectionOrder) {
        throw new Error(`Stored module differs from source: ${mod.docId}`);
      }
    }
    console.log(`  VERIFIED: ${modules.length} exact source bodies, titles, slugs, order and sections; status=${course.status}`);
    return;
  }
  const fields = {
    name: overview.name,
    description: overview.description,
    category: virtual ? virtual.category : 'tech',
  };
  if (course) {
    await api('PUT', `/courses/${course.id}`, fields);
  } else {
    course = await api('POST', '/courses', { slug: courseSlug, ...fields });
  }

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
    await api('POST', `/courses/${course.id}/modules/import`, input);
    orderIndex += 10;
  }

  console.log(`  course: ${course.name} (${course.slug}, status: ${course.status})`);
  console.log(`  modules imported: ${modules.length}`);
  console.log(`  DocCardList stubs skipped: ${skippedStubs}`);
  for (const line of log) console.log(line);
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2).filter(arg => arg !== '--verify');
  const slugs = requested.length > 0 ? requested : TARGET_COURSES;

  const unknown = slugs.filter((s) => !TARGET_COURSES.includes(s));
  if (unknown.length > 0) {
    console.error(`Not in the confirmed target list, refusing: ${unknown.join(', ')}`);
    process.exit(1);
  }

  const failures: Array<{ course: string; error: string }> = [];
  await login();
  for (const slug of slugs) {
    try {
      await importCourse(slug);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  HARD STOP — ${slug} import stopped (completed API writes may remain; rerun to resume): ${message}`);
      failures.push({ course: slug, error: message });
    }
  }

  console.log('\n=== summary ===');
  console.log(`  succeeded: ${slugs.length - failures.length}/${slugs.length}`);
  if (failures.length > 0) {
    console.log('  failed:');
    for (const f of failures) console.log(`    - ${f.course}: ${f.error}`);
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
