#!/usr/bin/env node
// Backs up every diagram referenced in a course's CourseModule.bodyMdx by
// downloading it from its LIVE Bunny CDN URL into
// diagram-backups/<course-slug>/<module-name>/<filename>.svg, and
// maintains diagram-backups/manifest.json as the single source of truth
// (INDEX.md is generated FROM it below — never hand-edit INDEX.md).
//
// Deliberately does NOT reuse apps/docs/static/img/diagrams/ as a source:
// confirmed 2026-09-19 that those local files are stale — missing a
// dark-theme CSS fix (`<style data-sypher-theme="blackboard-v3">`) that
// was applied directly to the Bunny-hosted copies and never synced back
// into the repo. Bunny is the only trustworthy source for what's actually
// live, so this script always reads from there.
//
// Idempotent: a diagram whose Bunny ETag hasn't changed since the last
// run is skipped via a conditional GET (304), no re-download. A changed
// or brand-new diagram is fetched, its sha256 recomputed, and only
// written to disk / recorded in the manifest if that hash actually
// differs from what's already there — so re-running after a future
// Bunny-side content fix (the same class of drift this script exists
// because of) correctly picks up only what changed, not all ~1000 files
// again. Running with no arguments processes DEFAULT_COURSES (the
// courses confirmed fully migrated as of 2026-09-19); pass one or more
// course slugs to process a subset instead (e.g. once
// ai-engineering-hands-on is imported: `npx tsx
// scripts/backup-course-diagrams.ts ai-engineering-hands-on`).
//
// Usage (from repo root): npx tsx scripts/backup-course-diagrams.ts [course-slug ...]

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { config as loadEnv } from 'dotenv';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scripts$/, '');
// This is a repo-root script, not run from apps/api — DATABASE_URL lives
// in apps/api/.env, not anywhere dotenv would find by default (which only
// looks at cwd). Loaded explicitly so this works regardless of the
// directory it's invoked from.
loadEnv({ path: join(REPO_ROOT, 'apps', 'api', '.env') });

const prisma = new PrismaClient();
const OUT_ROOT = join(REPO_ROOT, 'diagram-backups');
const MANIFEST_PATH = join(OUT_ROOT, 'manifest.json');
const INDEX_PATH = join(OUT_ROOT, 'INDEX.md');

// Courses confirmed fully migrated (course content + diagrams both
// present and correct in apps/web) as of the 2026-09-19 migration-status
// audit. Append a slug here once a new course is imported and confirmed
// complete, then re-run this script (with or without args — an appended
// DEFAULT_COURSES entry is picked up by a no-args run automatically).
const DEFAULT_COURSES = [
  'agentic-ai-fundamentals',
  'ai-for-quality-engineering',
  'ai-llm-testing',
  'ai-qe-ragas',
  'api-testing-java',
  'api-testing-python',
  'api-testing-typescript',
  'build-with-ai',
  'design-patterns',
  'git-github-actions',
  'learn-typescript',
  'playwright-test-automation',
  'python-for-ai-engineers',
  'python-for-test-automation',
  'search-algorithms',
  'solid-principles',
  'sorting-algorithms',
  'typescript-for-test-automation',
];

interface ManifestEntry {
  courseSlug: string;
  courseName: string;
  moduleSlug: string;
  moduleTitle: string;
  moduleOrder: number;
  diagramIndex: number;
  filename: string;
  localPath: string;
  bunnyUrl: string;
  alt: string;
  sha256: string;
  byteLength: number;
  etag: string | null;
  downloadedAt: string;
}

function sanitize(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'untitled'
  );
}

