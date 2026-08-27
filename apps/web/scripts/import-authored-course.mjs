#!/usr/bin/env node
/**
 * Authored-course importer for Sypher Next — drives apps/web's own
 * management API instead of touching the database directly.
 *
 * Replaces the retired apps/app compose-authored-course.mjs service-role
 * path: every write here goes through the same tsoa endpoints the
 * /manage-courses UI calls via src/data/courses.ts, authenticated by the
 * committed dev-seed admin's session cookie (apps/api/prisma/seed.ts).
 *
 * Input: a staging directory of .mdx files, one per module, YAML
 * frontmatter (title, order) + markdown body below the fence. Files are
 * imported in `order`, which becomes order_index order, which decides the
 * free-preview window.
 *
 * Usage (from apps/web):
 *   node scripts/import-authored-course.mjs --api http://localhost:4000 \
 *     --course <course-slug> --name "Course Name" \
 *     [--description "..."] --input scratch/<dir> \
 *     [--roles FREE_USER,PAID_USER] [--publish]
 *
 * Idempotent: an existing course is reused (name/description updated), and
 * modules are matched by their slugified title for update-in-place rather
 * than duplicated.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dev-seed credentials only (already public in apps/api/prisma/seed.ts).
const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL || 'admin@sypher.local';
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD || 'devpassword123';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--api') args.api = argv[i + 1];
    if (argv[i] === '--course') args.course = argv[i + 1];
    if (argv[i] === '--name') args.name = argv[i + 1];
    if (argv[i] === '--description') args.description = argv[i + 1];
    if (argv[i] === '--input') args.input = argv[i + 1];
    if (argv[i] === '--roles') args.roles = argv[i + 1];
    // "tech" | "life-skills"
    if (argv[i] === '--category') args.category = argv[i + 1];
    // CSV of related course slugs, e.g. "a,b,c"
    if (argv[i] === '--related') args.related = argv[i + 1];
    // Target audience role, e.g. "developer" | "qa" | "engineering-manager"
    if (argv[i] === '--role') args.role = argv[i + 1];
    if (argv[i] === '--publish') args.publish = true;
  }
  return args;
}

function die(message) {
  console.error(`[import-authored-course] ${message}`);
  process.exit(1);
}

// Mirrors apps/api/src/lib/slug.ts so staged titles predict the same
// module slugs the API will generate.
function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookie = null;
  }

  async login() {
    const res = await this.raw('POST', '/auth/login', {
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) die(`Login failed (${res.status}). Is the API running and seeded (npm run dev in apps/api)?`);
    // The session cookie is set via Set-Cookie; keep name=value pairs only.
    const cookies = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .filter(Boolean);
    this.cookie = cookies.join('; ');
    if (!this.cookie) die('Login succeeded but no session cookie was returned.');
    console.log('[import] logged in as', ADMIN_EMAIL);
  }

  raw(method, urlPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) headers.Cookie = this.cookie;
    return fetch(`${this.baseUrl}${urlPath}`, { method, ...options, headers });
  }

  async json(method, urlPath, body) {
    const res = await this.raw(method, urlPath, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      die(`${method} ${urlPath} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return res.status === 204 ? null : res.json();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.api || !args.course || !args.name || !args.input) {
    die('Usage: node scripts/import-authored-course.mjs --api <base> --course <slug> --name "<Name>" --input <stagingDir> [--description "..."] [--roles R1,R2] [--publish]');
  }

  const files = fs.readdirSync(args.input).filter((f) => f.endsWith('.mdx'));
  if (files.length === 0) die(`No .mdx files found in ${args.input}`);

  const batch = files
    .map((file) => {
      const raw = fs.readFileSync(path.join(args.input, file), 'utf-8');
      const { data, content } = matter(raw);
      if (!data.title) die(`${file}: frontmatter is missing "title".`);
      return { file, title: data.title, order: data.order ?? 0, body: content.trim() };
    })
    .sort((a, b) => a.order - b.order);

  const api = new ApiClient(args.api);
  await api.login();

  // ---- course ----
  // /courses/manage/list is paginated ({ courses, total }); pull a page
  // large enough to cover the whole catalog (server caps at 1000).
  const { courses: allCourses } = await api.json('GET', '/courses/manage/list?limit=1000');
  let course = allCourses.find((c) => c.slug === args.course);
  if (course) {
    await api.json('PUT', `/courses/${course.id}`, {
      name: args.name,
      // Omit when absent; send "" to clear (explicit nulls are rejected by
      // tsoa's Partial<> validators).
      description: args.description ?? undefined,
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.related !== undefined ? { relatedCourses: args.related } : {}),
      ...(args.role !== undefined ? { audienceRole: args.role } : {}),
    });
    console.log(`[import] reusing course "${args.course}" (${course.id})`);
  } else {
    course = await api.json('POST', '/courses', {
      name: args.name,
      slug: args.course,
      description: args.description ?? undefined,
      category: args.category || undefined,
      relatedCourses: args.related || undefined,
      audienceRole: args.role || undefined,
    });
    console.log(`[import] created course "${args.course}" (${course.id})`);
  }

  // ---- modules, strictly in teaching order ----
  const existing = await api.json('GET', `/courses/${course.id}/manage/modules`);
  const bySlug = new Map(existing.map((m) => [m.slug, m]));

  let created = 0;
  let updated = 0;
  for (const mod of batch) {
    const slug = slugify(mod.title);
    const match = bySlug.get(slug);
    if (match) {
      await api.json('PUT', `/courses/${course.id}/modules/${match.id}`, { title: mod.title, bodyMdx: mod.body });
      updated += 1;
      console.log(`[import] updated  ${slug} (${mod.file})`);
    } else {
      await api.json('POST', `/courses/${course.id}/modules`, { title: mod.title, bodyMdx: mod.body });
      created += 1;
      console.log(`[import] inserted ${slug} (${mod.file})`);
    }
  }

  // ---- access roles ----
  if (args.roles) {
    const allowedRoles = args.roles.split(',').map((r) => r.trim()).filter(Boolean);
    if (allowedRoles.length > 0) {
      await api.json('PUT', `/courses/${course.id}/access/roles`, { allowedRoles });
      console.log('[import] access roles:', allowedRoles.join(', '));
    }
  }

  // ---- publish ----
  if (args.publish) {
    await api.json('PUT', `/courses/${course.id}/status`, { status: 'published' });
    console.log('[import] published');
  } else {
    console.log('[import] left as draft (pass --publish to publish)');
  }

  console.log(`[import-authored-course] done: ${created} inserted, ${updated} updated.`);
}

main().catch((err) => die(err.message));
