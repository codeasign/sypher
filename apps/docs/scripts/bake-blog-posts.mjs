#!/usr/bin/env node
/**
 * Runs before `docusaurus build` (wired as npm's `prebuild`). Queries
 * Supabase for all published blog posts and writes each as a Markdown
 * file with YAML frontmatter into blog-content/, so the blog-routes
 * plugin can bake real static HTML for each post at build time instead
 * of fetching from Supabase in the browser.
 *
 * A Supabase query/connection failure fails the build loudly (deploy
 * should not silently ship a blog missing posts). Zero published posts
 * is a valid, successful result — the blog is just empty.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import 'dotenv/config';
import { bakeBlogPosts } from './lib/blogBake.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../blog-content');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[bake-blog-posts] Missing SUPABASE_URL / SUPABASE_ANON_KEY — aborting build.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { transport: ws },
});

async function main() {
  const count = await bakeBlogPosts(supabase, OUTPUT_DIR);
  console.log(`[bake-blog-posts] Baked ${count} published post(s) into blog-content/.`);
}

main().catch((err) => {
  console.error('[bake-blog-posts]', err.message);
  process.exit(1);
});
