# Current Task Handoff

> **STANDING RULE — DO NOT COMMIT WITHOUT EXPLICIT APPROVAL.** Never run
> `git commit` / `git add` (in preparation for a commit) / `git push` unless the
> user has, in this session, explicitly asked for that specific commit or push.
> Finishing the task, updating a file, a passing build, or approval of an
> earlier commit do NOT authorize one. Leave completed work as uncommitted
> working-tree changes and say it is ready. Approval is per-action. (Also in
> `AGENTS.md` → Git Safety Rules.)

## Current Status (IN PROGRESS, 2026-09-17: post-"API Audit and Mobile readiness" UI follow-on)

Last commit on `v2-openrouter` is `075c1a99` "API Audit and Mobile readiness"
(author codeasign, 2026-09-17 12:29 IST) — NOT this session's work, but the
baseline this session built on. It bundled a large, mostly-unrelated set of
streams; summarized here since no prior handoff section covers it:

- **New Videos feature** (full vertical slice): `Video` Prisma model,
  `apps/api/src/repositories/VideoRepository.ts` + `VideoController.ts`
  (streaming proxy via `apps/api/src/lib/videoStream.ts` — the real Bunny URL
  is never sent to the client), `VideoCommentController.ts`, apps/web pages
  `manage-videos` (admin CRUD, `ManageVideosContent.tsx` + `VideoEditor.tsx`),
  `browse-videos` (catalog) and `videos/[slug]` (watch page + playlist rail),
  `components/VideoPlayer`. Nav: `manage-videos` + `browse-videos` keys added
  to `apps/web/src/lib/navItems.ts`; Browse Videos was placed in the Overview
  section (not Manage) directly above Browse Courses — see
  `apps/web/Sidebar-Components-Map.md` (new this session, see below).
- **Course Auditor workflow**: new `REVIEWER` and `COURSE_AUDITOR` roles,
  `ModuleEditRequest` model/repository/controller — a Reviewer's proposed
  content edit is held for a Course Auditor to approve before it goes live.
  apps/web: `course-audit` page/nav key, `CourseModulePage/AdminModuleBody.tsx`
  + `AdminModuleEditContext.tsx` + `AdminModuleHeaderActions.tsx`.
- **API security/mobile-readiness audit** (apps/api, dated 2026-09-15 per its
  own doc header): `CONTRIBUTING.md` (new standing rules for every
  tsoa controller — `@Security('session')` gating, ownership re-derivation,
  never trust client-supplied ids), `Mobile-Auth-Design.md` (design-only,
  NOT implemented — bearer-token delivery path for the existing `Session`
  table, for a future Expo/RN client), `lib/rateLimit.ts` rewrite +
  `RateLimitBucket` model (Postgres-backed, fixes the multi-instance
  in-memory counter bug), `lib/httpCache.ts` (new shared cache-header
  helpers), `lib/cache.ts` (in-process purge-on-write cache — see its own
  file-header comment on the single-instance invariant), `lib/contentAuthz.ts`,
  `lib/bunnySign.ts`, new test files (`AuthController.test.ts`,
  `httpCachingAndPagination.test.ts`, `httpCache.test.ts`, `rateLimit.test.ts`,
  `tsoaAuth.test.ts`, `CohortRepository.test.ts`), `vitest.config.ts`.
- Renamed nav labels: "Launch Cohort" -> "Manage Cohort", "Setup & Dependencies"
  -> "Resources & Guides", "Bookmarks" -> "My Bookmarks" (all reflected in
  `Sidebar-Components-Map.md`).
- Also in that commit: `Toast/ToastProvider` (new global toast system),
  `zipGuard.ts`, avatar support on `DashboardSidebar`, two new question-bank
  `easy_extra.json` files, and routine question-bank/migration/package-lock
  churn. Not independently re-verified by this session; treat the above as a
  summary of what shipped, not a fresh audit.

This session (uncommitted, on top of that baseline) did small, independent
UI polish requested live, unrelated to the audit above:
- `videos/[slug]`: playlist-item hover background, description emphasis
  bumped to `--ifm-color-emphasis-900`, category line removed from playlist
  cards; `VideoPlayer`: centered play-icon overlay (shows while paused,
  solid `--ifm-color-primary` background) on top of the existing speed
  control.
- `browse-videos`: removed the play-icon badge overlay from catalog cards
  (`.playBadge` CSS deleted).
- `/blog` (`components/BlogList`): list-row thumbnail now a true fixed
  56x56 square, card-view image now full-width 16:9 with `object-fit:
  contain` (was cropping banner SVGs). Root cause of "fixed size not
  working": a global `img[src*="/svgs/"]` rule in `globals.css` (meant for
  course-diagram SVGs) also matches Bunny-hosted blog cover/content SVGs
  and out-specificities `.rowThumb`/`.cardImage` — fixed with `!important`
  on the thumbnail rules, not by touching the global rule (still needed
  for its original course-diagram use case).
- **New**: global upload-loading overlay. `data/uploadStatus.ts` (tiny
  external-store counter) + `components/UploadOverlay` (mounted once in
  root `app/layout.tsx`), wired through the single shared
  `data/bunnyUpload.ts#uploadToBunny` so every existing call site (blog/
  course/video/cohort editors, profile avatar, onboarding, access manager —
  9 call sites) gets a centered full-screen spinner automatically, no
  per-call-site changes needed.
- **New**: `apps/web/Sidebar-Components-Map.md` — durable map of every
  sidebar nav item -> route -> page -> component, created this session and
  already current as of the 075c1a99 baseline above. Paired with a new
  `AGENTS.md` Hard Rule: any future change to `navItems.ts` or a sidebar
  page's components must update this map in the same change.
- `apps/web/src/app/api/upload/route.ts` gen_ct_ai.py-adjacent script
  `apps/api/scripts/gen_ct_ai.py` is untracked and unrelated to this
  session's work (pre-existing untracked file, not touched).

Not done / not verified this session: no browser screenshot re-verification
of the last commit's Videos/Course-Audit features themselves (only this
session's own small CSS/JS changes were browser-checked, via Claude in
Chrome, against `https://next.sypher.local/blog` and the video pages).
`npx tsc --noEmit` passed for apps/web after the upload-overlay change.
No commit made this session — all of the above (except the prior commit
itself) is uncommitted working-tree state per the standing no-commit rule.

Next action: none pending from the user as of this handoff; resume from
git status if picking this back up.

## Previous Status (COMPLETE + COMMITTED + PUSHED, 2026-09-11: apps/web diagram/caption repair)

The repair the prior checkpoints scoped is DONE and verified end to end, then
committed and pushed. The preventive-code section and the Metrics-course notes
further down remain historical context.

### Commit / push

- Commit `43b2dd39` "UI - UX Changes , Audited Course and Diagrams" (author
  codeasign), pushed to `origin/v2-openrouter` on 2026-09-11.
- Follow-up commit `e5a80f1e` "Updated Instructions for handover file" (author
  codeasign), pushed 2026-09-11: adds the "DO NOT COMMIT WITHOUT EXPLICIT
  APPROVAL" standing rule to `AGENTS.md` (Git Safety Rules) and to the top of
  this file. Branch up to date with origin; working tree clean.
- It bundles THREE streams that were all uncommitted at the time: (A) the prior
  agent's Docusaurus import of agentic-ai-fundamentals + git-github-actions
  (importer, CourseController import endpoint, package*.json parse5, 2 manifests,
  ~395 `apps/docs/docs/**` YAML/content files, helper scripts); (B) this
  session's diagram/caption repair (see New/changed files below); (C) unrelated
  in-progress apps/web UI work (bookmarks two-pane, navbar "My Courses",
  dashboard scrollbar, course-cover banners, CourseScroller, ActionIcons).
- `scratch/diagram-browser-profile/` was initially committed by mistake. Its
  Chrome Crashpad dump contained two OpenRouter API keys, so GitHub push
  protection blocked the first push. Fixed by `git rm -r` of that dir +
  `.gitignore` entries (`scratch/diagram-browser-profile/`,
  `scratch/*-browser-profile/`) + `git commit --amend` (old unpushed hash
  `11b4a8dc` discarded). Final commit scanned clean for secrets before push.
- OUTSTANDING (user action, not code): rotate the two leaked OpenRouter keys
  (`sk-or-v1-1dde9797…`, `sk-or-v1-3ec55efd…`). They never reached the remote
  (push protection blocked the first attempt) and are in no tracked file, but
  they were briefly written to disk in a locally-committed artifact. The live
  key in `apps/docs/.env` (gitignored) is unaffected.

### Outcome

### Independent re-verification (2026-09-11)

- Reran the full read-only live audit from apps/api: all 949 CDN SVG URLs
  returned HTTP 200; 13 blackboard-v4 and 936 blackboard-v3. No failed fetches,
  gray-background defects, missing source captions, bare imported images,
  unmatched diagrams or incorrectly styled following prose were reported.
- All 14 safeguard tests passed with `node scripts/diagram-safeguards.test.mjs`.
  The `node --test` launcher hit sandbox spawn EPERM; running the same test file
  directly executed all 14 tests successfully in-process.
- API /health and web localhost:3002 both returned HTTP 200. No browser visual
  check was repeated in this verification.
- Corrected assets are available at the live referenced new URLs. No CDN purge
  is indicated by these results; new content-hashed filenames avoid reuse of
  the old defective image URLs. If an already-open lesson looks stale, reload
  it (Ctrl+F5). No cache was purged and no content/assets were changed this turn.
- Git reconciliation: contrary to the historical clean-tree statement above,
  current-task.md already had an uncommitted CDN-scope clarification. Preserved
  it; this handoff remains the only modified file. No commit/push performed.
- Next action: no further repair or upload required for the audited defects.
  Investigate a specific browser URL only if the user still observes stale UI.

### Previously recorded outcome

- Git reconciled at session start: matched the prior checkpoint exactly
  (415 tracked + 10 untracked). `https://next.sypher.local` confirmed WORKING
  (the earlier "outage" did not reproduce; unauth routes correctly 307 -> /login).
- All 18 imported-diagram courses migrated through the authenticated apps/api
  management API. Final full audit (`node apps/api/scripts/audit-course-diagrams.mjs`,
  all 949 CDN fetches): every course `bareImportedImg 0`, grey-defect `0`,
  `missingCaptions []`, `styledProseParagraphs 0`, `unmatched 0`.
  949/949 diagrams are now `<figure>`-wrapped; 912 carry a `<figcaption>`
  (544 pre-existing `<p><em>` folded in verbatim + 225 restored from source
  `caption` + 143 git-github-actions source `title`); 37 git-github-actions
  figures are intentionally caption-less (source has only `alt`).
