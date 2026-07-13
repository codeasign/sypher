# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## Blog publishing

Blog posts are authored in-app at `/manage-blog` (access-gated via `nav_access`,
same mechanism as other admin sidebar items). Authoring, drafts, and image
uploads (Bunny.net) all happen client-side against Supabase — unchanged by
anything below.

**Publishing to the live site is NOT instant.** Public post pages
(`/blog`, `/blog/<slug>`) are static HTML baked at build time, not fetched
live from Supabase. When a post is published:

1. `scripts/bake-blog-posts.mjs` runs automatically before every build
   (wired as npm's `prebuild` step) — it queries Supabase for all
   `status = 'published'` posts and writes each as a Markdown file into
   `blog-content/` (gitignored, regenerated every build).
2. `docusaurus build` picks up those files via the `blog-routes` plugin and
   generates real static pages with correct `<title>`/meta tags — no
   client-side fetch on the public side, so crawlers and social-preview
   bots see real content.
3. A new build has to actually run for a newly published (or edited,
   unpublished, deleted) post to go live. Expect roughly **1–3 minutes**
   from clicking Publish to the change appearing on the live site.

### Auto-triggering a rebuild on publish

To avoid waiting for the next unrelated deploy, wire a Supabase Database
Webhook to a Vercel Deploy Hook:

1. In Vercel: Project Settings → Git → Deploy Hooks → create one (e.g.
   name it `blog-publish`, target your production branch). Copy the
   generated URL.
   `VERCEL_DEPLOY_HOOK_URL = <PASTE-DEPLOY-HOOK-URL-HERE>` — replace once
   the Vercel project exists.
2. In Supabase: Database → Webhooks → Create a new webhook.
   - Table: `blog_posts`
   - Events: `Update` (also add `Insert`/`Delete` if you want unpublishes
     and deletions to trigger a rebuild too — recommended, since the bake
     script also needs to remove posts that are no longer published)
   - Type: HTTP Request → POST → paste the Vercel Deploy Hook URL from
     step 1
   - No payload/auth configuration is required — Vercel Deploy Hooks
     accept a bare POST.
3. Save. Publishing (or unpublishing/deleting) a post now triggers a
   Vercel rebuild automatically, in addition to any rebuild you'd trigger
   normally via a `git push`.

### Required environment variables on Vercel

The `prebuild` bake script needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` at
**build time**, not just runtime. Set both in the Vercel project's
Environment Variables (Production, and Preview if you want preview
deploys to bake posts too) — not only in a local `.env` file. If these are
missing on Vercel, the bake script exits non-zero and **fails the build
loudly** (by design — a broken Supabase connection should never silently
ship a blog missing posts).

### Razorpay payments — required environment variables on Vercel

Unlike the blog-bake vars above, these are needed only at **runtime** by
the Serverless Functions under `api/razorpay/` and `api/cron/` — set them
as Vercel Environment Variables the same way, but they don't affect the
static build itself:

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` — see [SupabaseSchema.md](./SupabaseSchema.md#payments-razorpay-upgrades)
  for why this one function-scoped exception exists
- `CRON_SECRET` — Vercel automatically sends this as a `Bearer` token on
  cron-triggered requests to `api/cron/expire-paid-users.js`
- `PAID_UPGRADE_PRICE_INR_PAISE`, `PAID_UPGRADE_GST_RATE`,
  `PAID_UPGRADE_DURATION_DAYS`

After first deploying with a real (non-test) `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`,
register the webhook manually in the Razorpay dashboard: **Settings → Webhooks
→ Add New Webhook**, URL = `https://<your-domain>/api/razorpay/webhook`,
active event = `payment.captured`, and set `RAZORPAY_WEBHOOK_SECRET` to the
secret Razorpay generates for that webhook.
