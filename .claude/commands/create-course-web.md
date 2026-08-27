---
description: Sypher Next course creation command — scaffold a new authored course on apps/web from spec to verified live, covering both authoring paths (manual UI + bulk compose), content rules, access gates, and publishing workflow
---

# Create a new Sypher Next authored course for: $ARGUMENTS

$ARGUMENTS is the course slug (e.g. `build-an-agent-framework`). The course name (title case), description, and module outline are derived from your specification below.

Read **CLAUDE.md** (both root and `apps/web/CLAUDE.md` if present) and the memory files in `C:\Users\admin\.claude\projects\D--jenny-sypher\memory\` first — especially:

- `sypher-next-course-authoring-status.md` — the 14-phase plan, current status (Phases 1-14 done, holding before Phase 15)
- `feedback_button_design_language.md` — button/icon/badge rules for every NEW button in apps/web
- `sypher-next-mock-test-feature.md` — the Certification/Mock Test pattern (ModuleCompletionTracker, CourseCompletionRepository)
- `sypher-next-module-progress-tracking.md` — per-user completion tracking via ModuleProgress table
- `sypher-next-free-preview-percentage.md` — 15% → 20% preview rule (now `computeFreePreviewCount`)

## SYSTEM OVERVIEW

Sypher Next courses live in **apps/web** (Next.js App Router) backed by **apps/api** (Express + TSOA + Prisma + Supabase). Courses are **DB-backed** — not file-based like the legacy Docusaurus courses in `apps/docs`. The content is rendered at runtime from the `bodyMdx` column of `CourseModule` via `react-markdown` + `rehype-raw` + `rehype-sanitize` (see `CourseModuleArticle.tsx`) — **NOT** compiled MDX. This means no JSX component imports, no `<AsciiDiagram>`, no Docusaurus `<Tabs>` inside module bodies.

### Two authoring paths (both fully supported)

1. **Manual path** — via the `/manage-courses` UI. The CourseEditor sets name/description/cover; the ModuleEditor (MDXEditor) writes each module's `bodyMdx`. Use this for courses authored one module at a time.

2. **Generated/bulk path** — via `apps/app/scripts/compose-authored-course.mjs`. Reads `.mdx` files from a staging directory (frontmatter: `slug`, `title`, `order`; body below the YAML fence), upserts into `course_modules` via the service-role key with `authoring_mode='generated'`. **Crucially, the Course itself is always created manually first** via `/manage-courses` (`compose-authored-course.mjs` fails loudly if `--course` doesn't resolve). The script handles insert/update/skip-on-manual collision and triggers ISR revalidation.

Choose the path here. The bulk path is preferred when you have 4+ modules of content ready in markdown. The manual path is mandatory for the initial Course row, the Overview module, and the Setup module (these are always hand-authored per the workflow described in `compose-authored-course.mjs`'s header comment).

---

## STEP 1 — PLAN THE COURSE

### 1.1 Course metadata
- **Slug**: kebab-case, becomes both the URL path (`/learn/<slug>`) and the DB `course.slug` (CUID for `id`, slug is human-readable and unique). Example: `build-an-agent-framework`
- **Name**: Human-readable display name. Example: "Build an Agent Framework"
- **Description**: One or two sentences shown on the course home page. Plain text/markdown — it's rendered as a single `<p>` on `learn/[slug]/page.tsx`. Keep it concise.
- **Cover image**: Upload to Bunny at `courses/<courseId>/covers/` via the CourseEditor's file input. If you don't have one yet, leave it null — can be added later.

### 1.2 Module structure
Every course must have:
- **An Overview module** — `slug: "overview"`, `title: "Course Overview"`, `showInGettingStarted: false`. This is the synthetic top-level module created manually (the `compose-authored-course.mjs` script skips overview — it expects Course + Overview + Setup to exist already). Its `bodyMdx` explains what the course covers, prerequisites, and what you'll build.
- **A Setup module** — `slug: "setup"`, `title: "Setup and Environment"`, `showInGettingStarted: false`. Environment setup, prerequisites installation, project scaffolding. Always the first real content module.
- **Content modules** (3-15 depending on course depth) — each with a pedagogical slug like `your-first-tool`, `tool-calling-patterns`, `debugging-common-errors`.
- **Optional capstone module** — `slug: "capstone"`, marks course completion. If present, `CourseCompletionRepository.markCompleteIfAllModulesDone` fires when the user marks it complete, which is what populates `/mock-tests`.

### 1.3 Section grouping
Modules can be grouped into sections via `sectionLabel` (e.g. "Section 1 — Foundations") and `sectionOrder` (integer). These are **only set by the bulk import path** (`compose-authored-course.mjs` doesn't set them — wait, it doesn't actually set them either; they're nullable and null for manual modules). For manual authoring, leave both null. The module index on the course page renders a flat ordered list by `orderIndex` — no sections needed.

### 1.4 Free preview allocation
- `computeFreePreviewCount(n)` = `min(ceil(n * 0.2), 10)` — 20% of modules are free to preview, max 10.
- Preview modules are the **first N by `orderIndex`** — order matters. Put genuinely introductory content first.
- `showInGettingStarted: true` modules are **always** visible (additive with the 20% preview) — these show up on `/getting-started`.
- Document which modules are in the free preview in your plan. The user should be able to predict exactly which modules a signed-in free user can read.

### 1.5 Access control planning
- **Default**: After creation, the course has no `AuthoredCourseAccess` role grants — no one but admin can access it (see `courseAccessInfo` in `CourseController.ts`). You MUST set access via the Access tab before publishing.
- **Roles** (from `schema.prisma` + `roleLabels.ts`): `ADMIN` (always full access), `FREE_USER`, `PAID_USER`, `INTERNAL_HR`, `COMPANY_HR`, `COMPANY_EMPLOYEE`, `BRANDER`, `COHORT_USER`.
- **Company grants**: Grant an entire company's employees via `AuthoredCompanyCourseAccess`. This is for B2B training.
- **Rule**: `COMPANY_EMPLOYEE` role alone does NOT grant access — they need an explicit company grant (see `hasCourseAccess` in `accessControl.ts`). `COHORT_USER` is excluded from course access (cohort course pools are scoped to the slug-keyed docs system).
- **Preview visibility**: even with zero role/company grants, any non-empty published course is "visible" (shows in `/learn` with a lock icon + upgrade prompt) — this is the **discoverability exception** confirmed 2026-08-22. The locked modules show title/metadata but `bodyMdx` is stripped server-side.

---

## STEP 2 — CREATE THE COURSE (via /manage-courses UI)

> These steps assume you are an admin. Non-admins will get a 403 on the management endpoints.

1. Navigate to `/manage-courses` (inside the `(app)` route group).
2. Click **+ New Course**.
3. In the **CourseEditor** form:
   - Fill **Name** (required, max 80 chars — `NAME_MAX` constant in `CourseEditor.tsx`).
   - Fill **Description** (optional, shown on course home page).
   - Upload a **Cover image** via the file input → goes to Bunny at `courses/new/covers/`.
   - Click **Save Draft** (not Publish — keep as draft until content is complete).
4. The course is now created with a `cuid()` id, your slug will be auto-generated from the name (lowercase, hyphenated). Note the course ID and slug.

> If you're using the **bulk path**, this step still happens first. `compose-authored-course.mjs` requires the Course row to already exist.

---

## STEP 3 — CREATE MODULES

### 3.1 Manual path (ModuleEditor)
For each module:
1. In the CourseWorkspace for your course, go to the **Modules** tab.
2. Click **+ New Module**.
3. **ModuleEditor** fields:
   - **Title** (required).
   - **Show in Getting Started Guides** checkbox — check for modules you want surfaced on `/getting-started` (always visible, even to free users). Strategic: use this for 1-2 genuinely introductory modules.
   - **Content** (required) — the MDXEditor. Write markdown content here. Use the toolbar (Bold, Italic, Headings, Lists, Links, Images, Code Blocks, Themes: js/ts/jsx/tsx/python/bash/json/css/html/sql/yaml).
   - **Preview mode** (eye icon) — renders the bodyMdx through the same `react-markdown` + `rehype-raw` + `rehype-sanitize` pipeline as the live course page. **Always preview before saving** — this is your ground truth for how content will render.
   - Click **Save**.
4. **Reorder** modules by dragging via the up/down arrows on the Modules tab — the order you set here is `order_index`, which determines:
   - Display order on the course home page module list.
   - Prev/Next pagination on module pages (`learn/[slug]/[moduleSlug]/page.tsx` computes `currentIndex` from `orderIndex`-sorted list).
   - Which modules are in the free preview (first N by orderIndex).

### 3.2 Bulk/generated path (compose-authored-course.mjs)
If you have markdown content ready for multiple modules:
1. Create a staging directory with one `.mdx` file per module:
   ```
   staging/my-course/
     01-overview.mdx — frontmatter: slug: overview, title: "Course Overview", order: 1
     02-setup.mdx    — frontmatter: slug: setup, title: "Setup", order: 2
     03-core.mdx     — frontmatter: slug: core, title: "Core Concepts", order: 3
     ...
   ```
   Body is plain markdown (no JSX component imports — remember, `react-markdown` + `rehype-raw`, not an MDX compiler).
2. Run from `apps/app`:
   ```bash
   node scripts/compose-authored-course.mjs --course <courseSlug> --input staging/my-course
   ```
3. The script:
   - Looks up the course by slug in Supabase (must already exist from Step 2).
   - Upserts each module: inserts new ones (`authoring_mode='generated'`, `order_index` = MAX+1000, +2000 sequentially), updates existing `generated` modules' `title`/`body_mdx`, **skips** any slug that's already `manual` (with a warning — never overwrites hand-authored content).
   - Triggers ISR revalidation via `COURSES_REVALIDATE_SECRET` against `NEXT_PUBLIC_API_BASE_URL/api/courses/revalidate-external`.
4. **Verify** in `/manage-courses` Modules tab — each module should show "Generated" badge (vs "Manual").

> Important: the Overview and Setup modules should still be created manually first (Step 3.2 explicitly skips creating the Course, but it will happily overwrite a `generated` Overview if you bulk-import one — which you shouldn't; the workflow says Course + Overview + Setup are always manual).

### 3.3 Image uploads within module content
Images inside `bodyMdx` are uploaded via the ModuleEditor's image plugin → `uploadToBunny(file, 'courses/<courseId>/modules', BUNNY_CONFIG)`. The resulting URL is embedded as a standard markdown image `![alt](url)` in the bodyMdx. This is **not** a special component — `react-markdown` renders standard markdown image syntax, and `rehype-raw` lets any raw HTML through (the sanitize schema is permissive on `img` attributes).

---

## STEP 4 — WRITE MODULE CONTENT (MDX/MARKDOWN RULES)

### 4.1 Markdown only — no JSX components
`CourseModuleArticle.tsx` renders `bodyMdx` via:
```tsx
<ReactMarkdown
  remarkPlugins={[remarkBreaks]}
  rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
  components={{ pre: CodeBlock }}
