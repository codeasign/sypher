---
description: Scaffold a non-technical life-skill course on Sypher Next (apps/web + apps/api) — written through apps/web's own management API into the PostgreSQL DB, react-markdown rendered, no MDX components, no quizzes, exercises embedded as text rewrites in markdown
---

# Create a non-technical life-skill course for Sypher Next: $ARGUMENTS

**Usage:** `/next-life-skill <course-slug> [optional detailed requirements]`

`$ARGUMENTS` captures everything after the command name. The **first token** is always the course slug (e.g. `communication-skills`). Any text **after the slug** is treated as optional user-provided context that refines the planning defaults — module count, focus areas, content style, specific scenarios to include, topics to prioritize, etc.

Examples:
```
/next-life-skill communication-skills
/next-life-skill communication-skills focus on workplace scenarios, include scripts for email and meetings
/next-life-skill time-management 8 modules max, include Pomodoro and estimation techniques
```

**This command creates courses for `apps/web` (Sypher Next), not `apps/docs` (Docusaurus) and not `apps/app`.** Sypher Next courses are **DB-backed PostgreSQL rows via Prisma** — no files on disk, no sidebar JSON, no navbar entries. All writes go through **apps/web's own management flow**: login → `POST /courses` → `POST /courses/{id}/modules` → `PUT /courses/{id}/access/roles` → `PUT /courses/{id}/status`. This is exactly the same endpoint chain the `/manage-courses` UI calls through `apps/web/src/data/courses.ts`; the driver script just does it programmatically instead of through the browser. **Never write course rows directly with the Supabase JS client or a service-role key** — that was the old `apps/app/scripts/compose-authored-course.mjs` path and it is retired for this workflow.

Content renders through `react-markdown` + `rehype-raw` + `rehype-sanitize` inside `CourseModuleArticle.tsx`, which means **NO JSX components** in module bodies — no `<AsciiDiagram>`, no `<Editor>`, no Mermaid. For pure text courses this is ideal: the body is just markdown.

Read the companion command `.claude/commands/create-course-web.md` first — this is a specialization of that template, overriding the content style for non-technical life skills.

---

## ARCHITECTURE REFERENCE (already built, don't rebuild)

### What you use (read-only, understand these files)
- **DB schema**: `apps/api/prisma/schema.prisma` — `Course`, `CourseModule`, `ModuleProgress`, `CourseCompletion`, `AuthoredCourseAccess`, `AuthoredCompanyCourseAccess`
- **API controller**: `apps/api/src/controllers/CourseController.ts` — all CRUD routes under `/courses`, `courseAccessInfo()` for access logic
- **Frontend data layer**: `apps/web/src/data/courses.ts` — `Course`, `CourseModule`, `CourseWithAccess` interfaces; every function here maps 1:1 onto an endpoint the driver script also calls
- **Content renderer**: `apps/web/src/components/CourseModulePage/CourseModuleArticle.tsx` — `react-markdown` pipeline (NOT compiled MDX)
- **Auth**: `apps/api/src/controllers/AuthController.ts` — `POST /login` sets an opaque session cookie (`secure: true`, so HTTPS only). Local admin credentials come from the committed dev seed `apps/api/prisma/seed.ts`: `admin@sypher.local` / `devpassword123` (role ADMIN, full management access)
- **Driver script**: `apps/web/scripts/import-authored-course.mjs` — reads staging `.mdx` files, logs in against the API, drives the management endpoints in order
- **Completion tracker**: `apps/web/src/components/CourseModulePage/ModuleCompletionTracker.tsx` — idempotent POST on module page load
- **Routes** (dynamic catch-alls, already exist, no new files needed):
  - `apps/web/src/app/(app)/learn/page.tsx` — `/learn` course catalog grid
  - `apps/web/src/app/learn/[slug]/page.tsx` — course home (module list + free/locked indicators)
  - `apps/web/src/app/learn/[slug]/[moduleSlug]/page.tsx` — module reader page
  - `apps/web/src/app/(app)/manage-courses/page.tsx` — admin management UI

### How routes work
Next.js dynamic catch-all pages work for **any** published course. No new route files per course — course and modules live entirely in PostgreSQL. The URL `/learn/<courseSlug>/<moduleSlug>` resolves by querying `Course` by slug, then `CourseModule` by slug within that course.

### Module slugs derive from titles
`POST /courses/{id}/modules` slugifies the title (`apps/api/src/lib/slug.ts`: lowercase, strip non-alphanumerics, hyphenate). Title "Clarity: Say What You Mean" becomes slug `clarity-say-what-you-mean`. Choose titles whose slugified form you're happy to see in the URL. Duplicates within a course get `-2`, `-3` suffixes automatically.

### Course slugs: pass explicitly
`POST /courses` accepts an optional `slug` field (added 2026-08-26; before that it derived only from `name`). Always pass your target slug explicitly so the requested course slug wins over the name-derived default. If omitted, behavior is unchanged (slugify of name).

