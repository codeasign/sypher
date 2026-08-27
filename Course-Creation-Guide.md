# Course Creation Guide — Sypher Next (apps/web)

> The definitive reference for building courses on the Sypher Next platform. Covers architecture, data model, content rendering, authoring paths, access control, publishing, verification, and common pitfalls.

## Table of Contents

1. [Which Platform?](#1-which-platform)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model](#3-data-model)
4. [API Endpoints](#4-api-endpoints)
5. [Content Rendering](#5-content-rendering)
6. [Authoring Paths](#6-authoring-paths)
7. [Module Structure](#7-module-structure)
8. [Access Control](#8-access-control)
9. [Free Preview System](#9-free-preview-system)
10. [Completion & Progress Tracking](#10-completion--progress-tracking)
11. [Publishing Workflow](#11-publishing-workflow)
12. [Verification Checklist](#12-verification-checklist)
13. [Common Pitfalls & Gotchas](#13-common-pitfalls--gotchas)
14. [Quick Reference](#14-quick-reference)

---

## 1. Which Platform?

### Sypher Next (`apps/web` + `apps/api`) — DB-Backed
- Courses live in **PostgreSQL** (via Supabase), not files on disk.
- Routes are **dynamic catch-alls** (`/learn/[slug]`, `/learn/[slug]/[moduleSlug]`) — one set of page files serves every course.
- Content rendered via `react-markdown` (not compiled MDX).
- Content types: Authored courses (created via `/manage-courses` UI or bulk import).

### Docusaurus (`apps/docs`) — File-Based
- Courses are markdown/MDX files in `docs/<slug>/`.
- Has its own sidebar JSON per topic.
- Content rendered via compiled MDX with full component system (`<AsciiDiagram>`, `<Tabs>`, etc.).
- Content types: Technical/coding courses, AI engineering courses.
- Being phased out — new UI/UX work goes in `apps/web` only.

> **This guide covers the `apps/web` (Sypher Next) platform.** See `.claude/commands/create-course-web.md` and `.claude/commands/next-life-skill.md` for Claude Code commands.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    apps/web (Next.js)                    │
│                                                          │
│  /learn/page.tsx          → Course catalog grid         │
│  /learn/[slug]/page.tsx   → Course home (modules list)    │
│  /learn/[slug]/[moduleSlug]/page.tsx → Module reader     │
│  /mock-tests/page.tsx     → Completed courses            │
│  /manage-courses/        → Admin authoring UI            │
│                                                          │
│  CourseModuleArticle.tsx → react-markdown renderer       │
│  CourseModuleIndex.tsx   → Left sidebar (switcher/outline) │
│  ModuleCompletionTracker → Fires completion POST          │
│  LockedModuleNotice.tsx  → "Go Pro" paywall              │
└────────────────────────┬─────────────────────────────────┘
                          │
                          │ serverApiFetch (session cookie auth)
                          │
┌────────────────────────▼─────────────────────────────────┐
│                    apps/api (Express + TSOA)              │
│                                                          │
│  CourseController.ts    → All course/module CRUD          │
│  CourseRepository       → Prisma queries                 │
│  CourseModuleRepository → Module CRUD                     │
│  ModuleProgressRepository → Completion tracking          │
│  CourseCompletionRepository → Mock test driver           │
│  coursePreview.ts       → Free preview math                │
│  accessControl.ts       → Role/company grants             │
│                                                          │
│  Auth: session cookie (proprietary opaque cookie)        │
│  Admin: requireCanManageCourses() (role check)           │
└────────────────────────┬─────────────────────────────────┘
                          │
                          │ Prisma Client
                          │
┌────────────────────────▼─────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)                 │
│                                                          │
│  Table: courses                    (Course model)        │
│  Table: course_modules            (CourseModule model)   │
│  Table: module_progress           (ModuleProgress)      │
│  Table: authored_course_access    (AuthoredCourseAccess) │
│  Table: authored_company_course_access                   │
│  Table: course_completions        (CourseCompletion)      │
│  Table: authored_course_bookmarks                       │
│  Table: authored_module_bookmarks                        │
│                                                          │
│  RLS: per-table policies (session_role() based)          │
│  Service role key: bypasses RLS (compose script only)    │
└─────────────────────────────────────────────────────────┘
```

### Key components to know

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | All DB models (Course, CourseModule, ModuleProgress, CourseCompletion, access tables, bookmarks) |
| `apps/api/src/controllers/CourseController.ts` | TSOA controller — every endpoint, access logic (`courseAccessInfo`), preview logic |
| `apps/web/src/data/courses.ts` | Frontend data layer — interfaces + CRUD functions (client-side via `apiFetch`) |
| `apps/web/src/components/CourseModulePage/CourseModuleArticle.tsx` | Content renderer — `react-markdown` pipeline |
| `apps/web/src/app/learn/[slug]/page.tsx` | Course home page — module list with free/locked indicators |
| `apps/web/src/app/learn/[slug]/[moduleSlug]/page.tsx` | Module reader — paper sheet, prev/next pager, completion tracker |
| `apps/web/src/components/CourseModuleIndex/index.tsx` | Sidebar — switches between course switcher and module outline |
| `apps/web/src/components/CourseModulePage/ModuleCompletionTracker.tsx` | Client component — fires idempotent POST to `/complete` on page load |
| `apps/web/src/components/CourseModulePage/LockedModuleNotice.tsx` | Paywall for locked modules (Go Pro button) |
| `apps/api/src/lib/coursePreview.ts` | Free preview math: `computeFreePreviewCount`, `isModuleFreelyVisible` |
| `apps/api/src/lib/accessControl.ts` | Role-based access: `hasCourseAccess`, `canSeeNavItem` |
| `apps/app/scripts/compose-authored-course.mjs` | Bulk import script — reads staging .mdx, upserts modules via service-role key |
| `apps/web/src/data/bunnyUpload.ts` | Image upload to Bunny CDN |

### Styling conventions (must follow)

From `feedback_button_design_language.md`:

- **Labeled buttons**: solid colored background + white text (never ghost/outline)
- **Icon-only buttons**: bare Material glyph, NO background, tinted by theme tokens
- **Status badges**: square corners (`border-radius: 0`), solid semantic background + white text
- **Back-links**: bare text links (`← My Courses`), semibold, hover to primary color
- **Topic/module pages**: "print preview" style — paper sheet on canvas backdrop, visible drop shadow
- **Content area**: max-width 1200px for module content, 1600px for dashboard
- **Tooltips**: inverse-surface coloring (dark text on light bg / light text on dark bg) via shared `<Tooltip>` component

---

## 3. Data Model

### Course

```prisma
model Course {
  id            String   @id @default(cuid())
  slug          String   @unique           // URL path: /learn/<slug>
  name          String                     // Display name
  description   String?                    // Course home page description
  coverImageUrl String?                    // Bunny CDN URL
  status        String   @default("draft") // "draft" | "published"
  authorId      String?                    // FK to User
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  publishedAt   DateTime?

  modules       CourseModule[]
  access        AuthoredCourseAccess?
  companyAccess AuthoredCompanyCourseAccess[]
  bookmarkedBy  AuthoredCourseBookmark[]
  completions   CourseCompletion[]
}
```

Key fields:
- `slug`: must be unique, kebab-case (e.g. `communication-skills`). Becomes the URL path.
- `status`: `draft` (hidden) or `published` (visible in `/learn`).
- `publishedAt`: set when status flips to `published`.

### CourseModule

```prisma
model CourseModule {
  id                   String   @id @default(cuid())
  courseId             String
  slug                 String                            // URL path segment
  title                String                            // Display title
  moduleType           String  @default("content")       // "content" | "assignment" | "video" | "mcq" (schema headroom only)
  isCertification      Boolean @default(false)
  bodyMdx              String  @default("")              // THE CONTENT (markdown rendered by react-markdown)
  orderIndex           Int     @default(0)               // Display order (sparse: 1000, 2000, 3000...)
  sectionLabel         String?                           // "Section 1 — Foundations" (from bulk import)
  sectionOrder         Int?                              // Group sort key
  authoringMode        String  @default("manual")        // "manual" | "generated"
  showInGettingStarted Boolean @default(false)           // Visible on /getting-started
  gettingStartedOrder  Int?

  progress     ModuleProgress[]
}
```

Key fields:
- `bodyMdx`: **plain markdown**, rendered by `react-markdown`. NOT compiled MDX. No JSX components, no imports.
- `orderIndex`: determines display order, free preview cutoff, and prev/next pagination. Uses sparse integers (1000, 2000, ...).
- `authoringMode`: `manual` (created via /manage-courses UI) or `generated` (created via compose script). The compose script skips `manual` modules.
- `showInGettingStarted`: makes this module always visible on `/getting-started`, additive with free preview.
- `moduleType`: currently only `content` has an editor/renderer. Other types are schema headroom.

### Supporting models

```prisma
model ModuleProgress {
  id          String   @id @default(cuid())
  userId      String
  moduleId    String
  courseId    String
  completedAt DateTime @default(now())
  @@unique([userId, moduleId])
}

model CourseCompletion {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  completedAt DateTime @default(now())
  @@unique([userId, courseId])
}
```

- `ModuleProgress`: one row per user per module — marks that user has visited/completed the module.
- `CourseCompletion`: one row per user per course — created when ALL modules are marked complete. Drives `/mock-tests`.

---

## 4. API Endpoints

All under `/courses` route, session-required. Management endpoints additionally require `requireCanManageCourses()` (admin role).

### Public reads (session required — any signed-in user)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses` | session | List visible published courses (with access or free preview > 0) |
| GET | `/courses/sidebar-list` | session | List ALL published courses (locked ones shown with lock icon — for sidebar course switcher) |
| POST | `/courses/by-ids` | session | Batch lookup by IDs (for bookmarks) |
| POST | `/courses/modules/by-ids` | session | Batch module lookup by IDs |
| GET | `/courses/getting-started` | session | Modules with `showInGettingStarted: true` |
| GET | `/courses/mock-tests` | session | Courses the user has fully completed (for /mock-tests page) |
| GET | `/courses/{slug}/modules` | session | List modules (locked modules have `bodyMdx` stripped to `''`) |
| GET | `/courses/{slug}/modules/{moduleSlug}` | session | Single module (same locking rules) |
| POST | `/courses/{slug}/modules/{moduleSlug}/complete` | session | Mark module complete (idempotent) |
| GET | `/courses/{slug}` | session | Single course with `hasFullAccess` flag |

### Management (requireCanManageCourses — admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses/manage/list` | admin | List ALL courses (draft + published) |
| GET | `/courses/manage/{id}` | admin | Get single course by ID |
| POST | `/courses` | admin | Create new course |
| PUT | `/courses/{id}` | admin | Update course (name, description, coverImageUrl) |
| PUT | `/courses/{id}/status` | admin | Set `draft` or `published` (also sets `publishedAt`) |
| DELETE | `/courses/{id}` | admin | Delete course + all modules (cascade) |
| GET | `/courses/{courseId}/manage/modules` | admin | List all modules (including locked bodyMdx) |
| POST | `/courses/{courseId}/modules` | admin | Create new module |
| PUT | `/courses/{courseId}/modules/{moduleId}` | admin | Update module (title, bodyMdx, showInGettingStarted) |
| PUT | `/courses/{courseId}/modules/{moduleId}/reorder` | admin | Move up/down |
| DELETE | `/courses/{courseId}/modules/{moduleId}` | admin | Delete module |
| GET | `/courses/{courseId}/access` | admin | Get allowed roles |
| PUT | `/courses/{courseId}/access/roles` | admin | Set allowed roles |
| GET | `/courses/{courseId}/access/companies` | admin | List granted companies |
| PUT | `/courses/{courseId}/access/companies/{companyId}` | admin | Grant/revoke company access |

### Cache revalidation
- POST `/api/courses/revalidate-external` (with `COURSES_REVALIDATE_SECRET` header) — clears the `/learn` page cache and sidebar list cache.
- Called automatically by `compose-authored-course.mjs` after import.
- Called by `purge('courses')` in the status update endpoint.

---

## 5. Content Rendering

### The pipeline

`CourseModuleArticle.tsx`:
```tsx
<ReactMarkdown
  remarkPlugins={[remarkBreaks]}
  rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
  components={{ pre: CodeBlock }}
>
  {content}  // ← this is bodyMdx from the database
</ReactMarkdown>
```

### What works in bodyMdx
- **Headings**: `#`, `##`, `###`, `####`
- **Paragraphs**: plain text, wrapped by react-markdown
- **Lists**: ordered (`-`/`*`) and unordered (`1.`/`2.`)
- **Bold/Italic**: `**bold**`, `*italic*`, `__underline__`
- **Inline code**: `` `code` ``
- **Code blocks**: ```` ```typescript ````, ```` ```bash ````, ```` ```python ````, etc.
- **Tables**: standard markdown tables
- **Blockquotes**: standard markdown
- **Links**: `[text](url)` — open in same tab
- **Images**: `![alt](url)` — standard markdown image, `rehypeRaw` passes through
- **Raw HTML inline**: `<u>`, `<br/>`, `<details>`/`<summary>` — allowed by sanitize schema
- **Single newlines**: become `<br>` (via `remarkBreaks` plugin)

### What does NOT work in bodyMdx
- **No `<AsciiDiagram>`** — it's a Docusaurus component, doesn't exist in apps/web
- **No `<Tabs>` / `<TabItem>`** — also Docusaurus-only
- **No `<YouTube>` / `<PdfEmbed>` / `<Slideshow>`** — Docusaurus-only components
- **No `import` statements** — not an MDX compiler, imports render as literal text
- **No JSX expressions** — `{variable}` would try to parse as JSX and fail
- **No Docusaurus admonitions** — `:::info`, `:::note`, `:::tip` etc. render as literal text

### CSS styling for bodyMdx
Defined in `apps/web/src/components/CourseModulePage/styles.module.css` under `.body`:
- Font size: 1rem, line-height: 1.75
- Max width: 1200px (within the paper sheet container)
- `h1`: 2rem, weight 700
- `h2`: 2rem, weight 700, margin 2rem 0 1rem
- `h3-h6`: margin 1.5rem 0 0.75rem
- `p`: margin 0 0 1rem
- `ul`/`ol`: padding-left 2.5rem
- `a`: primary color, no underline (underline on hover)
- `blockquote`: left border 3px, emphasis-300, italic, 1.1rem
- `img`: max-width 100%, border-radius
- `table`: display block, overflow-x auto
- `pre` (code blocks): padding 0.65rem 0.85rem, border-radius, overflow-x auto, `pre-wrap`, `word-break: break-word`
- `code`: `overflow-wrap: break-word`

### Paper-sheet treatment for module pages
- Background: `--ifm-background-surface-color` (white light, elevated #171721 dark)
- Border: 1px solid `--ifm-color-emphasis-200`
- Border-radius: `--ifm-global-radius`
- Box-shadow: `0 4px 16px rgba(0, 0, 0, 0.14)` (deliberately visible)
- Max-width: 1200px, centered

---

## 6. Authoring Paths

### Path A: Manual UI (/manage-courses)

1. Navigate to `/manage-courses` (requires admin role).
2. Click **+ New Course**.
3. **CourseEditor**: fill Name, Description, upload Cover image → **Save Draft**.
4. Click **Manage** on the course row to open CourseWorkspace.
5. Go to **Modules** tab → **+ New Module**.
6. **ModuleEditor** (MDXEditor):
   - Fill Title.
   - Toggle "Show in Getting Started" if applicable.
   - Write content in the markdown editor.
   - Click **Preview** (eye icon) to see how it renders via the same react-markdown pipeline.
   - Click **Save**.
7. Use up/down arrows to reorder modules (sets `orderIndex`).
8. Go to **Details** tab → **Republish** (sets status to `published`).
9. Go to **Access** tab → set role grants and company grants.

### Path B: Bulk import (compose-authored-course.mjs)

#### Prerequisites
- Course row must already exist (create via Path A step 1-3 first, or direct DB insert).
- `apps/app/.env.local` must have: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `COURSES_REVALIDATE_SECRET`, `NEXT_PUBLIC_API_BASE_URL`.

#### Staging file format
One `.mdx` file per module in a staging directory:

```
staging/communication-skills/
  01-overview.mdx
  02-clarity.mdx
  03-listening.mdx
  ...
```

Each file:
```mdx
---
slug: overview
title: Course Overview
order: 1
---

# Course Overview

What this course covers...

## Who this is for

...
```

- `slug`: kebab-case, unique within the course. Becomes the URL path segment.
- `title`: human-readable display name.
- `order`: integer for sequencing (files are sorted by this before import).
- Body: plain markdown. No `import`, no JSX, no AsciiDiagram.

#### Running the script
```bash
cd apps/app
node scripts/compose-authored-course.mjs --course communication-skills --input scratch/communication-skills
```

#### What the script does
1. Resolves the course by slug in Supabase (fails if not found).
2. Reads all `.mdx` files, parses frontmatter via `gray-matter`.
3. Sorts by `order` field.
4. For each module:
   - **No existing row** → inserts with `authoring_mode='generated'`, `order_index` = MAX(existing)+1000, sequential (+1000 per module).
   - **Existing `generated` module** → updates `title` and `body_mdx` only (never touches `order_index`, `show_in_getting_started`, `getting_started_order`).
   - **Existing `manual` module** → skips with warning (never overwrites hand-authored content).
5. Triggers ISR revalidation.

#### Important notes
- The script **never creates the Course itself** — fails loudly if `--course` doesn't resolve.
- The script **never creates overview/setup manually** — these should exist before import (the workflow says Course + Overview + Setup are always manual first, but the script will insert them as `generated` if they don't exist).
- `order_index` uses sparse integers (1000, 2000, ...) so future manual reordering can insert modules between existing ones without renumbering.

---

## 7. Module Structure

### Required modules
Every course must have:
1. **Overview module** — `slug: "overview"`, `title: "Course Overview"`. What the course covers, who it's for, how to use it. Always module #1.
2. **Setup/Introduction module** — `slug: "setup"` (or concept-appropriate). Foundational setup, context, or the first learnable skill.

### Content module pattern
Each content module should:
1. **Teach one concept** (not multiple).
2. **Name it plainly** — e.g. "Clarity: Say What You Mean", not "Effective Communication Strategies".
3. **Show a realistic BAD example** — what people actually say wrong.
4. **Show a BETTER example** — the practical improvement.
5. **Explain WHY** — 1 short sentence, not a theory paragraph.
6. **Give a TRY IT exercise** — rewrite, choose, adapt a script.

Example structure within a module:
```markdown
# Clarity: Say What You Mean

## What this teaches you

By the end of this module, you will be able to rewrite vague requests into clear ones in under 10 seconds.

## The problem

"I think maybe we could potentially look at changing the timeline if everyone is okay with it."

This sentence is 17 words, hedged with "I think", "maybe", "could", "potentially", and ends with "if everyone is okay" — a request hidden behind uncertainty.

## The fix

"I recommend moving the deadline to Friday."

Three reasons this works:
1. It states a recommendation (no hedging).
2. It gives a specific date (no ambiguity).
3. It's 7 words (vs 17).

## Try it

Rewrite this message:

"I was just wondering if it might be possible to maybe get the report done soon?"

<details>
<summary>Suggested answer (click to reveal)</summary>

"Can you send me the report by Thursday?"

Three changes: "just wondering" → direct; "if it might be possible" → direct request; "soon" → "Thursday".
</details>
```

### Module length
- **Short modules**: 200-400 words of body text.
- **No module should exceed 2-3 screens of scrolling.**
- **Do not pad** — if a concept fits in 100 words, don't write 300.

---

## 8. Access Control

### The access model

```
┌──────────────────────────────────────────────────────────┐
│  courseAccessInfo(user, course) → { hasFullAccess, visible } │
└──────────────────────────────────────────────────────────┘

  ADMIN role
    → hasFullAccess = true, visible = true  (always)

  Non-admin with role in allowedRoles
    → hasFullAccess = true, visible = true

  COMPANY_EMPLOYEE with company grant
    → hasFullAccess = true, visible = true

  Any signed-in user, course has ≥1 module
    → hasFullAccess = false, visible = true  (discoverable with lock icon)

  Otherwise
    → hasFullAccess = false, visible = false  (404 — course hidden)
```

### Setting access
Via the **Access** tab in `/manage-courses`:
- **Role checkboxes**: `FREE_USER`, `PAID_USER`, `INTERNAL_HR`, `COMPANY_HR`, `BRANDER` (Admin always has access; `COMPANY_EMPLOYEE` access comes from company grants; `COHORT_USER` is excluded).
- **Company grants**: dropdown of all companies, click Add to grant all employees at that company.

### Free preview (always applies on top of access)
Even a user with NO access role gets:
- The course visible in `/learn` (with lock icon).
- Modules beyond the free preview show title + lock icon, but `bodyMdx` is stripped.
- The first `min(ceil(n * 0.2), 10)` modules are readable.

### Getting Started modules
Modules with `show_in_getting_started: true`:
- Always visible on `/getting-started` page (no login wall).
- Always readable by anyone, regardless of access or preview status.
- Additive with free preview — a getting-started module outside the first N is still free.
- Use sparingly (1-2 modules max per course).

### What NOT to do
- Never trust "RLS returned this row" as "this user can open this course" — the getting-started branch in the RLS policy exists for `/getting-started` visibility, not for dashboard access.
- Never set `status: 'published'` before access control is configured — the discoverability exception means the course shows up with a lock for everyone as soon as it's published.
- Admin always has access — the only way to completely hide a course from admin is `status: 'draft'`.

---

## 9. Free Preview System

### The math

```typescript
// apps/api/src/lib/coursePreview.ts
export function computeFreePreviewCount(totalModules: number): number {
  return Math.min(Math.ceil(totalModules * 0.2), 10);
}
```

- 20% of modules, ceiling-rounded.
- Capped at 10 (so a 50-module course doesn't give away 10 free modules).
- Guaranteed ≥1 for any non-empty course (ceil of positive * 0.2 ≥ 1).

### Which modules are free
- The **first N modules by `orderIndex`** — this is the pedagogical sequence, not a custom-curated set.
- Order matters: plan your module order so the intro modules are first.

### Implementation in the API
`CourseController.listModules` and `getModule`:
```typescript
const locked = !info.hasFullAccess && !isModuleFreelyVisible(m, modules);
return {
  ...m,
  bodyMdx: locked ? '' : m.bodyMdx,  // ← stripped server-side
  completed: completedIds.has(m.id),
  locked
};
```

For free users:
- Modules 1 through N: `locked = false`, `bodyMdx` is the full content.
- Modules N+1 through end: `locked = true`, `bodyMdx = ''`.

### Getting Started override
```typescript
export function isModuleFreelyVisible(module, orderedModules): boolean {
  return module.showInGettingStarted || isModuleInFreePreview(module, orderedModules);
}
```
A module with `showInGettingStarted: true` is free even if it's beyond the first N. This can push the effective free percentage above 20% — intentional and accepted.

---

## 10. Completion & Progress Tracking

### How it works

```
Module page loads
  → ModuleCompletionTracker (client component)
    → POST /courses/{slug}/modules/{moduleSlug}/complete
      → ModuleProgressRepository.markComplete(userId, moduleId, courseId)
        → INSERT OR IGNORE into module_progress (idempotent)
          → CourseCompletionRepository.markCompleteIfAllModulesDone(userId, courseId)
            → If count(completed modules) == count(all modules)
              → INSERT OR IGNORE into course_completions
                → Course now appears on /mock-tests page
```

### ModuleCompletionTracker
```tsx
// apps/web/src/components/CourseModulePage/ModuleCompletionTracker.tsx
'use client';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function ModuleCompletionTracker({ courseSlug, moduleSlug }) {
  useEffect(() => {
    void apiFetch(`/courses/${courseSlug}/modules/${moduleSlug}/complete`, { method: 'POST' });
  }, [courseSlug, moduleSlug]);
  return null;
}
```
- **Client component** — fires on page load (not server-side, because the page is an async Server Component).
- **Idempotent** — `markComplete` uses `INSERT OR IGNORE` (unique on `(userId, moduleId)`). Revisiting a completed module is a no-op.
- **Only fires for unlocked modules** — the POST endpoint itself checks `isModuleFreelyVisible` and returns 404 for locked modules. Completion is a mutation with no legitimate reason to fire for locked content.

### ModuleCompletionTracker placement
On the module page (`learn/[slug]/[moduleSlug]/page.tsx`):
```tsx
{!mod.locked && <ModuleCompletionTracker courseSlug={slug} moduleSlug={moduleSlug} />}
```
- Only renders when the module is unlocked — a locked module page doesn't fire the completion POST at all.

### CourseCompletion (drives /mock-tests)
- `CourseCompletionRepository.markCompleteIfAllModulesDone` checks: `count(ModuleProgress for this user+course) == count(CourseModule for this course)`.
- If yes, inserts a `CourseCompletion` row (unique on `(userId, courseId)`).
- The `/courses/mock-tests` endpoint reads `CourseCompletionRepository.listForUser(user.id)` and embeds the published `Course` data.
- **Only published courses** appear on /mock-tests (a draft course completion is filtered out).
- Completion is never revoked or recomputed — if the course later gains new modules, the completion row stays as a permanent "completed as of this date" record.

### Progress display (sidebar)
`CourseModuleIndex` shows a green dot per module:
```tsx
<span className={mod.completed ? `${styles.dot} ${styles.dotComplete}` : styles.dot} />
```
- Green (`dotComplete`) if the user has a `ModuleProgress` row for this module.
- Empty circle otherwise.
- Only rendered in the module-outline view (not the course-switcher view).

---

## 11. Publishing Workflow

### Step 1: Create (status: draft)
- Via CourseEditor → **Save Draft** (or direct DB insert with `status: 'draft'`).
- Course is invisible to everyone (including admin on `/learn`).
- Only visible in `/manage-courses` list.

### Step 2: Add modules
- Via ModuleEditor (manual) or compose script (bulk).
- Modules can be created/edited while the course is still `draft`.

### Step 3: Set access control
- Via Access tab → set role grants + company grants.
- **Must be done before publishing** — once published, the discoverability exception makes the course visible (locked) to everyone.

### Step 4: Publish
- Via Details tab → **Republish** (or toggle Publish from Draft → Published).
- This calls `PUT /courses/{id}/status` with `{ status: "published" }`.
- API sets `publishedAt = now()` and calls `purge('courses')` (clears cache).
- The course now appears in `/learn` for users with access, and visible-but-locked for everyone else.

### Step 5: Verify
- Navigate to `https://next.sypher.local/learn/<slug>` (Caddy HTTPS, not localhost).
- Confirm course home, module pages, access gates, completion tracking.

### Cache invalidation
- `compose-authored-course.mjs` triggers: `POST /api/courses/revalidate-external` with `COURSES_REVALIDATE_SECRET`.
- Status toggle triggers: `purge('courses')` in the `updateStatus` endpoint (clears `getOrSet('courses', ...)` cache keys).
- Cache TTL: getting-started list is cached for 60s (`GETTING_STARTED_CACHE_TTL_MS = 60_000`).

---

## 12. Verification Checklist

| # | Check | How | Status |
|---|-------|-----|--------|
| 1 | Course appears in /manage-courses | Admin visits `/manage-courses`, sees the course in the list | ☐ |
| 2 | Course appears on /learn | Sign in as a user with access, course shows in grid | ☐ |
| 3 | Course home renders | `/learn/<slug>` shows name, description, cover, module list in order | ☐ |
| 4 | Module renders correctly | `/learn/<slug>/<moduleSlug>` shows markdown, code blocks, images | ☐ |
| 5 | Free preview works | First 2-3 modules readable by ungranted user; rest locked | ☐ |
| 6 | Locked module notice | `/learn/<slug>/<locked-slug>` shows LockedModuleNotice, no body content | ☐ |
| 7 | Role access works | PAID_USER sees all modules; FREE_USER (no grant) sees only preview | ☐ |
| 8 | Company access works | COMPANY_EMPLOYEE at granted company sees all modules | ☐ |
| 9 | Completion tracking | POST to `/complete` fires on module page load; ModuleProgress row created | ☐ |
| 10 | Course completion → mock-tests | Complete all modules, course appears on `/mock-tests` | ☐ |
| 11 | Sidebar navigation | CourseModuleIndex shows course outline with green completion dots | ☐ |
| 12 | Prev/next pagination | Edge-pager chevrons navigate between modules correctly | ☐ |
| 13 | Bookmarking | Bookmark button on course home and module page works | ☐ |
| 14 | Back link | "← Back to course" on module page, "← My Courses" on course home | ☐ |
| 15 | Mobile responsive | Paper sheet adapts, pager drops sidebar offset below 768px | ☐ |
| 16 | Getting Started | Module with `show_in_getting_started: true` visible on `/getting-started` | ☐ |
| 17 | Cache revalidation | After publish, fresh content shows without stale cache | ☐ |

### Testing URLs
- **App origin**: `https://next.sypher.local` (Caddy HTTPS — not localhost:3000)
- **Course home**: `https://next.sypher.local/learn/<slug>`
- **Module page**: `https://next.sypher.local/learn/<slug>/<moduleSlug>`
- **Course catalog**: `https://next.sypher.local/learn`
- **Mock tests**: `https://next.sypher.local/mock-tests`
- **Getting Started**: `https://next.sypher.local/getting-started`
- **Management UI**: `https://next.sypher.local/manage-courses`

Roles to test with:
- `FREE_USER` — sees free preview only
- `PAID_USER` with role grant — sees all modules
- `COMPANY_EMPLOYEE` with company grant — sees all modules
- Admin — sees all courses in management, full access everywhere

---

## 13. Common Pitfalls & Gotchas

### 1. `bodyMdx` is NOT compiled MDX
**Gotcha**: You can't use `<AsciiDiagram>`, `<Tabs>`, `<YouTube>`, or any JSX component in module content. These render as literal text.

**Why**: `CourseModuleArticle` uses `react-markdown` (plain markdown renderer), not an MDX compiler. The `rehypeRaw` plugin allows raw HTML, but not JSX component syntax.

**Fix**: Use plain markdown for all content. For diagrams, use fenced code blocks with box-drawing characters. For tabbed content, use separate code blocks with headers.

### 2. `import` statements render as literal text
**Gotcha**: Adding `import Tabs from '@theme/Tabs';` at the top of a module bodyMdx makes the word "import" appear on the page.

**Why**: Same as above — no MDX compiler strips imports, they're just markdown text.

**Fix**: Never use `import` statements in module content. All rendering is handled by `CourseModuleArticle`'s fixed component set (CodeBlock for code, react-markdown for everything else).

### 3. Scheme mismatch silently breaks sessions
**Gotcha**: Testing at `http://localhost:3000` or `http://localhost:3002` — the login redirect works, the page loads, but session cookies aren't stored. Everything looks unauthenticated.

**Why**: The Express session cookie has `secure: true` (HTTPS only). An HTTP request can't store it. The cookie is silently dropped.

**Fix**: Always test at `https://next.sypher.local` (Caddy proxy terminates TLS). Never use raw localhost:port.

### 4. Free preview is NOT a custom set — it's first-N-by-orderIndex
**Gotcha**: Thinking you can mark specific modules as free preview. The system doesn't support this.

**Why**: `isModuleInFreePreview` checks `rank < computeFreePreviewCount(orderedModules.length)` where rank is the position in the `orderIndex`-sorted array. `showInGettingStarted` is the only way to make a specific module always-free.

**Fix**: Order your modules so the intro content is first. Use `showInGettingStarted` for 1-2 modules you want always-free regardless of position.

### 5. Locked modules have `bodyMdx` stripped server-side
**Gotcha**: The API returns `bodyMdx: ''` for locked modules. If you're bulk-importing and forget to set `orderIndex` correctly, a module you thought was free might actually be locked.

**Why**: `CourseController.listModules` explicitly sets `bodyMdx: locked ? '' : m.bodyMdx` in the response. The full content never travels over the wire for locked modules.

**Fix**: Test access with a FREE_USER account, not just admin. Admin bypasses all access checks.

### 6. compose-authored-course.mjs never creates the Course
**Gotcha**: Running the compose script without first creating the Course row → "No course found" error, exit code 1.

**Why**: The script's header comment explicitly states: "The script never creates the Course itself — fails loudly if --course doesn't resolve to an existing row (Course + Overview + Setup are always created manually first via /manage-courses, per the stated workflow)."

**Fix**: Always create the Course first (via UI or direct DB insert), then run the compose script.

### 7. compose-authored-course.mjs skips `manual` modules
**Gotcha**: If you manually create an "Overview" module via the UI (authoring_mode='manual'), then run the compose script with an "overview.mdx" file in staging, the script skips it with a warning.

**Why**: The script checks `existing.authoring_mode === 'manual'` and skips rather than overwrites. This protects hand-authored content from being clobbered by generated content.

**Fix**: Either delete the manual module first, or don't include it in the staging directory. The workflow intent is: create Course + Overview + Setup manually, then bulk-import the remaining content modules.

### 8. The `/learn` route group vs `/learn/[slug]` layout difference
**Gotcha**: `/learn` (catalog grid) is inside the `(app)` route group (has DashboardSidebar). `/learn/[slug]` and `/learn/[slug]/[moduleSlug]` are OUTSIDE the `(app)` route group (uses CourseModuleIndex instead).

**Why**: Confirmed 2026-08-22 — the generic app nav isn't useful while inside a course. CourseLayout replaces DashboardSidebar with CourseModuleIndex for the whole `/learn/[slug]` subtree.

**Fix**: If adding new routes under `/learn/`, be aware of which route group they fall into and what layout wrapper they get.

### 9. `revalidate` requires deployed origin
**Gotcha**: The compose script's `revalidate()` function fetches `NEXT_PUBLIC_API_BASE_URL/api/courses/revalidate-external`. If this env var points to localhost, the revalidation POST fails silently.

**Why**: "A script process has no 'current origin' to fall back to — this must be the deployed app's absolute origin."

**Fix**: Set `NEXT_PUBLIC_API_BASE_URL` to the deployed origin (e.g. `https://next.sypher.local` or the production URL) in `apps/app/.env.local`.

### 10. `rehypeSanitize` strips `id` from headings by default
**Gotcha**: Anchor links to headings (`#heading`) don't work because `rehype-sanitize` strips `id` attributes from `h1-h6`.

**Why**: The default sanitize schema strips `id` from all tags as an anti-collision/targeting measure. The fix is applied via a custom schema that explicitly allow-lists `id` on `h1-h6` — but this is done at the `CourseModuleArticle` level, not in `bodyMdx`.

**Fix**: This is handled by the existing schema configuration in `CourseModuleArticle.tsx` — don't worry about it in content. Headings just work.

---

## 14. Quick Reference

### Commands

```bash
# Create course row: via UI at /manage-courses → + New Course → Save Draft
# OR direct DB insert (service role)

# Bulk import modules
cd apps/app
node scripts/compose-authored-course.mjs --course <slug> --input <staging-dir>

# Publish course
# Via UI: Details tab → Republish
# OR API: PUT /courses/{id}/status  { status: "published" }

# Start dev servers
cd apps/api && npm run dev
cd apps/web && npm run dev

# Verify
https://next.sypher.local/learn/<slug>
```

### File paths (key files to reference)

```
apps/api/
  prisma/schema.prisma                          ← DB models
  src/controllers/CourseController.ts           ← All endpoints, access logic
  src/lib/coursePreview.ts                      ← Free preview math
  src/lib/accessControl.ts                     ← Role/company access logic

apps/web/
  src/data/courses.ts                           ← Frontend CRUD functions + interfaces
  src/components/CourseModulePage/
    CourseModuleArticle.tsx                     ← react-markdown renderer
    ModuleCompletionTracker.tsx                 ← Completion POST trigger
    LockedModuleNotice.tsx                      ← Paywall
    styles.module.css                           ← Paper-sheet CSS
  src/app/
    (app)/learn/page.tsx                        ← /learn catalog grid
    (app)/mock-tests/page.tsx                   ← Completed courses
    (app)/manage-courses/page.tsx               ← Admin UI
    learn/[slug]/page.tsx                       ← Course home
    learn/[slug]/[moduleSlug]/page.tsx          → Module reader
    learn/[slug]/layout.tsx                     → Course layout (CourseModuleIndex sidebar)

apps/app/
  scripts/compose-authored-course.mjs           ← Bulk import script
  .env.local                                    ← Supabase + Bunny + revalidate secrets
```

### Env vars needed (apps/app/.env.local)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (for client reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypasses RLS — compose script only) |
| `NEXT_PUBLIC_BUNNY_STORAGE_ZONE` | Bunny storage zone name |
| `NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY` | Bunny upload key |
| `NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME` | Bunny storage hostname |
| `NEXT_PUBLIC_BUNNY_PULL_ZONE_URL` | Bunny pull zone URL (for reading) |
| `NEXT_PUBLIC_API_BASE_URL` | Deployed app origin (for revalidation POST) |
| `COURSES_REVALIDATE_SECRET` | Secret for revalidation endpoint |

### Content do's and don'ts

| Do | Don't |
|----|-------|
| Write plain markdown in bodyMdx | Use `<AsciiDiagram>` or `<Tabs>` |
| Use fenced code blocks with language tags | Write `import` statements |
| Use before/after examples | Use Docusaurus admonitions (`:::note`) |
| Keep modules 200-400 words | Pad with filler or theory |
| Use "TRY IT" text-based exercises | Create multiple-choice quizzes |
| Use realistic scenarios | Use generic "In today's world..." openers |
| Test at `https://next.sypher.local` | Test at `http://localhost:3000` |
| Verify with a FREE_USER account | Only verify with admin |
| Create Course + Overview + Setup first | Skip the prerequisite creation step |
| Set access control before publishing | Publish before setting access grants |

### Claude Code Commands

This guide is accompanied by two Claude Code slash commands in `.claude/commands/`:

#### `/next-life-skill <slug> [optional requirements]`
Specializes course creation for **non-technical life-skill courses** (e.g. Communication Skills, Time Management). It follows the same 8-step workflow (plan → DB insert → staging .mdx → compose script → access control → publish → verify → report) but applies life-skill-specific content rules:

- Plain English, no academic/corporate jargon
- Realistic before/after examples
- Practical scripts "When X happens, say Y instead of Z"
- Text-based "TRY IT" exercises (no quizzes — the system has no quiz framework)
- 8-12 modules, 200-400 words each
- No diagrams (pure English)

**Usage**:
```
/next-life-skill communication-skills
/next-life-skill communication-skills focus on workplace scenarios, include scripts for giving feedback to managers, emphasize email communication
/next-life-skill time-management 6 modules, cover Pomodoro and estimation techniques
```

The first token is always the slug. Everything after it is optional user-provided context that refines module count, focus areas, and content emphasis. The command then walks through the full creation workflow with these refinements applied.

Example invocation for the Communication Skills course (assuming this command exists and is invoked):
1. The command sets up a `scratch/communication-skills/` staging directory with `.mdx` files
2. Creates the `Course` row via direct Supabase insert (service-role key from `apps/app/.env.local`)
3. Runs `compose-authored-course.mjs` to bulk-import modules
4. Sets access control (FREE_USER + PAID_USER roles)
5. Publishes the course (status: published)
6. Verifies live at `https://next.sypher.local/learn/communication-skills`

#### `/create-course-web <slug>`
The general-purpose version for any Sypher Next course. Use this for technical courses that need code examples, more modules, or the full 4-section lesson structure (Overview / Build-It / Avoid-Mistakes / Review).

#### `/update-course <slug>`
Audits an existing course against the current template standards and fixes structural issues, deprecated sections, narration style, and link policy.

```
/next-life-skill <slug> [optional requirements]    ← Create a non-tech life-skill course
/create-course-web <slug>                          ← Create a general Sypher Next course
/update-course <slug>                             ← Audit & update an existing course
```

---

*This guide is the living reference for Sypher Next course creation. When the system changes, update this file.*