>
  {content}
</ReactMarkdown>
```
- **No `import` statements** — there's no MDX compiler, imports are inert text.
- **No `<AsciiDiagram>`** — that's a Docusaurus components import, doesn't exist in apps/web.
- **No `<Tabs>`/`<TabItem>`** — same reason. If you need tabbed code, explain the alternative approaches in prose and use separate code blocks.
- Standard markdown (headings, lists, tables, blockquotes, code fences) works.
- Raw HTML inline is allowed via `rehype-raw` (e.g. `<u>`, `<br/>`, `<details>`) — but the sanitize schema is configured, so arbitrary HTML attributes may be stripped. Test in preview mode.

### 4.2 Code blocks
- Every code fence MUST have a language tag: ```python, ```bash, ```typescript, ```json, ```sql, ```yaml.
- The `CodeBlock` component (imported in `CourseModuleArticle.tsx`, rendered via `components={{ pre: CodeBlock }}`) handles syntax highlighting. It's the same component used across the app — consistent styling.
- Code should be complete, runnable, and commented. No pseudo-code unless explicitly labeled.

### 4.3 Links and further reading
- External links open in the same tab by default (standard markdown link rendering).
- Link to official documentation sources directly: docs.python.org, nodejs.org/api, playwright.dev/docs, github.com/... etc.
- For non-official sources (blog posts, tutorials, papers), use `TODO` placeholder with a description of what should go there — never invent a URL.

### 4.4 Narration style
- Write in **second person** — "you will build", "you should already know". Never "the reader" or "the learner."
- **No Docusaurus admonitions** (`:::info`, `:::note`, etc.) — they don't exist in react-markdown. Use `##` headers instead.
- Write like a senior engineer at a colleague's desk — direct, conversational.
- Short paragraphs, bullet lists, tables, diagrams (ASCII art in code fences works fine).

