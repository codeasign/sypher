---
description: Create a short, role-specific Metrics course on Sypher Next (apps/web + apps/api) — PostgreSQL-backed, mock-data driven, charts delivered as static image files uploaded to Bunny CDN, with verified calculations and role-specific metrics
---

# Create a Metrics course for Sypher Next: $ARGUMENTS

**Usage:** `/next-metrics-course <course-slug> [optional detailed requirements]`

`$ARGUMENTS` captures everything after the command name. The **first token** is always the course slug (e.g. `measuring-delivery`). Any text **after the slug** is optional user-provided context that refines the planning defaults — the target role, module count, focus areas, specific metric domains to cover, etc.

Examples:

```text
/next-metrics-course designing-metrics

/next-metrics-course measuring-developer-productivity

/next-metrics-course measuring-test-automation focus on flaky tests and automation ROI

/next-metrics-course measuring-delivery role is Engineering Manager, focus on cycle time, throughput and predictability

/next-metrics-course product-metrics-that-mislead include examples around DAU, feature adoption and conversion
```

**This command creates courses for `apps/web` (Sypher Next), not `apps/docs` (Docusaurus) and not `apps/app`.** Sypher Next courses are **DB-backed PostgreSQL rows via Prisma** — no files on disk for content, no sidebar JSON, no navbar entries. All writes go through **apps/web's own management flow**: login → `POST /courses` → `POST /courses/{id}/modules` → `PUT /courses/{id}/access/roles` → `PUT /courses/{id}/status`, driven by `apps/web/scripts/import-authored-course.mjs`. **Never write course rows directly with the Supabase JS client or a service-role key.**

Read the companion command `.claude/commands/create-course-web.md` first — this is a specialization of that template, overriding the content style for metrics education.

Content renders through `react-markdown` + `rehype-raw` + `rehype-sanitize` inside `CourseModuleArticle.tsx`, which means **NO JSX components** in module bodies — no `<AsciiDiagram>`, no Mermaid fences, no embedded widgets. The metrics specialization adds one thing module bodies CAN carry: **static chart image files** referenced with plain markdown `![alt](url)`.

---

## ARCHITECTURE REFERENCE (already built, don't rebuild)

### What you use (read-only, understand these files)

- **DB schema**: `apps/api/prisma/schema.prisma` — `Course`, `CourseModule`, `ModuleProgress`, `CourseCompletion`, `AuthoredCourseAccess`, `AuthoredCompanyCourseAccess`

- **API controller**: `apps/api/src/controllers/CourseController.ts` — all CRUD routes under `/courses`, `courseAccessInfo()` for access logic

- **Frontend data layer**: `apps/web/src/data/courses.ts` — interfaces and endpoint mappings the driver script also calls

- **Content renderer**: `apps/web/src/components/CourseModulePage/CourseModuleArticle.tsx` — `react-markdown` pipeline (NOT compiled MDX)

- **Auth**: `apps/api/src/controllers/AuthController.ts` — `POST /login` sets an opaque session cookie (`secure: true`, HTTPS only). Local admin credentials come from the committed dev seed `apps/api/prisma/seed.ts`: `admin@sypher.local` / `devpassword123` (role ADMIN)

- **Driver script**: `apps/web/scripts/import-authored-course.mjs` — reads staging `.mdx` files, logs in against the API, drives the management endpoints in order

- **Chart image pipeline**: Bunny CDN via `apps/web/src/data/bunnyUpload.ts` — config comes from `NEXT_PUBLIC_BUNNY_*` env vars in `apps/web/.env`. Imported diagram SVGs already live under the storage path convention `svgs/<course>/<module>/<hash>.svg`; metric chart images follow the same pattern

- **Routes** (dynamic catch-alls, already exist, no new files needed): `/learn` catalog, `/learn/[slug]` course home, `/learn/[slug]/[moduleSlug]` reader, `(app)/manage-courses` admin UI

### Module slugs derive from titles

`POST /courses/{id}/modules` slugifies the title (`apps/api/src/lib/slug.ts`). Choose titles whose slugified form you're happy to see in the URL.