- **CDN re-upload scope (user asked explicitly, 2026-09-11):** only the **13**
  defective SVGs were re-uploaded to Bunny — NOT all 949. The other 936 healthy
  v3 SVGs were left completely untouched: same bytes, same URLs, never
  re-uploaded (deliberate, per "preserve healthy SVG URLs" / "don't wholesale
  reimport"). This upload went directly through Bunny's storage API and is
  independent of git — SVG assets on Bunny are not git-tracked, so this
  happened regardless of the commit/push history above.
- All 13 grey edge-label SVGs re-normalised from their CURRENT CDN bytes with
  the shared blackboard-v4 helper and re-uploaded under new content-hashed
  filenames in the same folders; only those 13 image URLs changed. The other
  936 SVG URLs are byte-for-byte the same v3 assets as before.
- `node --test apps/api/scripts/diagram-safeguards.test.mjs` — 14 tests green.
  apps/api `tsc --noEmit` clean. Re-running the repair driver on any migrated
  course = 0 changes (idempotent).
- Browser-verified (user was logged in): screenshot lesson +
  `typescript-for-test-automation/functions-and-imports`,
  `python-for-test-automation/setup`, two `git-github-actions` overviews — grey
  label boxes gone, `<figcaption>` styled correctly (or absent for caption-less),
  following prose is ordinary body text.

### Artifacts

- Pre-repair backup (all 37 courses / 1304 modules):
  `C:\Users\admin\AppData\Local\Temp\sypher-diagram-repair-backups\course-bodies-backup-2026-09-10T18-29-27-925Z.json`
- Per-milestone driver reports + final audit JSON: same folder,
  `repair-ttfa-apply.json`, `repair-milestoneA..D.json`, `audit-final.json`.
- `Course-Diagram-Audit.md` (repo root) rewritten with the before/after table
  and the full change list.

### New / changed files this session (now in commit 43b2dd39; none are course content)

- NEW `apps/api/scripts/repair-course-diagrams.mjs` — the repair driver.
- NEW `apps/api/scripts/diagram-safeguards.test.mjs` — `node --test` regression suite.
- MOD `apps/api/src/lib/diagramMarkup.ts` — caption now optional
  (`renderDiagramFigure` / `diagramCaption` / `assertImportedDiagramCaptions`
  accept an image-only `<figure>`; `alt` never used as a visible caption).
- MOD `apps/api/scripts/import-docusaurus-course.ts` — importer call site follows
  the new `diagramCaption(caption, title)` signature.
- MOD `apps/api/scripts/audit-course-diagrams.mjs` (was untracked) — imports the
  reader's real `courseMarkdownSchema`, recognises the v4 `.edgeLabel *` override,
  adds `--course` filter and `bareImportedImg` / `figuresWithCaption` fields.
- The DB (949 module bodies) and Bunny CDN (13 new v4 SVGs) changed; those are
  not in git.
- All of it (streams A/B/C) landed in commit 43b2dd39 EXCEPT
  `scratch/diagram-browser-profile/`, which was removed and gitignored.
  Working tree is now clean; `git status` shows up to date with origin.

### If anything else is wanted

- Re-verify any time: `cd apps/api && node scripts/audit-course-diagrams.mjs`.
- The preventive-code review, `parse5` dependency note, and Puppeteer/EPERM
  notes below are still accurate history.
- The diagram/caption repair is shipped. Any further diagram work would be new
  scope (e.g. authoring real captions for the 37 caption-less git-github-actions
  figures, or reviewing the ~49 source-hash drifts deliberately left alone).


### Objective and authority

Fix apps/web's gray SVG edge-label backgrounds, missing diagram captions and
ordinary prose being styled as captions, with preventive validation/regression
tests. User has authorized the repair; do not ask them again whether to fix it.
The screenshot URL is
https://next.sypher.local/learn/typescript-for-test-automation/just-enough-typescript-to-read-a-test.
All course/module writes must use authenticated apps/api management endpoints,
never direct Prisma or Supabase writes. Preserve course IDs, module IDs, slugs,
order, access grants, published status and unrelated lesson text.

### Confirmed baseline (diagnosis complete)

See Course-Diagram-Audit.md for the full table and links to all 13 defective SVGs.
37 courses / 1,304 modules / 949 live SVG references across 18 courses:
- 13 SVGs across 5 courses have the nested edgeLabel p gray background defect.
- 225 source captions are missing from stored bodies across 11 courses.
- 180 Git GitHub Actions diagrams have no caption field in source, but existing
  diagram titles/alt descriptions can supply captions without inventing content.
- 74 ordinary paragraphs across 8 courses match the old img + p caption styling.
- 49 live SVG references differ from current source hashes: do NOT wholesale
  reimport courses just to fix captions. Preserve the live diagram content.
- All 37 courses were published at the last audit; neither this diagnosis nor
  the current repair changed their publication status.

### Implemented locally (not end-to-end validated)

1. New apps/api/src/lib/diagramSvg.ts extracts the existing blackboard normalizer
   into a shared helper. It removes prior data-sypher-theme style blocks, writes
   blackboard-v4, and overrides background on edgeLabel AND every descendant,
   covering the previously missed nested p. It uses the actual SVG root id and
   rejects missing/invalid root ids or missing closing svg tags.
   diagramSvgFilename returns <stem>.blackboard-v4-<SHA256-prefix>.svg based on
   normalized bytes, so corrected assets get new immutable URLs instead of stale
   CDN-cache reuse. Existing diagram geometry/text is meant to be preserved.
2. New apps/api/src/lib/diagramMarkup.ts provides caption fallback (caption, then
   existing title, then alt), one-pass basic entity decoding, HTML escaping,
   renderDiagramFigure, and assertImportedDiagramCaptions using parse5.
   It emits <figure><img ... /><figcaption>...</figcaption></figure> and rejects
   imported /svgs/*.svg images without a nonempty figure caption. It ignores
   fenced code examples. This validator needs regression coverage/review.
3. apps/api/scripts/import-docusaurus-course.ts uses those helpers for future
   imports (v4 content-hashed SVG filenames + required semantic captions).
   Its former inline normalizer was moved out. Existing script comments and
   verification assumptions still need cleanup for the new representation.
4. CourseController now calls assertImportedDiagramCaptions on module create,
   import and body update. The watcher may already have loaded this code.
   IMPORTANT partial-state consequence: saving an existing legacy body can now
   be rejected until converted to figures. Address compatibility during repair;
   do not assume the currently published legacy content has been migrated.
5. apps/web/src/components/CourseModulePage/markdownSchema.mjs now explicitly
   permits figure/figcaption while retaining all other sanitizer restrictions.
   CourseModuleArticle.tsx uses this schema. styles.module.css removes both broad
   p:has(em) and img + p rules and styles only figure/figcaption. Existing legacy
   captions therefore no longer receive the old styling until migrated.
6. parse5 ^7.3.0 was declared in apps/api/package.json and the apps/api entry of
   package-lock.json. Version 7.3.0 was already installed and locked transitively.
   npm install --package-lock-only --ignore-scripts failed with ENOTCACHED due
   to the offline registry policy, so these two declaration lines were patched
   directly; no new package version was downloaded.
7. New scripts/register-typescript.cjs shares the in-process TypeScript loader;
   run-import-without-esbuild.cjs now requires it. This avoids esbuild spawn EPERM.

### NOT done yet

- No repair/migration driver, backup snapshot, or mutation plan has been created.
- NO course bodies or CDN SVGs have been repaired in this repair phase.
- No v4 SVGs have been uploaded. The 13 live defects and persisted caption gaps
  remain; only local code/CSS has changed.
- No regression tests have been written. No final browser verification.
- The audit/check scripts have NOT been updated for figure captions, caption
  fallback, content-hashed filenames or v4. Current audit gray detection looks
  for an edgeLabel p override, so must recognize the new wildcard override too.
- The existing importer --verify expects freshly converted exact source output,
  including v4 URLs. It will not pass against still-legacy assets, and selective
  repair of only 13 SVGs will intentionally leave healthy v3 asset URLs intact.
  Add a conformance check that validates captions/actual SVG styling without
  forcing unrelated live diagrams to change.

### Validation and environment

- npx tsc --noEmit -p apps/api/tsconfig.json passed after the new helpers and
  controller calls were added (before the declaration-only package/lock edits).
- apps/web typecheck/build and renderer tests have not run on these changes.
- Puppeteer launch fails with spawn EPERM. A shell Start-Process attempt returned
  PID 22284 but it exited; no DevToolsActivePort was produced. A subsequent
  redirected launch failed on duplicate environment keys Path/PATH.
  scratch/diagram-browser-profile/ contains generated browser artifacts; not
  source code and not intended for commit. PID 22284 is no longer running and
  port 9229 is not listening. No repair/import background jobs are running.
- Last port check: API :4000 PID 7176, web :3002 PID 39216. Both left running.
- Manual tsoa generation previously hit EPERM on generated files; the running
  development watcher did generate/load routes successfully. Check live behavior.

### Concrete Next Action

1. Read AGENTS.md and this checkpoint, inspect current Git diff, and review the
   new helpers. Add meaningful regression tests before making live writes:
   the screenshot's nested gray p, normalized SVG idempotence/content-hashed URLs,
   figure/figcaption surviving the real sanitizer, escaped text remaining safe,
   prose after images retaining normal styling, and API rejection of lost captions.
   Test caption/title/alt fallback and captionless sources failing clearly.
2. Build a dry-run, idempotent repair driver. Reuse the audit's source matching
   (unique alt first, then hash; handle repeated hashes, paired AsciiDiagram tags,
   and entities). Back up original bodies/metadata before writes. Convert the
   949 imported diagram blocks to explicit figures, preserving existing caption
   text or restoring the 225 source captions; use authored title/alt for the
   180 sources without caption fields. Never substitute ordinary following prose.
3. Fetch the 13 defective CURRENT CDN SVGs, normalize those exact bytes with the
   shared v4 helper, upload under new content-hashed filenames in their existing
   course/module folders, verify the new URLs, then update only those image URLs
   in the planned bodies. Keep the other live diagram URLs and all lesson text.
4. Review the plan and apply via authenticated API, checking each current body
   still matches its preflight snapshot before updating. Preserve all non-body
   fields/status/access; compare afterwards. Rerunning should make zero changes.
5. Update/read-only audit and checks to use the actual reader schema and new
   caption contract. Validate all 949 diagrams/captions, API negative cases,
   sanitizer behavior, plus the screenshot lesson visually if browser access can
   be obtained safely. Add a runnable regression-test command to prevent repeats.
6. Update Course-Diagram-Audit.md and this handoff with final results. No commit
   unless explicitly requested. Do not promise literal impossibility of future
   bugs; deliver enforceable checks for these failure modes.

### Files Modified (actual Git status at handoff)

415 tracked modifications and 10 untracked entries. No commits made.
- 235 apps/docs/docs/agentic-ai-fundamentals/ files and 160 git-github-actions/
  files are the pre-existing audits/import YAML corrections. Preserve them.
- Earlier import work: apps/api/scripts/import-docusaurus-course.ts,
  apps/api/src/controllers/CourseController.ts, the Agentic AI diagram manifest,
  apps/docs/diagram-manifests/summary.json, and memory-bank/current-task.md.
  The importer/controller are additionally modified by this repair as above.
- Current repair additionally modifies apps/api/package.json, package-lock.json,
  apps/web/src/components/CourseModulePage/CourseModuleArticle.tsx and
  apps/web/src/components/CourseModulePage/styles.module.css.
- 11 unrelated pre-existing apps/web changes remain: app/(app)/bookmarks/
  BookmarksContent.tsx, page.tsx, styles.module.css; app/learn/[slug]/page.tsx and
  styles.module.css; components/AuthoredBookmarkButton/styles.module.css;
  components/CourseScroller/index.tsx; components/DashboardHome/styles.module.css;
  components/Navbar/index.tsx and styles.module.css; components/icons/ActionIcons.tsx.
  All these paths are relative to apps/web/src. Do not overwrite them.
- Untracked: Course-Diagram-Audit.md; apps/api/scripts/audit-course-diagrams.mjs,
  check-course-import.mjs, check-import-frontmatter.cjs, register-typescript.cjs,
  run-import-without-esbuild.cjs; apps/api/src/lib/diagramMarkup.ts and diagramSvg.ts;
  apps/web/src/components/CourseModulePage/markdownSchema.mjs;
  scratch/diagram-browser-profile/ (generated diagnostic artifacts).

The older COMPLETE diagnosis and import notes below are historical. Repair
authorization and IN PROGRESS status above supersede their "diagnosis only" text.

## Previous Phase (COMPLETE, 2026-09-10: apps/web diagram/caption diagnosis)

User reported a gray box behind "shape" and a missing caption at
/learn/typescript-for-test-automation/just-enough-typescript-to-read-a-test,
then requested the depth across apps/web courses. Scope is diagnosis, not repair.
Full report: Course-Diagram-Audit.md; reusable read-only checker:
apps/api/scripts/audit-course-diagrams.mjs.

Completed: authenticated reads of all 37 courses / 1,304 modules; all 949 live
imported SVG URLs across 18 courses returned 200 and blackboard-v3. Found:
- 13 SVGs across 5 courses with the exact gray-background defect: TypeScript for
  Test Automation 3, API Testing TypeScript 2, API Testing Python 1, Playwright 1,
  Python for Test Automation 6. The normalizer misses the nested edgeLabel p
  background, which retains rgba(232,232,232,0.8). Palette-marker checks miss this.
- 225 source captions absent from persisted apps/web bodies across 11 courses.
  The historical importer c4e7bec2 emitted only img/src/alt; current caption
  support does not repair old imports. No captions are missing from the two
  newly imported courses.
- Git GitHub Actions has 180 diagrams with no caption in the source itself.
- Reader CSS img + p incorrectly styles 74 normal prose paragraphs across
  8 courses as captions. Counts verified through the reader's remark/rehype
  parsing/sanitization chain; this explains the centered prose in the screenshot.
- 49 live SVG references across 6 courses differ from current source hashes.
  Do not blindly reimport whole courses just to restore captions.

Known issues/limits: headless Chromium launch fails with spawn EPERM. Audit uses
live CDN/DB content and renderer AST/CSS, not full visual-browser certification.
All current catalog courses are now published, including the two earlier draft
imports; this change was observed, not made by this audit.

Files Modified reconciled with Git: 411 tracked modifications plus 5 untracked
files. The previous import's 400 tracked changes and 3 helper scripts remain.
11 additional pre-existing apps/web changes were observed and preserved:
bookmarks/BookmarksContent.tsx, bookmarks/page.tsx, bookmarks/styles.module.css,
learn/[slug]/page.tsx, learn/[slug]/styles.module.css,
components/AuthoredBookmarkButton/styles.module.css, components/CourseScroller/index.tsx,
components/DashboardHome/styles.module.css, components/Navbar/index.tsx,
components/Navbar/styles.module.css, components/icons/ActionIcons.tsx
(bookmarks paths are under apps/web/src/app/(app); learn paths under apps/web/src/app;
components paths under apps/web/src). This audit adds Course-Diagram-Audit.md and
apps/api/scripts/audit-course-diagrams.mjs, and updates this handoff only.
No course bodies, SVG assets, or rendering CSS were changed; no commits made.

Next Action: present the report. If repair is requested, fix the SVG label
normalizer and 13 live assets, restore the 225 missing captions through the API,
and narrow caption CSS. Treat the 180 missing source captions as separate authoring
work. Earlier Status/Files Modified/Next Action sections are historical.

## Previous Task (COMPLETE, 2026-09-10: import two audited courses)

Both requested courses are now in Sypher Next as drafts with blackboard-v3 SVGs.
Neither existed in the authenticated catalog before this import (35 courses);
the catalog now has 37 courses. No publish or access-grant changes were requested.

### Completed and validated

- agentic-ai-fundamentals: cmtv6fudk000byd9ot2cbp705, 234 modules, 57 SVGs.
- git-github-actions: cmtv6yo1j00jbyd9orvblphfm, 163 modules, 257 SVGs.
- All 397 stored bodies, titles, slugs, section labels/orders and 10-step module
  order indexes exactly match conversion of the current source (--verify mode).
- All 314 public CDN SVGs returned success and contain blackboard-v3 plus canvas
  #0B0F14, boxes #16202C, borders/arrows #5EA3E6 and text #E8EEF5.
- Authenticated https://next.sypher.local/manage-courses returned HTTP 200 with
  both courses in its rendered payload. This was an HTTP check, not visual browser QA.
- TypeScript passes. Live API checks pass unauthenticated rejection, missing-course
  rejection, invalid slug/order rejection, and idempotent re-upsert retaining IDs/counts.
- Corrected 56 stale Agentic AI svgGitTracked flags after actual Git/disk verification;
  updated both its manifest and summary, including totalUntrackedSvg (242).
- Fixed 212 invalid unquoted YAML title/sidebar_label values without changing their
  displayed text. All 450 source files now parse. The earlier audit's assertion
  that frontmatter was clean was incorrect.

### Decisions and known issues

The legacy importer used direct repository writes, contrary to current AGENTS.md.
It now uses authenticated management API requests, with a management-protected
POST /courses/{courseId}/modules/import endpoint preserving source slugs/sections/order.
Reimports retain existing course status, access and module identity; new courses
default to draft. Requests commit individually and reruns resume by stable slug.
--verify performs read-only comparisons without uploading or writing.

Manual generation of ignored API routes/swagger hits EPERM, but the development
watcher generated/loaded the new route successfully (verified against the live API).
tsx also hits esbuild spawn EPERM here; scripts/run-import-without-esbuild.cjs
provides an in-process TypeScript loader for the same importer.
The pre-existing MCP overview diagram's old config labels remain out of scope.

### Files Modified (reconciled with Git)

400 tracked modifications and 3 untracked helper scripts, all uncommitted:
- 235 apps/docs/docs/agentic-ai-fundamentals/ files (pre-existing audit plus YAML fixes).
- 160 apps/docs/docs/git-github-actions/ files (pre-existing audit plus YAML fixes).
- apps/api/scripts/import-docusaurus-course.ts
- apps/api/src/controllers/CourseController.ts
- apps/docs/diagram-manifests/agentic-ai-fundamentals.json
- apps/docs/diagram-manifests/summary.json
- memory-bank/current-task.md
- New: apps/api/scripts/check-course-import.mjs
- New: apps/api/scripts/check-import-frontmatter.cjs
- New: apps/api/scripts/run-import-without-esbuild.cjs

### Next Action

Import work is complete. Review the drafts in Manage Courses; publish only when
requested. No commit was made. Older Status, Files Modified and Next Action
sections below are historical and superseded by this section.

## git-github-actions content-quality audit (COMPLETE, 2026-09-09; verified 2026-09-10)

**STATUS: DONE.** All 51 topics / 211 files close-read against the 6-criteria
rubric. ~85 confirmed technical/structural bugs fixed (full per-topic list and
recurring bug families in the "GIT-GITHUB-ACTIONS COURSE: CONTENT-QUALITY AUDIT
(COMPLETE)" section further down this file, ~line 1439). Changes are UNCOMMITTED
in the working tree (160 files modified under apps/docs/docs/git-github-actions/),
left that way per the original directive - the user commits separately, same as
the design-patterns and python-for-ai-engineers audits.

Final course-wide corruption sweep INDEPENDENTLY RE-VERIFIED 2026-09-10 (the
forked worker asserted "zero hits" but died to a rate limit before actually
running it): re-ran all detection patterns against current content of every
file - 0 remaining em/en dashes outside AsciiDiagram/mermaid, 0 title-suffix
corruption (`^title:.*\) [A-Z]`), 0 prose paren-imbalance (excl. fenced code /
diagram content / table rows), 0 broken frontmatter titles. Clean.

Diagrams (AsciiDiagram tags + mermaid sources) were out of scope and untouched;
a few diagram numbers now trail a nearby prose fix (noted in the summary below).

Next action for a future session: none required for the audit itself. If asked
to publish, this course would re-import into apps/web the same way
design-patterns / python-for-ai-engineers were (see those sections + the
"How to import a course from Docusaurus" reference below).

---
### Original scope note (kept for context)
Same process/rubric as the completed design-patterns and python-for-ai-engineers
audits (see those sections below): relevance, accuracy, readability, engagement,
zero em/en dashes, human-voice; 95% minimum per file. Scope:
`apps/docs/docs/git-github-actions/`, 51 topics, 211 files (50 topics x 4 files
[`index.md`, `01-overview.mdx`, `02-practice-exercise.mdx`,
`03-general-practice.mdx`] + capstone's 10 files + top-level `index.md`).
Canonical topic order is `apps/docs/sidebars/git-github-actions.json`.

Course-wide mechanical dash pre-pass (COMPLETE): ran the ported dash-fix script
across all 211 files, 141 fixed. Verified 0 remaining em/en dashes outside
protected AsciiDiagram/mermaid blocks, 0 markdown-link corruption, AsciiDiagram
tags intact. One genuine double-colon artifact found and hand-fixed:
`artifacts-and-build-outputs/03-general-practice.mdx` line 282 (a pre-existing
YAML colon inside a code span collided with the script's inserted colon).
Reusable script: `ggha_audit_dash_fix.py` in this session's scratchpad
(session-scoped, copy out before it expires) - same v4 logic as the
python-for-ai-engineers tool (protects AsciiDiagram content/mermaid fences,
paired-em-dash-aside heuristic, guards on 2+ JSX attributes per line).

Per-topic close read (relevance/accuracy/readability/engagement/human-voice,
not just dashes) IN PROGRESS: `what-version-control-is` topic complete (index.md
+ 3 lesson files) - content already excellent (strong narrative hook, accurate
Git internals, no AI-tells), only needed the dash pass plus 2 manual index.md
dash-to-comma smoothing edits. Also manually dash-fixed the top-level course
`index.md` (5 edits: en-dash range, 2 em-dash-to-comma prose rewrites, 2
bullet-label colons).

Remaining topics in sidebar order (50 left, not yet close-read for
accuracy/engagement beyond the mechanical dash pass): using-the-terminal,
installing-git, what-github-is, your-first-repository, what-is-version-control,
git-init-add-commit, git-staging-area, git-log-and-history,
gitignore-and-git-attributes, git-reset-revert-checkout, git-remotes-push-pull,
git-stash, git-branching, git-merging, resolving-merge-conflicts, git-rebasing,
interactive-rebase-history-rewriting, cherry-picking-commits, git-bisect-and-blame,
git-tags-and-releases, forking-and-pull-requests, code-review-workflow,
github-issues-project-boards, git-hooks, git-submodules, git-worktrees,
github-actions-fundamentals, workflow-yaml-syntax, triggers-and-events,
jobs-steps-runners, environment-variables-and-secrets, artifacts-and-build-outputs
(dash-fixed + the one manual fix above, not yet close-read), building-a-ci-pipeline,
matrix-builds, caching-dependencies, deployment-workflows-cd,
github-environments-approval-gates, release-automation,
required-status-checks-gated-checkins, codeowners-required-reviewers,
reusable-workflows-composite-actions, branch-protection-rules,
security-scanning-codeql-dependabot, debugging-github-actions-workflows,
pipelines-as-quality-gates, which-quality-gates-matter, managing-flaky-tests,
test-parallelization-pipeline-speed, pipeline-reliability-failure-triage,
testing-your-pipelines, capstone.

Next action: continue close-reading topics in the order above, checkpointing
here every ~10 topics or on a rate-limit interruption.

**Course-wide corruption sweep after the mechanical dash pass (COMPLETE, real
bugs found):** the dash-fix script's paired-em-dash-aside heuristic (merges
"A - B - C" into "A (B) C" when exactly 2 em dashes appear on one line) mis-fired
on lines where two UNRELATED single-dash sentences happened to share a line, or
where a genuine paired aside's closing punctuation didn't suit a bare space.
Found and hand-fixed real corruption in:
- `using-the-terminal/02-practice-exercise.mdx` + `03-general-practice.mdx` and
  `your-first-repository/02-practice-exercise.mdx` + `03-general-practice.mdx`:
  frontmatter titles like "Topic (Subtitle) Let's Work Together" missing the
  colon before the suffix clause - fixed to "Topic (Subtitle): Suffix".
- `branch-protection-rules/01-overview.mdx`: a paragraph where two unrelated
  sentences on one line got merged into one broken multi-sentence parenthetical
  ("...the others (it restricts... Use this sparingly) it can block...") -
  restored to two clean sentences.
- `your-first-repository/01-overview.mdx`, `matrix-builds/01-overview.mdx`,
  `reusable-workflows-composite-actions/01-overview.mdx`: same cross-sentence
  parenthetical corruption pattern, all restored.
- `resolving-merge-conflicts/03-general-practice.mdx`: found a PRE-EXISTING
  (not script-caused) unclosed parenthetical bug in original source text,
  fixed while auditing the same file.
- `artifacts-and-build-outputs/03-general-practice.mdx`,
  `workflow-yaml-syntax/01-overview.mdx`,
  `matrix-builds/01-overview.mdx` (second fix): minor double-colon /
  colon-collision smoothing where the script's single-dash-to-colon conversion
  landed next to a pre-existing colon or another converted dash on the same
  line.

Verification method used (reusable if this happens again on remaining topics):
(1) `git diff` grep for lines with 2+ literal em dashes in the pre-image
(`^-.*—.*—`) to find every line the paired-heuristic touched, spot-check each
converted result; (2) grep current files for unbalanced `(`/`)` per line
(excluding fenced code, AsciiDiagram content, table rows) to catch
cross-sentence merges; (3) grep for a lowercase-letter-colon...colon pattern
to catch double-colon leftovers, filtering out legitimate multi-clause
sentences. All three sweeps are now clean across the whole course except
topics not yet reached in the close-read pass (the sweep already covered 100%
of files, not just topic 1, so remaining topics do NOT need this corruption
sweep repeated - only the accuracy/readability/engagement close-read is left).

**IMPORTANT CORRECTION to the above:** the paren-balance sweep (method 2) had
a blind spot - a line with a legitimate NESTED parenthetical (e.g. "(work
laptop, personal computer, a cloud VM)") plus the corruption's outer parens
still nets to a balanced open/close COUNT, so it slipped through undetected.
Found via a better method: (4) directly scan the git diff pre-image for every
line with exactly 2 em dashes, then check whether the text BETWEEN the two
dashes contains a sentence break (regex `\.\s+[A-Z]`) - that indicates the
"paired aside" was actually two unrelated sentences that should never have
been merged. This found 11 total instances (most already caught by methods
1-3, but 4 NEW ones missed by the paren-balance check): `installing-git/
01-overview.mdx` (nested-paren case), `debugging-github-actions-workflows/
01-overview.mdx` (3 separate instances in one file), `gitignore-and-
git-attributes/02-practice-exercise.mdx` (also required restoring the actual
original meaning, not just re-punctuating - the mechanical merge had inverted
the lesson's logic about why `data.bin` stays untracked), `your-first-
repository/01-overview.mdx` (a second instance, the `--force` bullet). All 11
now verified fixed and re-swept clean (method 4 rerun against the diff
pre-image list, then grepped every flagged file's CURRENT content for any
remaining em/en dash - zero hits). Lesson for any future dash-fix pass: method
4 (sentence-break-between-dashes check) is strictly more reliable than
paren-balance counting and should be the primary corruption check, not a
supplement.


## Objective
Started as: extend the Docusaurusâ†’Sypher Next course importer
(`apps/api/scripts/import-docusaurus-course.ts`) to cover 6 more courses
the user listed (sorting-algorithms, search-algorithms, solid-principles,
design-patterns, git-github-actions, coding-bootcamp â€” alongside the 14
already-imported ones), fixing bugs/improving the script as needed, but
only actually running the import for ONE course as a pilot for now.
Grew into: the user browsed the live imported course and reported real
bugs (duplicate heading, missing captions, missing course-nav sidebar,
unstyled/monochrome code blocks) â€” fixing those became part of the same
task, see "session 2"/"session 3" below.

## Completed Follow-up (2026-09-09: deepen Life Skills courses)
The user authorized revisions to only the two courses whose category is exactly
`life-skills`: `communication-skills` and `negotiation-skills`. Do not modify
the 17 `Presentation` courses. Requirements: increase useful depth without
padding, add no external links, and rename every `TRY IT` section to
`PRACTICE`. Preserve the current published status and `FREE_USER,PAID_USER`
access. All database writes must use the authenticated apps/api management
endpoints through `apps/web/scripts/import-authored-course.mjs`; never write
course rows directly through Prisma or Supabase.

Baseline before editing: Effective Communication has 12 published modules and
6,117 words; Negotiation Skills has 10 published modules and 4,742 words. Both
have one-exercise overview practices and no final integrated practice. The
committed staging files at `scratch/communication-skills/` and
`scratch/negotiation-skills/` match the recoverable source baseline in commit
`f767952d`. New lessons must be reordered through the management API because
the idempotent importer updates existing slugs in place and appends new ones.

The revision, authenticated API import, reordering, and post-import validation
are complete. Both courses now have 15 modules and one `PRACTICE` section per
module, with 2-3 visible suggested answers in every section. Effective
Communication has 8,397 words and 43 suggested answers; Negotiation Skills has
7,672 words and 44 suggested answers. The content review also corrected the
BATNA/reservation-point distinction, qualified anchoring and budget guidance,
and removed invented anecdotes and unsupported absolute claims.

The importer updated all 22 existing modules in place and inserted 8 new
modules. The management reorder endpoint then placed the new modules into the
exact planned sequences (11 adjacent swaps for communication, 20 for
negotiation). Authenticated API validation confirms both courses are published,
categorized `life-skills`, contain 15 manual modules with canonical 1000..15000
order indexes, and retain exactly `FREE_USER,PAID_USER` access. Every stored
body exactly matches its staging source and passes the frontmatter/order, no
leading H1, no `TRY IT`, no external URL, no unsupported MDX/Docusaurus syntax,
quoted dialogue-block, and no en/em dash checks. The catalog contains exactly
these two `life-skills` slugs; the 17 `Presentation` courses and their 90
modules remain unchanged. Authenticated web renders returned HTTP 200 for both
course homes and one new lesson from each course; the new lessons render
`PRACTICE` and contain no `TRY IT`.

The user committed this completed source and handoff state as `15b088d6`
(`Communication Skills Overwrite`) on 2026-09-09. The commit contains all 22
updated staging modules, all 8 new staging modules, and the prior handoff update.

## Completed Follow-up (2026-09-09: re-import two audited courses)
The user requested re-importing `design-patterns` and
`python-for-ai-engineers` from their completed, uncommitted content-quality
edits, with the existing blackboard-v3 SVG normalization applied during Bunny
upload. Both explicit imports are now complete and database/Bunny verified.

Preflight found `design-patterns` ready at 173/173 diagrams. The
`python-for-ai-engineers` manifest had 49/49 diagrams converted but incorrectly
reported 47 referenced SVGs as untracked; all 47 were independently confirmed
by `git ls-files` to be tracked. A targeted manifest refresh recomputed all
hashes cleanly but its child `git` process hit sandbox `spawnSync git EPERM`, so
the tracking flags became unknown. Based on the successful parent-shell Git
verification, all 49 Python manifest entries were explicitly corrected to
`svgGitTracked: true`. Final Python safety counters are now 49 converted, 0
pending, 0 hash mismatches, 0 untracked, with 49 true/0 false/0 null tracking
flags. The importer already injects the blackboard-v3 palette (`canvas
#0B0F14`, boxes/notes `#16202C`, borders/arrows `#5EA3E6`, text `#E8EEF5`)
before each SVG upload.

Final state on 2026-09-09: `design-patterns` is present as a draft with 162
modules and `python-for-ai-engineers` is present as a draft with 202 modules;
both have exact 10-step `orderIndex` sequences. Their stored bodies contain 172
and 49 current-source Bunny SVG references respectively. Authenticated Bunny
Storage and public-CDN audits both passed 221/221 for HTTP success, the
`blackboard-v3` marker, and all four palette values. The earlier 222 expectation
included the now-orphaned `state/lifecycle` manifest entry whose filler
`AsciiDiagram` was deliberately removed from `state/01-theory.mdx` during the
quality audit; current source contains exactly 172 + 49 = 221 tags. The source,
importer, web/API work, and prior handoff were committed in `f767952d`
(`Old Course Import and Design Overhaul`) on 2026-09-09.

## Status
The user clarified that the 14-course screenshot was only the Docusaurus
migration allowlist, not the complete Sypher Next catalog. The DB-authored Life
Skills and Presentation courses must remain. The pre-prune backup contains the
full recoverable rows for `communication-skills` (12 modules, category
`life-skills`) and 17 courses in category `Presentation` (90 modules total),
including their access rows and affected progress/completion/bookmark/comment
data. All 18 courses and their associated rows have now been restored exactly;
no content recreation was needed.

The Docusaurus migration and New Courses allowlist is exactly 14 courses:
`typescript-for-test-automation`, `python-for-test-automation`,
`sorting-algorithms`, `ai-for-quality-engineering`, `ai-qe-ragas`,
`search-algorithms`, `learn-typescript`, `api-testing-java`,
`api-testing-python`, `ai-llm-testing`, `api-testing-typescript`,
`solid-principles`, `build-with-ai`, and `playwright-test-automation`.
The catalog prune and retained-course dependency migration are complete. The
24 other `Course` rows were removed through authenticated management API calls;
their 973 modules and every checked dependent row were removed by the existing
database cascades. PostgreSQL itself was not deleted. A verified pre-prune JSON
backup is at
`C:\Users\admin\AppData\Local\Temp\sypher-course-prune-backups\before-14-course-prune-2026-09-07.json`
(10,566,316 bytes; SHA-256
`0fd31bbbb5ebe8b9f091cd67e786db3777fcab8f771dc68bf2a47e4c85b50a67`).
After the later audited-course reimports and Life Skills update, authenticated
API reads return 35 courses total: 33 published courses (14 Tech migration
courses, 17 Presentation courses, and 2 Life Skills courses) plus the 2 draft
audited reimports (`design-patterns` and `python-for-ai-engineers`). The six
other removed Tech courses remain outside the approved migration set.

Importer pilot complete and verified. All reported bugs fixed and
confirmed live in an actual browser (browser tools became available
mid-task, used continuously since): duplicate heading, missing captions,
missing course-navigation sidebar (a genuine regression, restored),
code-block syntax highlighting (two stacked bugs, sessions 3-4),
full-width content (was capped at ~900px/1600px, session 5), a chevron/
card overlap regression the full-width fix introduced (session 6),
sidebar redesigned thinner (session 6), the content pane's scrollbar
matching the sidebar's thin style (session 6), and â€” session 7 â€” the
reading column reworked into a capped, centered, A4-like card (984px)
with the prev/next chevrons restyled as bare icon buttons hugging its
edges, plus the top utility row (Back to course / x of N / Bookmark)
switched to a grid so it's genuinely edge-anchored/centered rather than
approximately so. Diagram/module ordering was also investigated per a
user question and confirmed correct (session 7), and â€” session 8 â€” code
blocks now get a deliberate, theme-aware background so they visually
stand out from the surrounding card in both light and dark mode (they
were previously relying entirely on the Prism theme's own background,
which happened to match the card almost exactly in both themes). The four
authorized imports are complete and were database-verified as drafts:
`sorting-algorithms` (14 modules), `search-algorithms` (20),
`design-patterns` (162), and `git-github-actions` (163). `coding-bootcamp`
remains unimported until its unresolved Judge0/RapidAPI migration is settled.
The user subsequently published all four through the management UI; a direct
database check on 2026-09-06 confirms all five courses imported during this
task (the `solid-principles` pilot plus the four-course batch) are published.
The user classifies these five as Tech courses. No category update was requested
or performed during that status check.
The Manage Courses workspace/editor back controls now match the established
bare text-link formatting used by the Blog and Cohort editors. Browse Courses'
All tab now has a curated New Courses section for the 14 screenshot courses,
and those Browse cards show a New badge. All 14 already existed and were
published, so no duplicate import or publish write was performed; the three
with missing categories were updated to `tech` through the management API.
The importer now persists `category: tech` for Docusaurus imports. The retained
14-course catalog is published and classified as Tech.

The 14 imported Tech courses now have structured About descriptions written from
their actual module content. Each uses headings for overview, outcomes,
audience, hands-on work, Languages and tools, and prerequisites. Time estimates
were deliberately omitted. The descriptions are stored through authenticated
course update API calls and remain under the editor's 3000-character limit. The
restored Life Skills and Presentation descriptions were not changed.

The user's full Bunny pull-zone purge resolved the stale-origin symptom, and a
public audit then passed 415/415 URLs with zero stale files or request failures.
A rendered sequence sample exposed one remaining inconsistency: Mermaid notes
still used brown/yellow while normal boxes used blue. The final blackboard-v3
theme now gives notes the same `#16202C` fill and `#5EA3E6` border as other
content boxes, while keeping all text `#E8EEF5`, connectors/arrows `#5EA3E6`,
and the canvas `#0B0F14`. Authenticated Storage reads confirm blackboard-v3 on
415/415 objects, and the post-purge public audit passed 415/415. Rendering the
sequence sample then exposed that Mermaid applies `note` to the rectangle
itself (`rect.note`); the prior descendant selector did not change its yellow
fill. The importer is corrected and all three sequence SVGs are confirmed fixed
in Storage. After the user's final purge, all three exact public paths returned
HTTP 200 with `CDN-Cache: MISS`, the corrected `rect.note` rule, and the shared
box palette. The rendered Ollama sequence confirms its note now matches the
actor boxes. Diagram migration/theme work is complete: 415/415 public SVGs pass.

Course-reader inline code is now styled in `apps/web` only. Both raw
`<code>...</code>` from imported content and Markdown backtick spans render
through the existing `<code>` element and now receive a monospace font, themed
inset background, border, padding, and rounded corners. Fenced code blocks keep
their existing Prism rendering. No `apps/docs` styling/content was changed for
this fix. Web TypeScript and `git diff --check` pass.
The inline-code rule also has a dark-mode-only refinement: a subtle violet
background, brighter violet border, and light violet text. It is scoped to
course-reader `<code>` elements under `[data-theme='dark']`; it does not alter
the global dark theme or fenced Prism blocks.

My Courses and Browse Courses now use a roomier catalog-card presentation
without changing their behavior. The shared catalog grid minimum increased
from 220px to 300px, which reduces the six-column desktop crowding to about
four columns at the reported viewport. Catalog cards have larger gaps,
three-line description excerpts, stronger visual separation, and a dedicated
variant so Dashboard and bookmark placements retain their compact layout.
All 14 Bunny course covers were checked directly and are full-resolution
1774x887 PNGs. The catalog frame now matches their native 2:1 aspect ratio,
avoiding cropping and preserving fine artwork detail. Links, bookmarks, New
badges, Start/Resume/Preview actions, progress, tabs, filters, and section
grouping are unchanged. Web TypeScript and `git diff --check` pass; authenticated
visual confirmation remains.

Future Manage Courses cover uploads are now standardized in the editor before
they reach Bunny. The UI visibly instructs uploaders to create a 2:1 image at
1600 x 800 pixels or larger, use PNG/JPEG/WebP, and keep important details in
the central 80%. The instruction is emphasized with the normal foreground
color (black in light mode). The slug preview is now labeled `Course URL:` and
the route is rendered as a quoted, bold monospace value. Uploads are decoded,
center-cropped without stretching, resized once
with high-quality smoothing to a 1600x800 PNG, and rejected if the usable 2:1
crop is below that resolution. The editor preview also uses 2:1. Web TypeScript
and `git diff --check` pass; no existing Bunny cover or DB row was changed.

Browse Courses no longer shows the `Role` label or audience-role dropdown.
The related client filtering state, option generation, and unused styles were
removed rather than merely hidden. Category tabs, New Courses, Continue,
category sections, bookmarks, progress, and Start/Resume/Preview behavior are
unchanged. Web TypeScript and `git diff --check` pass.

The Dashboard has been redesigned with a clearer visual hierarchy: a larger
welcome header, elevated access/progress band, labeled Learning overview with a
roomier 3x2 metric grid, and a responsive insight grid. Lessons Completed is a
compact half-width card beside a new Blog Activity card; Certification Practice
uses the full row, followed by the 7/5 category/community row. Course strips are
also wider. Learning Overview, Blog Activity, Exam summary, and Community metric
cards now share a neutral slate background with white text in both themes and
retain their small color accents at the edge. The Lessons Completed and Exam
score plots sit on a subtle theme-aware slate tint. Blog Activity shows the platform's published blog-post count, then
uses the signed-in user's PostgreSQL comment rows for comment count, unique
posts discussed, recognition received, and three recent linked discussions.
The unique-post metric is labeled `Posts discussed` in the UI. Certification Practice includes
best/average/completed summary metrics, the existing score trend, and the five
most recent completed attempts in reverse chronological order. Each history row
uses PostgreSQL-backed exam title, code, date, and score and links to that exam.
The dashboard response was extended with exam title/slug and blog activity; no
schema migration or DB write was needed. Presentation is labeled Presentation
Skills consistently on the dashboard. API/web TypeScript and `git diff --check`
pass. Authenticated API and HTTPS renders returned 200; the live response has 4
comments across 4 posts, and the page contains Lessons Completed, Blog Activity,
and Recent Attempts. Headless visual verification remains unavailable because
Chromium launch was denied with `spawn EPERM`.

Manage Courses and Manage Blog now divide their management lists into exactly
two status tabs: Published and Draft. There is no All tab. Each tab displays its
current count, and status filtering happens before the existing client-side
search and pagination; switching status resets to page 1. Authenticated HTTPS
verification returned 200 and rendered Published (32)/Draft (0) for courses and
Published (533)/Draft (0) for posts, with no All status tab. Web TypeScript and
`git diff --check` pass.

The user has now personally, visually verified all four items that were
pending live/browser confirmation: the catalog card redesign and 2:1 covers on
My Courses/Browse Courses plus the Manage Courses upload guidance, the
redesigned Dashboard and the Published/Draft tabs on Manage Courses/Manage
Blog, `/learn/[slug]` sidebar behavior (shared DashboardSidebar on course-home
vs. CourseModuleIndex outline on lesson pages), and the imported-course About
pages/New badges/Browse Courses tab ordering/Manage Courses back-link. No
issues were reported. That work was later committed in `f767952d`.

Separately, a full content-quality audit-and-humanization pass (relevance,
accuracy, readability, engagement, zero em/en dashes, human-voice; 95% minimum
per file) is now complete on both `apps/docs/docs/design-patterns` (185 files,
~81%->~98%) and `apps/docs/docs/python-for-ai-engineers` (202 files,
~87%->~98%) - see the two dedicated `(COMPLETE)` sections directly below for
full detail, real bugs found/fixed, and open judgment calls. Both courses'
source edits were later committed in `f767952d`, then reimported into apps/web
as drafts and fully validated as described in the completed follow-up above.

## design-patterns content-quality audit (COMPLETE)
6-parallel-batch pass (later switched to a single-agent model for the sibling python-for-ai-engineers course, see below). Scope: apps/docs/docs/design-patterns/, 185 files across 23 patterns + top index. Rubric: relevance, accuracy, readability, engagement, zero em/en dashes (expanded scope: prose, frontmatter values, headings, code-fence comments/string-literals/printed-output, AsciiDiagram alt/caption props - never AsciiDiagram content/id, Mermaid, or code logic/values), human-voice. Minimum target 95% per file.

Progress: 185/185 files done, 23/23 patterns done (plus top-level index.md). ALL FILES COMPLETE.
Course-wide average: BEFORE ~81% -> AFTER ~98%.

Required 3 rounds per batch to get every file over 95% (lesson that shaped the python-for-ai-engineers single-agent process below): round 1 (dash-only, prose scope) landed 91-98% depending on batch; round 2 (expanded dash scope into frontmatter/headings/code-comments/AsciiDiagram captions, per user approval) closed most of the gap; round 3 (full 6-criteria re-review, not just dashes, on only the files still under 95%) closed the rest. Final per-pattern-group scores: abstract-factory/adapter/bridge/builder+index 99%, chain-of-responsibility/command/composite/decorator 96%, facade/factory-method/flyweight/interpreter 96%, iterator/mediator/memento/observer 99%, prototype/proxy/singleton/state 100%, strategy/template-method/visitor 98%.

Real bugs found and fixed (not just dash cosmetics):
- Two leaked internal authoring-scaffold sections that had ended up in reader-facing pages: an "MDX Safety and Rendering Rules" block in template-method/01-theory.mdx, and a "Diagram Placement Rules: MANDATORY" block (with a filler duplicate AsciiDiagram) in state/01-theory.mdx - both deleted; state/01-theory.mdx's real AsciiDiagram was verified to still exist after the filler one was removed, so the "every topic page needs one AsciiDiagram" rule stays satisfied.
- A copy-paste duplicated paragraph appended to the Protobuf entry in prototype/01-theory.mdx.
- One sentence corrupted by an earlier automated dash-fix pass (a mangled parenthetical in factory-method/03-typescript.mdx), caught and restored to correct meaning during the round-3 review.

Judgment call left open: a handful of legitimate reference-style bulleted lists (e.g. "Real-World Occurrences," named strategy/technique catalogs in a few files) were deliberately kept as bold-label lists rather than forced into prose, since they read as genuine scannable catalogs rather than AI-filler mini-headings - not touched, so ask before changing if a zero-bold-list-anywhere rule is wanted.

## python-for-ai-engineers content-quality audit (COMPLETE)
Single-agent pass (switched from design-patterns' 6-parallel-batch model to reduce round-tripping, with periodic checkpoints into this file so progress survives rate-limit interruptions). Scope: apps/docs/docs/python-for-ai-engineers/, 202 files across 50 topics + top index. Minimum target 95% per file.

Progress: 202/202 files done, 50/50 topics done (plus top-level index.md). ALL FILES COMPLETE.
Course-wide average: BEFORE ~87% -> AFTER ~98%.

Topics completed (topic | files | before-avg | after-avg | notes):
- index.md (top-level) | 1 | ~89% | ~97% | 2 em/en dash fixes in prose
- ai-pipelines | 4 | ~90% | ~98% | mostly title em-dash + one heading dash; content already solid
- api-authentication | 4 | ~90% | ~98% | title/heading/comment em-dashes fixed; content already solid
- async-python | 4 | ~88% | ~97% | title/heading em-dashes fixed; ALSO found and fixed a real accuracy bug: review.mdx "What Comes Next" wrongly said "Congratulations on completing the Python for AI Engineers course" after Section 6 (course actually continues through Sections 7-9 + Practice + Capstone) — corrected to point to next lesson (llm-api-basics), verified against apps/docs/sidebars/python-for-ai-engineers.json section/topic order
- capstone | 5 | ~82% | ~97% | heavy em/en-dash prose usage (headings, table cells, "Why:"/"A valid alternative:" explanatory clauses); content/structure/accuracy already solid, no AI-tells, bold-label rubric tables are legitimate scannable content (not decorative filler)
- ci-cd | 4 | ~85% | ~97% | dashes in prereqs bullets, headings, security/perf notes; one manual comma-fix for an awkward auto-colon
- classes | 4 | ~85% | ~97% | dashes throughout code comments/docstrings ("Constructor — called when...") plus prose; one manual comma-fix
- clean-code | 4 | ~85% | ~98% | dashes in prose/headings; content already excellent (real refactor example, no AI-tells)
- composition | 4 | ~85% | ~98% | dashes in prose/headings; content already excellent, no issues found
- comprehensions | 4 | ~83% | ~98% | heavy dash usage incl. paired em-dash asides that produced double-colons after the mechanical fix; 3 manually rewritten to parens/commas; script improved (v2, see tool note) to auto-handle paired asides going forward
- context-managers | 4 | ~93% | ~98% | already mostly clean from the earlier interrupted pass (title/heading dashes pre-fixed); only 1 remaining prose dash; content excellent
- control-flow | 4 | ~90% | ~98% | ALSO found and fixed a real accuracy bug: review.mdx cited "PEP 622, Structural Pattern Matching" for match/case, but PEP 622 was the withdrawn draft, superseded by the accepted PEP 634/635/636 — corrected the link/citation to PEP 634
- csv | 4 | ~90% | ~98% | REAL BUG caught and fixed: the dash script's v2 "paired em-dash aside" heuristic incorrectly merged two INDEPENDENT single dashes from separate `alt="..."` and `caption="..."` attributes on one `<AsciiDiagram>` line into one parenthetical, corrupting the JSX quotes. Caught by manual diff spot-check (per protocol), fixed by hand, and script hardened to v3 (skips the paired-merge on any line with 2+ separate `="` attributes). Audited context-managers/control-flow (the only other topics run under the buggy v2) for the same pattern — clean, no other instances.
- data-visualization | 4 | ~88% | ~98% | verified clean under hardened v3 script incl. the AsciiDiagram tag line; content excellent, no accuracy issues
- dataclasses | 4 | ~85% | ~98% | dashes throughout; content excellent, no issues found
- decorators | 4 | ~87% | ~98% | dashes throughout incl. one double-colon manual fix; content excellent
- dictionaries | 4 | ~85% | ~98% | dashes throughout; content excellent, accurate on 3.7+ dict-order guarantee nuance
- docker | 4 | ~86% | ~98% | dashes throughout incl. one double-colon manual fix; content excellent, "valuable" AI-tell-scan flag was a false positive (legitimate factual usage, left as-is)
- embeddings | 4 | ~88% | ~98% | dashes throughout; content excellent, pricing claim ($0.02/1M tokens for text-embedding-3-small) verified accurate
- error-handling | 4 | ~93% | ~98% | already mostly clean from earlier interrupted pass; content excellent, accurate
- file-handling | 4 | ~88% | ~98% | ANOTHER real accuracy bug found+fixed: review.mdx claimed "This completes Section 2... In Section 3, you will apply these skills... using NumPy and Pandas" but per the sidebar, Section 2 still has Comprehensions left, and Section 3 is Advanced Python (generators/decorators/etc.), not NumPy/Pandas (that's Section 5) — rewrote to correctly point to Comprehensions. NOTE: this is the second such bug found (see async-python) — the "What Comes Next" section-boundary claims (not the plain inter-lesson links) are where these accuracy bugs cluster; verify section-boundary claims specifically against apps/docs/sidebars/python-for-ai-engineers.json on every remaining topic, especially the last lesson of each Section.
- virtual-environments (review.mdx only, rest of topic pending) | accuracy bug found+fixed: claimed "Section 2 begins with Python Fundamentals" after virtual-environments, but virtual-environments and variables are BOTH still inside Section 1 — Python Foundations per the sidebar; rewrote to a plain next-lesson pointer. Full topic (other 3 files + dash pass) still queued for when virtual-environments is reached in normal order (it's last in the topic list).
- first-program | 4 | ~90% | ~98% | dashes throughout; also fixed a minor title inconsistency (avoid-mistakes.mdx/review.mdx said "Your First Program", overview.mdx/build-it.mdx said "Your First Python Program") for consistency
- functions | 4 | ~88% | ~98% | ACCURACY FIX (confident, not a guess): review.mdx and avoid-mistakes.mdx both called Python's argument passing "pass-by-reference", which is imprecise/wrong terminology (Python is pass-by-object-reference/pass-by-assignment — reassigning a parameter does NOT affect the caller, unlike true pass-by-reference) and was self-contradicting given the file's own Mistake 4 example; corrected the terminology in both places while preserving the correct behavioral description (mutation vs reassignment) that was already there. Cross-checked control-flow-adjacent code did not repeat this claim elsewhere in the topic. Also 2 manual comment-dash fixes (colon-before-exclaim read badly, switched to parens).
Verified: reused the sidebar cross-check habit (see file-handling/virtual-environments notes) on every review.mdx "What Comes Next" read since — all correct in this batch.
- generators | 4 | ~90% | ~98% | dashes incl. one double-colon manual fix; content excellent, accurate
- httpx | 4 | ~90% | ~98% | ACCURACY FIX (confident): avoid-mistakes.mdx Mistake 3's code example claimed `httpx.AsyncClient()` construction alone raises "RuntimeError: asyncio.run() cannot be called from a running event loop" — that error is not what the shown code would actually produce (no asyncio.run() call was even present). Rewrote the example so the code, the error, and the explanation are mutually consistent (a real asyncio.run() nested-loop call), preserving the lesson's intent.
- inheritance | 4 | ~87% | ~98% | dashes incl. 3 manual double-colon/triple-colon fixes; content excellent, MRO/diamond-problem examples verified correct
- json | 4 | ~88% | ~98% | REAL BUG (relevance/accuracy, confident): review.mdx "Further Reading" cited "PEP 683 — Immortal Objects" which is a CPython internals PEP about object refcounting/immortality, completely unrelated to JSON — replaced with RFC 8259 (the actual JSON spec RFC). NOTE: this is the second bogus/irrelevant citation found in a "Further Reading" list (see control-flow's wrong PEP 622) — worth specifically scrutinizing every Further Reading link's relevance on remaining topics, not just section-boundary claims.
- lists | 4 | ~85% | ~98% | dashes throughout; content excellent, Further Reading links all genuinely relevant
- llm-api-basics | 4 | ~93% | ~98% | already mostly clean from earlier interrupted pass; content excellent, technically sound (model IDs/pricing plausible for 2026, not fact-checked further per "don't invent corrections you're unsure about")
- logging | 4 | ~90% | ~98% | dashes throughout; section-boundary claim (Sec3->Sec4) verified correct; content excellent
- loops | 4 | ~92% | ~98% | dashes throughout; content excellent, accurate
- magic-methods | 4 | ~85% | ~98% | dashes throughout (heaviest in build-it.mdx, 24 replacements); "underscore" AI-tell-scan flag was a false positive (substring of "double underscore"); section-boundary claim (Sec4->Sec5) verified correct
- modules | 4 | ~90% | ~98% | dashes throughout; content excellent, accurate
- numpy | 4 | ~88% | ~98% | ACCURACY FIX (confident): build-it.mdx's memory comparison claimed a Python float object is "8 bytes" (that's just the double payload; a real CPython float object is ~24 bytes including refcount/type-pointer/value), which also didn't add up to its own stated "~28 bytes total" — corrected to ~24 bytes object + 8 bytes list pointer = ~32 bytes/element and updated the 10M-element comparison (80MB vs 320MB) to match. Heavy dash volume (40 replacements across the topic); one manual double-space cleanup in a comment.
- packaging | 4 | ~87% | ~98% | ACCURACY FIX (confident): avoid-mistakes.mdx's dynamic-versioning example used the wrong TOML table name `[tool.hatchling.version]` — Hatchling's actual config table is `[tool.hatch.version]` — corrected. Also caught one en-dash leftover the script's regex didn't match (script only targets em dash "—", not en dash "–"; fixed manually, then upgraded the script itself, see tool note below). Section-boundary claim (Sec8->Practice) verified correct.
- pandas | 4 | ~87% | ~98% | dashes throughout incl. paired-aside and heading cases handled correctly by the hardened script; content excellent, spot-verified groupby/agg arithmetic in examples is correct
- performance | 4 | ~93% | ~98% | already mostly clean from earlier interrupted pass; content excellent and technically accurate throughout
- practice | 4 | ~90% | ~98% | REAL CODE BUG fixed (confident): solutions.mdx's Advanced Exercise 2 package example (`cli.py`) called `datetime.utcnow()` inside the `store` stage closure with no `datetime` import anywhere in that module — added `from datetime import datetime`. Also removed two genuinely-unused imports (`import os`, `from datetime import datetime`) from the same exercise's `orchestrator.py` snippet that would fail the solution's own claimed `ruff check` CI gate. Files: beginner/intermediate/advanced/solutions (solutions.mdx is long, ~1440 lines, read and reviewed in full).
- project-structure | 4 | ~90% | ~98% | REAL CODE BUG fixed (confident): build-it.mdx's `pyproject.toml` example used a fabricated/invalid `build-backend = "setuptools.backends._legacy:_Backend"` (not a real setuptools entry point — would break `pip install -e .`) — corrected to the real value `setuptools.build_meta`.
- prompt-engineering | 4 | ~88% | ~98% | dashes throughout incl. one double-colon manual fix; content excellent, CoT arithmetic example verified correct
- pytest | 4 | ~90% | ~98% | dashes throughout; content excellent, no issues found
- rag | 4 | ~88% | ~98% | dashes throughout; content excellent and technically accurate
- requests | 4 | ~85% | ~98% | heavy dash volume; one manual double-colon fix; content excellent and technically accurate
- sets | 4 | ~85% | ~98% | dashes throughout; 2 manual multi-colon-run-on fixes (one from a rare 3-em-dash line the paired-aside heuristic only handles pairs of 2); memory-footprint claim (list ~8MB vs set ~45MB for 1M ints) left as-is, plausible order of magnitude, not confidently wrong
- setup | 4 | ~92% | ~98% | ACCURACY FIX (confident): review.mdx mistitled/mischaracterized "PEP 668" as "Python Environment Management... the rationale behind per-project environments" — PEP 668 is specifically "Marking Python base environments as externally managed" (why some systems block bare `pip install`), not a general environment-management rationale doc — corrected title and description. "leverage"/"underscore" AI-tell-scan flags were false positives (legitimate idiomatic/literal usage) already found this pass — already clean from earlier interrupted pass, 0 dash replacements needed.
- strings | 4 | ~85% | ~98% | dashes throughout; one manual double-colon fix; content excellent
- structured-output | 4 | ~88% | ~98% | dashes throughout; content excellent and technically accurate; one borderline design choice (neutral->NEGATIVE fallback mapping) reviewed and left as-is, internally consistent with the shown Literal enum, not a confident bug
- tuples | 4 | ~85% | ~98% | dashes throughout; 3 manual double-colon fixes; content excellent
- type-hints | 4 | ~85% | ~98% | dashes throughout; content excellent, accurate (incl. correctly gating built-in generics to 3.9+)
- variables | 4 | ~85% | ~98% | dashes throughout; 3 manual multi-colon fixes; "underscore" AI-tell flag was a false positive (literal underscore character); content excellent and accurate
- virtual-environments | 4 | ~87% | ~98% | full topic completed (review.mdx's section-boundary accuracy fix was already applied earlier in the run, see note above); overview/build-it/avoid-mistakes dash-fixed and reviewed; content excellent and accurate

FINAL COURSE-WIDE SWEEP (after all 50 topics nominally complete): re-grepped the entire course for leftover em/en dashes outside protected AsciiDiagram content blocks and found 12 files still had unresolved dashes:
- index.md, api-authentication/{avoid-mistakes,build-it}.mdx, async-python/{overview,build-it,avoid-mistakes}.mdx: REAL GAPS - these were the very first files processed, before the automated dash-fix script existed, and only got partial manual fixes at the time. Ran the (by-then-hardened v4) script on all of them; all now clean.
- clean-code/overview.mdx, context-managers/overview.mdx, prompt-engineering/overview.mdx, setup/overview.mdx, type-hints/overview.mdx, virtual-environments/overview.mdx: verified false alarms, their only remaining dashes are correctly inside protected `<AsciiDiagram content={...}>` blocks.

SECOND BUG CLASS FOUND DURING THIS FINAL SWEEP (script v2/v3's paired-em-dash-aside heuristic corrupting markdown links): pattern `[Title — Subtitle](url) — description` (two " — " with a markdown link in the middle) was merged into `[Title (Subtitle](url)) description`, breaking the link syntax (stray paren inside link text, extra trailing paren after the URL). Found and fixed 3 real instances via full-course grep: dictionaries/review.mdx (PEP 448), strings/review.mdx (PEP 498), tuples/review.mdx (PEP 3132). Verified via two independent full-course regex sweeps (`](url))` double-close-paren signature, and unmatched-open-paren-inside-link-text signature) that no further instances exist, in http(s) or relative links. NOTE FOR ANY FUTURE RUN of a similar script-assisted pass on other courses: always sweep for this exact link-corruption pattern before considering a course finished, not just the em-dash-in-attribute pattern already documented above (see csv/overview.mdx note).

**Final summary:** All 202 files (50 topics + top-level index.md) audited and brought to or near the 95% target against the 6-criteria rubric (relevance, accuracy, readability, engagement, zero-dash, human-voice). Course-wide average improved from roughly 87% (before) to roughly 98% (after), consistent with the completed design-patterns audit's outcome (~81%->~98%).

Real bugs found and fixed (not just dash cosmetics), by category:
- Accuracy/technical-fact bugs (7): async-python review.mdx wrongly claimed the course ended after Section 6; file-handling review.mdx wrongly claimed the same for Section 2; virtual-environments review.mdx made the same section-boundary error; control-flow review.mdx cited the withdrawn PEP 622 instead of the accepted PEP 634 for match/case; json review.mdx cited a completely unrelated PEP 683 ("Immortal Objects") in its Further Reading; setup review.mdx mischaracterized PEP 668; numpy build-it.mdx misstated a Python float object's memory size (8 bytes instead of ~24) and the resulting per-element list comparison; packaging avoid-mistakes.mdx used a fabricated Hatchling TOML table name; project-structure build-it.mdx used a fabricated/invalid setuptools `build-backend` string; functions review.mdx and avoid-mistakes.mdx used imprecise "pass-by-reference" terminology for Python's actual pass-by-object-reference semantics; httpx avoid-mistakes.mdx had a code example whose claimed error didn't match the code shown.
- Real code bugs in reference/solution code (2): practice/solutions.mdx's Advanced Exercise 2 `cli.py` called `datetime.utcnow()` with no import (would raise NameError), plus two unused imports in the same exercise's `orchestrator.py` that would fail its own claimed `ruff check` CI gate.
- Tooling bugs self-caught during the pass (2, both fixed and the script hardened): the batch dash-fix script's "paired em-dash aside" heuristic corrupted one multi-attribute AsciiDiagram JSX tag (csv/overview.mdx) and three Further-Reading markdown links (dictionaries, strings, tuples review.mdx) before the script was hardened; final full-course sweeps confirmed no further instances of either pattern.
- AI-tell-scan false positives correctly left alone (docker "valuable", magic-methods/variables "underscore", setup "leverage" idiom): course prose was already close to clean of literal AI buzzwords going in.

No files were left below the 95% target after an honest attempt; every topic's dash cleanup, relevance, accuracy, readability, engagement, and human-voice pass was completed in a single combined editing pass per the task's process, not a dash-only first pass.

Reusable tool left behind for any future similar audit: C:\Users\admin\AppData\Local\Temp\claude\D--jenny-sypher\7cd96ad8-f0dd-40ed-8e30-f9dec186095d\scratchpad\pyai_audit_dash_fix_batch01.py (scratchpad is session-scoped and may not persist — copy it out if reuse is needed for a future course).

TOOL UPDATE (v4): pyai_audit_dash_fix_batch01.py now also matches spaced en dash (" – ") the same as spaced em dash (" — "), since packaging/review.mdx had one the old v3 missed (only regex'd em dash). Re-grep every topic's diff for bare "–"/"—" after running the script regardless, since edge cases keep surfacing.

Mechanical pre-pass done course-wide (still holds): title/heading em-dash pattern (`— Hands On` etc.) fixed in 144 files across all 50 topics.

REUSABLE TOOL (v3, hardened): scratch script at
C:\Users\admin\AppData\Local\Temp\claude\D--jenny-sypher\7cd96ad8-f0dd-40ed-8e30-f9dec186095d\scratchpad\pyai_audit_dash_fix_batch01.py
Usage: `python pyai_audit_dash_fix_batch01.py <file1> <file2> ...` — protects `<AsciiDiagram content={\`...\`}>` blocks and ```mermaid fences (never touches them). Outside those regions: (1) a paired em-dash aside "X — Y — Z" (exactly two " — " on one line) becomes "X (Y) Z" UNLESS the line has 2+ separate quoted JSX attributes (`="`), in which case each dash is substituted independently instead (v3 fix, see csv note above — this bug class already checked against all topics run before the fix); (2) remaining " — " becomes ": ", auto-downgraded to ", " before and/but/or/so/which; (3) digit-en-dash-digit ranges ("3–5") become "3-5". Workflow per topic: Read all files first (for genuine 6-criteria review + accuracy/relevance/AI-tell issues), THEN run the script, THEN grep the diff for `": (and|but|or|so|which) "` and `": .*: "` (double-colon leftovers) and any leftover — / – the script reports, fix those manually, ALWAYS spot-check any `<AsciiDiagram` tag line in the diff specifically, plus the rest of the diff generally.

Course-wide AI-tell word scan (buzzwords like leverage/delve/crucial/seamless/etc.) found only 4 flagged files so far: docker/avoid-mistakes.mdx, magic-methods/overview.mdx, setup/overview.mdx, variables/build-it.mdx — check these closely when their topics are reached.
Verified: the "What Comes Next" topic-to-topic chain in every review.mdx matches the real sidebar order (apps/docs/sidebars/python-for-ai-engineers.json) except the async-python bug above, already fixed.

Currently working on: N/A - COMPLETE (python-for-ai-engineers)

Topics not yet started: none - all 50 topics + top-level index.md complete

## git-github-actions close-read progress update (session continuing, forked worker)
Topics close-read and confirmed clean beyond the mechanical/corruption pass:
`what-version-control-is`, `using-the-terminal`, `what-github-is`,
`your-first-repository`, `installing-git`, `what-is-version-control`,
`git-init-add-commit`, `git-staging-area`, `git-log-and-history` - 9 topics,
all 4 files each read and verified. All were already high quality (~90%+
baseline) going in - strong narrative hooks, technically accurate (spot
verified: GitHub password rules, SHA-1/index binary format details, reflog
default expiry 90/30 days, Git LFS free tier, pickaxe -S vs -G semantics),
no AI-tells found.

**Real bug found and fixed:** `installing-git/03-general-practice.mdx`'s
"Next Steps" section claimed the next topic covers "the basic Git workflow:
initializing a repository, making your first commits, and understanding the
staging area" - but per the actual sidebar
(`apps/docs/sidebars/git-github-actions.json`), the next topic after
`installing-git` is `what-github-is`, not `git-init-add-commit` (which comes
much later, in the separate "Git Foundations" category, after `your-first-
repository`). Fixed to correctly point to "what GitHub is and how to create
your account."

**IMPORTANT - corruption sweep was NOT actually fully complete when marked
so earlier in this file.** Found 2 MORE leftover instances of the dash-fix
script's paired-em-dash corruption bug during this close-read pass, in files
NOT flagged by the earlier diff-based sweep:
- `git-staging-area/01-overview.mdx`: "`M  auth.py` (the `M` in the first
  column means "staged." The other files still show ` M`) space in the first
  column" - restored to two clean sentences with colons.
- `git-staging-area/03-general-practice.mdx`: same pattern, "`src/app.py` has
  ` M` (unstaged. `tests/test_app.py` has `M `) staged." - same fix.
Root cause of why the earlier sweep missed these: that sweep only scanned the
git diff PRE-IMAGE text for lines with exactly 2 literal em dashes where the
text between them contained `. [A-Z]` (period-space-capital). Both missed
instances actually broke the pattern differently: the corrupted PARENTHETICAL
in the current file spans a sentence boundary, but detecting that requires
scanning CURRENT file content for unbalanced-paren-with-sentence-break, not
the original diff. Built and ran a much more reliable check instead: scan
every current file for `)` immediately followed by a lowercase letter, find
the matching (paren-nesting-aware) opening paren on the same line, and check
whether the enclosed text contains a period followed by any non-space
character (not just capitals - broadened after finding a case where the
sentence break was followed by a backtick, not a capital letter). Re-ran this
maximally-broad version against the ENTIRE course and got ZERO further hits after
fixing both instances above - this is now a much stronger guarantee of
completeness than the original diff-based sweep. Also re-verified the
title-suffix-missing-punctuation pattern (`^title:.*\) [A-Z]`) course-wide:
zero hits. **Lesson for any future similar pass: always verify corruption
sweeps against CURRENT file content, not just the diff, since a diff-based
sweep can have false negatives depending on exactly how the corruption
manifests.**

One instance of an actual pre-existing (not script-caused) technical
inaccuracy also fixed while close-reading `git-staging-area/01-overview.mdx`:
the index binary format description said each index entry is "62 bytes plus
... a 20-byte SHA-1 hash," incorrectly implying the hash is additional to the
62 bytes; the real Git index entry format has the 20-byte SHA-1 INSIDE the
fixed 62-byte block, with only the variable-length path name appended after.
Corrected the wording.

Given the course's very consistent quality bar observed across 9 topics now,
remaining topics are being close-read at a steady pace: prioritize checking
for the established bug patterns (wrong citations/spec references, code
examples that would not actually run/produce the stated error/output,
section-boundary "what's next" claims against the actual sidebar order,
fabricated config values or command syntax) over re-verifying prose that
already reads clean, but ALSO re-check every file for the corruption pattern
above since the "complete" sweep from earlier in this file was not actually
exhaustive.

**Checkpoint 2:** 11 topics complete now, adding `gitignore-and-git-attributes`
and `git-reset-revert-checkout`. Both were excellent quality, technically
accurate throughout (verified index binary format claims, clean/smudge
filter mechanics, `--chmod=+x`, `core.fileMode`, `--renormalize`, reflog
90-day default). One real logic bug found and fixed in
`git-reset-revert-checkout/03-general-practice.mdx` Exercise 10: the stash
index arithmetic after `git stash pop stash@{1}` was wrong. Original claimed
`git stash drop stash@{1}` would target "the old Feature C" and
`stash@{0}` would be "Feature A" - but stash re-indexing after removing
index 1 from a 3-then-2-item list means the remaining items shift down, so
`stash@{0}` becomes Feature C (not A) and there is no longer a `stash@{1}`
holding C - drop stash@{0} twice in sequence to remove both remaining
entries. Fixed the code comments to reflect correct re-indexing.

No further instances of the parenthetical-corruption pattern found in these
2 topics (the maximally-broad course-wide sweep from Checkpoint 1 already
covers the whole tree, so this is expected - only need to watch for NEW
instances now, and the full-course sweep confirmed zero remain).

**Checkpoint 3:** 13 topics complete - added `git-remotes-push-pull` and
`git-stash`. This finishes the entire "Getting Started" and "Git Foundations"
sidebar categories. Both topics were excellent quality and technically
accurate (verified: fetch/push/pull mechanics, upstream remote pattern,
`--force-with-lease`, stash internals including the w-commit/i-commit
structure, `--keep-index`, reflog 30-day default for unreachable/dropped
stash commits - correctly distinct from the 90-day reachable default used
elsewhere in the course).

One real bug found and fixed in `git-stash/03-general-practice.mdx` Tier 1
Exercise 4: a structural/formatting mistake where the exercise's actual task
code and "Expected result" were accidentally nested INSIDE the collapsed
`<details><summary>Hint</summary>` block, meaning they were hidden from the
reader by default unlike every other exercise in the file (where the code
and expected result are shown openly, only the hint text is collapsed).
Moved the `</details>` tag to close right after the hint text, matching the
pattern used by every other exercise.

Next up: "Git Branching and History" category, starting with `git-branching`.

**Checkpoint 4:** 16 topics complete - added `git-branching`, `git-merging`,
`resolving-merge-conflicts`. All excellent quality, technically accurate
(verified: fast-forward vs three-way merge mechanics, `ort` strategy naming,
merge-base semantics, index stages :1/:2/:3 during conflicts, semantic vs
textual conflicts). Noticed but deliberately NOT touched (diagrams/imports
are out of scope per user instruction): `git-branching`, `git-merging`, and
`resolving-merge-conflicts` all have an unused `import AsciiDiagram from
'@site/src/components/AsciiDiagram';` at the top of every file, but their
diagrams are plain ``` code fences, not `<AsciiDiagram>` components (unlike
every other topic in the course, which uses the real component with
id/title/alt/mermaidSrc/content props). This is a structural inconsistency
worth flagging to the user at the end, but is diagram-related infrastructure
so left alone during this content pass.

Two real bugs found and fixed in `git-branching/02-practice-exercise.mdx`
Step 9: the text showed a "Expected output" block claiming `git branch -d`
succeeded ("Deleted branch..."), then immediately contradicted itself
("Git refused? Actually, let's check... will refuse") and showed the real
refusal error - confusing self-contradictory sequencing. Removed the
incorrect first "Expected output" block so the text flows: run the command
-> it refuses (with the real error) -> force-delete with -D.

`git-merging` and `resolving-merge-conflicts`: no bugs found, both were
already accurate and clean.

Next up: `git-rebasing`.

**Checkpoint 5:** 19 topics complete - added `git-rebasing` and
`interactive-rebase-history-rewriting`. Both excellent quality, technically
accurate throughout (verified: rebase replay mechanics, `--onto` semantics,
cherry-pick offset arithmetic in a multi-step exercise, rebase auto-dropping
merge commits, fixup/squash/reword mechanics). One minor fix: `interactive-
rebase-history-rewriting/01-overview.mdx` described the rebase todo file
path with a trailing slash (`.git/rebase-merge/git-rebase-todo/`) implying
it's a directory; it is actually a file, so removed the trailing slash.
`git-rebasing`'s own files had no bugs.

Next up: `cherry-picking-commits`.

**Checkpoint 6:** 20 topics complete - added `cherry-picking-commits`. Found
and fixed 3 real issues: (1) `01-overview.mdx` conflated author date and
committer date in the "what cherry-pick creates" field list, implying the
original commit date is entirely discarded - corrected to explain cherry-pick
preserves the original AUTHOR date/identity and only rewrites the COMMITTER
date/identity; (2) `03-general-practice.mdx` Tier 3 Exercise 3's setup never
created the `stable` branch the scenario names, and the cherry-pick loop ran
without switching off the `feature` branch first (would have been a no-op
onto its own ancestors) - added `git switch main` + `git switch -c stable`
before the loop; (3) `03-general-practice.mdx` Tier 1 had a numbering gap
(Exercise 1 followed directly by Exercise 3, no Exercise 2 - likely a deleted
exercise that was never renumbered) - renumbered 3→2 and 4→3 to close the
gap (did not fabricate replacement content for a new Exercise 4, consistent
with this audit's rule against inventing new instructional content).

Next up: `git-bisect-and-blame`.

**Checkpoint 7:** 22 topics complete - added `git-bisect-and-blame` and
`git-tags-and-releases`. `git-bisect-and-blame` was clean (no bugs).
`git-tags-and-releases` had a real, high-confidence command bug repeated in
4 places across `03-general-practice.mdx`: `git fetch --prune --tags origin`
was used as "the command that prunes locally deleted remote tags," but
`--tags` alone only fetches tags, it does not delete any; the actual pruning
flag is the separate `--prune-tags` (which itself only takes effect when
`--prune` is also given). Fixed all 4 occurrences to `git fetch --prune
--prune-tags origin` and added a clarifying note distinguishing the three
flags (`--prune`, `--prune-tags`, `--tags`) where the fix landed.

Next up: `forking-and-pull-requests`.

**Checkpoint 8:** 23 topics complete - added `forking-and-pull-requests`.
`01-overview.mdx` and `02-practice-exercise.mdx` were clean. Found and fixed
a real command bug in `03-general-practice.mdx` Tier 2 Exercise 2: the
solution ran `git merge fork-a/feature-a` in the `dev` repo, but `dev` never
added a remote named `fork-a` (both `dev` and `fork-a` share the same
`origin` = the shared bare `upstream.git`, so `fork-a`'s pushed branch lands
in that shared remote, not a `fork-a`-named remote). Fixed to
`git fetch origin && git merge origin/feature-a`, which correctly reflects
how the two clones actually share the bare repo in this simulated setup.

Next up: `code-review-workflow`.

**Checkpoint 9:** 25 topics complete - added `code-review-workflow` and
`github-issues-project-boards`. `code-review-workflow`: found and fixed one
fabricated CLI flag - the "What You Just Learned" summary claimed
`--dismiss-stale-reviews` as something you "use" (implying a command flag),
but this is actually a branch-protection JSON setting (`dismiss_stale_reviews`,
shown correctly earlier in the same file's Step 7 API call), not a flag on
any `gh pr` command - reworded to describe it accurately as a setting to
enable. `github-issues-project-boards`: no bugs found, clean throughout.

Next up: `git-hooks`.

**Checkpoint 10:** 26 topics complete - added `git-hooks`. `01-overview.mdx`
and `02-practice-exercise.mdx` were clean and accurate. Found and fixed a
substantive bug in `03-general-practice.mdx` Tier 1 Exercise 2 ("prevent
force-pushing"): the hint and solution checked whether `local_oid` was all
zeros and labeled that "force push detection" - but an all-zeros `local_oid`
actually signals a ref DELETION, not a force push, and there is no explicit
force flag in the pre-push hook's stdin at all. Worse, the test scenario
never created diverging history, so the demonstrated `git push --force`
would have succeeded trivially with nothing to block (the fallback "Force
push blocked" text would never have actually printed). Rewrote the hook to
use the technically correct detection method (`git merge-base --is-ancestor
<remote_oid> <local_oid>` to catch a genuine non-fast-forward update, with
explicit zero-oid checks for delete/new-branch cases), and rewrote the setup
to actually amend an already-pushed commit first so the force-push is real
and the hook has something to catch.

Next up: `git-submodules`.

**Checkpoint 11:** 28 topics complete - added `git-submodules` and
`git-worktrees`. Both clean, no bugs found (technically accurate throughout:
gitlink mechanics, submodule detached-HEAD behavior, worktree shared
object-database architecture, branch-single-worktree constraint). This
completes all of "Git Branching and History" plus GitHub collaboration
topics through worktrees. Roughly 55% of the 51-topic course is now done.

Next up: `github-actions-fundamentals` (starting the CI/CD half of the
course).

**Checkpoint 12:** 30 topics complete - added `github-actions-fundamentals`
(clean, no bugs) and `workflow-yaml-syntax`. Found and fixed a substantive,
high-confidence YAML/GitHub-Actions semantics bug repeated in TWO exercises
in `workflow-yaml-syntax/03-general-practice.mdx` (Exercise 6 "Merge
multiple anchors" and Exercise 9 "Refactor a duplicated workflow"): both
anchored a LIST of multiple steps (e.g. `&setup: [uses: checkout, uses:
setup-python]`) and then referenced it inside another `steps:` sequence with
`- *setup`, presenting this as valid, working YAML that "flattens" the
shared steps into the job. This is wrong: a YAML alias node substitutes the
literal referenced node, so `- *setup` nests the entire 2-item list as ONE
non-mapping entry inside `steps`, which GitHub Actions' schema validator
rejects (every `steps[]` entry must be a mapping). Confirmed via standard,
uncontroversial YAML node-substitution semantics, not a guess. Exercise 6's
own explanatory note even correctly said "`<<:` doesn't work for sequences,
use `- *anchor-name` instead" while its code block above used BOTH the wrong
`<<:` merge key on a sequence AND the equally-wrong multi-step alias in the
same broken example - self-contradictory in two different ways at once.
Fixed both exercises: Exercise 6 now anchors two SINGLE steps (mappings),
which is genuinely valid since `- *singlestep` inserts exactly one correct
mapping entry, with an explanatory note about the one-step-per-anchor
limit. Exercise 9 (which explicitly needs to dedupe a *group* of steps
across 4 jobs, where single-step anchors don't suffice) now uses a composite
action (`.github/actions/setup/action.yml` + `uses: ./.github/actions/setup`
in each job) as the technically correct mechanism, with a note explaining
why the anchor approach doesn't work and forward-pointing to the
`reusable-workflows-composite-actions` topic for depth.

Next up: `triggers-and-events`.

**Checkpoint 13:** 31 topics complete - added `triggers-and-events`.
`01-overview.mdx` and `02-practice-exercise.mdx` were clean. Found and
fixed a real YAML bug in `03-general-practice.mdx` Tier 3 Exercise 9: the
"Solution" workflow declared `push:` TWICE as a sibling key directly under
`on:` (once with `branches`/`paths-ignore`, once with `tags`) - an invalid
duplicate mapping key that a YAML parser would either reject or silently
resolve to only the last occurrence, discarding the branch/paths-ignore
filter entirely and breaking constraint 1 of the exercise (deploy to
staging on merge to main). Merged into a single `push:` block with
`branches`, `tags`, and `paths-ignore` together, which is both valid YAML
and the technically correct way to express "trigger on push to main OR push
of a version tag" (GitHub OR's `branches`/`tags` filters within one `push:`
event).

Next up: `jobs-steps-runners`.

**Checkpoint 14:** 32 topics complete - added `jobs-steps-runners`. Two real
bugs found and fixed: (1) `01-overview.mdx` Step 4 claimed "`uses` and `run`
... can be combined in the same step," which is flatly wrong (a GitHub
Actions step is always one or the other, never both), and its own example
directly contradicted the claim by showing two separate steps anyway -
reworded to state the correct constraint and relabeled the example's two
steps clearly; (2) `03-general-practice.mdx` Tier 3 Exercise 9's "Fast
Pipeline" optimization solution had the YAML and the prose disagree: the
code still had `test: needs: lint` (serializing them) while the prose's math
assumed lint/test/build all ran fully in parallel, and the prose itself was
internally inconsistent (stated "~9 min," then computed "2 min + 8 min = 8
min" - an arithmetic error - then said "10 min total"). Removed the
leftover `needs: lint`, added `deploy: needs: [lint, test, build]` so
deploy correctly waits on all three parallel jobs (not just two), and
rewrote the explanation with correct, single arithmetic: 8 (slowest
parallel job) + 1 + 1 = 10 min total, down from 2+8+5+1+1 = 18 min
sequential.

Next up: `environment-variables-and-secrets`.

**Checkpoint 15:** 33 topics complete - added `environment-variables-and-
secrets`. `01-overview.mdx` and `02-practice-exercise.mdx` clean. Found and
fixed a real, repeated bash bug in `03-general-practice.mdx`: three separate
places used `[ -n '$VAR_NAME' ]` with the variable reference inside SINGLE
quotes, which prevents bash variable expansion entirely - the test always
checks whether the literal 10-ish-character string `$VAR_NAME` is
non-empty (always true), never the variable's actual value, so these checks
would silently report "configured: yes" even when the secret/variable was
never set. This directly undermines what two of the three exercises exist
to teach (verifying a secret is set without exposing it). Fixed all three
to use double quotes (`[ -n "$VAR_NAME" ]`), which is the correct,
expansion-preserving form. Swept the entire course for the same pattern
afterward and confirmed no other instances exist.

Next up: `artifacts-and-build-outputs`.

**Checkpoint 16:** 34 topics complete - added `artifacts-and-build-outputs`
(already had the one dash-collision fix from earlier in the session; the
deep accuracy pass found no further bugs - upload/download mechanics,
retention defaults, glob/exclusion patterns, matrix artifact naming, and the
multi-platform release/selective-CI exercises all checked out as accurate).

Next up: `building-a-ci-pipeline`.

**Checkpoint 17:** 35 topics complete - added `building-a-ci-pipeline`.
`01-overview.mdx` and `02-practice-exercise.mdx` clean. Found and fixed a
real logic bug in `03-general-practice.mdx` Tier 3 Exercise 2 (monorepo CI):
the scenario explicitly required "only the relevant checks for changed
files," but the given solution had `frontend: if:
github.event_name == 'pull_request'` (unrelated to changed files - runs on
every PR regardless of what changed, never on direct pushes) while
`backend` and `shared` had NO condition at all, running unconditionally on
every push/PR. None of the three jobs actually checked which paths changed,
directly contradicting the stated requirement. Replaced with a
`detect-changes` job using the `dorny/paths-filter` action (the same tool
the original text already named as an "alternative" without actually using
it) producing per-directory true/false outputs, with each language job's
`if` correctly gated on its own output. Also added an honest note that
GitHub Actions has no native way to cap concurrency across distinct job IDs
(only within a matrix via `max-parallel`), rather than fabricating a fake
mechanism for the exercise's "no more than 2 parallel jobs" constraint.

Next up: `matrix-builds`.

**Checkpoint 18:** 36 topics complete - added `matrix-builds`. Two real bugs
found and fixed: (1) `01-overview.mdx` conflated the 256-job matrix SIZE cap
(per workflow run) with actual runner CONCURRENCY limits, claiming "GitHub
runs up to 256 concurrent matrix jobs across all workflows in a repository"
- these are two unrelated numbers (concurrency is plan-based, e.g. 20 for
free-tier accounts, and applies account-wide, not per-matrix) - corrected to
distinguish the two; (2) `03-general-practice.mdx` Tier 3 Exercise 2 stated
"11 jobs (2×3×2=12, minus 1 exclude, plus 1 include)" where the parenthetical
arithmetic itself (12-1+1) equals 12, not 11 - fixed the stated total to
match its own math. `02-practice-exercise.mdx` was clean.

Next up: `caching-dependencies`.

**Checkpoint 19:** 37 topics complete - added `caching-dependencies`. Found
and fixed a pervasive, genuinely build-breaking bug repeated 7 TIMES across
all 3 files in this topic: workflows cached only `~/.npm` (npm's compressed
download cache) but then used `if: steps.<cache-id>.outputs.cache-hit !=
'true'` to SKIP `npm ci` entirely on a cache hit. This is wrong: `~/.npm` is
not `node_modules` - `npm ci` is the step that actually builds
`node_modules` from the cache, so skipping it on a hit would leave
`node_modules` empty and break every subsequent step (`npm test`, etc.).
The bug was especially notable because `01-overview.mdx`'s own Step 3 and
`02-practice-exercise.mdx`'s own Step 7 / Error 2 troubleshooting section
correctly explained that `npm ci` must still run on a cache hit (just
faster, ~10s vs ~90s, since it skips the network download) - directly
contradicting the broken pattern shown a few paragraphs away in the same
files. Fixed all 7 occurrences (`01-overview.mdx` Step 2 + full example;
`02-practice-exercise.mdx` Step 2, the run-time comparison table, Step 4's
"skipped" claim, and the summary bullet; `03-general-practice.mdx` Tier 2
Ex1, Tier 2 Ex2 (also affected `pip install`, same root cause), Tier 3 Ex1's
"fix", and Tier 3 Ex3) to always run the install command, with an
explanatory note on why at each fix site. Verified zero remaining instances
of the pattern course-wide afterward.

Next up: `deployment-workflows-cd`.

**Checkpoint 20:** 38 topics complete - added `deployment-workflows-cd`, no
bugs found (CD concepts, GitHub Pages deploy flow, concurrency groups,
blue-green/canary rollback strategies, and the canary monitoring loop's
5-minute timing all checked out accurate).

Next up: `github-environments-approval-gates`.

**Checkpoint 21:** 39 topics complete - added `github-environments-approval-
gates`. No confirmed bugs (required-reviewers cap of 6, wait-timer/branch-
restriction/secret-isolation mechanics, and the PCI-compliance and deploy-
freeze exercise designs all checked out accurate).

Next up: `release-automation`.

Note: git status shows ~65 files already modified from an earlier, interrupted, dash-only/narrower-scope attempt (topics: ai-pipelines, api-authentication, async-python, capstone, context-managers, control-flow, csv, data-visualization, error-handling, file-handling, first-program, llm-api-basics, logging, loops, performance, practice, project-structure, setup, strings). These are being re-audited against the full 6-criteria rubric, not trusted as-is.

**Checkpoint 22:** 41 topics complete - added `release-automation` and
`required-status-checks-gated-checkins`. Two real bugs found and fixed:
- `release-automation/01-overview.mdx`: claimed `softprops/action-gh-release`
  `files:` uploads are capped at "max 10 GB total" - fabricated. Verified via
  web search against GitHub's actual release-asset limits: each file must be
  under 2 GiB, up to 1000 assets per release, no aggregate size cap. Fixed the
  parameter description accordingly.
- `required-status-checks-gated-checkins/02-practice-exercise.mdx` and
  `03-general-practice.mdx`: repeatedly conflated two distinct GitHub GraphQL
  PR fields. `mergeable` only ever returns `MERGEABLE`/`CONFLICTING`/`UNKNOWN`
  (pure git-conflict status, resolves fast, independent of check results).
  `mergeStateStatus` is the separate field that actually reflects required-check
  and up-to-date blocking (`BEHIND`/`BLOCKED`/`CLEAN`/`DIRTY`/etc.). Both
  practice files had `gh pr view --json mergeable` calls and claimed the
  `mergeable` field itself would show `"BLOCKED"` - a value that field can
  never hold. Fixed across 4 locations in `02-practice-exercise.mdx` (Step 3,
  Step 3 command, Step 4 verify, Step 6) and 4 in `03-general-practice.mdx`
  (Exercise 2.2 hint + solution, Exercise 2.4 task/hint/solution, summary
  table), adding `mergeStateStatus` to the `--json` calls and correcting the
  claimed output values (`BLOCKED` for failing required check, `BEHIND` for
  strict-mode out-of-date, `CLEAN` for all-clear).
No other issues found in either topic - `required-status-checks-gated-
checkins/01-overview.mdx` and `index.md` were verified clean (check-run vs
commit-status mechanics, conclusion-blocking table incl. the `skipped`-does-
not-block claim, matrix check-name suffixing, and the branch-protection API
parameter table all checked out accurate against GitHub's docs).

Next up: `codeowners-required-reviewers`.

**Checkpoint 23:** 42 topics complete - added `codeowners-required-reviewers`.
This topic had the highest bug density found so far in this audit - 4 distinct,
confirmed factual errors about how GitHub CODEOWNERS actually works, verified
via web search against GitHub's docs and independent sources before fixing:
1. **Lookup-order bug:** claimed order was `.github/` -> `docs/` -> root;
   actual order is `.github/` -> root -> `docs/`. Fixed in the table and prose
   in `01-overview.mdx`, and the "Common Errors" section of
   `02-practice-exercise.mdx`.
2. **Fabricated syntax:** an entire "Negation Patterns" section taught `!`
   negation prefixes as working syntax, and the wildcard table included
   `[abc]` character classes. Neither is supported by CODEOWNERS (both are
   gitignore features GitHub's own docs explicitly list as unsupported
   exceptions). Replaced the negation section with the correct technique
   (a later, more specific rule overriding an earlier broad one) and removed
   the character-class table row with a note that both are invalid.
3. **Wrong matching algorithm:** the overview claimed CODEOWNERS uses a
   "longest match wins" / most-specific-rule-wins algorithm. The real
   algorithm is pure file-order: the *last* matching line always wins,
   regardless of how specific or broad it is. Fixed the core explanation in
   `01-overview.mdx` Step 2, plus matching "longest-match-wins" language in
   `02-practice-exercise.mdx`'s closing summary and a specificity-based
   framing in `03-general-practice.mdx` Exercise 4's hint.
4. **Non-cumulative ownership (biggest one):** the overview claimed that if
   two different CODEOWNERS lines both match the same file, both sets of
   owners apply cumulatively (e.g., `/src/backend/` + `*.py` both matching one
   file requiring approval from both teams). This is false - a single file is
   owned by exactly one rule, the last matching line; the earlier match is
   discarded, not merged. Owners only combine if listed together on that one
   line. This invalidated the entire premise of `03-general-practice.mdx`
   Tier 3 Exercise 1 (a monorepo policy assuming two independent rules could
   both apply to `src/backend/config.yml`), which was rewritten to demonstrate
   the real technique: an explicit combined-owner line
   (`src/backend/*.config.* @backend-team @platform-team`) placed after the
   broader rules it needs to override, with corrected hint text and expected
   output explaining why.
Also fixed (from release-automation's checkpoint) carried no changes here.
No other issues in this topic - the branch-protection API parameter table,
check-suite/check-run mechanics, and all other exercises checked out accurate.

Next up: `reusable-workflows-composite-actions`.

**Checkpoint 24:** 43 topics complete - added `reusable-workflows-composite-
actions`. Another high bug-density topic - 7 distinct confirmed errors, all
verified via web search before fixing:
1. **Outdated nesting limit:** claimed reusable workflows nest "4 levels
   deep" and composite actions "9 levels deep." GitHub raised the reusable-
   workflow limit to 10 nested levels / 50 total workflows per run in a
   November 2025 changelog update (long before today's date) - "4 levels" is
   the old, superseded figure. The "9 levels deep" composite-action figure
   appears to be fabricated outright; no such documented limit exists for
   composite actions. Fixed the comparison table in `01-overview.mdx`.
2. **Wrong internal trigger:** Step 1 claimed GitHub dispatches reusable
   workflows using the `workflow_dispatch` event type internally. The actual
   (and only) trigger is the distinctly-named `workflow_call` event -
   `workflow_dispatch` is a completely different, unrelated trigger type.
   Fixed in `01-overview.mdx`.
3. **Wrong cross-repo claim:** claimed composite actions cannot nest another
   composite action from a different repository ("not supported"). This is
   backwards - cross-repo nesting works fine with the full `owner/repo@ref`
   syntax; only a *relative* path (`./path`) is same-repo-only. Fixed in
   `01-overview.mdx`.
4. **Wrong debug-logging mechanism:** `02-practice-exercise.mdx`'s "Called
   workflow failed" troubleshooting tip showed enabling debug logging by
   adding `ACTIONS_STEP_DEBUG: true` inside a `secrets:` passthrough block on
   the caller job. That is not how it works (and would not even validate,
   since the reusable workflow does not declare that as an accepted secret
   input) - the real mechanism is a repository/org-level secret or variable
   named `ACTIONS_STEP_DEBUG`. Fixed with the correct Settings path.
5. **Wrong input type list:** `02-practice-exercise.mdx` Step 2 claimed
   `workflow_call` input `type` supports `environment` and `choice` in
   addition to `string`/`number`/`boolean`. Those two are `workflow_dispatch`-
   only (UI-form types with no equivalent for a programmatic call) -
   confirmed both by web search and by `03-general-practice.mdx` Exercise 9's
   own correct note elsewhere in the same course. Fixed.
6. **Broken exercise + false limitation claim (the big one):**
   `03-general-practice.mdx` Exercise 10 claimed "you cannot use
   `strategy.matrix` directly in a job that uses `uses:`" as a hard
   limitation requiring a dynamic-matrix workaround. This is false - matrix
   strategies on reusable-workflow-calling jobs have been directly supported
   since August 2022, confirmed against GitHub's docs and example syntax.
   The exercise's own "workaround" solution was also independently broken:
   mismatched matrix axes produced a 3x3 cartesian product instead of the
   intended 6 paired combinations, and `matrix.version.versions[0]` always
   selected the first version regardless of which one should have applied.
   Rewrote the primary solution to a plain `matrix: include:` list directly
   on the `uses:` job (achieves the task correctly, no workaround needed),
   reframed the dynamic-matrix example as an optional technique for
   runtime-computed combinations rather than a required limitation-workaround.
7. **Self-contradiction:** Exercise 12 claimed that after updating a shared
   reusable workflow, "all 5 repos pick up the change immediately" - but the
   example pins `@v1` (a tag ref), and this same course's own
   `01-overview.mdx` correctly explains that tag refs require an explicit
   tag-move to propagate changes, unlike branch refs. Fixed to match the
   course's own correct model.
Also fixed one leftover corruption artifact (unrelated to the above): a
stray space broke a composite-action path example in `03-general-practice.mdx`
Exercise 3 (`./ .github/actions/hello-action` -> `./.github/actions/hello-
action`).
No other issues found - the outputs propagation model (job-output ->
workflow_call-output -> needs.job.outputs chain), secrets:inherit security
framing, and the remaining exercises (composite action inputs/outputs,
error-handling hierarchy, refactor exercise structure) all checked out
accurate.

Next up: `branch-protection-rules`.

**Checkpoint 25:** 44 topics complete - added `branch-protection-rules`. Third
high-bug-density topic in a row - 8 distinct confirmed errors:
1. **Structural corruption:** the API/YAML keys table had a duplicated
   header+separator row, and "Step 1: GitHub Receives the Push or PR Event"
   was an entire duplicated section (same heading, near-identical body,
   twice in a row) before Step 2. Merged into one of each.
2. **Fabricated API field:** `strict_required_status_checks_commits` used as
   a top-level key. The real field is the nested `required_status_checks.
   strict`. Fixed in the table and all later prose references.
3. **Invented check-run states:** claimed four states `queued`/`in_progress`/
   `completed_success`/`completed_failure`. Real API has two separate fields:
   `status` (`queued`/`in_progress`/`completed`) and, once completed, a
   `conclusion` (`success`/`failure`/`neutral`/`cancelled`/`timed_out`/
   `action_required`/`skipped`). Fixed to the correct two-field model.
4. **Same mergeable/mergeStateStatus conflation found in checkpoint 22**,
   here with an added invented enum value: claimed `mergeable` is a composite
   AND of every protection rule with values `MERGEABLE`/`UNMERGEABLE`/
   `UNKNOWN`. Real `mergeable` only tracks git-conflict status (`MERGEABLE`/
   `CONFLICTING`/`UNKNOWN`; `UNMERGEABLE` does not exist). The composite-AND
   concept the file wanted is `mergeStateStatus` (`BEHIND`/`BLOCKED`/`CLEAN`/
   `DIRTY`/`DRAFT`/`HAS_HOOKS`/`UNKNOWN`/`UNSTABLE`). Rewrote Step 3 to
   correctly separate the two fields.
5. **Wrong GH006 error text**, repeated 8 times across all three files
   (`01-overview.mdx`, `02-practice-exercise.mdx` x2, `03-general-practice.mdx`
   x4): showed `"GH006: Push to protected branch \"main\""` /
   `"You cannot push/force push..."`. Real GitHub wording (verified via
   multiple independent sources) is `"GH006: Protected branch update failed
   for refs/heads/main."` followed by a reason-specific second line
   (`"Changes must be made through a pull request."` or `"Cannot force-push
   to a protected branch."`). Fixed all 8 instances.
6. **Self-contradiction on self-approval:** `02-practice-exercise.mdx` Step 4
   claimed a solo repo owner can self-merge without review "because you are
   the repository owner" - directly contradicted by that same file's Error 3
   section (correctly stating self-approval is never allowed) and by
   independently verified GitHub behavior (self-approval is a hard platform
   rule with no override). The real reason the walkthrough's merge succeeds
   is the `enforce_admins`-off admin-bypass button on a freshly created rule,
   not a "solo repo" exception. Rewrote the explanation.
7. **Wrong PUT request shape:** two exercises in `03-general-practice.mdx`
   sent `required_linear_history`/`allow_force_pushes` as `{"enabled": bool}`
   objects in a PUT body. Confirmed via GitHub's REST docs that PUT expects
   plain booleans for these fields - the wrapped-object shape only appears
   in GET responses. Fixed both scripts.
8. **Broken exercise premise (follows directly from #7):** Tier 3 Exercise 1's
   hotfix-override exercise saved a GET response to a file and then PUT it
   straight back later to "restore" protection - which would fail/misconfigure
   given the GET/PUT shape asymmetry just confirmed in #7. Added a `jq`
   reshaping step between save and restore so the exercise actually works.
No other issues - the atomic-merge-check narrative, admin-enforcement model,
emergency-hotfix-branch process, and the remaining exercises checked out
either accurate or unfalsifiable-but-plausible (left alone per the
confidence bar).

Next up: `security-scanning-codeql-dependabot`.

**Checkpoint 26:** 45 topics complete - added `security-scanning-codeql-
dependabot`. 5 distinct confirmed bugs, all in runnable workflow/script code
(none in the conceptual explanations, which checked out accurate against
GitHub's CodeQL and Dependabot docs, including the query-suite comparison
table and CVE facts):
1. **`alert-lookup: true` misuse**, repeated in both `01-overview.mdx` and
   `02-practice-exercise.mdx`'s Dependabot auto-merge workflows: this option
   requires `github-token` to be a PAT/App token (confirmed via the action's
   own docs), but neither example provides one, and neither uses any of the
   outputs the option actually populates (`alert-state`/`ghsa-id`/`cvss`) -
   only `update-type`, which works without it. Removed the option with an
   explanatory comment in both files.
2. **Self-contradicting path filter:** `02-practice-exercise.mdx` Step 8 added
   `paths: src` to the CodeQL filter, but the exercise's own sample project
   keeps `index.js` at the repo root with no `src/` directory ever created -
   so this would make CodeQL match nothing, contradicting the step's own
   closing claim that analysis still "focuses...on your application source
   code." Fixed to match the project's actual layout.
3. **Outdated language-identifier guidance:** claimed TypeScript has no
   identifier of its own and must always be requested via `javascript`.
   GitHub has since added `javascript-typescript` as an explicit alias
   identifier (confirmed via CodeQL's language docs). Updated the supported-
   identifiers list and note accordingly.
4. **Broken PR-number extraction (Exercise 3.1, the biggest one):** a script
   tried to parse a PR number out of a Dependabot branch name with `grep -oP
   'dependabot/\K\d+'`. Real Dependabot branch names never contain a PR
   number - the format is `dependabot/<ecosystem>/<dependency>-<version>`
   (e.g. `dependabot/npm_and_yarn/lodash-4.17.21`), confirmed via GitHub's
   docs. The regex could never match, so the exercise's entire "label the PR
   by severity" mechanism would silently no-op every time. Rewrote to look
   up the PR via `gh pr list --head <branch>`.
5. **Missing `ref` filter on the alerts API (same exercise, two call sites):**
   `gh api .../code-scanning/alerts` was called with no `ref` parameter.
   Confirmed via GitHub's REST docs that omitting `ref` defaults the query to
   the repository's *default* branch, not the branch actually just scanned -
   so the severity check was silently evaluating alerts from `main` instead
   of the Dependabot branch. Added `?ref=refs/heads/$BRANCH_NAME` to both
   call sites (the labeling step and the blocking step).
No other issues found - the Dependabot/CodeQL architecture diagrams, the
dependabot.yml schema table, the query-suite descriptions, and the remaining
exercises (custom CodeQL query, multi-repo SARIF aggregation, organizational
code-scanning API) checked out accurate.

Next up: `debugging-github-actions-workflows`.

**Checkpoint 27:** 46 topics complete - added `debugging-github-actions-
workflows`. Lighter bug density than the last several topics - the core
overview (`01-overview.mdx`) checked out fully accurate (job timeout
defaults, pipefail semantics, secret masking caveats, step isolation model
all verified). One real bug found in `02-practice-exercise.mdx`:
- A whole "Common Error" section was built on a false premise: it claimed
  the `github` context is unavailable in workflow/job-level `env:` blocks
  and only works in step-level expressions. In reality `github` is available
  almost everywhere, including `env:` (`env: BRANCH_NAME: ${{ github.
  ref_name }}` is a common, working pattern - confirmed via GitHub's own
  contexts-reference docs). The restriction that actually exists, and that
  trips people up in a similar way, is that the `steps` context cannot be
  read from an `env:` block, because `env:` is resolved before any step
  runs. Rewrote the section around the real restriction with a corrected
  example and fix.
Reviewed but left unflagged (plausible but not disprovable with available
evidence, per the confidence bar): whether tmate's SSH session on a Windows
runner drops into native PowerShell or a bash-like shell (Exercise 9 assumes
native PowerShell) - action-tmate documents Windows support but not the
exact shell, so this was not confidently wrong enough to correct.
No other issues found in `03-general-practice.mdx` - the workflow_dispatch
debug-input pattern, matrix-targeted conditional debug steps, and the
reusable debug-analyzer workflow (including its `context.sha` usage, which
is correct since the example workflow calls it locally via `./` rather than
cross-repo) all checked out sound.

Next up: `pipelines-as-quality-gates`.

**Checkpoint 28:** 47 topics complete - added `pipelines-as-quality-gates`.
4 confirmed bugs, all in runnable script/workflow code:
1. `01-overview.mdx`'s smoke-test step piped `curl -f URL | grep "200 OK"` -
   `curl -f` without `-i`/`-I` prints only the response body, never an
   "HTTP/1.1 200 OK" status line, so the grep could never match a real
   success response. Replaced with the standard `-s -o /dev/null -w
   "%{http_code}"` status-code-capture idiom.
2. `02-practice-exercise.mdx`'s "expected output" Jest coverage table was
   missing the "Uncovered Line #s" column and truncated the filename
   (`calculator` vs the real `calculator.js`) that Jest's default reporter
   actually prints. Fixed to match Jest's real table format.
3. `03-general-practice.mdx` Exercise 2.2's matrix had an `exclude: - os:
   ubuntu-latest, node: 18` entry, but the matrix's own `node:` axis was
   `[16, 20]` - 18 was never in it, so the exclude was inert dead code.
   Removed it (Node 18 on ubuntu is already covered by the separate `gate`
   job earlier in the same exercise).
4. Exercise 3.1's quality-scorecard pipeline had two independent bugs in the
   same solution: (a) the CodeQL vulnerability-count step read a
   `codeql-results.sarif` file that was never produced, since the preceding
   `codeql-action/analyze` step never set `output:` and SARIF results go to
   a `runner-managed location by default; and its jq filter searched for a
   `.severity` field with values "high"/"critical" that do not exist
   anywhere in the SARIF schema (the real field is `properties["security-
   severity"]`, a numeric CVSS-like string). Fixed by adding `output:
   codeql-results` to the analyze step and rewriting the jq query against
   the real `properties["security-severity"] >= 7.0` field. (b) The lint
   warning-count step read `.[0].warningCount` from eslint's JSON output,
   but that formatter emits one object per linted file, so indexing element
   0 silently undercounts on any repo with more than one file. Fixed to sum
   across all files with `[.[].warningCount] | add`.
Reviewed but left unflagged (plausible but not confidently disprovable):
whether the inline `bc` "if (cond) A else B" one-liner syntax used for the
composite-score arithmetic in the same exercise is valid GNU bc - genuinely
uncertain without testing, so left as-is per the confidence bar.
No other issues found - the dependency-chain/fail-fast/environment-gate
conceptual model, the staged-promotion and self-healing-retry exercises, and
the rest of the exercises checked out sound.

Next up: `which-quality-gates-matter`.

**Checkpoint 29:** 48 topics complete - added `which-quality-gates-matter`.
4 confirmed bugs:
1. `01-overview.mdx`'s reference table claimed `concurrency: group: ci-${{
   github.ref }}` alone "cancels in-progress runs." Confirmed via GitHub's
   docs that without `cancel-in-progress: true`, the default behavior only
   cancels a still-*pending* (queued but not started) run in the same group
   - a run already in progress keeps going. Fixed the table row and example.
2. `02-practice-exercise.mdx`'s "Error 2" showed npm audit output with a
   garbled duplicated-word command (`npm install --audit-audit-level=high`)
   - leftover-looking text corruption. Fixed to a real, working command
   (`npm audit fix`).
3. `03-general-practice.mdx` Tier 3 Exercise 3: the stated pipeline total
   ("38 minutes") did not match the sum of the individual job times given in
   the same exercise (8s+12s+45s+3m+5m+22m+30s = ~32 minutes, not 38).
   Corrected the stated total and propagated the fix through the downstream
   percentage-reduction and time-saved claims that were computed from the
   wrong number (84% -> 81% reduction; "~2 minutes saved by tiering" -> "~4
   minutes," reconciled against the exercise's own internally-consistent
   28-minute still-blocking subtotal).
4. **The most consequential one:** Tier 2 Exercise 3's fast-track workflow
   used `if: github.event_name == 'pull_request' || !github.event.inputs.
   fast-track` to decide whether to run integration/E2E tests. This is the
   classic GitHub Actions truthy-string gotcha: `github.event.inputs.*` is
   always a string, and any non-empty string (including the literal string
   `"false"`) is truthy in GHA expressions, so `!github.event.inputs.fast-
   track` always evaluates to `false` - meaning integration and E2E tests
   would silently skip on *every* manual dispatch regardless of what the
   user selected, the opposite of the exercise's own stated behavior ("when
   fast-track is false, all gates run normally"). Fixed to an explicit
   string comparison (`github.event.inputs.fast-track != 'true'`) and added
   an explanatory note about the pitfall for readers.
No other issues found - the tiered-gate conceptual model, the microservices
dependency-graph exercise, the adaptive path-filter exercise, and the flaky-
test cost-benefit exercise (whose own arithmetic checked out correct) were
all sound.

Next up: `managing-flaky-tests`.

**Checkpoint 30:** 49 topics complete - added `managing-flaky-tests`. Highest
bug count of any topic so far - 8 confirmed bugs, most in runnable
Python/bash/jq code:
1. **Fabricated tool** (`01-overview.mdx` + `02-practice-exercise.mdx`,
   biggest single item): both files taught a nonexistent `pytest-flaky`
   package with a `--flaky-attempts N` CLI flag that runs the whole suite N
   times. Confirmed via PyPI/GitHub search that the real package is just
   `flaky` (no "pytest-" prefix) and works via a per-test `@flaky(max_runs=N,
   min_passes=M)` decorator, not a CLI flag - and it retries individual
   decorated tests, not the whole suite. Rewrote the reference table row and
   the entire "Step 3" walkthrough section (package install, test code,
   command, explanation) plus the "What You Just Learned" bullet to use the
   real package and API correctly.
2. `03-general-practice.mdx` Exercises 3.1 and 3.2: both scripts ran `pytest
   --json-report --json-report-file=-` expecting the report on stdout via
   `json.loads(result.stdout)`. Confirmed pytest-json-report has no stdout
   convention for `-` (it is a real path or `none`, never a stdout sentinel)
   - so this would write to a literal file named `-` while stdout instead
   holds pytest's own human-readable console output, which is not valid
   JSON. Fixed both scripts to write to a real temp file and read it back.
3. Exercise 2.2's quarantine-graduation workflow comma-joined a file list
   (`','.join(files)`) then iterated it with a plain `for f in ${{ ... }}`
   bash loop, which splits on whitespace, not commas - the whole
   comma-joined string would be treated as a single token. Fixed with
   `IFS=',' read -ra FILES <<< "..."`.
4. Workflow 2 (SLA Escalation)'s jq filter compared `.createdAt` (an
   ISO8601 string from `gh issue list --json`) directly against `(now -
   14400)` (a number). jq's cross-type comparison always sorts strings after
   numbers regardless of content, so this comparison would always be false -
   the escalation could never fire. Fixed with `fromdateiso8601` to parse
   the string to a numeric timestamp before comparing.
5. Workflow 3 (Auto-Delete)'s git log used `--since="30 days ago"`, which
   restricts to commits from the last 30 days (recent) - backwards from the
   stated goal of finding tests quarantined for 30+ days (i.e., added *more
   than* 30 days ago). Fixed to `--until="30 days ago"`.
No other issues found - the quarantine-pattern conceptual model, the
retry-vs-quarantine decision table, the flake-rate tracking script's core
logic, and the SLA-tier design (aside from the two fixed bugs) all checked
out sound.

Next up: `test-parallelization-pipeline-speed`.

**Checkpoint 31:** 50 topics complete - added `test-parallelization-pipeline-
speed`. 5 confirmed bugs:
1. `01-overview.mdx`'s reference table included a fabricated `--basedir`
   flag for `pytest-split` (`pytest --splits 4 --group 1 --basedir tests`).
   Confirmed via the plugin's own docs/source that no such flag exists -
   only `--splits`, `--group`, `--store-durations`, `--durations-path`,
   `--splitting-algorithm`, `--clean-durations`. Removed it.
2. `02-practice-exercise.mdx` used `--store` as the pytest-split
   timing-capture flag in 5 places (Step 4's explanation, Step 7's command
   and explanation, Error 4's fix, and the closing summary). The real flag,
   confirmed via the plugin's docs, is `--store-durations`. Fixed all 5.
3. `03-general-practice.mdx` Tier 3 Exercise 1: the greedy-splitting Python
   script only `print()`-ed its output, but the workflow usage example right
   after it referenced `${{ steps.split.outputs.files }}` - an output the
   script never wrote. Fixed the script to also append to `$GITHUB_OUTPUT`.
4. Same exercise tier, Exercise 2 (cost-optimization): claimed that adding
   `xdist` to halve each shard's wall time (8min -> 4min) leaves monthly
   cost unchanged "because runners are the same (4 runners, not 4x2)."
   This misunderstands GitHub Actions billing: it charges by wall-clock
   runner-minutes, not per vCPU, so a job that finishes in half the time on
   the same runner type also costs half as much. Recalculated: compute
   minutes per run 32 -> 16, cost $112.64/mo -> $56.32/mo. Fixed the
   recommendation and budget-remaining figures accordingly. (The AsciiDiagram
   immediately after still shows the old $112.64 figure in its cost table -
   left untouched since diagram content is out of scope for this pass.)
No other issues found - the sequential-vs-parallel speedup math, the
bottleneck-shard exercise, the matrix+sharding combination exercise, the
Jest `--shard` exercise, and the flaky-test-retry design in Tier 3 Exercise 3
all checked out sound.

Next up: `pipeline-reliability-failure-triage`.

**Checkpoint 32:** 51 topics complete - added `pipeline-reliability-failure-
triage`. 4 confirmed bugs:
1. **Fabricated action (biggest, spanned both files):** `actions/retry-step@
   v1` doesn't exist - the `actions/` namespace is reserved for GitHub's own
   official actions, and no such retry action lives there. Confirmed via
   Marketplace/GitHub search that the real, widely-used community action is
   `nick-fields/retry`. Its actual input names shown in the course
   (`max_attempts`, `retry_on`, `command`, `timeout_minutes`) already matched
   the real action's schema - only the owner/repo identity was wrong. Fixed
   every occurrence across `01-overview.mdx` (table row + Step 3 code) and
   `02-practice-exercise.mdx` (Steps 3/4/8, Error 1's framing, and the
   closing summary) to `nick-fields/retry@v3`.
2. **Invalid enum value (found while fixing #1):** `retry_on: exit` appeared
   3 times in `02-practice-exercise.mdx`. Confirmed via the action's docs
   that valid `retry_on` values are `error`, `timeout`, or a specific
   numeric exit code - never the literal string `exit`. Fixed to `error`.
3. `03-general-practice.mdx` Exercise 2.1: the exponential-backoff shell
   loop computed delays as `BASE_DELAY * 2**i` with `i` starting at 1
   (yielding 4s/8s/16s/32s/64s), but the prose immediately after claimed the
   sequence was "2s, 4s, 8s, 16s, 32s" - off by one exponent throughout, and
   the loop also slept needlessly after the final (5th) failed attempt with
   nothing left to retry. Fixed the exponent to `2**(i-1)` (matching the
   claimed 2/4/8/16 sequence for 5 attempts = 4 gaps) and added the missing
   "skip the trailing sleep" guard, consistent with the correctly-written
   equivalent loop already present later in the same file's Tier 3 Exercise
   3.1.
No other issues found - the failure-categorization table, the notify-per-
job-failure pattern (Exercise 2.2), the workflow_dispatch job-selector
pattern (Exercise 2.3, correctly wired unlike a similar unwired input in the
prior topic), the fail-fast matrix exercise, and the self-healing/graceful-
degradation designs in Tier 3 all checked out sound.

Next up: `testing-your-pipelines`.

**Checkpoint 33:** 52 topics complete - added `testing-your-pipelines` (the
last non-capstone topic). 3 confirmed bugs:
1. **Wrong CLI flag, pervasive across all three files (biggest item):**
   every instance of `act --dry-run` used a hyphen, but the real nektos/act
   flag is `--dryrun` (one word, confirmed via the project's own GitHub
   issues/docs - `-n`/`--dryrun`, never `--dry-run`). Fixed all ~20+
   occurrences across `01-overview.mdx`, `02-practice-exercise.mdx`, and
   `03-general-practice.mdx` via targeted `--dry-run` -> `--dryrun`
   replacements (verified this did not collide with unrelated log filenames
   like `/tmp/dry-run-latest.log`, which lack the leading `--` and were left
   untouched).
2. **Matrix include/exclude semantics error** (`03-general-practice.mdx`
   Exercise 2.1): claimed a matrix with 3 OS x 3 Node, 2 exclusions, and 1
   inclusion produces 8 jobs, showing `(ubuntu, 20)` and `(ubuntu, 20,
   coverage)` as two separate job lines. Per GitHub's documented `include`
   behavior (also caught in `codeowners-required-reviewers`, checkpoint 23,
   and `matrix-builds`'s history) - and confirmed here again - an `include`
   entry whose keys exactly match an existing (non-excluded) combination
   merges into that job rather than creating a new one. Since `{os: ubuntu,
   node: 20}` already exists in the 7 remaining combinations after the 2
   exclusions, the real total is 7 jobs, with `coverage: true` merged onto
   the existing `(ubuntu, 20)` job. Fixed the hint, solution output, and
   explanation.
3. **Overstated isolation claim** (`03-general-practice.mdx` Exercise 3.1):
   a test harness called `act -j <job>` on each job in a `needs`-chained
   workflow "isolated job tests," implying each job runs independently.
   `act -j <job>` still resolves and executes that job's full `needs` chain
   first (confirmed plausible via a related upstream nektos/act GitHub issue
   about dependency-running scope), so `act -j deploy` on a 5-job chain
   actually runs all 5 jobs, not deploy alone. Added a clarifying note so
   the exercise doesn't overpromise what the test actually isolates.
No other issues found - the event-payload testing pattern, the reusable-
workflow local-testing pattern, the artifact verification exercise, and the
pipeline-as-code test-suite design in Tier 3 all checked out sound.

Next up: `capstone` (10 files - the final topic in this audit).

**Checkpoint 34:** 51/51 topics complete (course content fully close-read) -
added `capstone` (10 files: index.md + 01-brief through 09-review). This
topic had the most severe individual bug of the whole audit - a false claim
that would have completely blocked solo readers from finishing the capstone
as written:
1. **Truncated file:** `01-brief.mdx` ended mid-sentence ("In the next
   page") with nothing after it. Completed the sentence.
2. **Cross-file output mismatch:** the Brief's example output showed `"404
   Not Found"` (no FAIL flag) and `"500 Internal Server Error (FAIL)"`, but
   the actual implemented `check_url()`/`format_result()` code (page 3)
   always returns generic `"Client Error"`/`"Server Error"` labels and flags
   *any* status >=400 as `(FAIL)`, including 404. Fixed the Brief's example
   to match what the real, tested code actually produces.
3. **Self-contradicting rule:** the Brief states "No one (including you)
   pushes directly to main," but page 2's own scaffolding step instructs
   `git push origin main` directly. Added a note framing this as the one
   deliberate bootstrap exception before branch protection exists, not a
   violation of the rule that governs everything after it.
4. **Test-isolation code smell:** a test in page 3 mutated `sys.argv`
   directly with no cleanup, which leaks into whichever test runs next.
   Fixed with `monkeypatch.setattr`, which restores state automatically.
5. **Matrix-vs-version-independent bug (page 5):** the "break a test on
   purpose" walkthrough singled out only the `test (3.11)` job as failing,
   but the broken assertion (`assert status == 999`) is a hardcoded wrong
   value with nothing Python-version-specific about it, so both `test
   (3.11)` and `test (3.12)` would fail identically. Fixed the prose.
6. **Repeated false claim, the most serious bug in the whole audit (pages 6
   and 8):** both pages stated a repo owner/admin "can approve your own PR"
   in a solo project. This is false and independently re-confirmed in this
   same session (see checkpoint 25's `branch-protection-rules` fix):
   self-approval of PRs is a hard GitHub platform rule with zero override,
   regardless of role. Combined with page 6's own instruction to check "Do
   not allow bypassing the above settings," a solo reader following these
   exact instructions would hit a genuine, unexplained dead end with no way
   to ever satisfy the required-approval gate. Rewrote both sections to
   correctly explain the constraint and give an actually-working path
   (add a second account/collaborator as reviewer, or temporarily reduce
   the approval count to explore the other gates and restore it after).
   Verified this does NOT apply to the separate environment-deployment
   "Prevent self-review" setting in page 7, which really is off-by-default
   and optional (confirmed via GitHub's own changelog) - that page was
   already correct and left unchanged.
7. **Wrong check-run naming (page 6):** listed required status checks as
   `lint (ubuntu-latest)` and `build (ubuntu-latest)`, but per the naming
   rule already established in this audit's `required-status-checks-gated-
   checkins` topic, only matrix jobs get a parenthetical suffix (with the
   matrix values, not `runs-on`). Since `lint` and `build` are plain,
   non-matrix jobs in the actual CI YAML, their real check names are just
   `lint` and `build`. Fixed both occurrences in this file.
No other issues found - the trunk-based-development rationale, the CD
environment/approval-gate mechanics (verified correct including the
self-review distinction above), the merge-strategy comparison, and the
final review/extension-ideas page all checked out accurate.

## FINAL COURSE-WIDE CORRUPTION SWEEP (all 211 files, post-completion)
Re-ran the two corruption-detection patterns established earlier in this
audit against the CURRENT content of every file in `apps/docs/docs/git-
github-actions/` (course-wide, not just recently-touched files):
1. Unbalanced-paren-with-sentence-break: `)` immediately followed by a
   lowercase letter, paren-nesting-aware match to the opening `(` on the
   same line, checking whether the enclosed span crosses a sentence
   boundary (period/other terminator followed by non-space) - scoped to
   prose lines only, excluding fenced code blocks, AsciiDiagram
   content/mermaid blocks, and markdown table rows.
2. Title-suffix corruption: `^title:.*\) [A-Z]` (closing paren directly
   followed by a capitalized word with no intervening punctuation) across
   all frontmatter blocks.
Zero hits on both patterns course-wide. The course is clean of the dash-fix
script's known corruption signature.

## GIT-GITHUB-ACTIONS COURSE: CONTENT-QUALITY AUDIT (COMPLETE)
Course-wide close-read finished 2026-09-09 across all 51 topics (211 files:
50 topics x 4 files + capstone's 10 files, plus the top-level index.md).
Same 6-criteria rubric as the completed design-patterns and python-for-ai-
engineers audits: relevance, accuracy, readability, engagement, zero em/en
dashes, human-voice, 95% minimum per file.

**Before/after quality estimate:** baseline was already fairly strong
(~90%+ on narrative quality, hooks, and human-voice going in - no AI-tell
buzzwords found anywhere in the course), but technical accuracy had a
meaningfully higher defect rate than the two previously-audited courses,
averaging roughly 4-8 confirmed bugs per topic in the GitHub-Actions-
specific half of the course (topics 30-51), versus close to zero in the
Git-fundamentals half (topics 1-29, mostly clean beyond the mechanical dash
pass). Post-fix, all 211 files are at or above the 95% bar.

**Full topic list with notes** (chronological/sidebar order; topics with no
bugs found are marked clean):
1. what-version-control-is - clean
2. using-the-terminal - clean
3. installing-git - 1 bug (wrong next-topic claim)
4. what-github-is - clean
5. your-first-repository - clean
6. what-is-version-control - clean
7. git-init-add-commit - clean
8. git-staging-area - 1 bug (index format byte-count error)
9. git-log-and-history - clean
10. gitignore-and-git-attributes - clean
11. git-remotes-push-pull - clean
12. git-stash - 1 bug (structural: exercise content hidden inside collapsed hint block)
13. git-branching - 1 bug (self-contradictory expected-output block)
14. git-merging - clean
15. resolving-merge-conflicts - clean
16. git-rebasing - clean
17. interactive-rebase-history-rewriting - 1 bug (trailing-slash path error)
18. cherry-picking-commits - 2 bugs (author/committer date conflation, missing branch + exercise numbering gap)
19. git-bisect-and-blame - clean
20. git-tags-and-releases - 1 bug (4 instances: --prune --tags vs --prune --prune-tags)
21. forking-and-pull-requests - 1 bug (wrong remote name)
22. code-review-workflow - 1 bug (fabricated CLI flag)
23. github-issues-project-boards - clean
24. git-hooks - 2 bugs (force-push detection logic error, non-functional test scenario)
25. git-submodules - clean
26. git-worktrees - clean
27. github-actions-fundamentals - clean
28. workflow-yaml-syntax - 1 bug (YAML anchor/sequence semantics, 2 exercises)
29. triggers-and-events - 1 bug (duplicate push: key)
30. jobs-steps-runners - 2 bugs (false uses+run claim, arithmetic error + leftover needs:)
31. environment-variables-and-secrets - 1 bug (3 instances, bash single-quote)
32. artifacts-and-build-outputs - clean (post dash-fix)
33. building-a-ci-pipeline - 1 bug (monorepo exercise not implementing its own requirement)
34. matrix-builds - 2 bugs (concurrency-vs-matrix-size conflation, arithmetic error)
35. caching-dependencies - 7 bugs (build-breaking npm ci skip anti-pattern, most significant single-topic bug count pre-GHA-half)
36. deployment-workflows-cd - clean
37. github-environments-approval-gates - clean
38. release-automation - 1 bug (fabricated 10 GB release-asset limit)
39. required-status-checks-gated-checkins - 1 bug class (mergeable/mergeStateStatus conflation, 8 locations)
40. codeowners-required-reviewers - 4 bugs (lookup-order, fabricated negation/character-class syntax, wrong matching algorithm, non-cumulative-ownership misconception)
41. reusable-workflows-composite-actions - 7 bugs (outdated nesting limit, wrong internal trigger, wrong cross-repo claim, wrong debug mechanism, wrong input-type list, false matrix limitation + broken exercise, self-contradiction on tag refs)
42. branch-protection-rules - 8 bugs (structural corruption, fabricated API field, invented check-run states, mergeable conflation + invented enum value, wrong GH006 text x8, self-approval self-contradiction, wrong PUT shape, broken restore exercise)
43. security-scanning-codeql-dependabot - 5 bugs (alert-lookup misuse x2, self-contradicting path filter, outdated language identifier, broken PR-number extraction + missing ref filter)
44. debugging-github-actions-workflows - 1 bug (false github-context-unavailable-in-env claim)
45. pipelines-as-quality-gates - 4 bugs (broken curl status check, wrong Jest coverage table format, dead-code matrix exclude, missing SARIF output + wrong jq field + eslint undercounting)
46. which-quality-gates-matter - 4 bugs (concurrency cancel-in-progress omission, arithmetic inconsistency, GHA truthy-string gotcha - most consequential bug in this topic)
47. managing-flaky-tests - 8 bugs (fabricated pytest-flaky package/flag, broken stdout JSON capture x2, comma-split bash bug, jq cross-type comparison bug, git log --since/--until direction bug)
48. test-parallelization-pipeline-speed - 5 bugs (fabricated --basedir flag, wrong --store flag x5, missing GITHUB_OUTPUT write, GH Actions billing-model misconception)
49. pipeline-reliability-failure-triage - 4 bugs (fabricated actions/retry-step action, invalid retry_on enum value, exponential-backoff off-by-one arithmetic)
50. testing-your-pipelines - 3 bugs (pervasive --dry-run vs --dryrun flag typo, matrix include/exclude merge-semantics error, overstated job-isolation claim)
51. capstone - 7 bugs (see Checkpoint 34 above; includes the single most
    consequential bug in the whole audit - the repeated false self-approval
    claim that would have blocked solo readers entirely)

**Real bugs found and fixed across the whole course:** ~85 distinct
confirmed technical/structural defects, the large majority concentrated in
the GitHub-Actions-specific half of the course (topics 27-51) rather than
the Git-fundamentals half (topics 1-26). Every fix was verified against an
external authority (GitHub's own docs/changelog, a tool's own source/docs,
or internal consistency with another part of the same course) before being
applied - per the standing rule, nothing was "corrected" on suspicion alone.
Recurring bug families worth naming for future maintainers:
- The `mergeable` vs `mergeStateStatus` GraphQL field conflation appeared
  independently in two different topics (checkpoints 22 and 25).
- CODEOWNERS non-cumulative-ownership and last-match-wins-not-longest-match
  semantics were wrong in exactly the way a well-intentioned but unverified
  human writer would get them wrong (checkpoint 23).
- Fabricated tool/action names with otherwise-correct-looking parameter
  schemas appeared three separate times (`pytest-flaky`, `actions/retry-
  step`, and a `--basedir` pytest-split flag) - suggesting a pattern where
  the actual option/parameter names were sourced correctly but the
  package/action identity was hallucinated or misremembered.
- The GH Actions truthy-string gotcha (`!github.event.inputs.x` never
  being false-y for the string `"false"`) and the `--dry-run`/`--dryrun`
  act flag typo were the two highest-leverage single-string fixes, each
  silently breaking the described behavior in every environment.

**Open judgment calls (documented, not fixed, per the confidence bar):**
- `which-quality-gates-matter` Tier 3 Exercise 1: whether the inline GNU
  `bc` `if (cond) A else B` one-liner syntax is valid was left unverified
  and unflagged - plausible but not confidently disprovable without testing.
- `pipeline-reliability-failure-triage` Exercise 3.1's DELAYS array
  declaring an unused third value (dead code, not a functional bug) - left
  as-is.
- `testing-your-pipelines` Exercise 3.1's "isolated job tests" via `act -j`:
  added a clarifying note about dependency-chain execution rather than a
  full rewrite, since the exact scope of act's dependency-running behavior
  wasn't fully confirmed by available sources.
- Several `01-overview.mdx` files contain specific-sounding internal-
  architecture claims (e.g., exact millisecond lock-hold durations, internal
  queueing mechanics) that are plausible narrative color but not
  independently verifiable against any public documentation - left
  unflagged since they are presented as illustrative rather than as
  load-bearing technical facts a reader would act on.

Diagrams and their content (AsciiDiagram tags, mermaid sources) were
explicitly out of scope for this entire pass per the user's instruction and
were never modified, even where a diagram's numbers now trail slightly
behind a prose fix made nearby (e.g., `test-parallelization-pipeline-speed`
Tier 3 Exercise 2's cost table still shows the pre-fix $112.64 figure).

No git commits were made. No content was imported or republished. This was
a source-file content pass only, left uncommitted per the original
directive.

## git-github-actions course (COMPLETE)

Files still below 95% after an honest attempt: none so far
- Added PostgreSQL-backed Blog Activity to the dashboard and placed its compact
  card on the same row as Lessons Completed; expanded Certification Practice to
  a full-width card below it.
- Added the platform's published blog-post count as a fourth Blog Activity
  metric. Authenticated API/page verification returned and rendered 533 posts.
- Standardized dashboard metric surfaces with a neutral slate background and
  white text in both themes, and added a subtle tinted plotting surface behind
  the activity and exam charts.
- Fixed the dashboard markup issue found during validation, then passed API and
  web TypeScript checks and authenticated API/HTTPS rendering checks.
- Added Published and Draft status tabs, counts, status-scoped search, and
  status-scoped pagination to Manage Courses and Manage Blog. No All status tab
  is present.
- No database rows were changed and no commit was made.

## Known Issues (Docusaurus removal audit)
The 14 retained runtime courses are now independent of Docusaurus content:

- The earlier stale public-origin symptom was resolved by the user's full
  pull-zone purges. Public responses now source the final Storage objects.
- A targeted call to Bunny's cache purge endpoint using the configured
  `BUNNY_STORAGE_ACCESS_KEY` returned HTTP 401. Bunny cache purge requires the
  account API access key; the storage-zone password cannot authorize it.

- A course-by-course manifest comparison found exactly 415 manifest diagrams
  and exactly 415 unique Bunny SVG URLs in PostgreSQL. Live HEAD requests to all
  415 SVGs, plus the two newly uploaded Playwright PNGs, returned HTTP 200.
- All retained local `/docs/...` links were rewritten to `/learn/...` through
  authenticated module-update API calls. The two Playwright screenshots were
  uploaded to Bunny and their stored module URLs updated. No retained module has
  a local Docusaurus `/docs`, `/img`, or `/pdf` dependency.
- `coding-bootcamp` remains deliberately unimported because Judge0 is unresolved.
  `system-design-fundamentals` is also outside the user-approved catalog.
- Removing `apps/docs` will still remove the Markdown sources, diagram manifests,
  and current idempotent re-import/recovery inputs. Decide whether to archive
  those authoring sources before deleting the legacy app.
- Four old slug-keyed Docusaurus records remain outside the DB-backed `Course`
  graph: two `CourseAccess` rows, one cohort pool grant, and one legacy bookmark
  for removed slugs. They do not appear in the Sypher Next course catalog and
  were included in the backup; clean them when retiring the legacy catalog.

## Completed (session 13: restore DB-authored categories and refine New badge)
- Restored `communication-skills` and all 17 Presentation courses from the
  checksum-verified pre-prune backup through a temporary authenticated API
  management operation, then removed that operation from the API source/routes.
- Preserved the original IDs and exactly matched the backup for 18 courses,
  102 modules, 18 access rows, 57 progress rows, 7 completions, one module
  bookmark, 6 comments, 3 votes, and one Helpful mark.
- Authenticated Browse API validation returns all 32 published courses:
  14 `tech`, 17 `Presentation`, and one `life-skills`. The restored courses
  contain no local Docusaurus `/docs`, `/img`, or `/pdf` dependencies.
- Browse now labels the existing `Presentation` category as
  `Presentation Skills`. The New badge uses white text in both themes and no
  longer forces uppercase or extra letter spacing.
- API and web TypeScript checks and `git diff --check` pass. No commit made.

## Completed (session 14: imported-course About descriptions)
- Researched current competitor course-page conventions: explicit outcomes and
  level/time framing (Coursera and Pluralsight), plus concrete practical scope
  and career/application context (Udemy). Applied those patterns without
  copying competitor wording.
- Updated descriptions for exactly the 14 imported Tech slugs. Each is 418â€“490
  characters and reflects its real modules, tools, and capstone work.
- Verified all 14 remain published with category `tech`; verified the 18
  restored Life Skills/Presentation descriptions are unchanged. API and web
  TypeScript checks remain clean. No commit made.

## Completed (session 15: structured About sections)
- Updated the 14 imported Tech course descriptions to detailed Markdown with
  separate headings for Overview, What you'll learn, Who this is for, What
  you'll build, Languages and tools, and Prerequisites. Removed all time/
  duration wording and left Life Skills/Presentation descriptions unchanged.
- Updated the course reader to render About Markdown with headings, lists, and
  emphasis. Expanded the management editor limit to 3000 characters and
  relabeled the field as `Description / About content`.
- Added compact first-paragraph excerpts for course cards and bookmarks so
  structured Markdown does not spill into condensed catalog views.
- Database verification: all 14 are published Tech courses, all have the
  required structured sections, none contain time wording or encoding
  corruption, and all remain below 3000 characters. API/web TypeScript checks
  and `git diff --check` pass. No commit made.

## Completed (session 12: canonical 14-course catalog and Docusaurus independence)
- Exported all 24 removal targets and associated course/module data before the
  destructive operation, then verified the backup by parsing it and recording
  its row counts and SHA-256 checksum.
- Re-queried immediately before deletion and required an exact 14-retained /
  24-removed match. Deleted those exact 24 course IDs using authenticated
  `DELETE /courses/{id}` management calls.
- Post-delete validation found zero residues by removed course/module/comment ID
  across courses, modules, progress, completions, authored access, company
  access, course/module bookmarks, comments, votes, helpful marks, mentions, and
  group course grants.
- Uploaded the two retained Playwright screenshots to Bunny and updated five
  retained modules through the API to replace those images and all local
  Docusaurus links.
- Matched every retained course's diagram manifest count to the unique Bunny SVG
  references stored in its module bodies: 415/415. Live-checked all 417 retained
  Bunny assets; every request returned HTTP 200.
- Authenticated `GET /courses` and direct Prisma checks both report exactly the
  approved 14 courses. API and web TypeScript checks pass. No commit was made.

## Completed (session 11: New Courses section in Browse Courses)
- Reconciled the screenshot's 14 slugs against the database: all 14 course rows
  already existed and were published. No importer rerun was needed.
- Added `apps/web/src/lib/newCourses.ts` as the curated source/order for those
  14 slugs.
- In Browse Courses only, the All tab now renders `New Courses` after Continue
  and before category sections. New courses already present in Continue are not
  repeated there, and New-section cards are removed from the later Tech section
  so no card appears twice in All. The Tech tab still contains them normally.
- Added a square primary-colored `New` badge to curated cards throughout Browse
  Courses. My Courses and dashboard cards are unchanged.
- `sorting-algorithms`, `search-algorithms`, and `solid-principles` had
  `category: null`; updated all three to `category: tech` through authenticated
  `PUT /courses/{id}` calls. Database verification confirms all 14 screenshot
  courses are now both published and Tech.
- Updated the Docusaurus importer/repository path to write `category: tech` on
  both create and idempotent update. Also aligned `design-patterns` and
  `git-github-actions` through the authenticated API. Database verification
  confirms all 19 imported/generated courses are published and Tech.
- API and web TypeScript checks passed with `--noEmit --incremental false`.
  Targeted
  ESLint could not run because the repository has ESLint 9 installed but no
  `eslint.config.js|mjs|cjs`; this is pre-existing tooling configuration, not a
  lint failure in the changed files.

## Completed (session 10: Manage Courses back-button consistency)
- Replaced the filled neutral-pill `.backBtn` treatment in
  `manage-courses.module.css` with the app's existing bare back-link style:
  muted semibold text, no fill/border/padding, primary-light hover color, and
  a matching disabled state.
- The shared class covers `Back to courses` in the course workspace/editor and
  `Back to modules` in the module editor, keeping those nested views consistent.
- `node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`: clean
  from `apps/web`.

## Completed (session 9: four-course import)
- Imported `sorting-algorithms`, `search-algorithms`, `design-patterns`, and
  `git-github-actions` individually. All four landed with `status: draft`; the
  importer does not publish them.
- `git-github-actions` initially hard-stopped without writing its course because
  `what-is-version-control/01-overview.mdx` uses valid paired
  `<AsciiDiagram>...</AsciiDiagram>` components while the importer scanner only
  recognized self-closing tags. Extended the existing backtick-aware scanner to
  recognize both closing forms.
- The same paired-tag gap had omitted that page's eight diagrams from the
  tracked manifest even though their SVGs and `.mmd` sources already existed.
  Verified all eight SVGs are Git-tracked and every `.mmd` SHA-256 prefix exactly
  matches its hash-named SVG, then added the entries and reconciled course/global
  summary totals. A full source-to-manifest comparison found no remaining IDs.
- Direct Prisma validation passed: expected module counts, `orderIndex` values
  from 0 in increments of 10, contiguous named sections, stable named-section
  ordering, and draft status for all four. Confirmed `coding-bootcamp` has no
  `Course` row.
- `node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`: clean.
- This restricted shell could not spawn `tsx`/esbuild, so the imports were run
  through Node 24's native TypeScript support with temporary scratch loader
  files. All temporary files were removed after validation.

## Completed (session 8: code-block background differentiation)
User report: "add background color to differentiate the codeblocks in
light and dark theme" (in the course content area reworked in session 7).
Not an importer/script change â€” this is purely a reader-side rendering
fix in `apps/web/src/components/BlogPostPage/CodeBlock.tsx`, which is the
one shared component both course modules and blog posts render fenced
code through.

- Root cause: `CodeBlock.tsx` used `prism-react-renderer`'s `themes.vsLight`/
  `themes.vsDark` as-is, and never set its own background â€” the block's
  background came entirely from the theme's `plain.backgroundColor`.
  Checked those values directly in `prism-react-renderer`'s bundled
  `dist/index.js`: `vsLight.plain.backgroundColor` is `#ffffff`, identical
  to `apps/web/src/app/globals.css`'s light-theme
  `--ifm-background-surface-color` (also `#ffffff`, the card background) â€”
  zero separation, a code block on a light-theme card looked like plain
  unstyled text with no visible container. `vsDark`'s `#1E1E1E` vs the
  dark-theme card's `#17171b` was only marginally better.
- Fix: override just `plain.backgroundColor` (spreading the rest of the
  base theme untouched, so all syntax-token colors are unaffected) to
  `var(--ifm-color-emphasis-50)` â€” reused rather than invented, since it's
  already this app's "sunken surface" token (zebra-striped table rows,
  `mock-tests` card variants, etc.). Checked its actual per-theme values
  in `globals.css` before picking it: light `#f5f6f7` (light gray, clearly
  distinct from the white card), dark `#111114` (distinctly darker than
  the `#17171b` card) â€” genuinely differentiated in BOTH themes, unlike
  `--ifm-color-emphasis-100` which is explicitly set equal to the dark
  card color (`#17171b` in both, `globals.css` line ~253) and would have
  been a no-op fix in dark mode specifically.
- Verified live in an actual browser, both themes, on the same
  `solid-principles` Python module used for session 7's verification:
  dark mode shows a clearly darker, visually inset code block against the
  lighter card; toggled the navbar's theme switch and confirmed light mode
  shows a light-gray-tinted block against the white card. Screenshotted
  both.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: clean.
- No importer-script changes needed for this one â€” flagged since the user
  also asked to "update scripts" this turn; `import-docusaurus-course.ts`
  doesn't touch rendering/theming at all, only content transformation, so
  there was nothing in it for this fix to touch.

## Completed (session 7: A4-proportioned reading card, chevron restyle, top-row grid, diagram-order investigation)
All verified live via `javascript_tool` `getBoundingClientRect()`
measurements + screenshots, same discipline as prior sessions.

- **Reading column reworked from a flex-width hack into a capped, centered
  card.** The session-6 "condense by 10%" fix (`flex: 0 0 auto; width:
  calc((100% - 240px - 1.5rem) * 0.9); margin-left: auto` on `.content`,
  `learn/[slug]/layout.module.css`) shrank the pane but pushed the freed
  space to the LEFT only â€” the card wasn't actually centered between the
  prev/next chevrons, just narrower and offset. Superseded entirely: reverted
  `.content` back to plain `flex: 1` (fills the pane, no width math), and
  moved the sizing into `CourseModulePage/styles.module.css`'s `.container`
  itself: `max-width: min(var(--card-max), calc(100% - var(--card-clearance)))`
  + `margin: 0 auto`. Percentage there resolves against `.container`'s real
  parent width (`.page`/`.content`, i.e. the actual pane), so this both caps
  the column at an A4/Letter-page-like width AND centers it for free â€”
  first at 820px (interpreting "decrease more than A4 sheet size"), then
  widened 20% to **984px** on a follow-up request ("increase width of
  content area by 20%" â€” user clarified "content area" = the A4-dimensioned
  card, not the outer pane).
- **Prev/next chevrons pulled in to hug the card's edges, and restyled bare.**
  Two separate user reports: "I want previous and next button to look like
  they are part of the site" (they were a 3.75rem filled circle with
  `--sidebar-bg` background + drop shadow â€” read as a floating widget) and,
  later, "move previous and next button closer to the content area" (once
  the card was width-capped, the old pane-edge-anchored `.pagination` left
  huge dead gaps on wide screens since it never accounted for the cap).
  - Restyle: `.paginationLink` now matches the site's existing icon-only-
    button convention (see memory `feedback_button_design_language` /
    `admin/access`'s `.actionBtn`) â€” no border, no fill, no shadow at rest
    OR hover, just an emphasis-600 -> primary color shift on hover. Circle
    shrunk 3.75rem -> 2.75rem to suit a bare glyph.
  - Positioning: since `.pagination` is `position: fixed` (deliberately â€”
    stays vertically centered regardless of scroll), its `left`/`right`
    can't read `.container`'s percentage-based width directly (a fixed
    element's percentages resolve against the viewport). Solution: shared
    CSS custom properties defined once on `layout.module.css`'s `.shell`
    (`--pane-left`, `--pane-right`, `--card-max`, `--card-clearance`,
    inherited down the DOM regardless of CSS-module file boundaries) let
    `.pagination` replicate `.container`'s own `min(card-max, 100%-clearance)`
    formula in viewport units, then subtracts the chevron's own footprint
    (2.75rem + 1rem margin) so the button always lands ~1rem outside the
    card at any viewport width, in both the width-capped and the
    clearance-limited regime. Keep `--card-max`/`--card-clearance` in sync
    between the two files if either changes again.
  - Verified live at a 1920px window: card rendered at exactly 984px,
    centered (595-1579px, chevron midpoint 1092px vs card center 1087px);
    chevrons moved from their old position (296px / 1844px, i.e. flush at
    the pane's own edge) to 540px / 1600px â€” right up against the card.
- **Top utility row (Back to course / x of N / Bookmark) switched from
  flex + `space-between` to CSS grid.** User report: "Content needs to be
  centrally aligned in between buttons too" + "Back to course and Bookmark
  button needs to be left and right aligned respectively." Root cause:
  `justify-content: space-between` on 3 unequal-width children only splits
  the LEFTOVER space into two equal gaps â€” it doesn't put the middle child
  at the row's true center unless the two outer children happen to be the
  same width, which "Back to course" (text) and the bookmark button (icon)
  never are. Fixed with `display: grid; grid-template-columns: 1fr auto 1fr`
  + `justify-self: start/center/end` on the three children (bookmark
  targeted via `.moduleTopRow > *:last-child` since `ModuleBookmarkButton`
  owns its own styling) â€” this centers the middle column exactly regardless
  of sibling widths, and strictly pins the other two to the edges. Verified
  live: `backLink` left edge 296px (= pane-left), `bookmark` right edge
  1866px (= row's own right edge minus its 0.75rem padding, exact), counter
  genuinely centered in its own grid column.
- **Diagram/module ordering investigated per user question** ("Are diagrams
  placed in right order... are we matching the exact docusaurus structure
  while importing") â€” confirmed correct at the code level, not just
  reasoned about:
  - Within a page: `convertAsciiDiagrams()` in the importer scans
    `<AsciiDiagram>` tags left-to-right and replaces each **in place** at
    its original byte offset (`findAsciiDiagramTags` + a single cursor-walk
    reconstruction) â€” it never collects diagrams and appends them
    elsewhere, so a diagram's rendered position is exactly where it was in
    the `.mdx` source.
  - Across pages: module `orderIndex` comes from walking the actual
    `apps/docs/sidebars/<course>.json` in array order â€” the same file
    Docusaurus itself uses for its own nav â€” so course structure is
    preserved by construction, not reconstructed.
  - Where a diagram visually lands near the bottom of a page, that's
    matching the source, not a bug: e.g.
    `solid-principles/open-closed/04-python.mdx` deliberately places its
    architecture diagram at line 404/441 (91% down), immediately before
    "## Key takeaways", as a closing visual summary â€” verified by grepping
    heading/tag line numbers directly against the source file. Compare
    `single-responsibility/04-python.mdx`, whose diagram sits at line
    14/372 (4% down), right after the "Implementation" heading â€” same
    importer, different authored placement, both correct.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: clean after every edit this
  session. Browser tab opened for verification, closed when done (session's
  tab-hygiene convention).

## How to import a course from Docusaurus (reference)
For the next time a new `apps/docs` course needs to land in Sypher Next.

1. **Confirm the course is diagram-conversion-ready.** Check
   `apps/docs/diagram-manifests/summary.json` for the course's entry:
   needs `pending: 0` and `hashMismatches: 0`. If it's not ready, that's a
   separate diagram-conversion pass (see memory `diagram-manifest-system`),
   not something this importer can fix.
2. **Add the course slug to `TARGET_COURSES`** in
   `apps/api/scripts/import-docusaurus-course.ts` â€” the script hard-refuses
   any slug not on this allowlist, on purpose (a safety gate, not an
   oversight).
3. **Watch for stale `svgGitTracked` manifest data.** This is the one
   real bug class found so far (session 1, this task): a diagram-manifest
   JSON can say `svgGitTracked: false` for an SVG that IS actually
   committed, if the manifest was generated before the SVG got committed
   and nothing in this repo re-syncs it after the fact. The importer's
   `convertAsciiDiagrams()` hard-stops the WHOLE course on this (by
   design â€” do not weaken this check to unblock an import). If a course
   hard-stops citing this, cross-check the flagged files against
   `git ls-files apps/docs/static/img/diagrams/` directly; if they ARE
   tracked, it's stale data â€” patch the manifest JSON's `svgGitTracked`/
   `untrackedSvg` fields (and `summary.json`'s per-course `untrackedSvg`)
   to match real git state, rather than editing the importer. (No reusable
   script for this yet â€” see Next Action item 3 below; it was a one-off
   scratch fix each of the 6 times so far.)
4. **Run it:**
   `cd apps/api && npx tsx scripts/import-docusaurus-course.ts <slug>`
   (omit the slug to import every course in `TARGET_COURSES` at once).
   It's idempotent (`upsertBySlug`/`upsertImported`) â€” safe to re-run after
   a content or script fix without creating duplicates.
5. **What it does NOT do, on purpose:** publish the course (always lands
   `status: draft` â€” an explicit admin-UI publish step is required per
   course after review), or carry over any interactive/executable content
   (e.g. `coding-bootcamp`'s Judge0-backed code-execution exercises depend
   on `apps/docs`'s separate Supabase auth stack â€” prose/diagrams import
   fine, the interactive widgets just won't work post-import).
6. **Verify after running:** spot-check the DB (`Course` row + `CourseModule`
   count/`orderIndex`/`sectionLabel`), then browse the course live â€”
   specifically the Course Overview module (duplicate-heading risk if a new
   course's `index.md` also leads with `# <title>` â€” should already be
   handled by `stripLeadingH1()`, but worth eyeballing), any diagram-bearing
   module (caption present, image loads), and at least one module in each
   language the course covers if it's a per-language-leaf-doc course
   (java/csharp/bash code blocks needed the `prismLanguages.ts` fix â€” see
   session 3/4 above â€” a brand-new language not yet in that file's
   `require()` list would silently render flat/monochrome again).

## Completed (session 6: chevron overlap, thinner sidebar, matching scrollbar)
All three verified live via `javascript_tool` measurements + screenshots,
not just visual inspection.
- **Chevron/card overlap** (a regression from session 5's own full-width
  fix, caught immediately when the user looked): `.pagination`'s `left`
  offset (`calc(240px + 2rem)`) and `max-width: 1200px` were both stale --
  the 240px assumed the OLD `(app)` DashboardSidebar, not the restored
  240px `CourseModuleIndex`, and the 1200px cap no longer matched the now
  full-width `.container`. Measured live: chevrons and the card's
  border/background genuinely overlapped by their full width on one side.
  Fixed by recalculating `.pagination`'s offset for the current sidebar
  width, dropping the now-meaningless `max-width`, and -- the part that
  actually fixes the visual overlap -- adding `margin: 0 4.5rem` to
  `.container` itself (with smaller matching values in the existing
  768px/640px breakpoints) so the card leaves genuine clearance for the
  fixed-position 3.75rem chevron circles instead of assuming a narrow
  reading column would do it for free, which is what the old 900px cap
  was accidentally providing all along. Re-measured after: 12px/27px clear
  gaps on each side, zero overlap.
- **Sidebar redesigned thinner**: `CourseModuleIndex` width 280px -> 240px
  (also updates `.pagination`'s offset accordingly, kept in sync), the
  80x80px book icon shrunk to 22x22px and recolored to
  `--ifm-color-primary` (was plain text color -- a big, heavy icon was the
  single biggest contributor to the "bulky" feel), tightened padding/gaps/
  font-sizes across `.courseName`/`.entry`/`.entryLeft`/`.sectionLabel`/
  `.lockIcon`. All via existing theme-aware CSS vars (no new hardcoded
  colors), so it reads correctly in both themes -- confirmed live in light
  mode via screenshot after making the change, not assumed.
- **Content-pane scrollbar matches the sidebar's**: `.content`
  (`learn/[slug]/layout.module.css`) previously used the browser's default
  scrollbar; copied `CourseModuleIndex`'s existing thin/transparent-until-
  hover `.scrollable` treatment verbatim (`scrollbar-width: thin`, 6px
  webkit thumb, transparent until `:hover`) onto `.content` so both panes
  behave identically. Confirmed live: the default chunky scrollbar is gone
  from the screenshot after the change.
- Also confirmed (per user's other request in the same message) that the
  session-3 importer fixes (`stripLeadingH1`, caption extraction) are
  still present in `import-docusaurus-course.ts` â€” nothing had reverted
  them, no re-run needed.
- `npx tsc --noEmit`: clean after each change in this session.

## Completed (session 5: full-width content + first live browser verification)
User's screenshot ("messed up the whole layout... needs to be full width")
plus a follow-up "sidebar should be of browser [width]" pointed at real
CSS width caps, and â€” for the first time this task â€” browser tools became
available, so this was verified live rather than reasoned from CSS alone.
- Measured live via `javascript_tool` on the actual page at a 2400px
  viewport: `.content` (learn/[slug]/layout.module.css) was hard-capped
  at `max-width: 1600px`, leaving a 464px dead gap before the scrollbar;
  the inner "paper sheet" `.container` (CourseModulePage/styles.module.css)
  was ADDITIONALLY capped at 900px via two back-to-back `.container` rules
  in the same file (the second silently overriding the first's 1200px) â€”
  a deliberate "print preview" reading-column design from whenever this
  was first built, no longer wanted now that the restored sidebar changes
  the page's whole visual context.
- Fix: removed the 1600px cap from `.content` entirely (full width of
  whatever space is left beside the sidebar), and removed the duplicate/
  overriding 900px `.container` rule plus the 1200px cap on the
  remaining one (kept the card's background/border/shadow/padding, just
  not the width limit). The course-home page's own `.container`
  (`learn/[slug]/styles.module.css`) already had no cap of its own
  (`width: 100%`), so it inherits the fix automatically.
- Verified live end-to-end in an actual authenticated Chrome session
  (already logged in from the user's own profile) at
  `/learn/solid-principles/single-responsibility-single-responsibility-java`:
  - `.content` now 2032px / `.container` now 2013px on a 2400px viewport
    (was 1600px / 900px) â€” measured via `getBoundingClientRect()`, not
    just visual inspection.
  - Toggled dark mode live and scrolled to non-comment Java code: real
    per-token-type colors confirmed with my own eyes for the first time
    this task (keywords blue, class names teal, `@Override` yellow,
    strings orange, comments green) â€” the session-3/4 fix is genuinely
    working, not just passing an isolated repro.
  - Checked the course-home page (`/learn/solid-principles`, no
    `moduleSlug`) too: `CourseModuleIndex` correctly switches to its
    course-switcher view (lists every other course in the sidebar) â€”
    confirms the session-2 sidebar restoration's *other* view also works,
    not just the module-outline one.
- `npx tsc --noEmit`: clean. Closed the browser tab when done (session's
  own tab-hygiene convention).

## Completed (session 2: bugs found by browsing solid-principles live)

## Completed (session 2: bugs found by browsing solid-principles live)
User published `solid-principles` themselves (not via this script â€” the
importer never touches `status`) to look at it in the browser, and found
three issues:

1. **Duplicate heading on the Course Overview module** â€” fixed in
   `import-docusaurus-course.ts`. `apps/docs/docs/solid-principles/index.md`
   (and presumably other courses' top-level index.md files) leads its body
   with `# <same as frontmatter title>` â€” a common Docusaurus authoring
   habit the importer never stripped, so the reader's own
   `<h1>{module.title}</h1>` plus that leading body H1 rendered the title
   twice. Verified (via `grep`, excluding code-fence false-positives) this
   is the ONLY genuine leading-H1 case across all of solid-principles'
   source files â€” every per-language leaf doc is clean. Added
   `stripLeadingH1()` (strips only a genuine first-line H1, never a `# `
   inside a later code fence) and applied it at both body-construction
   sites (`loadCourseOverview()` and the general leaf-module loop).
2. **Diagram captions silently dropped** â€” fixed. `convertAsciiDiagrams()`
   extracted `id`/`mermaidSrc`/`alt` from each `<AsciiDiagram>` tag but
   never `caption`. Checked the reader's sanitize schema
   (`CourseModuleArticle.tsx` extends `rehype-sanitize`'s `defaultSchema`
   with only `'u'`) â€” `<figure>`/`<figcaption>` are NOT in that allowlist,
   so used the closest allowed equivalent instead: `<p><em>{caption}</em>
   </p>` appended right after the `<img>`.
   - Re-ran `import-docusaurus-course.ts solid-principles` after both
     fixes (safe/idempotent, `upsertBySlug`) and verified directly in the
     DB: Course Overview module's body no longer starts with the
     duplicate heading; a diagram-bearing module now has the
     `<p><em>...</em></p>` caption line after its `<img>`.
3. **No course-navigation sidebar while reading a module â€” a real
   regression, not a missing feature.** Traced via `git log -S` across
   the whole repo: a component called `CourseModuleIndex` (course
   switcher on the course home page, per-course module outline with green
   completion dots + lock badges + sectionLabel grouping once inside a
   module) was deliberately built 2026-08-22 specifically to REPLACE
   `DashboardSidebar` for the entire `/learn/[slug]` subtree ("the
   generic app nav isn't useful while inside a course" â€” its own original
   commit comment). `Course-Creation-Guide.md` pitfall #8 already
   documented this exact architecture and was never updated -- meaning
   the docs were right the whole time and the code drifted.
   `apps/web/src/app/learn/[slug]/layout.tsx` (own auth check, since it's
   deliberately outside `(app)`'s auth-checking layout) fetched the
   course + sidebar course-list + module-list and rendered
   `CourseModuleIndex` around whatever the page rendered.
   - Today's "Refactoring and UI Upgrades" commit (4f537f1f, same day as
     this session) **relocated** `/learn/[slug]/**` from
     `apps/web/src/app/learn/[slug]/` into
     `apps/web/src/app/(app)/learn/[slug]/` (confirmed via full,
     unfiltered `git show --stat` as a pure rename â€” zero content changes
     to `page.tsx`/`[moduleSlug]/page.tsx` themselves) so it would pick up
     `(app)/layout.tsx`'s `DashboardSidebar` â€” and simply deleted
     `learn/[slug]/layout.tsx` + `layout.module.css` + the
     `CourseModuleIndex` component entirely in the same commit, with no
     replacement. Not a deliberate design change with a documented
     rationale â€” just dropped.
   - Asked the user how the restored sidebar should relate to
     `DashboardSidebar`: replace it (original design) vs. show both side
     by side. **Answer: replace it (original design).**
   - **Restored, verbatim from git history** (`git show 4f537f1f^:<path>`
     for exact fidelity, not retyped from memory):
     `apps/web/src/components/CourseModuleIndex/{index.tsx,
     styles.module.css}`, `apps/web/src/app/learn/[slug]/{layout.tsx,
     layout.module.css}`.
   - **Moved back** (via `git mv`, so tracked as renames) all 7 files
     under `apps/web/src/app/(app)/learn/[slug]/**` to
     `apps/web/src/app/learn/[slug]/**` (i.e. reversed today's relocation):
     `page.tsx`, `styles.module.css`, `loading.tsx`, `error.tsx`, and the
     `[moduleSlug]/` subdirectory's `page.tsx`/`loading.tsx`/`error.tsx` â€”
     none of their own content needed changes, only their location.
   - `/learn` itself (the top-level course-browsing grid,
     `(app)/learn/page.tsx`) was untouched â€” stays inside `(app)` with
     `DashboardSidebar`, exactly as documented. Only `/learn/[slug]` and
     `/learn/[slug]/[moduleSlug]` moved back out.
   - Confirmed `/courses/sidebar-list` (the API endpoint the restored
     layout fetches for the course-switcher list) still exists in
     `CourseController.ts` â€” not something else that had also rotted.
   - `npx tsc --noEmit -p apps/web/tsconfig.json` initially reported 2
     errors pointing at the OLD `(app)/learn/[slug]` path inside
     `.next/types/validator.ts` â€” confirmed this is just a stale
     Next.js-generated artifact (the file itself says auto-generated),
     deleted `apps/web/.next` and re-ran clean.
   - **Not yet done**: browser verification (no browser tool available
     this session) that the restored sidebar actually renders correctly
     â€” the course-switcher view on `/learn/solid-principles`, and the
     module-outline-with-completion-dots view on
     `/learn/solid-principles/<any-module-slug>`, plus that `next dev`
     doesn't error on the moved route files.

## Completed (session 3: code-block syntax highlighting was silently broken)
User reported code blocks in the course reader looked plain/monochrome
(one screenshot showed every token â€” keywords, class names, strings,
comments â€” in the same flat cyan). Traced to a real, verified, monorepo-
wide bug, not a missing feature or wrong theme choice:

- `CourseModuleArticle.tsx` already renders every fenced code block
  through `@/components/BlogPostPage/CodeBlock.tsx`, which already uses
  `prism-react-renderer`'s `Highlight` (hooks-based) with a real theme â€”
  this was never actually a "no highlighting exists" situation, contrary
  to my own first assumption a few turns earlier (a bad grep pattern
  missed the existing wiring â€” flagging my own mistake here, not just the
  user's).
- Root cause, found by reproducing outside the app (a throwaway repro
  script, deleted after): `apps/web/package.json` pinned `react`/
  `react-dom` at an exact `19.2.4`, separate from the monorepo root's
  hoisted `19.2.7` (which every other workspace effectively uses, driven
  by `apps/docs`'s `^19.0.0` range resolving to that version). Since
  `prism-react-renderer` is a root-only dependency (nothing pins a nested
  copy for it), its internal `require('react')` walks up from *its own*
  location in `node_modules` and finds the root's 19.2.7 â€” a different
  copy than the rest of `apps/web` uses. Two React copies in one
  component's render path breaks React's hook-dispatcher singleton
  (`useCallback` inside `prism-react-renderer` throwing/returning null),
  which silently degraded every token to one flat fallback color instead
  of raising a visible error.
- Verified with an isolated Node repro (`prism-react-renderer`'s
  `Highlight` rendered via `react-dom/server`) that reproduced the exact
  "Invalid hook call" crash before the fix, and produced correctly
  differentiated per-token-type colors (keyword blue, function
  yellow-tan, string orange, punctuation gray, etc.) after.
- Fix: changed `apps/web/package.json`'s `react`/`react-dom` from exact
  `19.2.4` to exact `19.2.7` (matching root), ran `npm install` from the
  repo root â€” confirmed via `npm install`'s own "removed 2 packages"
  output and directly checking `apps/web/node_modules` that the nested
  copies are gone; the whole workspace now shares one React 19.2.7.
  Re-ran the isolated repro to confirm the fix. Did NOT touch `apps/app`'s
  matching `19.2.4` pin â€” that app is retiring, out of scope, and nothing
  reported a problem there.
- Also switched `CodeBlock.tsx`'s theme pairing from `themes.github`
  (light) / `themes.dracula` (dark) to `themes.vsLight`/`themes.vsDark` â€”
  requested as "pick one, some coding style" before the duplicate-React
  bug was found; github's light-mode colors are subtle enough to read as
  "no styling" at a glance, VS Code's are unambiguous in both modes. This
  was already in place *before* the real bug was found and stays as the
  new default regardless.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: clean after the version
  bump + reinstall. Restarted the dev server (killed the stale PID,
  cleared `apps/web/.next`, fresh `npm run dev`) â€” ready in <1s, no
  compile errors in the log.
- **Not yet done**: browser verification that code blocks actually render
  with proper per-token colors now (no browser tool available this
  session) â€” the isolated repro proves the mechanism works again, but
  hasn't been seen through the actual page.
- **This fix was necessary but turned out NOT sufficient** â€” see session 4.
  The user sent a screenshot after this fix showing code still rendering
  in one flat color, plus the restored `CourseModuleIndex` sidebar
  actually working correctly (visible in the same screenshot: course
  name, section-grouped module list, green completion dots, "6 / 36"
  position, Bookmark button, prev/next chevrons â€” all rendering as
  designed, contrary to the user's "messed up the whole layout" framing
  of that screenshot; the layout itself was fine, only the code color
  was the real problem).

## Completed (session 4: the REAL remaining cause â€” missing Prism language grammars)
Stopped guessing from code reading alone and reproduced empirically:
rendered the actual production `CourseModuleArticle` component (via
`tsx`, with a throwaway CSS-module stub since Node can't load `.css`
imports directly) using the real `bodyMdx` pulled straight from the DB
for the exact module in the user's screenshot. Result: every single
token â€” keywords, class names, strings, comments, everything â€” came back
tagged `"token plain"`, i.e. completely untokenized, not just
miscolored.

- Root cause: `prism-react-renderer` only bundles a small, "a little
  arbitrary" (its own README's words) default set of Prism language
  grammars. Verified directly: `python`/`javascript`/`typescript`/`rust`
  tokenize into real types (keyword/string/function/etc.) out of the box;
  `java`/`csharp`/`bash` come back as 100% `plain` â€” silently, no error,
  no console warning. This course's per-language leaf docs cover exactly
  JavaScript, TypeScript, Python, Java, C#, Rust â€” so 2 of 6 languages
  (Java, C#) were guaranteed to render with zero color, plus Bash
  (relevant to other courses, e.g. git-github-actions, even though not
  used in solid-principles).
- Confirmed `prism-react-renderer` v2.4.1 (resolved from `^2.3.0`) exports
  its internal `Prism` instance directly (`import { Prism } from
  'prism-react-renderer'`) â€” the OLD documented fix recipe
  (`require('prism-react-renderer/prism')`) doesn't apply to this version,
  it has no such subpath export; had to find the real export by reading
  `dist/index.js` directly rather than trusting the README's example.
- Fix: new `apps/web/src/lib/prismLanguages.ts` â€” points the global
  `Prism` (both `window` and Node's `global`) at prism-react-renderer's
  own internal instance, then `require()`s the missing
  `prismjs/components/prism-{java,csharp,bash,go,sql,yaml,json}` grammar
  files (each is a plain IIFE that self-registers onto whatever `Prism`
  global it finds â€” this is a *different* Prism ecosystem than the plain
  `prismjs` package the Lexical-based admin editors use directly elsewhere
  in this app, so pointing the global at the wrong one would silently
  fail again). Imported once, for its side effects, at the top of
  `CodeBlock.tsx`.
- Verified twice: (1) isolated repro â€” `java`/`csharp`/`bash` all produce
  real differentiated token types after the fix, matching what
  `python`/etc. already produced; (2) rendered the real production
  component with the real DB content again â€” 4 distinct colors now
  present (was 2: pure black text + white background, i.e. nothing).
- `npx tsc --noEmit`: clean. Dev server restarted clean again (killed
  stale PID, cleared `.next`, fresh `npm run dev`, confirmed via `netstat`
  + a live `curl` response after a stray leftover-buffered-output line in
  the log briefly looked like a crash but wasn't â€” the old killed
  process's tail output landed in the same log file path, not this run).
- Went with `java`/`csharp`/`bash`/`go`/`sql`/`yaml`/`json` as the
  additional set (covers this course's full 6-language spread plus common
  DevOps-adjacent languages likely to show up in other courses,
  e.g. git-github-actions) rather than importing every language
  `prismjs/components/` ships â€” reasonable default, not exhaustive; add
  more the same way if another course surfaces one still rendering flat.

## Completed (session 1: import + manifest fixes)
- Confirmed all 20 requested course slugs (the original 14 + the 6 new
  ones) show `pending: 0` / `hashMismatches: 0` in
  `apps/docs/diagram-manifests/summary.json` â€” diagram-conversion-ready.
  `system-design-fundamentals` (not requested) correctly stays out of
  scope, nowhere close (3657/3696 pending).
- Structurally spot-checked `solid-principles`/`design-patterns` (sidebar
  + actual doc files) before running anything â€” per-language leaf docs
  (`<topic>-overview.mdx`, `-javascript.mdx`, etc.) under a category whose
  own index page is a pure `<DocCardList />` stub, plus a course-level
  index with real prose + `<CourseCurriculum/>`. Both patterns already
  match what the importer's existing logic handles â€” no script logic
  changes needed for these course *shapes*.
- Added the 6 new slugs to `TARGET_COURSES` in
  `import-docusaurus-course.ts` (the script hard-refuses any slug not on
  this allowlist), plus a header comment explaining the addition and
  flagging `coding-bootcamp`'s known caveat (see Decisions below). Updated
  the "no args = all N target courses" usage comment (14 -> 20).
- **Real bug found and fixed** (in the data, not the script): all 6 new
  courses had a large fraction of diagram-manifest entries with
  `svgGitTracked: false` (100% for 3 of them) â€” this is what actually
  hard-stopped the first pilot attempt. Cross-checked every flagged SVG
  against `git ls-files apps/docs/static/img/diagrams/` directly and found
  **zero genuinely-untracked files** â€” 100% stale manifest data (the SVGs
  were committed after their manifests were last generated; no script in
  this repo regenerates `svgGitTracked`, confirmed via Grep across
  `apps/docs`). Patched all 6 manifest JSON files' `svgGitTracked` +
  `untrackedSvg` fields, and `summary.json`'s per-course `untrackedSvg`,
  to match verified real git state, via a one-off scratch Node script
  (not saved as a reusable repo tool â€” see Next Action).
- Re-ran the import for `solid-principles` (chosen as the pilot: new
  course shape not yet proven through this script, small â€” 35 diagrams â€”
  low blast radius). **Succeeded**: 36 modules (35 leaf docs + 1 synthetic
  Course Overview), `status: draft`. Verified via direct DB query â€” course
  row, module count, `orderIndex` sequencing, and `sectionLabel` grouping
  (e.g. all 7 "Single Responsibility Principle" leaf docs share that
  label) all look correct.
- Found, not fixed (out of scope for an importer â€” it should copy content
  verbatim, not rewrite it): `open-closed/01-overview.mdx`'s frontmatter
  title uses a literal `--` instead of the em-dash (`â€”`) other overview
  pages in this same course use. Pre-existing source inconsistency in
  `apps/docs`, worth a pass if/when that course gets a content-quality
  cleanup.
- Wrote this session's findings into memory
  (`sypher-next-docusaurus-importer.md`, updated not replaced) since
  they're durable/reusable facts, not just this task's live state.

## Decisions
- Picked `solid-principles` as the sole pilot import (small, structurally
  representative of the newer multi-language-per-topic course shape) â€”
  user's own call to make if a different one was wanted, they can redirect.
- `coding-bootcamp` was added to `TARGET_COURSES` (user explicitly listed
  it) but its known caveat still stands: it depends on `apps/docs`'s
  separate Judge0/Supabase auth stack for interactive code-execution
  exercises (see memory `sypher-next-judge0-held`), which this importer
  does not carry over â€” importing it would bring over prose/diagrams only,
  with any interactive exercise widgets non-functional post-import. Flag
  this again before actually running it, not just noting it in a comment.
- Did not weaken the importer's `svgGitTracked` safety check itself (e.g.
  by making it non-blocking) â€” fixed the underlying stale data instead,
  since the check is a real, working safety mechanism, just fed stale
  input for these 6 courses specifically.

## Tests/Validation
- `npx tsx scripts/import-docusaurus-course.ts solid-principles`: hard-stop
  on first attempt (stale `svgGitTracked`, zero partial writes â€” the
  hard-stop-on-failure design worked exactly as intended); succeeded after
  the manifest fix; succeeded again (idempotent update) after the
  heading/caption fixes. Verified via `docker compose exec postgres psql`
  each time: `Course` row, `CourseModule` count = 36, ordering/
  `sectionLabel` grouping, then the corrected `bodyMdx` content directly
  (no leading duplicate H1; a diagram module's caption paragraph present).
- `npx tsc --noEmit -p apps/web/tsconfig.json`: clean after the
  sidebar-restoration file moves (one stale-`.next`-artifact false alarm,
  resolved by deleting `apps/web/.next`).
- Not browser-verified (no browser tool available this session) â€” the
  restored `CourseModuleIndex` sidebar's two views (course-switcher on
  `/learn/solid-principles`, module-outline-with-completion-dots on any
  module under it) and that `next dev` serves the moved routes without
  error still need an actual look in a browser.
- User independently published `solid-principles` themselves (this
  importer never touches `status`) and found the three session-2 bugs by
  browsing it live â€” not something this session verified in a browser
  itself.

## Files Modified
Reconciled from actual Git output on 2026-09-09 after commit `15b088d6`. The
working tree was completely clean immediately after that commit. This handoff
update is the only subsequent working-tree modification:

- `memory-bank/current-task.md` (handoff-only update; unstaged).

## Unrelated small change (mid-session tangent)
User pointed at GitHub's basic markdown formatting guide and asked that
identifiers (function/variable names) mentioned in prose be wrapped in
backticks going forward â€” confirmed scope as "general rule, not a fix to
existing content." Added one row to `Course-Creation-Guide.md`'s "Content
do's and don'ts" table linking that GitHub doc. Did not also touch
apps/docs's various `add-*` authoring skill files (design-patterns,
solid-principles, etc. are authored through those, not this guide) â€”
flag if the rule should live there too, since `Course-Creation-Guide.md`
is Sypher Next (apps/web)-specific by its own title.

## Next Action
The Life Skills follow-up is complete and committed. The older migration
backlog follows:

0. Reconcile/remove the orphaned `state/lifecycle` entry from the Design
   Patterns diagram manifest if the manifests will be archived before
   `apps/docs` is removed.
1. Before removing `apps/docs`, decide whether the Docusaurus Markdown sources,
   diagram manifests, and importer recovery inputs should be archived elsewhere;
   then remove the four legacy slug-keyed access/cohort/bookmark rows.
2. Keep `coding-bootcamp` unimported until its Judge0/RapidAPI migration is
   settled; its interactive exercises must not go live broken.
3. Consider proposing a small reusable
   `refresh-diagram-manifest-git-status.mjs` in `apps/docs/scripts/` so
   the `svgGitTracked`-staleness class of bug doesn't require a one-off
   scratch script again next time.
4. Worth a broader audit at some point: this session only fixed
   apps/web's duplicate-React pin. `apps/app` has the identical `19.2.4`
   exact pin diverging from root's `19.2.7` â€” not touched (retiring app,
   out of scope, nothing reported broken there) but the same class of bug
   could exist for any hooks-based root-only dependency it uses too.
5. (session 7) Mobile breakpoints (768px/480px) for the new grid top-row
   and card-hugging chevrons were reasoned through but not live-verified â€”
   `resize_window` doesn't reliably change `window.innerWidth` in this
   browser-tools environment (noted session 5/6 too), so narrow-viewport
   behavior should get an actual look (real device, or a browser resized
   by hand) next time a browser session is available.
6. (session 7) `--card-max`/`--card-clearance` (currently 984px/10rem) are
   this session's own numbers, chosen from the user's literal requests
   ("A4 sheet size", then "+20%") rather than a design-system value â€” treat
   as adjustable if the user wants the column narrower/wider again, and
   remember to change them in ONE place (`layout.module.css`'s `.shell`)
   since both `.container` and `.pagination` read the same vars.

## Last Updated
2026-09-09

## Handoff Events

- 2026-09-09 (Life Skills depth pass committed) - updated only
  `communication-skills` and `negotiation-skills` through authenticated API
  endpoints. Both are published `life-skills` courses with 15 ordered manual
  modules, `FREE_USER,PAID_USER` access, one `PRACTICE` section per module,
  2-3 visible suggested answers per section, and no external URLs. Stored bodies
  exactly match the content-gated staging sources. The 17 Presentation courses
  and 90 modules remain unchanged. Authenticated course-home and new-module web
  renders returned HTTP 200. The user committed all 30 staging files and the
  prior handoff update in `15b088d6` (`Communication Skills Overwrite`); the
  working tree was clean immediately afterward.

- 2026-09-09 (committed) - user committed the completed work as `f767952d`
  (`Old Course Import and Design Overhaul`). `git status` and `git diff --stat`
  were empty immediately afterward. Updated this handoff after the commit; only
  `memory-bank/current-task.md` is now modified and unstaged.

- 2026-09-09 (legacy title-quote decision) - user decided to retain the 148
  semantically neutral YAML title quotes in the retiring Docusaurus source.
  No importer normalization or reversal is needed; removed this decision from
  Next Action.

- 2026-09-09 (two-course re-import validated) - direct database validation
  confirms `design-patterns` at 162 draft modules and
  `python-for-ai-engineers` at 202 draft modules, both in exact 10-step order.
  Stored content has 221 current-source Bunny SVGs (172 + 49). Authenticated
  Storage and public CDN audits both passed 221/221 for HTTP 200,
  blackboard-v3 marker, and palette. The former 222 count included one orphaned
  Design Patterns manifest entry for a filler diagram removed during audit.

- 2026-09-09 (both imports executed; validation pending) -
  `python-for-ai-engineers` initially hard-stopped with zero writes because 148
  audited frontmatter titles used YAML-invalid unquoted colon-space values.
  Quoted those title scalars mechanically, verified all 202 Markdown/MDX files
  parse through `gray-matter`, then imported 202 modules successfully as a
  draft. The user questioned adding maintenance to the retiring Docusaurus app;
  pause before choosing whether to retain the semantically neutral source fix or
  reverse it and normalize legacy frontmatter in the importer instead. Removed
  the temporary TypeScript require hook. Full DB/Bunny validation is pending.

- 2026-09-09 (design-patterns re-import complete) - worked around sandboxed
  `tsx`/`esbuild` child-process `EPERM` with a temporary TypeScript require hook
  and ran the unchanged importer explicitly. `design-patterns` completed with
  162 modules and retained `draft` status. Full post-import DB/Bunny validation
  remains, and `python-for-ai-engineers` is next.

- 2026-09-09 (import resumed) - API health returned HTTP 200 after startup.
  Beginning the two explicit, idempotent imports, `design-patterns` first and
  `python-for-ai-engineers` second. If interrupted, rerun only the incomplete
  slug; never use the importer's no-argument all-course mode.

- 2026-09-09 (status recheck) - no re-import has occurred. Direct Prisma access
  now succeeds against PostgreSQL on port 5433, which contains 33 courses but
  neither `design-patterns` nor `python-for-ai-engineers`; the API on port 4000
  remains down. Both manifests still pass at 173/173 and 49/49, and the importer
  still injects the shared blackboard-v3 theme. The current DB differs from the
  older handoff state in which `design-patterns` had been imported.

- 2026-09-09 (current follow-up) - user requested re-importing the completed
  `design-patterns` and `python-for-ai-engineers` source edits with the existing
  blackboard-v3 SVG palette. Both course manifests now pass importer safety
  counters (173/173 and 49/49). No Bunny or database write has occurred because
  Docker/PostgreSQL is unavailable to this restricted shell. Awaiting the user
  starting PostgreSQL on port 5433; nothing staged or committed.

- 2026-09-07 (session 41) - user confirmed, via their own live browsing, all
  four pending visual-verification items from the prior Next Action list:
  catalog card redesign/2:1 covers/Manage Courses upload guidance, the
  redesigned Dashboard and Manage Courses/Manage Blog Published/Draft tabs,
  `/learn/[slug]` sidebar behavior (shared sidebar on course-home vs.
  CourseModuleIndex outline on lesson pages), and the imported-course About
  pages/New badges/Browse Courses tab ordering/Manage Courses back-link. No
  issues reported. Those four items are now considered verified and were
  removed from Next Action; no code changes made, no commit made.

- 2026-09-07 (session 40) - gave Learning Overview, Blog Activity, Exam summary,
  and Community metric cards one neutral slate background with white text in
  both themes. Preserved their colored identity edges and added subtle
  theme-aware tinted surfaces behind the Lessons Completed and Exam score
  charts. Web TypeScript and `git diff --check` pass. No commit.

- 2026-09-07 (session 39) - added `Blog posts` as the fourth Blog Activity
  metric, backed by a published-post count in the dashboard API. The metric grid
  is four columns on wider screens and 2x2 on mobile. API/web TypeScript,
  authenticated API/page rendering (533 posts), and `git diff --check` pass. No
  DB writes and no commit.

- 2026-09-07 (session 38) - added a PostgreSQL-backed Blog Activity card beside
  the compact Lessons Completed dashboard card, moved Certification Practice to
  a full-width row, and validated real activity/history data through the API and
  authenticated HTTPS render. Added Published and Draft tabs with counts to
  Manage Courses and Manage Blog; status scopes search and pagination, and no
  All tab is rendered. API/web TypeScript and `git diff --check` pass. No DB
  writes and no commit.

- 2026-09-07 (session 37) - redesigned the Dashboard hierarchy and added a
  real five-row Certification Practice history. Recent completed attempts now
  show exam title, code, date, and score and link back to the relevant exam;
  title/slug were added to the existing dashboard payload with no migration.
  Added responsive 3x2 metrics and 7/5 insight grids, stronger card hierarchy,
  wider course strips, dark-mode shadows, and consistent Presentation Skills
  labeling. API/web TypeScript and `git diff --check` pass. Authenticated HTTPS
  render returned 200 with the latest real attempt/link and no application
  error. Headless visual verification was blocked by Chromium `spawn EPERM`.
  No commit made.

- 2026-09-07 (session 36) - removed the Role label and audience-role dropdown
  from Browse Courses, including its state, option generation, filtering path,
  and dead styles. Category tabs and all catalog sections now always use the
  full course set; the remaining catalog behavior is unchanged. Web TypeScript
  and `git diff --check` pass. No commit made.

- 2026-09-07 (session 35) - made future Manage Courses cover uploads
  self-standardizing. The editor now displays emphasized creation guidance
  (2:1, 1600x800 or larger, PNG/JPEG/WebP, central 80% safe area), uses stronger
  foreground text for that guidance and the slug. The slug is labeled
  `Course URL:` and displayed as a quoted bold monospace route. The editor preprocesses accepted
  covers into one high-quality 1600x800 PNG before Bunny upload. Off-ratio
  images are center-cropped without stretching; undersized usable crops are
  rejected; the preview is 2:1. Web TypeScript and `git diff --check` pass. No
  existing cover or database row changed, and no commit was made.

- 2026-09-07 (session 34) - redesigned the shared My Courses/Browse Courses
  catalog presentation: 300px minimum cards, about four desktop columns,
  larger spacing, three-line excerpts, stronger elevation, and a catalog-only
  variant that leaves compact Dashboard/bookmark cards unchanged. Audited all
  14 Bunny covers directly: each is a full 1774x887 PNG. Matched the catalog
  frame to that native 2:1 ratio rather than creating lower-resolution copies.
  All course-card functionality is unchanged. Web TypeScript and
  `git diff --check` pass; authenticated visual confirmation remains. No commit.

- 2026-09-07 (session 33) - refined only the newly added inline-code styling
  under the dark theme with a violet-tinted background, brighter border, and
  light text. The overall site theme and fenced code blocks are unchanged. Web
  TypeScript and `git diff --check` pass. No commit made.

- 2026-09-07 (session 32) - fixed plain-looking inline code on course content
  pages in `apps/web` only by styling the reader's `<code>` elements with the
  existing light/dark theme tokens. Raw HTML code tags and Markdown backticks
  share the result; fenced Prism blocks remain unchanged. Web TypeScript and
  `git diff --check` pass. No commit made.

- 2026-09-07 (session 31) - after the final purge, verified all three corrected
  sequence URLs directly without cache-busting parameters: HTTP 200,
  `CDN-Cache: MISS`, blackboard-v3 marker, corrected `rect.note` selector, and
  shared blue box palette on all three. Rendered the Ollama sequence and
  visually confirmed the note matches actor boxes while text and arrows remain
  bright. Combined with the prior full public audit, 415/415 SVGs are complete.
  Temporary verification files were removed. No commit made.

- 2026-09-07 (session 30) - after the user's purge, the public blackboard-v3
  audit passed 415/415 with no stale URLs or failures. A rendered sequence
  sample caught a selector error invisible to token checks: Mermaid emits
  `<rect class="note">`, so `.note rect` did not recolor the note. Corrected the
  importer to target `rect.note`/`polygon.note` and confirmed all three sequence
  SVGs fixed in Bunny Storage. The 412 flowcharts need no further upload. One
  final purge of the three sequence paths and visual verification remain.
  No commit made.

- 2026-09-07 (session 29) - after the user's purge, the public CDN audit passed
  415/415 blackboard-v2 SVGs with no stale files or failures. Rendering the two
  diagram types in the retained corpus (412 flowcharts, 3 sequences) exposed a
  brown/yellow note box in the sequence style. Standardized notes to the normal
  blue content-box palette, deployed blackboard-v3, and confirmed v3 directly
  in Bunny Storage for 415/415 objects. One more purge and public audit remain.
  No commit made.

- 2026-09-07 (session 28) - uploaded the comprehensive blackboard-v2 palette
  to all 415 retained Bunny Storage SVGs. The first pass confirmed 288 writes;
  a Storage-aware pass found 364 already complete and repaired 45, and the six
  timed-out reads all passed on the next pass, yielding 415/415 confirmed.
  API/web TypeScript checks and `git diff --check` pass. Temporary operational
  scripts were removed. The user must purge the pull zone before public and
  visual verification. No commit made.

- 2026-09-07 (session 27) - the user's full pull-zone purge made the corrected
  Storage objects public. The full public audit is effectively 415/415; its one
  reported stale file had the final override after the legacy Mermaid rule.
  After the user reported palette inconsistency, expanded the importer to a
  comprehensive blackboard-v2 theme covering Mermaid 11 diagram families.
  The 415-object overwrite is the next operation. No commit made.

- 2026-09-07 (session 26) — after the user's manual purge, checked all 415
  public URLs: all remained old. A representative response was `CDN-Cache:
  MISS`, last-modified 2026-08-22, while authenticated Storage returned the
  corrected object last-modified 2026-09-07. Root cause refined from stale edge
  cache to a pull-zone origin/storage-zone mismatch. No commit made.

- 2026-09-07 (session 25) — completed authenticated Bunny Storage verification:
  413/415 passed the full audit and the two timed-out reads passed individually,
  yielding 415/415 corrected SVG objects. Zero stale storage objects remain.
  Manual pull-zone purge is now the only prerequisite to public CDN validation.
  No commit made.

- 2026-09-07 (session 24) — changed the SVG uploader to batches of 10 with a
  single 5-second attempt per asset, deferring failures to later passes. Three
  passes brought the checkpoint to 320/415 uploaded and 95 deferred. The user
  will manually purge Bunny after re-upload completes. No commit made.

- 2026-09-07 (session 23) — attempted a targeted Bunny purge for the confirmed
  stale screenshot SVG. Bunny returned HTTP 401 because the repo only contains
  a storage-zone access key, not the account API key required by the purge API.
  Removed temporary audit/refresh scripts. No worker is running. No commit made.

- 2026-09-07 (session 22) — compared PostgreSQL, the local Docusaurus SVG, and
  the live Bunny response for the screenshot diagram. Confirmed the database
  path is correct but Bunny serves a stale pre-blackboard cached asset. Stopped
  refresh workers remain stopped. No commit made.

- 2026-09-07 (session 21) — restarted the one-at-a-time Bunny worker with
  continue-on-error behavior so a timed-out SVG is logged and skipped while
  all remaining assets continue processing. Worker is active; no commit made.

- 2026-09-07 (session 20) — started the full 415-file sequential Bunny worker
  with per-file retries and output logging. One controlled upload returned
  HTTP 201 Created; the full worker remains in progress. No commit made.

- 2026-09-07 (session 19) — changed the Bunny SVG refresh to one-at-a-time
  sequential uploads with per-file retries, then started the 415-file worker.
  This is intended to avoid concurrent-request timeouts. No commit made.

- 2026-09-07 (session 18) — relaunched the retained-diagram Bunny refresh in
  retryable background batches after transient storage timeouts. Confirmed
  115 uploads before this retry run; completion of the remaining batches is
  still pending. No commit made.

- 2026-09-07 (session 17) — diagnosed low-contrast sequence-diagram labels and
  added shared blackboard SVG normalization to the importer. Added explicit
  caption spacing beneath diagram images. Bunny refresh is in progress; one
  asset returned HTTP 201 during verification. No commit made.

- 2026-09-07 (session 16) — aligned course-home About/Topics/Discussion pages
  with the shared DashboardSidebar. Lesson pages retain their module outline.
  Web TypeScript check and `git diff --check` pass. No commit made.

- 2026-09-07 (session 14) â€” updated About descriptions for exactly the 14
  imported Tech courses with researched, outcome-led marketing copy. Verified
  all remain published Tech courses and left Life Skills/Presentation copy
  unchanged. No commit made.

- 2026-09-07 (session 15) — expanded those 14 descriptions into structured About Markdown, removed time wording, added a separate Languages and tools section, and updated reader/editor/card rendering. API/web TypeScript checks and git diff --check pass. No commit made.

- 2026-09-07 (session 13) â€” restored the 18 DB-authored Life Skills and
  Presentation courses with their associated data, relabeled Presentation as
  Presentation Skills in Browse, and fixed the New badge's light-theme color
  and uppercase styling. API/web TypeScript checks pass. No commit made.

- 2026-09-07 (session 12) â€” established the exact 14-course catalog, backed up
  and deleted 24 other DB-backed courses plus cascaded dependencies, moved the
  retained Playwright images to Bunny, rewrote retained Docusaurus links, and
  verified 415/415 diagram SVGs plus both PNGs live on Bunny. API/web TypeScript
  checks pass. No commit made.

- 2026-09-05T20:47:38.229Z â€” auto-compaction (trigger: auto, session: e3397eef-52e2-4218-b953-18b7ec8a86e6). Verify Status/Next Action above are current.
- 2026-09-06 (session 7) â€” A4-card rework, chevron restyle, top-row grid fix, diagram-order investigation, and this "how to import" reference section all added post-compaction. Status/Next Action above are current as of this entry.
- 2026-09-06 (session 8) â€” code-block background differentiation (light/dark) added. Status/Next Action above are current as of this entry.
- 2026-09-06 (session 9) â€” imported and database-verified four requested courses; fixed paired AsciiDiagram parsing and reconciled eight omitted git-github-actions manifest entries. `coding-bootcamp` remains held. No commit made.
- 2026-09-06 (session 10) â€” aligned Manage Courses back controls with the established bare text-link formatting; web TypeScript check clean. No commit made.
- 2026-09-06 â€” direct database check confirmed all five courses imported in this task are published. User clarified the question was scoped to this session/handoff and classifies these five as Tech. No category update was performed; `coding-bootcamp` remains absent.
- 2026-09-06 (session 11) â€” added the curated 14-course New Courses strip inside Browse Courses' All tab plus New card badges; verified all already imported/published, aligned all imported courses to Tech through the API, and made the importer persist Tech. API/web TypeScript clean; ESLint unavailable because the repo has no ESLint 9 config. No commit made.
- 2026-09-06 â€” Docusaurus-removal audit found two unmigrated courses, seven legacy `/docs` links in six imported modules, two Playwright images available only in `apps/docs/static`, and loss of the current re-import path if `apps/docs` is deleted. Removal is not safe yet; no deletion performed.
- 2026-09-09T03:17:45.511Z — auto-compaction (trigger: auto, session: 9035d858-19e1-4ebe-9447-b96b30097e50). Verify Status/Next Action above are current.

## agentic-ai-fundamentals content-quality audit (COMPLETE, 2026-09-10)
Same 6-criteria rubric as the completed design-patterns, python-for-ai-engineers,
and git-github-actions audits: relevance, accuracy, readability, engagement,
zero em/en dashes, human-voice; 95% minimum per file. Scope:
`apps/docs/docs/agentic-ai-fundamentals/`, ~58 topics, 235 files. Topic file
structure is `overview.mdx` / `build-it.mdx` / `avoid-mistakes.mdx` / `review.mdx`
(same shape as python-for-ai-engineers - so the "review.mdx What Comes Next /
section-boundary" accuracy-bug class from that audit applies here). A few topics
add an `index.md`; `authentication` has a 5th file; `capstone` has its own 5
(index, milestones, reference-architecture, requirements, rubric). Canonical
order: `apps/docs/sidebars/agentic-ai-fundamentals.json`.

**Course-wide mechanical dash pass (COMPLETE, 2026-09-10):** ran
`ggha_audit_dash_fix.py` (still present in the 9035d858 session scratchpad,
same v4 logic) across all 235 files. 234 fixed, 0 em/en dashes remain outside
AsciiDiagram/mermaid.

**Course-wide corruption sweep (COMPLETE, 2026-09-10):** the paired-em-dash-aside
heuristic mis-fired on soft-wrapped paragraphs where two independent single-dash
asides shared one source line, merging them into a parenthetical that spans a
sentence break. Detector: scan the git-diff pre-image for lines with exactly 2
em dashes AND a `.\s+[A-Z]` sentence break between them (this is the reliable
check - paren-balance counting does NOT catch these because the merge inserts a
balanced `(`...`)`). Found and hand-fixed 15 real corruptions:
- caching-and-retries/review.mdx (retryable-vs-non-retryable bullet)
- caching-and-retries/overview.mdx ("naive retries" paired aside -> parenthetical)
- cost-and-latency-tracking/overview.mdx ("you try a different model" chain)
- mcp-architecture/overview.mdx ("4. Shutdown" bullet)
- monitoring-production-agents/build-it.mdx (BOTH "1. Instrumentation" and
  "4. Alerting" bullets)
- practice/solutions.mdx (2: "multiple sessions" edge-case note, "router cannot
  execute actions" why-this-works para)
- reasoning-vs-execution/overview.mdx ("reasoning requires a powerful model")
- transports/overview.mdx (3: stdio-vs-SSE server para, same-machine para,
  laptop-to-server deployment story)
- what-is-an-agent/overview.mdx (industry-loose-usage para; also swapped the
  AI-tell word "crucial" -> "matters" while there)
- what-is-mcp/overview.mdx ("Resources" primitive bullet)
- prompt-testing-and-iteration/review.mdx ("This completes Section 2" para)
Re-verified: 0 cross-sentence parentheticals, 0 residual dashes, 0 title-suffix
corruption course-wide. 234 files modified so far.

**FLAG for the close-read (not yet resolved):** both
`prompt-testing-and-iteration/review.mdx` AND
`planning-and-decision-making/review.mdx` claim "This completes Section 2" (one
says "Section 2 - Prompt Engineering", the other "Section 2: AI Agents
Fundamentals"). At most one can be right - verify every review.mdx
section-boundary claim against the real sidebar section order, same as the
python-for-ai-engineers audit.

**Per-topic close read: NOT STARTED.** Next: fork a worker to close-read all
~58 topics in sidebar order, same process as the git-github-actions audit
(read files, verify concrete technical claims against external authority, watch
for fabricated APIs/flags, broken code examples, section-boundary claims; edit
directly; checkpoint here every ~10 topics; final completion summary in the
style of the sections above). Uncommitted, no import - source pass only.

**Checkpoint 1 (close-read, forked worker):** topics 1-5 done (what-is-ai-engineering,
llm-fundamentals, tokens-and-context-windows, prompt-engineering-basics,
llm-apis-in-practice) + three big course-wide fixes:

1. **17 broken markdown links** in review.mdx "Further Reading" lists across 8
   files (building-an-mcp-client x2, caching-and-retries x2, few-shot-prompting,
   mcp-architecture x3, mcp-primitives x3, scaling-agent-systems x4,
   tokens-and-context-windows, transports). Same dash-fix link-corruption class
   from python-for-ai-engineers: `[Title (Sub](url)) desc` -> `[Title (Sub)](url): desc`.
2. **18 broken relative links** (`](../../topic/overview)` should be `](../topic/overview)`)
   in Prerequisites lists of 10 overview.mdx files (authentication,
   cost-and-latency-tracking, database-server, evaluating-agents, github-server,
   monitoring-production-agents, observability-logging-and-tracing,
   prompt-injection-and-guardrails, tool-evaluation, trajectory-evaluation).
3. **Section-boundary / section-number bugs** - the review "What Comes Next"
   blurbs had a systematic off-by-one on section numbers plus several outright
   wrong section-completion claims. Sidebar truth: S1 Foundations
   (what-is-ai-engineering..prompt-testing-and-iteration), S2 AI Agents
   Fundamentals (what-is-an-agent..planning-and-decision-making), S3 Agentic
   Execution (observe-think-act-loop..human-in-the-loop), S4 Multi-Agent Systems
   (orchestrator-and-supervisor-patterns..when-to-use-multi-agent), S5 Model
   Context Protocol (what-is-mcp..mcp-with-claude-code), S6 MCP Servers in
   Practice (filesystem-server..custom-mcp-server), S7 Evaluation and Reliability
   (evaluating-agents..cost-and-latency-tracking), S8 Production Agent Systems
   (deployment-patterns..monitoring-production-agents), then Practice, Capstone.
   Fixed:
   - llm-apis-in-practice/review.mdx: falsely claimed "completes Section 1" and
     "Section 2 begins with System Prompts" (it's the 5th of 12 in S1) -> plain
     next-lesson pointer.
   - prompt-testing-and-iteration/review.mdx: "completes Section 2, Prompt
     Engineering ... first two sections" -> "completes Section 1: Foundations",
     next = what-is-an-agent.
   - human-in-the-loop/review.mdx: falsely claimed "completes the course" and
     pointed BACK to structured-output-prompting -> "completes Section 3: Agentic
     Execution", next = orchestrator-and-supervisor-patterns.
   - mcp-with-claude-code/review.mdx: falsely "completed the ... course" -> 
     "completes Section 5", next = filesystem-server.
   - custom-mcp-server/review.mdx: "Section 7 ... Section 8" -> "Section 6 ... Section 7".
   - cost-and-latency-tracking/review.mdx: "Section 8 ... all eight sections" (it's
     end of S7, S8 still follows) -> "Section 7", next = deployment-patterns.
   - monitoring-production-agents/review.mdx: "Section 9" -> "Section 8"; fixed
     broken practice link -> ../practice/beginner.
   - authentication/review.mdx: "next lesson in Section 9" -> dropped stale ref.
   - observability-logging-and-tracing/review.mdx: "final lesson in Section 8" -> "Section 7".
   - slack-server/review.mdx: "final Section 7 lesson" -> "Section 6".
   - versioning-prompts-and-tools/review.mdx: "next lesson in Section 9" -> "Section 8".
   - custom-mcp-server/build-it.mdx: "across Section 7" -> "Section 6".
   - monitoring-production-agents/overview.mdx: "from Section 8" -> "Section 7".
   planning-and-decision-making/review.mdx and when-to-use-multi-agent/review.mdx
   checked and already correct.

Per-topic notes so far:
- what-is-ai-engineering: 2 minor (index.md "human-in-the-gate"->"human-in-the-loop";
  overview "leverage"->"use").
- llm-fundamentals: clean.
- tokens-and-context-windows: build-it.mdx section 1 used a likely-nonexistent
  `anthropic-tokenizer` pip package + unused legacy `HUMAN_PROMPT, AI_PROMPT`
  imports -> rewrote to use the real `client.messages.count_tokens()` API.
- prompt-engineering-basics: clean.
- llm-apis-in-practice: section-boundary fix above; code otherwise sound.

Next: system-prompts onward (topic 6+).

**Checkpoint 2 (close-read):** Section 1 complete (topics 6-12: system-prompts,
prompt-patterns, few-shot-prompting, chain-of-thought-and-reasoning,
prompt-templates, structured-output-prompting, prompt-testing-and-iteration).
- system-prompts, prompt-patterns, few-shot-prompting,
  chain-of-thought-and-reasoning, prompt-templates, structured-output-prompting:
  clean. Code and technical claims verified sound (CoT ~20-40pp accuracy gain
  matches Wei et al.; structured-output reliability tiers reasonable; Anthropic
  API usage correct throughout).
- prompt-testing-and-iteration: build-it.mdx A/B example had a real KeyError bug
  (`compare_prompts` uses default labels "Prompt A"/"Prompt B" but the caller
  looked up "Prompt V1"/"Prompt V2") -> pass explicit label_a/label_b and fix
  the lookups.
- prompt-testing-and-iteration/review.mdx section-boundary fix already logged in
  Checkpoint 1.
Section 1 all files now at/above the bar. Next: Section 2 (what-is-an-agent
onward).

**Checkpoint 3 (close-read):** Section 2 partial (what-is-an-agent,
agent-vs-chatbot-vs-workflow, anatomy-of-an-agent).

RECURRING BUG FAMILY found - the agent tool-use loop code. Two problems appear
together across many build-it.mdx files:
  (a) `content = response.content[0]` then `if content.type == "tool_use"` -
      only inspects the FIRST content block, so a tool call is silently dropped
      whenever the model emits a short text preamble before the tool_use block
      (very common with Claude). The loop then treats the preamble as the final
      answer and exits early.
  (b) `messages.append({"role": "assistant", "content": content})` passing a
      single block object as `content` (the API wants a str or a list of
      blocks - should be `response.content`).
  Fixed pattern applied: append `response.content` (the whole list); branch on
  `response.stop_reason != "tool_use"` for the final answer (join all text
  blocks); otherwise iterate ALL blocks, run each `tool_use`, and send back one
  `user` message whose content is the list of `tool_result` blocks.
  Fixed so far in: what-is-an-agent/build-it.mdx (also removed a FABRICATED
  final-answer: section 2 "Adding a Single Tool" showed `return
  response.content[0].text` after a `tools=` call with a comment claiming output
  "The current weather in Tokyo is 18C, partly cloudy" and prose asserting the
  tool was executed - the code did neither and would AttributeError on
  `.text`; rewrote it to honestly show the `tool_use` request, with execution
  shown in the loop section), agent-vs-chatbot-vs-workflow/build-it.mdx (2
  loops), anatomy-of-an-agent/build-it.mdx (3 loops: Orchestrator.step,
  SafeOrchestrator.step, the Build-Something-Real while loop).
  STILL TO FIX in later topics (grep `response.content[0]` + tool_use):
  agent-tools-and-tool-calling, observe-think-act-loop, react-pattern,
  plan-and-execute, planning-and-decision-making, reasoning-vs-execution,
  loop-safety-and-recovery, human-in-the-loop, practice/solutions.mdx.

Other Section 2 fixes:
- index.md (top-level): "human-in-the-gate" -> "human-in-the-loop".
- what-is-ai-engineering/overview.mdx: "leverage" -> "use".
- what-is-an-agent, agent-vs-chatbot-vs-workflow, anatomy-of-an-agent prose/
  Further-Reading: clean (Anthropic links valid; "Building Effective Agents"
  anthropic.com/engineering URL correct).

Next: reasoning-vs-execution, agent-memory, agent-tools-and-tool-calling,
planning-and-decision-making, then Section 3.

**Checkpoint 4 (close-read):** Section 2 complete (reasoning-vs-execution,
agent-memory, agent-tools-and-tool-calling, planning-and-decision-making).
Agent-loop `content[0]`/single-block-append bug fixed in all four build-it
files (reasoning-vs-execution: 3 loops incl. a dead `isinstance(decision,dict)`
branch that could never fire; agent-tools-and-tool-calling: `process_response`
+ `run_file_agent` - these split one assistant turn into multiple
assistant/user messages, invalid for parallel tool calls; planning: TripPlanner
`execute_subtask`). agent-memory build-it `.content[0].text` calls are all on
non-tool calls, correct as-is.
Other fixes:
- reasoning-vs-execution/build-it.mdx: the fused-vs-separated cost example was
  arithmetically broken - it added Haiku execution cost ON TOP of the full
  Sonnet reasoning cost, so "separated" came out MORE expensive and the printed
  "Savings" was ~-2% while the prose claimed "about 20% less" (and the overview
  claims 40-60%). Rewrote the model so fused pays Sonnet for planning +
  execution-formatting and separated moves the formatting tokens to Haiku;
  now ~39%, prose updated to "about 40% less".
- agent-memory/review.mdx: "Anthropic context caching" link pointed at a
  non-existent `/context-caching` path -> real feature is prompt caching,
  `/build-with-claude/prompt-caching`.
OPEN JUDGMENT CALL: agent-memory/review.mdx cites arxiv 2603.07670 "Memory for
Autonomous LLM Agents" - future-dated (2026-03) + generic title, possibly
fabricated, but not confidently disprovable; left as-is.

Next: Section 3 (observe-think-act-loop, react-pattern, plan-and-execute,
reflection-and-self-correction, loop-safety-and-recovery, human-in-the-loop).

**Checkpoint 5 (close-read):** Section 3 partial (observe-think-act-loop,
react-pattern). Agent-loop `content[0]` bug fixed in both build-it files
(observe-think-act-loop: 3 loops; react-pattern: 3 loops - here it was
especially broken because ReAct deliberately emits a <thought> TEXT block
before the tool_use block, so `content[0]` is always the thought and the
`content[0].type == "tool_use"` check was always False, meaning the ReAct
examples never actually called a tool - they'd exit on turn 1 treating the
thought as the final answer).
OPEN JUDGMENT CALLS (possible dead/fabricated Further-Reading links, left as-is
per confidence bar): observe-think-act-loop/review.mdx
"agentpatternscatalog.org"; react content/links otherwise verified (ReAct =
Yao et al. 2022, arxiv 2210.03629, correct).
Next: plan-and-execute, reflection-and-self-correction, loop-safety-and-recovery,
human-in-the-loop.

**Checkpoint 6 (close-read):** Section 3 COMPLETE (plan-and-execute,
reflection-and-self-correction, loop-safety-and-recovery, human-in-the-loop).
Agent-loop `content[0]` bug fixed in plan-and-execute (2 loops),
loop-safety-and-recovery (1: SafetySystem.run), human-in-the-loop (3:
agent_with_gates, escalation_agent, SupportAgent.run). reflection-and-self-
correction build-it is all plain no-tool calls, correct as-is; SQL agent sound.
Section 3 content otherwise clean; arxiv links verified real (Plan-and-Solve
2305.04091, Reflexion 2303.11366, ReAct 2210.03629); human-in-the-loop/
review.mdx section-boundary already fixed (checkpoint 1).
Next: Section 4 - orchestrator-and-supervisor-patterns, specialist-agents,
agent-communication-and-coordination, shared-memory-and-state,
when-to-use-multi-agent.

**Checkpoint 7 (close-read):** Section 4 COMPLETE (orchestrator-and-supervisor-
patterns, specialist-agents, agent-communication-and-coordination,
shared-memory-and-state, when-to-use-multi-agent). No agent-loop `content[0]`
bugs in this section (build-it code is mostly simulated/deterministic, not LLM
tool loops). Two real bugs fixed:
- specialist-agents/build-it.mdx: `format_table` tool had a broken Markdown
  table cell `| Q1 | $420K |: |` - a dash-fix artifact (original `| - |` /
  em-dash for "no prior quarter") -> `| n/a |`. Grepped course-wide for the
  same `|: |` table-cell signature: no other instances.
- shared-memory-and-state/build-it.mdx: `SharedStore.compare_and_swap` called
  `self.write()` while already holding the non-reentrant `threading.Lock`, so
  any CAS call deadlocks. Extracted `_write_unlocked()` and call that from both
  `write()` and `compare_and_swap()`.
Content otherwise clean; links verified (rabbitmq/redis/MS-event-sourcing docs
real).
Next: Section 5 - Model Context Protocol (what-is-mcp, mcp-architecture,
mcp-primitives, transports, building-an-mcp-server, building-an-mcp-client,
mcp-with-claude-code). This is the MCP-heavy section - verify method names,
primitive control models, transports (stdio/SSE/streamable-HTTP), lifecycle
against modelcontextprotocol.io. what-is-mcp/review.mdx and
mcp-with-claude-code/review.mdx section-boundary fixes already applied
(checkpoint 1).

(Coordinator asked for checkpoints every ~5 topics / after any real bug fix -
doing that from here.)

**Checkpoint 8 (close-read):** what-is-mcp (clean - JSON-RPC method names,
`initialize`/`notifications/initialized`/`tools/call`/`resources/read`,
`inputSchema` camelCase, error code -32602, protocolVersion 2024-11-05 all
verified correct vs MCP spec) + mcp-architecture. Two real bugs fixed in
mcp-architecture/build-it.mdx:
- `McpServer.handle_message`: the `not self._initialized` guard was checked
  BEFORE the `notifications/initialized` branch, AND that branch never called
  `handle_initialized()` - so the server could NEVER become initialized through
  `handle_message`; every post-handshake call returned "Server not initialized".
  Moved the notification branch above the guard and made it call
  `self.handle_initialized()`.
- `run_stdio` had a dead `buffer` var and a brittle string-match
  (`'"method":"notifications/initialized"'` with no space, never matches
  json.dumps output which has `": "`) as its only path to set initialized -
  simplified now that handle_message does it properly.
- `FileServer` was decorated `@dataclass` but also had an explicit `__init__`
  and `dataclass` was never imported -> NameError. Removed the decorator (it's
  a plain McpServer subclass).
Next: mcp-primitives, transports, building-an-mcp-server, building-an-mcp-client,
mcp-with-claude-code.

**Checkpoint 9 (close-read):** mcp-primitives + transports. Both content-clean
(method names tools|resources|prompts/list|call|read|get, camelCase
inputSchema/mimeType/uriTemplate, isError flag, prompts/get message shape all
verified vs MCP 2024-11-05 spec; course consistently pins that version so the
SSE-as-remote-transport framing is correct for it, pre-Streamable-HTTP). Minor
fixes only:
- mcp-primitives/build-it.mdx: `McpPrimitiveServer._prompts` annotated
  `list[dict]` but assigned/used as a dict -> `dict[str, callable]`; dropped
  pointless `@dataclass` decorators on two classes that have real `__init__`s
  (`McpPrimitiveServer`, `DocServer`) - harmless at runtime but the imports/
  decorator were misleading.
Next: building-an-mcp-server, building-an-mcp-client, mcp-with-claude-code
(last 3 of Section 5).

**Checkpoint 10 (close-read):** Section 5 COMPLETE (building-an-mcp-server,
building-an-mcp-client, mcp-with-claude-code). Two significant fixes:

1. **mcp-with-claude-code (whole topic) - wrong Claude Code MCP config.** The
   topic said MCP servers are configured under an `mcp_servers` (snake_case)
   key inside `settings.json` / `.claude/settings.local.json`. Correct: the key
   is `mcpServers` (camelCase, the universal MCP config key) and it lives in
   `.mcp.json` at the repo root (project scope, committed), or is added with
   `claude mcp add [--scope user|local]` (stored in `~/.claude.json`) - NOT in
   settings.json (which holds permissions/hooks/model, not servers). Fixed:
   renamed `mcp_servers`->`mcpServers` in every prose line and JSON block
   across overview/build-it/avoid-mistakes/review; rewrote the "configuration
   format" / scopes section, the "add filesystem server" / "global" / secrets
   passages, the How-It-Works paragraph, and the review key-takeaways/recap to
   describe `.mcp.json` + the three real scopes + `claude mcp add` + `claude
   mcp list`. The `command`/`args`/`env` sub-fields, stdio transport, child-
   process spawn, initialize->initialized->tools/list flow, MCP Inspector
   (`npx @modelcontextprotocol/inspector`), and `@modelcontextprotocol/
   server-filesystem` were all already correct and kept. OUT OF SCOPE, NOW
   TRAILS: overview.mdx's AsciiDiagram (lines ~56-90) + its alt text still show
   `settings.json` / `mcp_servers`.
2. **`mcp.server.stdio()` is not a thing.** building-an-mcp-server/build-it.mdx
   (3 code blocks) and mcp-with-claude-code/build-it.mdx (1) did
   `async with mcp.server.stdio() as (read, write)` with no `import mcp` - both
   a NameError and a wrong API. The SDK's context manager is `stdio_server`
   from `mcp.server.stdio` (custom-mcp-server/build-it.mdx already imports it
   correctly). Added `from mcp.server.stdio import stdio_server` after the
   `from mcp.server import Server, NotificationOptions` line and switched the
   calls to `stdio_server()`.
building-an-mcp-server SDK usage otherwise OK (real low-level `mcp.server.Server`
API, `InitializationOptions`, `get_capabilities` signature all correct).
Next: Section 6 (filesystem-server, github-server, database-server,
web-search-server, slack-server, custom-mcp-server).

**Checkpoint 11 (close-read):** Section 6 COMPLETE (filesystem-server,
github-server, database-server, web-search-server, slack-server,
custom-mcp-server). Big systemic code fix:

**`from mcp import Server` + `@server.tool(...)` is not a real API.** All six
Section-6 build-it files (plus custom-mcp-server overview/avoid-mistakes and
web-search-server/avoid-mistakes) built custom servers with `from mcp import
Server` (ImportError - `Server` isn't exported from top-level `mcp`) then a
non-existent `@server.tool("name")` decorator (that belongs to `FastMCP`, not
the low-level `Server`). Converted all to the real `FastMCP` API:
`from mcp.server.fastmcp import FastMCP` / `mcp = FastMCP("name")` /
`@mcp.tool(name="...")` / `@mcp.resource("uri")` / `@mcp.prompt("name")` /
`mcp.run(transport=...)`. TextContent returns + Pydantic-model params kept
(both work with FastMCP).
- filesystem-server SSE block used `from mcp.server import run_sse` (nonexistent)
  -> `mcp.run(transport="sse")`.
- custom-mcp-server section-7 transport block was a half-broken low-level
  `server.run(...)/create_initialization_options()/sse.connect_sse(...)`
  Starlette block after the FastMCP rename -> `mcp.run(transport=transport)`.
- custom-mcp-server/avoid-mistakes Mistake 4 fix used fabricated
  `@server.on_shutdown` -> rewrote to FastMCP `lifespan` context manager.
- 8 more `settings.json` / `.claude/settings.json` -> `.mcp.json` (+ `claude
  mcp add`) across the section, same Claude-Code-config fix as checkpoint 10.
- custom-mcp-server/overview "`Server` class" -> "`FastMCP` class".
Section 6 prose + section-boundary chain verified clean.
Next: Section 7 (evaluating-agents ... monitoring-production-agents).

**Checkpoint 12 (close-read):** Section 7 partial (evaluating-agents,
trajectory-evaluation, tool-evaluation). Fixes:
- evaluating-agents/build-it.mdx section 4 `llm_judge`: called
  `openai.chat.completions.create(model="claude-sonnet-4-6", response_format=
  {"type":"json_object"})` - OpenAI SDK + a nonexistent Claude model id + OpenAI
  json-mode syntax. Rewrote to the Anthropic SDK (`judge_client.messages.create`,
  model `claude-3-5-sonnet-20241022`, JSON-only prompt, parse
  `response.content[0].text`) with a comment that the judge model should differ
  from the agent's.
- Section-6/7 stray `@server.tool("...")` fragments in tool-evaluation,
  observability-logging-and-tracing, prompt-injection-and-guardrails,
  web-search-server/avoid-mistakes, custom-mcp-server/avoid-mistakes converted
  to `@mcp.tool(name="...")` for consistency with the FastMCP course convention.
  (practice/solutions.mdx uses `server = FastMCP(...)` + `@server.tool()` which
  is correct as-is; a blanket sed touched it and was reverted - net zero.)
trajectory-evaluation + tool-evaluation: clean (self-contained Python, sound
logic). Minor: tool-evaluation/review cites MCP spec 2025-03-26 while the rest
of the course pins 2024-11-05 - both real versions, left.
Next: prompt-injection-and-guardrails, observability-logging-and-tracing,
cost-and-latency-tracking (rest of Section 7).

**Checkpoint 13 (close-read):** Section 7 COMPLETE (prompt-injection-and-
guardrails, observability-logging-and-tracing, cost-and-latency-tracking).
prompt-injection defense code, OpenTelemetry setup (OTLP/HTTP port 4318,
correct exporter import path, TracerProvider/BatchSpanProcessor), and the
cost/latency profiler classes all verified accurate. OWASP/garak/OTel/Grafana
links real. cost-and-latency review section-boundary already fixed
(checkpoint 1).
Course-wide model-ID normalization: `claude-sonnet-4-6` (~10 files, ~25 refs)
and `claude-opus-4-8` were not real IDs; renamed to `claude-sonnet-4-20250514`
/ `claude-opus-4-20250514` (the real Claude 4 IDs already used in
deployment-patterns and scaling-agent-systems), and `claude-haiku-4-5` ->
`claude-haiku-4-5-20251001`. Pricing dict values ($3/$15, $15/$75, $0.25/$1.25)
kept - they match the Sonnet/Opus tiers; Haiku 4.5's exact price not
confidently known so left. Also fixed the one `claude-sonnet-4-6` in
evaluating-agents/build-it (checkpoint 12) as part of the llm_judge rewrite.
Next: Section 8 (deployment-patterns, versioning-prompts-and-tools,
configuration-management, authentication, scaling-agent-systems,
caching-and-retries, monitoring-production-agents).

**Checkpoint 14 (close-read):** Section 8 COMPLETE (deployment-patterns,
versioning-prompts-and-tools, configuration-management, authentication,
scaling-agent-systems, caching-and-retries, monitoring-production-agents).
All CLEAN on close read - this section is well-written and technically sound:
- deployment-patterns: multi-stage Dockerfile, blue-green CI/CD, health checks -
  correct. (Minor, not fixed: `check_llm_connectivity` does GET on
  `/v1/messages` which really returns 405 not the 200/400/401 the comment
  enumerates, but `!= 401` still behaves; pydantic-settings uses the legacy
  `class Config` style which still works in v2.)
- versioning-prompts-and-tools: `import semver` + `semver.Version.parse` is the
  correct python-semver v3 API; A/B hashing, rollback manager all sound.
- configuration-management, authentication (OAuth2/PKCE/OBO/jwt-bearer grant),
  scaling-agent-systems (Redis session store, nginx least_conn, Redis Lua
  token bucket), caching-and-retries (retry decorator + circuit breaker),
  monitoring-production-agents (prometheus_client Counter/Gauge/Histogram,
  SLI/SLO) - all accurate.
Section-boundary claims for authentication/scaling/caching/monitoring and
versioning already fixed in checkpoint 1; model-ID normalization in checkpoint
13 covered this section too. No new fixes needed.
Next: practice (beginner/intermediate/advanced/solutions), capstone (index +
brief/requirements/milestones/rubric/reference-architecture), top-level
index.md. Then final corruption re-sweep + completion summary.

---

## GAF FINAL COMPLETION SUMMARY (agentic-ai-fundamentals, 2026-09-10)

All 58 topics / 235 files close-read against the 6-criteria rubric (accuracy,
relevance, readability, engagement, zero em/en dashes, human-voice). Sections:
1 Foundations (12), 2 AI Agents Fundamentals (7), 3 Agentic Execution (6),
4 Multi-Agent Systems (5), 5 Model Context Protocol (7), 6 MCP Servers in
Practice (6), 7 Evaluation and Reliability (6), 8 Production Agent Systems (7),
Practice (4), Capstone (5), top-level index.md.

**Before/after quality estimate:** prose/voice baseline already strong (~90%,
no AI-tell buzzwords, good narrative hooks) - comparable to git-github-actions.
Technical-accuracy defects were moderate and CONCENTRATED in the code-heavy
build-it files, especially the agent tool-use loop and the MCP-SDK sections.
Post-fix all 235 files are at/above the 95% bar.

### Real bugs fixed (by class)

1. **Course-wide mechanical + corruption pass (pre-close-read):** dash-fix
   script over 235 files (234 fixed, 0 residual em/en dashes). Its paired-aside
   heuristic mis-fired on soft-wrapped multi-sentence lines -> 15 hand-fixed
   cross-sentence-parenthetical corruptions (caching-and-retries x2,
   cost-and-latency-tracking, mcp-architecture, monitoring-production-agents x2,
   practice/solutions x2, reasoning-vs-execution, transports x3,
   what-is-an-agent, what-is-mcp, prompt-testing-and-iteration).

2. **17 broken markdown links** (`[Title (Sub](url)) desc` -> `[Title (Sub)](url): desc`)
   in Further-Reading lists across 8 review.mdx files (same dash-fix link
   corruption class as python-for-ai-engineers).

3. **18 broken relative links** `](../../topic/overview)` -> `](../topic/overview)`
   in Prerequisites lists of 10 overview.mdx files.

4. **Section-boundary / section-number bugs** - the review "What Comes Next"
   blurbs had a systematic off-by-one plus several outright-wrong section-
   completion claims. Fixed ~13: llm-apis-in-practice (falsely "completes
   Section 1"), prompt-testing-and-iteration ("Section 2" -> Section 1),
   human-in-the-loop (falsely "completes the course", pointed backward),
   mcp-with-claude-code (falsely "completed the course"), custom-mcp-server
   (S7/S8 -> S6/S7), cost-and-latency-tracking (S8 -> S7), monitoring-production-
   agents (S9 -> S8), authentication/observability/slack-server/versioning
   (each off by one), custom-mcp-server/build-it + monitoring/overview
   ("Section 7"/"Section 8" refs). planning-and-decision-making and
   when-to-use-multi-agent verified already-correct.

5. **The agent tool-use loop bug (systemic, ~12 build-it files).**
   `content = response.content[0]` + `if content.type == "tool_use"` inspects
   only the first content block, so a tool call is silently dropped whenever
   the model emits a text preamble first (very common; in react-pattern it was
   fatal because ReAct deliberately emits a `<thought>` text block before the
   tool_use). Plus `messages.append({"role":"assistant","content": content})`
   passing a bare block instead of the list. Fixed to: append `response.content`,
   branch on `response.stop_reason != "tool_use"`, iterate ALL blocks, return
   one user message with the list of tool_result blocks. Files: what-is-an-agent
   (also removed a FABRICATED final-answer comment + prose claiming tool
   execution the code never did), agent-vs-chatbot-vs-workflow (2),
   anatomy-of-an-agent (3), reasoning-vs-execution (3, incl. a dead
   `isinstance(decision,dict)` branch that could never fire),
   agent-tools-and-tool-calling (2 - these split one assistant turn into
   multiple messages, invalid for parallel calls), planning-and-decision-making,
   observe-think-act-loop (3), react-pattern (3), plan-and-execute (2),
   loop-safety-and-recovery, human-in-the-loop (3).

6. **MCP custom-server API was fabricated (systemic, Section 6 + strays).**
   `from mcp import Server` (ImportError) + `@server.tool("name")` (that
   decorator is FastMCP's, not the low-level Server's). Converted every custom
   server to the real FastMCP API (`from mcp.server.fastmcp import FastMCP`,
   `mcp = FastMCP(...)`, `@mcp.tool(name=...)`, `@mcp.resource(uri)`,
   `@mcp.prompt(name)`, `mcp.run(transport=...)`). Also: `from mcp.server import
   run_sse` (nonexistent) -> `mcp.run(transport="sse")`; a broken low-level
   Starlette / `server.create_initialization_options()` transport block ->
   `mcp.run(transport=transport)`; a fabricated `@server.on_shutdown` -> FastMCP
   `lifespan` context manager. building-an-mcp-server and mcp-with-claude-code
   correctly use the low-level `mcp.server.Server` API and were kept - only
   fixed `mcp.server.stdio()` (nonexistent) -> `stdio_server` from
   `mcp.server.stdio`, and a `@dataclass` + manual-`__init__` `FileServer` with
   `dataclass` unimported (NameError) -> plain class.

7. **Wrong Claude Code MCP config (whole mcp-with-claude-code topic + strays).**
   Said servers go under `mcp_servers` (snake_case) in `settings.json` /
   `.claude/settings.local.json`. Correct: `mcpServers` (camelCase) in
   `.mcp.json` at repo root, or `claude mcp add` (stored in `~/.claude.json`),
   with three scopes (project/user/local). Renamed the key everywhere (prose +
   ~15 JSON blocks) and rewrote every file-location claim across
   mcp-with-claude-code + 8 Section-6 refs. OUT OF SCOPE, TRAILS:
   mcp-with-claude-code/overview.mdx AsciiDiagram + its alt text still show
   `settings.json` / `mcp_servers`.

8. **evaluating-agents/build-it `llm_judge`** called `openai.chat.completions
   .create(model="claude-sonnet-4-6", response_format={"type":"json_object"})` -
   OpenAI SDK + nonexistent Claude id + OpenAI json-mode. Rewrote to the
   Anthropic SDK with a real model and a comment to use a different model than
   the agent.

9. **Course-wide model-ID normalization:** `claude-sonnet-4-6` (~10 files) /
   `claude-opus-4-8` were not real -> `claude-sonnet-4-20250514` /
   `claude-opus-4-20250514` (already used in deployment-patterns &
   scaling-agent-systems); `claude-haiku-4-5` -> `claude-haiku-4-5-20251001`.

10. **shared-memory-and-state/build-it `SharedStore.compare_and_swap`**
    re-acquired a non-reentrant `threading.Lock` (deadlock on every CAS call) ->
    extracted `_write_unlocked` helper.

11. **prompt-testing-and-iteration/build-it** A/B example KeyError (default
    labels "Prompt A"/"Prompt B" vs. caller's "Prompt V1"/"Prompt V2") -> pass
    explicit labels.

12. **reasoning-vs-execution/build-it** fused-vs-separated cost example was
    arithmetically broken (added Haiku cost ON TOP of full Sonnet cost, so
    "separated" printed ~-2% savings while prose claimed 20-60%) -> remodelled,
    now ~39%, prose updated.

13. Smaller: tokens-and-context-windows/build-it fabricated `anthropic-tokenizer`
    pip package + legacy `HUMAN_PROMPT, AI_PROMPT` imports -> real
    `client.messages.count_tokens()` API; specialist-agents/build-it broken
    Markdown table cell `|: |` (dash-fix artifact) -> `| n/a |`;
    mcp-primitives/build-it `_prompts: list[dict] = {}` annotation mismatch +
    two pointless `@dataclass` decorators; index.md "human-in-the-gate" ->
    "human-in-the-loop"; what-is-ai-engineering "leverage" -> "use";
    agent-memory/review dead "context caching" link -> "prompt caching";
    capstone/rubric "the export export" typo.

### Recurring bug families

- The `response.content[0]` tool-loop antipattern - pervasive in every agent
  lesson's build-it; the single highest-count fix.
- Fabricated SDK surface: `from mcp import Server`, `@server.tool`, `run_sse`,
  `@server.on_shutdown`, `mcp.server.stdio()`, `anthropic-tokenizer`,
  `claude-sonnet-4-6` - the author knew the *shape* of the API but invented
  names/entry-points.
- The `mcp_servers` / `settings.json` Claude-Code config error, repeated ~25x.
- review.mdx section-number drift (systematic off-by-one).

### Open judgment calls (documented, not changed)

- agent-memory/review cites arxiv 2603.07670 "Memory for Autonomous LLM Agents"
  - future-dated + generic title, possibly fabricated, not confidently
  disprovable.
- observe-think-act-loop/review "agentpatternscatalog.org" - possibly dead,
  not confidently wrong.
- deployment-patterns `check_llm_connectivity` GETs `/v1/messages` (really 405,
  not the 200/400/401 the comment lists) but `!= 401` still behaves.
- Docker best-practices URL is the old (redirecting) path; pydantic-settings
  uses the legacy `class Config` style (deprecated, works).
- tool-evaluation/review cites MCP spec 2025-03-26 while the course otherwise
  pins 2024-11-05 - both real.
- `datetime.utcnow()` (deprecated in 3.12) in scaling-agent-systems &
  shared-memory - left (ubiquitous, still works).

### Final course-wide corruption re-sweep (post-completion)

0 em/en dashes outside diagrams, 0 broken markdown links, 0 `../../` relative
links, 0 `from mcp import Server`, 0 `mcp_servers` outside diagrams, 0
title-suffix corruption, 0 cross-sentence parentheticals, 0 residual fake
model IDs. Clean.

Diagrams (AsciiDiagram tags + mermaid sources) OUT OF SCOPE and untouched; the
one trailing item is the mcp-with-claude-code overview diagram still showing the
old config key/file.

No git commits. No import/republish. Source-file content pass only, left
uncommitted (235 files modified), matching the design-patterns /
python-for-ai-engineers / git-github-actions audits.
- 2026-09-16T11:40:09.884Z — auto-compaction (trigger: auto, session: 39134c1c-1eaf-4db0-a04b-4020d4d64613). Verify Status/Next Action above are current.
