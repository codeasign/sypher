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
//   (no args = all 20 target courses)

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
  // Added 2026-09-05 (see header comment above):
  'sorting-algorithms',
  'search-algorithms',
  'solid-principles',
  'design-patterns',
  'git-github-actions',
  'coding-bootcamp',
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
    const caption = extractAttr(tag.text, 'caption');

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
    const filename = path.basename(svgAbsPath);
    const pathPrefix = `svgs/${courseSlug}/${renderedModuleSlug(courseSlug, docId)}`;
    const bunnyUrl = await uploadBufferToBunny(svgBuffer, filename, pathPrefix, 'image/svg+xml');
    // <figure>/<figcaption> aren't in the reader's rehype-sanitize allowlist
    // (CourseModuleArticle.tsx extends defaultSchema with only 'u') — a
    // plain italic paragraph is the closest allowed equivalent, so a
    // caption survives instead of being silently dropped like before.
    const captionHtml = caption ? `\n\n<p><em>${escapeHtmlAttr(caption)}</em></p>` : '';
    replacements.push({ start: tag.start, end: tag.end, replacement: `<img src="${bunnyUrl}" alt="${escapeHtmlAttr(alt)}" />${captionHtml}` });
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
function readableBlackboardSvg(buffer: Buffer): Buffer {
  const svg = buffer.toString('utf8');
  const style = `<style data-sypher-theme="blackboard-v3">
#my-svg{background:#0B0F14!important;background-color:#0B0F14!important;color:#E8EEF5!important;}
#my-svg text,#my-svg tspan,#my-svg .nodeLabel,#my-svg .nodeLabel *,#my-svg .edgeLabel,#my-svg .edgeLabel *,#my-svg .label,#my-svg .label *,#my-svg .labelText,#my-svg .loopText,#my-svg .messageText,#my-svg .noteText,#my-svg .actor,#my-svg .actor *,#my-svg .cluster-label,#my-svg .cluster-label *,#my-svg .classTitleText,#my-svg .taskText,#my-svg .taskTextOutsideRight,#my-svg .taskTextOutsideLeft,#my-svg .sectionTitle,#my-svg .titleText,#my-svg .pieTitleText,#my-svg .legend,#my-svg .branch-label,#my-svg .commit-label,#my-svg .mindmap-node,#my-svg .timeline-node,#my-svg .packetLabel,#my-svg .architecture-service,#my-svg foreignObject,#my-svg foreignObject *{color:#E8EEF5!important;fill:#E8EEF5!important;stroke:none!important;}
#my-svg .node rect,#my-svg .node circle,#my-svg .node ellipse,#my-svg .node polygon,#my-svg .node .label-container,#my-svg .node .outer-path,#my-svg g.classGroup rect,#my-svg .statediagram-state rect,#my-svg .statediagram-state polygon,#my-svg rect.actor,#my-svg .actor-box,#my-svg .labelBox,#my-svg .requirementBox,#my-svg .elementBox,#my-svg .entityBox,#my-svg .attributeBoxEven,#my-svg .attributeBoxOdd,#my-svg .block rect,#my-svg .block polygon,#my-svg .kanban-item .label-container,#my-svg .architecture-service rect,#my-svg .architecture-group rect,#my-svg .c4Shape rect,#my-svg .packet rect,#my-svg [class*="packet"] rect,#my-svg [class*="event"] .label-container,#my-svg [class*="swimlane"] .label-container{fill:#16202C!important;stroke:#5EA3E6!important;}
#my-svg .node .label-container path,#my-svg .node .outer-path path,#my-svg .node-bkg{stroke:#5EA3E6!important;}#my-svg .node .label-container path[fill]:not([fill="none"]):not([fill="transparent"]),#my-svg .node .outer-path path[fill]:not([fill="none"]):not([fill="transparent"]),#my-svg .node-bkg{fill:#16202C!important;}
#my-svg rect[class*="task"],#my-svg polygon[class*="task"],#my-svg .journey-section rect,#my-svg .gantt .task,#my-svg .kanban-item rect,#my-svg .timeline-node rect,#my-svg .timeline-node-section rect,#my-svg .architecture-service .label-container,#my-svg .architecture-group .label-container,#my-svg .person rect,#my-svg .system rect,#my-svg .container rect,#my-svg .component rect{fill:#16202C!important;stroke:#5EA3E6!important;}
#my-svg .cluster rect,#my-svg .cluster polygon,#my-svg .architecture-group rect,#my-svg .boundary,#my-svg .section,#my-svg .kanban-section{fill:#101720!important;stroke:#33465C!important;}
#my-svg rect.note,#my-svg polygon.note,#my-svg .note rect,#my-svg .note polygon,#my-svg .statediagram-note rect,#my-svg .note-cluster rect{fill:#16202C!important;stroke:#5EA3E6!important;}
#my-svg .labelBkg,#my-svg .edgeLabel rect,#my-svg .edgeLabel polygon,#my-svg .edgeLabel span,#my-svg .relationshipLabelBox,#my-svg .requirementLabelBox{fill:#0B0F14!important;background:#0B0F14!important;background-color:#0B0F14!important;}
#my-svg .flowchart-link,#my-svg .edgePath path,#my-svg .edgePaths path,#my-svg .messageLine0,#my-svg .messageLine1,#my-svg .actor-line,#my-svg .loopLine,#my-svg .relation,#my-svg .relationshipLine,#my-svg .transition,#my-svg .requirementRelation,#my-svg .mindmap-edge,#my-svg .timeline-edge,#my-svg .architecture-edge,#my-svg .c4Shape line,#my-svg .divider,#my-svg .divider path,#my-svg line{stroke:#5EA3E6!important;}
#my-svg .gitGraph path,#my-svg path[class*="branch"],#my-svg path[class*="edge"],#my-svg path[class*="relation"],#my-svg path[class*="transition"],#my-svg path[class*="connector"],#my-svg path[class*="link"]{stroke:#5EA3E6!important;}
#my-svg marker path,#my-svg marker polygon,#my-svg .marker,#my-svg .arrowMarkerPath,#my-svg [id*="arrowhead"] path,#my-svg [id*="arrowhead"] polygon,#my-svg [id*="composition"] path,#my-svg [id*="composition"] polygon,#my-svg [id*="dependency"] path,#my-svg [id*="dependency"] polygon,#my-svg [id*="extension"] path,#my-svg [id*="extension"] polygon,#my-svg [id*="aggregation"] path,#my-svg [id*="aggregation"] polygon{fill:#5EA3E6!important;stroke:#5EA3E6!important;}
#my-svg .state-start,#my-svg .state-end,#my-svg .commit,#my-svg .quadrant-point{fill:#5EA3E6!important;stroke:#5EA3E6!important;}
#my-svg .grid .tick line,#my-svg .axis-line,#my-svg .quadrant-x-axis line,#my-svg .quadrant-y-axis line,#my-svg .radar-axis-line,#my-svg .radar-graticule{stroke:#33465C!important;}
#my-svg .sankey-link{stroke:#5EA3E6!important;fill:none!important;}
#my-svg .label-icon path,#my-svg .icon-shape path,#my-svg .icon-neo path{fill:#E8EEF5!important;stroke:#E8EEF5!important;}
</style>`;
  return Buffer.from(svg.replace('</svg>', `${style}</svg>`), 'utf8');
}

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
    let body = stripLeadingH1(stripKnownImports(content).trim()).trim();
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

  const course = await courseRepository.upsertBySlug(courseSlug, {
    name: overview.name,
    description: overview.description,
    category: 'tech',
  });

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