### Course slugs: pass explicitly

`POST /courses` accepts an optional `slug` field. Always pass your target slug explicitly so it wins over the name-derived default.

### Category and related courses

`Course` carries `category` ("tech" | "life-skills") and `relatedCourses` (CSV of slugs). **Metrics courses are always category "tech"** — set via the driver's `--category tech` flag; use `--related` to pair with adjacent courses once they exist.

### Content rendering constraints

- Standard markdown only — headings, lists, tables, blockquotes, code fences with language tags, markdown images
- Raw HTML allowed via rehypeRaw (`<br/>`, `<u>`) — but do NOT use `<details>` for exercise answers
- NO JSX components, NO import statements — they render as literal text
- `remarkBreaks` is on: keep each paragraph on one source line, blank lines between blocks

### Free preview & access model

- `computeFreePreviewCount(n)` = `min(ceil(n * 0.2), 10)` (`apps/api/src/lib/coursePreview.ts`) — first N modules by creation order are free
- Create modules strictly in teaching order — `orderIndex` follows creation order, and so does the free preview window
- Locked modules: title shown, body stripped server-side, renders `LockedModuleNotice`
- Access roles set per-course via `PUT /courses/{id}/access/roles`; until set, only ADMIN can read the course

---

## STEP 1 — PLAN THE COURSE

### 1.1 Parse $ARGUMENTS

Extract:

- Course slug
- Optional user-provided requirements

The optional requirements may refine:

- Target role
- Course size
- Module count
- Focus areas
- Specific metrics
- Scenarios
- Dataset requirements
- Chart requirements

Do not ignore explicit user requirements.

### Target role resolution

Do NOT freely infer the target role from the course slug.

Use the Sypher Metrics role taxonomy below.

#### Developer

- `measuring-developer-productivity`
- `measuring-code-review`
- `measuring-delivery-speed`
- `measuring-rework`
- `measuring-code-quality`
- `measuring-technical-debt`

#### QA / QE

- `measuring-test-effectiveness`
- `measuring-test-automation`
- `measuring-defects`
- `measuring-defect-leakage`
- `measuring-test-stability`
- `measuring-quality-trends`

#### Engineering Manager

- `measuring-delivery`
- `measuring-engineering-quality`
- `measuring-reliability`
- `measuring-team-health`
- `measuring-engineering-efficiency`
- `measuring-technical-debt-for-managers`
- `reading-an-engineering-dashboard`

#### Engineering Leader

- `measuring-engineering-performance`
- `measuring-engineering-investment`
- `measuring-engineering-roi`

#### Product Manager

- `choosing-product-metrics`
- `measuring-activation`
- `measuring-retention`
- `measuring-conversion`
- `product-metrics-that-mislead`

#### DevOps / SRE

- `understanding-dora-metrics`
- `measuring-reliability`
- `measuring-slos-and-error-budgets`
- `measuring-incidents`
- `measuring-toil`

#### Agile / Delivery

- `understanding-velocity`
- `measuring-flow`
- `measuring-delivery-predictability`

#### Project Management

- `measuring-project-progress`
- `measuring-project-risk`

#### Foundation / Cross-role

- `designing-metrics`
- `reading-metrics-without-being-misled`
- `choosing-the-right-chart`

If the slug exists in this taxonomy:

**Use the defined role.**

Do NOT override the defined role with a guessed role.

If the user explicitly supplies a role after the slug, use the user's explicit role.

If the slug is not in this taxonomy and the user has not supplied a role, ask for the role before creating the course.

### 1.2 Distinctness check (required, runs before any content planning)

Courses feed straight into the shared apps/web database, so **every course must teach things no other course teaches** — never re-skin the same material under a new slug.

1. List what exists first: `GET /courses/manage/list` with the admin session cookie (Step 2), or read the `/learn` catalog.

2. Compare the intended scope (target role + metric domains) against every existing course. If another course already covers the same ground, **narrow the angle until it is distinct** — different role reading the same data, a different decision the metric drives, different failure modes. Same numbers under a new title is a fail.