### Category and related courses
`Course` carries `category` ("tech" | "life-skills"; life-skill courses are always "life-skills") and `relatedCourses` (CSV of related course slugs, e.g. "a,b,c"; null until set). Both are accepted by POST /courses / PUT /courses/{id} and returned on every course read. The driver script sets them via `--category` and `--related`.

### Content rendering constraints
- **Standard markdown only** — headings, lists, tables, blockquotes, code fences with language tags
- **Raw HTML allowed** via `rehypeRaw` (e.g. `<br/>`, `<u>`) — but do NOT use `<details>` for exercise answers; answers are shown visibly (see TRY IT format below)
- **NO JSX components**, **NO `import` statements** — they render as literal text
- `remarkBreaks` is on: a single newline becomes `<br>`. Keep each paragraph on one source line; use blank lines between blocks.

### No built-in quiz/exercise framework
Exercises are text-based content embedded directly in the bodyMdx markdown ("TRY IT" rewrites), with `<details><summary>` for suggested answers. No multiple-choice, no auto-grading.

### Free preview & access model
- `computeFreePreviewCount(n)` = `min(ceil(n * 0.2), 10)` — first N modules by `orderIndex` are free to FREE_USERs
- `orderIndex` is assigned at creation time (sparse MAX+1000, appended per call) — create modules strictly in teaching order
- Locked modules: title shown, body stripped server-side, renders `LockedModuleNotice`
- Access roles are set per-course via `PUT /courses/{id}/access/roles`; until set, only ADMIN can read the course

---

## STEP 1 — PLAN THE COURSE

### 1.1 Parse $ARGUMENTS
Extract the slug and optional detailed requirements. Refine:
- Module count (default: 8-12 modules for a short life-skill course)
- Focus areas, content emphasis, specific scenarios/script types to cover

If no detailed requirements are provided, use the defaults from Step 1.2-1.4 below.

### 1.2 Course metadata
- **Slug**: kebab-case, unique. Becomes the URL path (`/learn/<slug>`). Passed explicitly to `POST /courses`.
- **Name**: Human-readable title (e.g. "Effective Communication"). May differ from the slug.
- **Description**: 1-2 sentences, plain text, shown on course home and /learn grid.
- **Cover image**: optional, upload later via CourseEditor. Leave null initially.

### 1.3 Module structure
- **Module 1**: overview — what the course covers, who it's for, how to use it. (Always first.)
- **Modules 2-N**: content lessons. Each teaches ONE actionable skill, 200-400 words, with Before/After examples and a "TRY IT" exercise.
- **Final module**: wrap-up / cheat sheet.

Aim for 8-12 modules total including the overview. Don't pad.

### 1.4 Free preview allocation
With 8-12 modules, free preview = ceil(n * 0.2) = 2-3 modules. Modules are free strictly by creation order, so put genuinely introductory content first and note which modules will be free.

### 1.5 Content style rules (life-skill specialization)

**Use**:
- Simple English. Short paragraphs. Short sentences. Natural language.
- Realistic before/after examples (show the bad version and the better version).
- Practical scripts the learner can adapt ("When X happens, say Y instead of Z").
- "TRY IT" exercises following the required format below.
- Real scenarios: manager feedback, coworker interruptions, disagreement, saying no, bad news, email clarity.

**TRY IT format (required, confirmed by user 2026-08-26 — follow across ALL courses):**
1. Every dialogue or example message is wrapped in quotation marks, including blockquoted lines.
2. Each TRY IT has 2-3 short exercises/examples, not just one (numbered or bold-labeled).
3. The suggested answer appears as plain bold text ("**Suggested answer:**") directly below its exercise. Never hide answers inside `<details>` collapses.
4. No leading `# H1` in any module body; the reader page renders the title itself.

**Avoid**:
- Academic language, corporate jargon, motivational fluff.
- "In today's fast-paced world...", "Communication is an essential skill...", "Let's dive into...", "It is important to understand...", "Whether you're...", "In conclusion..."
- Long theoretical explanations, repetition, obvious statements, filler.

**Teachable pattern per concept** (use everywhere):
1. Name the concept in plain English.
2. Show a realistic BAD example (with all the hedging/messiness people actually produce).
3. Show a BETTER example.
4. Explain WHY the better version works (1 sentence).
5. Give a "TRY IT" exercise.

### 1.6 Humanization requirement
The course must read like an experienced human instructor wrote it. Apply the humanizer skill's rules when authoring AND run a review pass over all bodies before import:
- No em/en dashes anywhere in the content (use commas, periods, colons).
- Vary how modules open (a scene, a bad example, a blunt statement). Never open two modules the same way.
- Show messy reality: over-explaining, defensiveness, nervousness, misunderstandings. Not every example lands perfectly.
- Straight quotes, minimal bold, sentence case for in-body subheadings, no emoji, no formulaic triads, no dramatic fragment chains.
- End modules on substance, not send-offs ("Happy communicating!" is banned).