### 4.5 AsciiDiagram in module content
Since `bodyMdx` is rendered via `react-markdown` (not compiled MDX), you **cannot** use the `<AsciiDiagram>` component directly in module content. To include an ASCII diagram:
- Use a fenced code block with an appropriate language hint (or `text`):
  ```
  ```text
  ┌─────────────┐
  │ Component A │
  └──> │
       │
  ┌────┴───────┐
  │ Component B │
  └─────────────┘
  ```
  ```
- For box-drawing diagrams, Unicode box-drawing characters (`┌ ─ ┐ │ └ ┘`) work fine in both light and dark mode via the CodeBlock component.

---

## STEP 5 — SET ACCESS CONTROL

In the CourseWorkspace, go to the **Access** tab:

### 5.1 Role-based access
- **Configurable roles** (from `AccessTab.tsx`): `FREE_USER`, `PAID_USER`, `INTERNAL_HR`, `COMPANY_HR`, `BRANDER`. (Admin always has access; `COMPANY_EMPLOYEE` gets access via company grants, not direct role checkbox; `COHORT_USER` is excluded.)
- Check the boxes for roles that should have full access. A checked role grants access to the entire course (all non-preview modules).
- **Rule of thumb**: if the course is for paying users, grant `PAID_USER`. If it's for free users too, also grant `FREE_USER`. If you're unsure, start with `PAID_USER` only — free users get the 20% preview automatically.