3. Modules within the course stay distinct too: one metric or skill per module; never restate an earlier module's computation with cosmetic changes.

4. Adjacent-but-distinct courses cross-link instead of overlapping — set reciprocal `--related` pairings once both exist.

### 1.3 Course metadata

- **Slug**: kebab-case, unique, passed explicitly to `POST /courses`
- **Name**, **Description**: human-readable, shown on course home and `/learn` grid
- **Category**: always `tech`
- Cover image: optional, upload later via CourseEditor; leave null initially

### 1.4 Module structure

Metrics courses are **short, focused micro-courses**.

Default:

- **4–7 modules**
- Prefer **5–6 modules**
- Use fewer modules when the topic can be taught clearly without expansion
- Never increase module count merely to make the course appear comprehensive

A module must earn its place.

Recommended structure:

- **Module 1**: overview — who the course is for, the core question/problem, the canonical mock dataset, and how to read the charts
- **Middle modules**: each teaches ONE metric or ONE closely related metric skill end to end
- **Final module**: practical decision-making, wrap-up, TRY IT, and/or decision cheat sheet

Do NOT create separate modules merely because several related metrics exist.

Combine closely related concepts when they can be taught more effectively together.

Do NOT create a module whose only purpose is introducing the dataset.

The canonical dataset should be introduced briefly in Module 1 and reused throughout the course.

The goal is:

**ONE COURSE → ONE CLEAR OUTCOME → 4–7 HIGH-VALUE MODULES → PRACTICAL APPLICATION**

Do not optimize for module count.

Do not optimize for page count.

Optimize for learning efficiency.

### 1.5 Free preview allocation

Free preview = `min(ceil(n * 0.2), 10)` modules, strictly by creation order. Put genuinely introductory content first and note which modules will be free.

### 1.6 Mock-dataset discipline (required)

Every metric must be computable from data the reader can see:

1. **One canonical mock dataset per course.** Invent ONE fictional team/product/company at planning time (name it once in Module 1 — e.g. "Relay, a fictional CI platform team of 9"). All numbers in every module derive from that single world. Keep a scratch notes file (`scratch/<course-slug>/dataset-notes.md`) recording the canonical figures so later modules stay consistent.

2. **Raw data travels with the metric.** Each module shows its raw input as a markdown table (sprint tickets, weekly deploys, support tickets — whatever the metric consumes) BEFORE computing anything from it.

3. **Every number is traceable.** Any derived figure in prose or on a chart must be recomputable from tables shown in the same or an earlier module. No orphan statistics.

4. **Label everything illustrative.** Numbers describe the fictional dataset only. Never present invented benchmarks as industry standards — phrase comparisons as "in our Relay data" or "illustrative". Healthy ranges may cite widely known heuristics in general terms without fabricating precise citations.

5. **No real company names, real dashboards, or real customer data** in examples.

### 1.7 Charts are static images (required mechanism)

There is **no charting library in apps/web** (no Recharts, nothing interactive) and none may be added as part of authoring. Charts ship as **pre-generated static SVG files**:

1. Author each chart as a standalone `.svg` file into `scratch/<course-slug>/images/` during Step 3 (hand-authored SVG or a throwaway script that emits one — either is fine; the artifact is the file).

2. **English-only text inside charts** — translate any non-English labels before upload.

3. Upload to a **dedicated per-course subfolder** on Bunny CDN: `svgs/<course-slug>/`. Every course owns exactly one folder there — never mix two courses' charts in one folder, never dump SVGs at the `svgs/` root. Bunny creates intermediate folders automatically on first PUT. Use the `NEXT_PUBLIC_BUNNY_*` env vars from `apps/web/.env` (same PUT-to-storage contract as `uploadToBunny`: `PUT https://<hostname>/<zone>/svgs/<course-slug>/<name>.svg` with the `AccessKey` header).

4. **Link after uploading**: take each returned pull-zone URL (`<pullZoneUrl>/svgs/<course-slug>/<name>.svg`) and reference it in module bodies as `![alt](url)`. Never put a local staging path in `bodyMdx` — if a body still references `scratch/...`, the upload/link pass isn't finished.