### 1.7 No diagrams, no quizzes
Pure English text. No ASCII art in fences either. Exercises are text rewrites in markdown.

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

The response sets the session cookie (`sypher_next_session`). Send it back as `Cookie:` on every management call. These are local seed credentials, already public in the repo; never replace them with real credentials or hardcode anything else.

---

## STEP 3 — CREATE STAGING .MDX FILES

Create `scratch/<course-slug>/` with one `.mdx` file per module:

```
scratch/communication-skills/
  01-overview.mdx
  02-clarity.mdx
  ...
```

```mdx
---
title: "Clarity: Say What You Mean"
order: 3
---

> "Hi! Sorry to bother you..."

...
```

Format rules:
- Frontmatter: `title` (human-readable; its slugified form becomes the module slug) and `order` (integer sort key).
- **No `# H1` in the body** — the module reader page already renders `<h1>{module.title}</h1>`; a leading H1 duplicates the title on the page.
- Body below the fence is the exact markdown that lands in `bodyMdx`.
- One paragraph per source line (remarkBreaks turns single newlines into `<br>`).
- Every code fence has a language tag. No JSX, no imports, no admonitions.

---

## STEP 4 — IMPORT VIA THE DRIVER SCRIPT

From `apps/web`:

```bash
node scripts/import-authored-course.mjs \
  --api http://localhost:4000 \
  --course <course-slug> \
  --name "Effective Communication" \
  --description "..." \
  --input scratch/<course-slug> \
  --roles FREE_USER,PAID_USER \
  [--publish]
```

What it does (all through apps/web's own endpoints, session cookie auth):
1. Logs in (seed admin) unless a valid cookie jar exists.
2. Resolves the course by slug from `GET /courses/manage/list`; creates it via `POST /courses {name, description, slug}` if missing.
3. Lists existing modules, then for each staging file in `order`: creates via `POST /courses/{courseId}/modules` or updates via `PUT .../modules/{moduleId}` when a module with the same slug already exists. Creation order = teaching order = orderIndex order = free-preview order.
4. Sets access roles via `PUT /courses/{courseId}/access/roles`.
5. With `--publish`, sets status published via `PUT /courses/{courseId}/status`.

Without `--publish` the course stays draft (invisible to everyone except admin), matching platform rules: nothing goes live automatically.

---

## STEP 5 — VERIFY LIVE

Dev servers:

```bash
cd apps/api && npm run dev      # if not already running
cd apps/web && npm run dev
```

Verify at `https://next.sypher.local` (Caddy HTTPS; raw localhost breaks secure session cookies):

1. **Course home**: `/learn/<course-slug>` shows name, description, module list in order, free badges on the first ceil(n*0.2) modules and lock icons on the rest.
2. **Module pages**: `/learn/<course-slug>/<module-slug>` render markdown correctly (headings, lists, tables, details/summary), sticky header, prev/next pager, completion tracker fires.
3. **Locked module** (as a FREE_USER or ungranted account): `LockedModuleNotice` with Go Pro, no body content.
4. **Sidebar**: `CourseModuleIndex` outline with completion dots.
5. **After completing all modules**: course appears on `/mock-tests`.

Test accounts: seeded `admin@sypher.local` (full access), plus any FREE_USER account for preview/lock verification.

---

## STEP 6 — REPORT

```
Course created: <slug>
Platform: apps/web (Sypher Next — PostgreSQL via apps/api, react-markdown rendered)
Modules: <count>
Free preview: <count>/<total> modules
Access: roles=<list>, companies=<count> granted
Status: published | draft
Authoring path: management API via apps/web/scripts/import-authored-course.mjs
Verification: course home ✓, module pages ✓, locked ✓, sidebar ✓, pagination ✓
Staging files: scratch/<course-slug>/ (<count> .mdx files)
```

---

## HARD RULES

- **Everything goes through apps/web's management API** — same endpoints the UI uses, authenticated by the seeded admin's session cookie. Never write course/module/access rows with the Supabase JS client or a service-role key. Never weaken access gates.
- **No file-based routes** — the dynamic catch-all pages handle any course. Do not create route files.
- **bodyMdx is markdown, not MDX** — no JSX components, no imports. Pure markdown only.
- **No quizzes** — TRY IT rewrites embedded in the body, `<details>` answers.
- **Create modules strictly in teaching order** — orderIndex (and therefore the free preview) follows creation order.
- **Pass the course slug explicitly** to `POST /courses`; module slugs follow from titles, so pick titles that slugify well.
- **Draft by default** — publish only after verification passes.
- **Use Caddy HTTPS for browser verification** — `https://next.sypher.local`, not localhost ports.
- **Never hardcode secrets** — the only credentials this workflow uses are the committed dev-seed pair from `prisma/seed.ts`.
- **Idempotent imports** — the driver updates existing modules by matching slugs instead of duplicating; safe to re-run after content fixes.
