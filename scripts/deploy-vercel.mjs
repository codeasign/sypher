#!/usr/bin/env node
/**
 * Triggers a production rebuild/deploy on Vercel via a Deploy Hook,
 * without needing a git push. Create the hook in the Vercel dashboard
 * (Project → Settings → Git → Deploy Hooks) and set its URL as
 * VERCEL_DEPLOY_HOOK_URL. Run after publishing/editing/unpublishing blog
 * posts so the live site's baked blog-content/ reflects current Supabase
 * state.
 */

import 'dotenv/config';

const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

if (!hookUrl) {
  console.error(
    '[deploy-vercel] Missing VERCEL_DEPLOY_HOOK_URL. Create a Deploy Hook in the Vercel dashboard ' +
      '(Project → Settings → Git → Deploy Hooks) and add its URL to .env.'
  );
  process.exit(1);
}

const response = await fetch(hookUrl, { method: 'POST' });

if (!response.ok) {
  console.error(`[deploy-vercel] Deploy hook responded with ${response.status} ${response.statusText}`);
  process.exit(1);
}

console.log('[deploy-vercel] Deployment triggered — check the Vercel dashboard for build progress.');