5. One sentence alt text per image; optional bold caption line below it.

6. Tables carry raw data; chart images carry visualizations. A module that computes a metric should show the trend/distribution visually where a chart earns its place — but never decorate with a chart that adds nothing over its table.

### 1.8 Content style rules (metrics specialization)

**Use**:

- Concrete datasets and worked calculations shown step by step.
- Decision framing: every metric ends with "what you'd do differently because of this number".
- Common-misuse callouts: gaming the metric, Goodhart effects, small-sample traps.
- Realistic messiness in the mock dataset: missing days, outliers, a bad week.

**Avoid**:

- Vanity-metric fluff ("measure what matters" platitudes with no numbers).
- Academic definitions followed by no computation.
- Filler openers ("In today's fast-paced world...", "It is important to understand...").

**Teachable pattern per concept** (use everywhere):

1. Name the metric in plain English.
2. Show the raw data table from the mock dataset.
3. Compute it step by step (arithmetic visible, not summarized).
4. Show it as a chart image over time/comparison.
5. Interpret: what it says about the fictional team, what to do next.
6. Give a "TRY IT" exercise.

### 1.9 TRY IT format (required, confirmed by user 2026-08-26 — applies across ALL courses)

1. Every dialogue or example message is wrapped in quotation marks, including blockquoted lines.

2. Each TRY IT has 2-3 short exercises/examples, not just one (numbered or bold-labeled).

3. The suggested answer appears as plain bold text ("**Suggested answer:**") directly below its exercise. Never hide answers inside `<details>` collapses.

4. No leading `# H1` in any module body; the reader page renders the title itself.

For metrics courses, TRY IT exercises give the learner a small table or scenario and ask them to compute or critique a metric themselves — the suggested answer shows the arithmetic.

### 1.10 Humanization requirement

The course must read like an experienced practitioner wrote it. Apply the humanizer skill's rules when authoring AND run a review pass over all bodies before import:

- No em/en dashes anywhere in the content (use commas, periods, colons).
- Vary how modules open (a dataset anomaly, a wrong conclusion, a blunt statement). Never open two modules the same way.
- Show messy reality: metrics that contradict each other, numbers that look great but mean nothing, teams that game their own dashboards.
- Straight quotes, minimal bold, sentence case for in-body subheadings, no emoji, no formulaic triads.
- End modules on substance, not send-offs.

---

## STEP 2 — AUTHENTICATE AGAINST THE API (seeded admin)

Start the API if it isn't running:

```bash
cd apps/api && npm run dev
```

Log in with the committed dev-seed admin account (`apps/api/prisma/seed.ts`):

```bash
curl -s -c /tmp/sypher-cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@sypher.local","password":"devpassword123"}' \
  http://localhost:4000/auth/login
```

Send the resulting session cookie back as `Cookie:` on every management call. These are local seed credentials, already public in the repo; never replace them with real credentials.

---

## STEP 3 — CREATE STAGING FILES

Create `scratch/<course-slug>/` with one `.mdx` per module plus an `images/` folder:

```text
scratch/measuring-delivery/

  dataset-notes.md

  01-overview.mdx
  02-cycle-time.mdx
  ...

  images/

    cycle-time-trend.svg
    throughput-by-week.svg
```

```mdx
---
title: "Cycle Time: From Started to Shipped"
order: 3
---

...body...
```

Format rules:

- Frontmatter: `title` (its slugified form becomes the module slug) and `order` (integer sort key).
- **No `# H1` in the body** — the reader page renders the title itself.
- Body below the fence is the exact markdown that lands in `bodyMdx`.
- Every code fence has a language tag.
- Chart images referenced by their eventual pull-zone URL (upload happens first in Step 4).

---

## STEP 4 — UPLOAD CHARTS TO BUNNY, LINK THEM, THEN IMPORT INTO THE DATABASE

