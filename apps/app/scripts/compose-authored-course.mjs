#!/usr/bin/env node
/**
 * Bulk-writes generated MDX modules into course_modules via the
 * service-role key -- the second of the two authoring paths described in
 * SupabaseSchema.md "Course authoring" (the other being the
 * /manage-courses MDXEditor UI, authoring_mode='manual'). Trusted CLI
 * operation, deliberately bypasses RLS: there is no logged-in author here.
 *
 * .mjs (not .js) so this runs as an ES module regardless of apps/app's
 * package.json having no "type": "module" -- same reason
 * apps/docs/scripts/bake-blog-posts.mjs uses the same extension.
 *
 * Input: a staging directory of .mdx files, one per module, YAML
 * frontmatter (slug, title, order -- a batch-local sort key, not the
 * literal DB order_index) + MDX body below the fence.
 *
 * Usage:
 *   node scripts/compose-authored-course.mjs --course <courseSlug> --input <stagingDir>
 *
 * Upsert matched on (course_id, slug):
 *   - no existing row -> insert, authoring_mode='generated', sparse
 *     order_index appended after whatever already exists in the course
 *     (MAX+1000, +2000, ... sequentially across this batch's inserts).
 *   - existing row, authoring_mode='generated' -> update body_mdx/title
 *     only; never touches order_index / show_in_getting_started /
 *     getting_started_order, so regenerating a module never reshuffles
 *     the module list or un-features it.
 *   - existing row, authoring_mode='manual' -> skip + warn, keep
 *     processing the rest of the batch. One colliding filename (e.g. a
 *     generated "setup.mdx" landing on a hand-written Setup module) never
 *     aborts the whole run.
 *
 * The script never creates the Course itself -- fails loudly if --course
 * doesn't resolve to an existing row (Course + Overview + Setup are always
 * created manually first via /manage-courses, per the stated workflow).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { config } from 'dotenv';

// dotenv/config's default lookup is `.env` in the current working directory
// -- this repo only has `.env.local` (never a plain `.env`), and this script
// is meant to be runnable from any cwd, not just apps/app. Resolve relative
// to this file's own location instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env.local') });

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--course') args.course = argv[i + 1];
    if (argv[i] === '--input') args.input = argv[i + 1];
  }
  return args;
}

const { course: courseSlug, input: inputDir } = parseArgs(process.argv.slice(2));

if (!courseSlug || !inputDir) {
  console.error('Usage: node scripts/compose-authored-course.mjs --course <courseSlug> --input <stagingDir>');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[compose-authored-course] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -- aborting.');
  process.exit(1);
}

// Node has no native WebSocket global for @supabase/supabase-js's Realtime
// client to use, even though this script never subscribes to anything --
// same fix as lib/supabaseAdmin.ts's getSupabaseAdmin().
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

async function nextSparseOrderIndex(courseId) {
  const { data, error } = await supabase
    .from('course_modules')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to compute next order_index: ${error.message}`);
  return (data?.order_index ?? 0) + 1000;
}

async function revalidate() {
  const secret = process.env.COURSES_REVALIDATE_SECRET;
  if (!secret) {
    console.warn('[compose-authored-course] COURSES_REVALIDATE_SECRET not set -- skipping cache revalidation.');
    return;
  }
  // Unlike a browser caller of this same base URL, a script process has no
  // "current origin" to fall back to -- this must be the deployed app's
  // absolute origin or the revalidation POST has nowhere to go.
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    console.warn('[compose-authored-course] NEXT_PUBLIC_API_BASE_URL not set -- skipping cache revalidation.');
    return;
  }
  try {
    const response = await fetch(`${baseUrl}/api/courses/revalidate-external`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!response.ok) {
      console.warn(`[compose-authored-course] Revalidation request failed: HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn(`[compose-authored-course] Revalidation request failed: ${err.message}`);
  }
}

async function main() {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (courseError) {
    console.error(`[compose-authored-course] Failed to look up course "${courseSlug}": ${courseError.message}`);
    process.exit(1);
  }
  if (!course) {
    console.error(
      `[compose-authored-course] No course found with slug "${courseSlug}" -- create it (and its manual Overview/Setup modules) via /manage-courses first.`
    );
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.mdx'));
  if (files.length === 0) {
    console.log(`[compose-authored-course] No .mdx files found in ${inputDir}.`);
    return;
  }

  const batch = files
    .map((file) => {
      const raw = fs.readFileSync(path.join(inputDir, file), 'utf-8');
      const { data: frontmatter, content } = matter(raw);
      return { file, frontmatter, content };
    })
    .sort((a, b) => (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let nextOrderIndex = await nextSparseOrderIndex(course.id);

  for (const { file, frontmatter, content } of batch) {
    const { slug, title } = frontmatter;
    if (!slug || !title) {
      console.warn(`[compose-authored-course] Skipping ${file}: frontmatter is missing "slug" or "title".`);
      skipped += 1;
      continue;
    }

    const { data: existing, error: lookupError } = await supabase
      .from('course_modules')
      .select('id, authoring_mode')
      .eq('course_id', course.id)
      .eq('slug', slug)
      .maybeSingle();
    if (lookupError) {
      console.error(`[compose-authored-course] Failed to look up module "${slug}" (${file}): ${lookupError.message}`);
      skipped += 1;
      continue;
    }

    if (existing && existing.authoring_mode === 'manual') {
      console.warn(`[compose-authored-course] Skipping "${slug}" (${file}): a manually-authored module already owns this slug.`);
      skipped += 1;
      continue;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('course_modules')
        .update({ title, body_mdx: content, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) {
        console.error(`[compose-authored-course] Failed to update "${slug}" (${file}): ${updateError.message}`);
        skipped += 1;
        continue;
      }
      updated += 1;
      continue;
    }

    const { error: insertError } = await supabase.from('course_modules').insert({
      course_id: course.id,
      slug,
      title,
      body_mdx: content,
      order_index: nextOrderIndex,
      module_type: 'content',
      authoring_mode: 'generated',
    });
    if (insertError) {
      console.error(`[compose-authored-course] Failed to insert "${slug}" (${file}): ${insertError.message}`);
      skipped += 1;
      continue;
    }
    nextOrderIndex += 1000;
    inserted += 1;
  }

  console.log(`[compose-authored-course] Done: ${inserted} inserted, ${updated} updated, ${skipped} skipped.`);

  if (inserted > 0 || updated > 0) {
    await revalidate();
  }
}

main().catch((err) => {
  console.error('[compose-authored-course]', err.message);
  process.exit(1);
});