function loadManifest(): ManifestEntry[] {
  if (!existsSync(MANIFEST_PATH)) return [];
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function keyOf(courseSlug: string, moduleSlug: string, filename: string): string {
  return `${courseSlug}/${moduleSlug}/${filename}`;
}

async function pool<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

const IMG_TAG_RE = /<img\s+[^>]*>/g;
const SRC_RE = /\bsrc="([^"]+)"/;
const ALT_RE = /\balt="([^"]*)"/;
// Some modules' images are stored as Markdown `![alt](url)` instead of an
// HTML <img> tag — found 2026-09-19: apps/web's admin ModuleEditor
// (MDXEditor) silently normalizes <img> to ![]() on save, which is
// harmless for the reader (react-markdown renders either form) but was
// invisible to a regex that only matched <img>, causing exactly one
// diagram (typescript-for-test-automation/setup) to be silently skipped
// by every earlier run of this script despite being fully live. Matched
// separately from IMG_TAG_RE rather than trying to unify into one regex,
// since the two syntaxes have differently-ordered/shaped capture groups.
const MD_IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

interface ExtractedImage {
  url: string;
  alt: string;
  filename: string;
}

function extractImages(bodyMdx: string): ExtractedImage[] {
  const out: ExtractedImage[] = [];
  const seenUrls = new Set<string>();

  for (const tag of bodyMdx.match(IMG_TAG_RE) ?? []) {
    const srcMatch = tag.match(SRC_RE);
    if (!srcMatch) continue;
    const url = srcMatch[1];
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    out.push({ url, alt: (tag.match(ALT_RE) || [])[1] ?? '', filename: url.split('/').pop()! });
  }

  for (const match of bodyMdx.matchAll(MD_IMAGE_RE)) {
    const [, alt, url] = match;
    if (seenUrls.has(url)) continue; // same image referenced both ways — don't double-back-up
    seenUrls.add(url);
    out.push({ url, alt, filename: url.split('/').pop()! });
  }

  return out;
}

interface FetchResult {
  status: 'unchanged' | 'downloaded' | 'failed';
  buf?: Buffer;
  etag?: string | null;
  error?: string;
}

async function fetchIfChanged(url: string, priorEtag: string | null | undefined): Promise<FetchResult> {
  try {
    const headers: Record<string, string> = {};
    if (priorEtag) headers['If-None-Match'] = priorEtag;
    const res = await fetch(url, { headers });
    if (res.status === 304) return { status: 'unchanged', etag: priorEtag ?? null };
    if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: 'downloaded', buf, etag: res.headers.get('etag') };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}