Order matters: images go up first into the course's own subfolder, module bodies get the real pull-zone URLs, and only then does the driver write anything to the apps/web database.

1. **Upload** each SVG from `scratch/<course-slug>/images/` to `svgs/<course-slug>/` on Bunny CDN (a small inline Node script using the same PUT contract as `uploadToBunny`, configured from `NEXT_PUBLIC_BUNNY_*` in `apps/web/.env`). Collect the returned pull-zone URL for every file.

2. **Link**: rewrite image references in the staging `.mdx` files to those exact URLs (skip if Step 3 already used them). Verify no body still points at `scratch/...`.

3. **Import the course into the database** by running the driver from `apps/web`:

```bash
node scripts/import-authored-course.mjs \
  --api http://localhost:4000 \
  --course <course-slug> \
  --name "<Course Name>" \
  --description "..." \
  --input scratch/<course-slug> \
  --category tech \
  --role <audience-role> \
  --roles FREE_USER,PAID_USER \
  [--publish]
```

`--role` takes the taxonomy role in kebab-case (`developer`, `qa`, `engineering-manager`, `engineering-leader`, `product-manager`, `devops-sre`, `agile-delivery`, `project-management`, `foundation`). It persists to the `Course.audienceRole` column and is what drives the role filter chips on `/learn` — a course imported without `--role` is invisible to role filtering.

What happens:

1. Driver logs in (seed admin) unless a valid cookie jar exists.
2. Resolves/creates the course by slug via `POST /courses {name, description, slug, category, audienceRole}`.
3. Creates/updates modules in staging-file order (creation order = teaching order = free-preview order); updates existing modules by matching slug instead of duplicating.
4. Sets access roles via `PUT /courses/{courseId}/access/roles`.
5. With `--publish`, sets status published. Without it, the course stays draft (invisible except to ADMIN).

---

## STEP 5 — VERIFY LIVE

Dev servers:

```bash
cd apps/api && npm run dev
cd apps/web && npm run dev
```

Verify at `https://next.sypher.local` (Caddy HTTPS; raw localhost breaks secure session cookies):

**Draft-visibility note (verified against the live implementation, not assumed):** `GET /courses/{slug}` — the endpoint behind the public `/learn/<course-slug>` reader — has **no ADMIN bypass for draft status**; `findPublishedBySlug` in `CourseController.getBySlug` strictly requires `status === 'published'` and 404s for anyone, ADMIN included, otherwise. A draft course cannot be opened through the public reader at all, by any account. Checks 1–2 below don't depend on the reader route and are fully verifiable pre-publish; checks 3–6 genuinely need the reader route and can only run once the course is published. Do the structural equivalent of 3–6 pre-publish via `/manage-courses` instead (module count, order, titles, access roles — no rendered reader view there), then re-run 3–6 for real immediately after publishing, before announcing the course anywhere.

1. **Calculation verification pass (do this BEFORE import, repeat after any edit)**: for every module, recompute every derived number against its own raw-data table and the dataset notes. Fix mismatches before importing. A published metrics course with wrong arithmetic is worse than no course.

