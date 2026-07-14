#!/usr/bin/env node
/**
 * DISCONNECTED as of Phase 7 (blog migrated to apps/app as real Next.js
 * SSR/ISR pages) — no longer wired into `dev`/`start`. Kept on disk, along
 * with bake-blog-posts.mjs, plugins/blog-routes/, and blog-content/, as a
 * rollback path for one release cycle. Safe to delete this whole set once
 * Phase 7 is confirmed stable.
 *
 * Original behavior: companion process for `npm run dev`/`npm run start`.
 * Bakes published Supabase posts into blog-content/*.md on startup, then
 * subscribes to postgres changes on blog_posts and re-bakes on every
 * insert/update/delete, so /blog and /blog/:slug stay live while the dev
 * server runs. The blog-routes plugin's getPathsToWatch() picks up the
 * file changes and Docusaurus hot-reloads just that plugin — no
 * dev-server restart.
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
  console.error('[watch-blog-posts] Missing SUPABASE_URL / SUPABASE_ANON_KEY — skipping live blog sync.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { transport: ws },
});

let baking = false;
let bakePending = false;

async function bakeNow(reason) {
  if (baking) {
    bakePending = true;
    return;
  }
  baking = true;
  try {
    const count = await bakeBlogPosts(supabase, OUTPUT_DIR);
    console.log(`[watch-blog-posts] ${reason}: baked ${count} published post(s).`);
  } catch (err) {
    console.error('[watch-blog-posts] Bake failed:', err.message);
  } finally {
    baking = false;
    if (bakePending) {
      bakePending = false;
      await bakeNow('follow-up change');
    }
  }
}

await bakeNow('initial sync');

supabase
  .channel('blog_posts_watch')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => {
    bakeNow('change detected');
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[watch-blog-posts] Listening for live blog post changes...');
    }
  });
