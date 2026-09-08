# Current Task Handoff

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
Fresh Prisma and authenticated API reads now return 32 published courses:
14 Tech migration courses, 17 Presentation courses, and one Life Skills course.
The six other removed Tech courses remain outside the approved migration set.

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
issues were reported. Everything in this task remains uncommitted.

Separately, a full content-quality audit-and-humanization pass (relevance,
accuracy, readability, engagement, zero em/en dashes, human-voice; 95% minimum
per file) is now complete on both `apps/docs/docs/design-patterns` (185 files,
~81%->~98%) and `apps/docs/docs/python-for-ai-engineers` (202 files,
~87%->~98%) - see the two dedicated `(COMPLETE)` sections directly below for
full detail, real bugs found/fixed, and open judgment calls. Neither course's
edits are committed yet. `design-patterns` content already lives in the live
apps/web DB (imported earlier); per explicit user decision this pass only
fixed the apps/docs source, the live DB copy was NOT re-imported/refreshed.
`python-for-ai-engineers` is still apps/docs-only (never imported to apps/web).

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

Currently working on: N/A - COMPLETE

Topics not yet started: none - all 50 topics + top-level index.md complete

Note: git status shows ~65 files already modified from an earlier, interrupted, dash-only/narrower-scope attempt (topics: ai-pipelines, api-authentication, async-python, capstone, context-managers, control-flow, csv, data-visualization, error-handling, file-handling, first-program, llm-api-basics, logging, loops, performance, practice, project-structure, setup, strings). These are being re-audited against the full 6-criteria rubric, not trusted as-is.

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
Reconciled from actual `git status --short` output on 2026-09-09. Nothing is
staged and no commit has been made for the Life Skills follow-up:

- `memory-bank/current-task.md`
- All 12 previously tracked files under `scratch/communication-skills/`
- All 10 previously tracked files under `scratch/negotiation-skills/`
- New communication modules:
  `06-manage-emotions-before-you-respond.mdx`,
  `12-communicate-across-cultures-and-styles.mdx`, and
  `13-persuade-without-pushing.mdx`
- New negotiation modules:
  `03-set-your-target-and-bargaining-range.mdx`,
  `07-create-value-with-multiple-issues.mdx`,
  `11-handle-pressure-and-unfair-tactics.mdx`, `13-break-a-deadlock.mdx`, and
  `14-close-and-confirm-the-agreement.mdx`

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
The Life Skills follow-up is complete; only user review and an explicitly
requested commit remain. The older migration backlog follows:

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

- 2026-09-09 (Life Skills depth pass complete) - updated only
  `communication-skills` and `negotiation-skills` through authenticated API
  endpoints. Both are published `life-skills` courses with 15 ordered manual
  modules, `FREE_USER,PAID_USER` access, one `PRACTICE` section per module,
  2-3 visible suggested answers per section, and no external URLs. Stored bodies
  exactly match the content-gated staging sources. The 17 Presentation courses
  and 90 modules remain unchanged. Authenticated course-home and new-module web
  renders returned HTTP 200. No commit made.

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