2. **Chart verification**: every image reference loads (200 from the pull-zone URL, checked with a direct fetch — doesn't need the reader route), renders at readable size, text inside charts is English and legible, alt text present.

3. **Course home** (post-publish): `/learn/<course-slug>` shows name, description, ordered module list, free badges on the first `min(ceil(n*0.2), 10)` modules, lock icons on the rest.

4. **Module pages** (post-publish): markdown tables render correctly, code fences highlighted, prev/next pager works, completion tracker fires.

5. **Locked module** (post-publish, as FREE_USER or ungranted account): `LockedModuleNotice`, no body content.

6. **Dataset consistency spot-check**: pick two modules that reference the same underlying figure (e.g. team size, sprint length) and confirm they agree. Draft-safe — read directly from the staged `.mdx` files or the `/manage-courses` module list, doesn't need the reader route.

Test accounts: seeded `admin@sypher.local` (full access), plus any FREE_USER account for preview/lock verification.

---

## STEP 6 — REPORT

```text
Course created: <slug>

Platform: apps/web (Sypher Next — PostgreSQL via apps/api, react-markdown rendered)

Role focus: <role> (persisted to Course.audienceRole, drives /learn chips)

Modules: <count>

Free preview: <count>/<total> modules

Charts: <count> SVGs on Bunny CDN under svgs/<slug>/

Mock dataset: <fictional entity name>, canonical notes in scratch/<slug>/dataset-notes.md

Access: roles=<list>, companies=<count> granted

Status: published | draft

Authoring path: management API via apps/web/scripts/import-authored-course.mjs

Verification: calculations ✓, charts ✓, course home ✓, module pages ✓, locked ✓

Staging files: scratch/<course-slug>/ (<count> .mdx, <count> images)
```

---

## HARD RULES

- **Teach distinct things** — check the existing catalog (`GET /courses/manage/list`) BEFORE planning content; a new course must not duplicate any existing course's scope (narrow the angle instead), and adjacent courses cross-link via `--related`.

- **Everything goes through apps/web's management API** — authenticated by the seeded admin's session cookie. Never write course/module/access rows with the Supabase JS client or a service-role key. Never weaken access gates.

- **No file-based routes** — the dynamic catch-all pages handle any course. Do not create route files.

- **bodyMdx is markdown, not MDX** — no JSX components, no imports, no Mermaid fences.

- **Charts are static images only** — SVG/PNG uploaded to the course's own Bunny subfolder (`svgs/<course-slug>/`, one folder per course, never shared, never at the `svgs/` root) and linked via markdown `![]()` AFTER upload; never local staging paths in bodyMdx. Never add a charting library or interactive component as part of course work. English-only text inside charts.

- **Every metric traceable** — computed from a raw-data table shown in the module, consistent with the course's single canonical mock dataset. Label all figures illustrative; never fabricate industry benchmarks or citations.

- **Verify calculations before import** — recompute every number; fix mismatches first.

- **TRY IT format** — quoted dialogue, 2-3 exercises, visible `**Suggested answer:**`, never `<details>` collapses, no leading H1.

- **Create modules strictly in teaching order** — orderIndex (and therefore the free preview) follows creation order.

- **Pass the course slug explicitly** to `POST /courses`; module slugs follow from titles.

- **Category is tech** — `--category tech` on the driver; `--related` for pairings.

- **Role is persisted, not just planned** — always pass `--role` from the taxonomy to the driver. It lands in `Course.audienceRole` (free-form column, added 2026-08-26) and drives the role filter chips on `/learn`. A metrics course without `audienceRole` set is a classification failure.

- **Draft by default** — publish only after verification passes.

- **Use Caddy HTTPS for browser verification** — `https://next.sypher.local`, not localhost ports.

- **Never hardcode secrets** — the only credentials this workflow uses are the committed dev-seed pair from `prisma/seed.ts`; Bunny keys come from env vars, never from the command text.

- **Idempotent imports** — safe to re-run after content fixes.

- **Course length is short by design** — default to 4–7 modules, preferably 5–6. Never create 8–12 modules by default and never pad a course for completeness.

- **Role must be correct** — use the Sypher Metrics role taxonomy when the slug is known; do not guess a different role from the course title.

- **One course, one outcome** — do not turn a focused course into a role-wide metrics encyclopedia.

- **One canonical dataset** — reuse the same fictional world throughout the course and keep `dataset-notes.md` authoritative.

- **Charts teach** — every chart must answer a question, use the correct chart form, and be interpreted with what it says, what it does not say, and what to investigate next.

- **No unnecessary visualization dependencies** — preserve the static SVG/Bunny architecture.

- **Simple, precise, humanized English** — remove filler, repetition, academic language, and AI-style introductions.

- **No em/en dashes in course content** — use commas, periods, or colons.

- **No real company/customer data** — use fictional illustrative data only unless the user explicitly requests a properly sourced external dataset and the repository workflow supports it.

- **Do not publish before verification** — draft first, verify calculations/charts/rendering/access, then publish if explicitly requested or if the existing workflow requires it.