function courseRank(slug: string): number {
  const i = DEFAULT_COURSES.indexOf(slug);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

function generateIndex(manifest: ManifestEntry[]): void {
  const lines: string[] = [
    '# Diagram Backups Index',
    '',
    '**Generated from `manifest.json` — do not hand-edit.** Regenerate with `npx tsx scripts/backup-course-diagrams.ts`.',
    '',
    "Local backup of every diagram from the fully-migrated courses, downloaded from their live Bunny CDN URLs. Ordered to mirror each course's real module sequence (DB `orderIndex`), not alphabetically.",
    '',
    '---',
    '',
  ];
  let curCourse: string | null = null;
  let curModule: string | null = null;
  for (const e of manifest) {
    if (e.courseSlug !== curCourse) {
      curCourse = e.courseSlug;
      curModule = null;
      lines.push(`## ${e.courseName}`, '');
    }
    if (e.moduleTitle !== curModule) {
      curModule = e.moduleTitle;
      lines.push(`### ${e.moduleTitle}`, '');
    }
    lines.push(`- **${e.filename}** — [local backup](./${e.localPath}) · [live Bunny source](${e.bunnyUrl})`);
  }
  lines.push('');
  writeFileSync(INDEX_PATH, lines.join('\n'));
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2);
  const courses = requested.length > 0 ? requested : DEFAULT_COURSES;

  mkdirSync(OUT_ROOT, { recursive: true });
  const priorManifest = loadManifest();
  const priorByKey = new Map(priorManifest.map((e) => [keyOf(e.courseSlug, e.moduleSlug, e.filename), e]));
  // Entries for courses NOT being processed this run are carried forward
  // untouched, so re-running for one course never drops another course's
  // rows from the consolidated manifest.
  const carriedForward = priorManifest.filter((e) => !courses.includes(e.courseSlug));

  const newEntries: ManifestEntry[] = [];
  let downloaded = 0;
  let unchanged = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const slug of courses) {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      console.error(`MISSING COURSE IN DB: ${slug}`);
      continue;
    }
    const modules = await prisma.courseModule.findMany({
      where: { courseId: course.id },
      orderBy: { orderIndex: 'asc' },
    });

    const courseDir = join(OUT_ROOT, slug);
    const usedModuleDirs = new Set<string>();
    let courseCount = 0;

    for (const mod of modules) {
      const diagrams = extractImages(mod.bodyMdx);
      if (diagrams.length === 0) continue;

      let moduleDirName = sanitize(mod.title);
      if (usedModuleDirs.has(moduleDirName)) {
        let n = 2;
        while (usedModuleDirs.has(`${moduleDirName}-${n}`)) n++;
        moduleDirName = `${moduleDirName}-${n}`;
      }
      usedModuleDirs.add(moduleDirName);
      const moduleDir = join(courseDir, moduleDirName);

      const results = await pool(diagrams, 8, async ({ url, alt, filename }, i) => {
        const k = keyOf(slug, mod.slug, filename);
        const prior = priorByKey.get(k);
        const localRelPath = `${slug}/${moduleDirName}/${filename}`;
        const localAbsPath = join(moduleDir, filename);

        const fr = await fetchIfChanged(url, prior?.etag);
        if (fr.status === 'failed') {
          failed++;
          failures.push(`${slug} / ${mod.title} / ${filename}: ${fr.error}`);
          return prior ? { ...prior, moduleOrder: mod.orderIndex, diagramIndex: i + 1 } : null;
        }
        if (fr.status === 'unchanged' && prior) {
          unchanged++;
          return { ...prior, moduleOrder: mod.orderIndex, diagramIndex: i + 1 };
        }

        const buf = fr.buf!;
        const sha256 = createHash('sha256').update(buf).digest('hex');
        if (prior && prior.sha256 === sha256) {
          // ETag rotated but content is byte-identical — refresh the
          // recorded ETag only, don't rewrite an unchanged file to disk.
          unchanged++;
          return { ...prior, etag: fr.etag ?? null, moduleOrder: mod.orderIndex, diagramIndex: i + 1 };
        }

        mkdirSync(moduleDir, { recursive: true });
        writeFileSync(localAbsPath, buf);
        downloaded++;
        courseCount++;
        const entry: ManifestEntry = {
          courseSlug: slug,
          courseName: course.name,
          moduleSlug: mod.slug,
          moduleTitle: mod.title,
          moduleOrder: mod.orderIndex,
          diagramIndex: i + 1,
          filename,
          localPath: localRelPath,
          bunnyUrl: url,
          alt,
          sha256,
          byteLength: buf.length,
          etag: fr.etag ?? null,
          downloadedAt: new Date().toISOString(),
        };
        return entry;
      });

      for (const r of results) {
        if (r) newEntries.push(r as ManifestEntry);
      }
    }
    console.log(`${slug}: ${courseCount} new/changed diagrams downloaded`);
  }

  const fullManifest = [...carriedForward, ...newEntries].sort((a, b) => {
    if (a.courseSlug !== b.courseSlug) {
      const ra = courseRank(a.courseSlug);
      const rb = courseRank(b.courseSlug);
      if (ra !== rb) return ra - rb;
      return a.courseSlug.localeCompare(b.courseSlug);
    }
    if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder;
    return a.diagramIndex - b.diagramIndex;
  });

  writeFileSync(MANIFEST_PATH, JSON.stringify(fullManifest, null, 2));
  generateIndex(fullManifest);

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ downloaded, unchanged, failed, failures, totalInManifest: fullManifest.length }, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