### 5.2 Company access
- Grant entire companies via the company access section (bottom of Access tab).
- Useful for B2B training — a `COMPANY_EMPLOYEE` user at a granted company sees the course in their sidebar and full module list.
- **Important**: company grants are on `companyId` (a UUID in the DB), and the UI lists all companies from `/access/companies`. Select one, click Add.

### 5.3 Verify access logic
Before publishing, mentally trace the `courseAccessInfo` function (`CourseController.ts`):
- Admin → full access, always visible.
- Non-admin → check role grants. If role matches → full access. If `COMPANY_EMPLOYEE` → check company grant set. If no match → check if course has ≥1 module (visible=true, hasFullAccess=false) — free preview only.

---

## STEP 6 — SET MODULE ORDER AND PREVIEW ALLOCATION

1. Go to the Modules tab. Verify `orderIndex` (drag order) puts Overview → Setup → content modules in the correct pedagogical sequence.
2. The first `min(ceil(n * 0.2), 10)` modules by this order are free preview for `FREE_USER`s and unauthenticated-but-signed-in users without role grants.
3. Use `showInGettingStarted` sparingly (1-2 modules max) — those always show on `/getting-started` regardless of access.

---

## STEP 7 — PUBLISH

1. Go to the **Details** tab in CourseWorkspace.
2. Click **Republish** (or toggle Publish if currently draft).
   - This sets `status = 'published'` and `publishedAt = now()` via `PUT /courses/{id}/status`.
   - The course now appears in `/learn` (for users with access) and `/getting-started` (for modules with `showInGettingStarted`).
3. **Verify live**: Navigate to `https://app.sypher.local/learn/<slug>` (or the deployed URL). Confirm:
   - Course appears in the grid (or with a lock icon if no full access).
   - Modules render correctly (markdown, code blocks, images all load).
   - Prev/Next pagination works.
   - Bookmark button works.
   - Free preview modules render; locked modules show the `LockedModuleNotice` component.

> **Important**: The user explicitly said to use `https://app.sypher.local/` as the base URL for apps/app test URLs. For apps/web, the convention is `https://next.sypher.local` (see `puppeteer-apps-web-must-use-caddy-https.md` in memory). Use the Caddy HTTPS URL, not raw localhost:port — the scheme mismatch breaks session cookies.

---

## STEP 8 — VERIFY COMPLETION TRACKING

If your course has a capstone module:
1. The `ModuleCompletionTracker` component (`CourseModulePage/ModuleCompletionTracker.tsx`) shows completion status and handles the `completeModule` API call on page load.
2. When a user marks the final module complete, `CourseCompletionRepository.markCompleteIfAllModulesDone` checks if ALL their completed modules == all course modules. If yes, inserts a `CourseCompletion` row.
3. The `/mock-tests` page (`mock-tests/page.tsx`) reads `CourseCompletionRepository.listForUser(user.id)` and shows completed courses newest-first — only published courses appear.
4. **Verify**: Sign in as a test user, complete all modules in sequence, confirm the course appears on `/mock-tests`.

---

## VERIFICATION CHECKLIST

Before declaring the course complete, verify:

| Check | How | Location |
|-------|-----|----------|
| Course appears in /manage-courses | Admin sees it in the list with status | `/manage-courses` |
| Course home page renders | Course name, description, cover image, module list | `/learn/<slug>` |
| Modules render content correctly | Markdown, code blocks, images, links all work | `/learn/<slug>/<moduleSlug>` |
| Free preview works | First 20% of modules visible to free-tier / ungranted user | Login as FREE_USER, visit `/learn/<slug>` |
| Locked modules show notice | `LockedModuleNotice` component renders, bodyMdx stripped | Visit a locked module URL as ungranted user |
| Access control gates correctly | Role-granted user sees full course; non-granted sees preview only | Test with PAID_USER vs FREE_USER accounts |
| Completion tracking works | `ModuleCompletionTracker` marks complete, course appears on /mock-tests after all modules done | Complete all modules, check /mock-tests |
| Sidebar navigation | `CourseModuleIndex` shows module list with progress dots | Visit any module page, check left sidebar |
| Prev/Next pagination | Chevron pager at screen edges navigates correctly | Visit a module page (non-locked) |
| Bookmarking | Course and module bookmark buttons work | Click bookmark icons on course home and module page |
| Mobile responsiveness | Paper sheet layout adapts | Resize browser or use devtools |

---

## HARD RULES

- **No bare `<AsciiDiagram>` in module bodyMdx** — `react-markdown` cannot render JSX components. Use fenced code blocks for diagrams.
- **No `import` statements in module body** — there is no MDX compiler, imports are inert text that will render as literal "import" on the page (this is the `unicode-escaped-import-corruption.md` gotcha, applied here differently — not unicode escape, but the same root cause: ESM imports don't work in react-markdown).
- **Course + Overview + Setup are always created manually** — the `compose-authored-course.mjs` bulk path requires these to exist first and will skip/warn if already `manual`.
- **Never downgrade access gates** — `courseAccessInfo` deliberately returns `notFound()` for invisible courses (hide existence) vs `locked: true` for discoverable ones (show with lock + preview). Don't weaken this.
- **bodyMdx is never trusted as empty for locked modules** — the API strips it server-side (`locked ? '' : mod.bodyMdx`). Never send content for locked modules in any bulk import.
- **Module order = free preview order** — the first N modules by `orderIndex` are the free preview. Plan this deliberately.
- **Use Caddy HTTPS for testing** — `https://next.sypher.local`, not `http://localhost:3000`. The scheme mismatch silently breaks session cookies.
- **Idempotent publishing** — you can safely re-run `/create-course-web` on an existing course; it should update fields, not create duplicates. The slug is unique in Prisma.
- **Never hardcode API keys** — Bunny config comes from env vars (`NEXT_PUBLIC_BUNNY_*`), Supabase from `.env.local`.
- **One course per invocation** — `$ARGUMENTS` takes a single slug. For multiple courses, call the command multiple times.

---

## REPORTING

After the course is created and verified, print a summary:

```
Course created: <slug>
Path: apps/web/src/app/learn/[slug]/  (auto-routing — no page files needed)
Backend: apps/api/src/controllers/CourseController.ts  (POST/PUT/DELETE /courses)
Modules: <count> (Overview + Setup + <n> content + Capstone)
Free preview: <count> of <count> modules (<percentage>)
Access: roles=<list>, companies=<count> granted
Authoring path: manual | generated | mixed
Verification: <all checklist items pass/fail>
Status: draft | published
```

Note: unlike Docusaurus courses in `apps/docs`, Sypher Next courses require **zero file creation** on disk — everything lives in the database. The `/learn/[slug]` and `/learn/[slug]/[moduleSlug]` routes are dynamic catch-all pages (`[slug].tsx` / `[moduleSlug].tsx`) already present in the repo — they work for any published course without new route code. The only on-disk files you create are **staging .mdx files** in a temp directory (consumed by `compose-authored-course.mjs` if using the bulk path), not source files in the app.
