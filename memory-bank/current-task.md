# Current Task Handoff

## Objective
Started as: extend the Docusaurus→Sypher Next course importer
(`apps/api/scripts/import-docusaurus-course.ts`) to cover 6 more courses
the user listed (sorting-algorithms, search-algorithms, solid-principles,
design-patterns, git-github-actions, coding-bootcamp — alongside the 14
already-imported ones), fixing bugs/improving the script as needed, but
only actually running the import for ONE course as a pilot for now.
Grew into: the user browsed the live imported course and reported real
bugs (duplicate heading, missing captions, missing course-nav sidebar,
unstyled/monochrome code blocks) — fixing those became part of the same
task, see "session 2"/"session 3" below.

## Status
Importer pilot complete and verified. All reported bugs fixed and
confirmed live in an actual browser (browser tools became available
mid-task, used continuously since): duplicate heading, missing captions,
missing course-navigation sidebar (a genuine regression, restored),
code-block syntax highlighting (two stacked bugs, sessions 3-4),
full-width content (was capped at ~900px/1600px, session 5), a chevron/
card overlap regression the full-width fix introduced (session 6),
sidebar redesigned thinner (session 6), the content pane's scrollbar
matching the sidebar's thin style (session 6), and — session 7 — the
reading column reworked into a capped, centered, A4-like card (984px)
with the prev/next chevrons restyled as bare icon buttons hugging its
edges, plus the top utility row (Back to course / x of N / Bookmark)
switched to a grid so it's genuinely edge-anchored/centered rather than
approximately so. Diagram/module ordering was also investigated per a
user question and confirmed correct (session 7), and — session 8 — code
blocks now get a deliberate, theme-aware background so they visually
stand out from the surrounding card in both light and dark mode (they
were previously relying entirely on the Prism theme's own background,
which happened to match the card almost exactly in both themes). Awaiting user
go-ahead before importing the remaining 5 staged courses.

## Completed (session 8: code-block background differentiation)
User report: "add background color to differentiate the codeblocks in
light and dark theme" (in the course content area reworked in session 7).
Not an importer/script change — this is purely a reader-side rendering
fix in `apps/web/src/components/BlogPostPage/CodeBlock.tsx`, which is the
one shared component both course modules and blog posts render fenced
code through.

- Root cause: `CodeBlock.tsx` used `prism-react-renderer`'s `themes.vsLight`/
  `themes.vsDark` as-is, and never set its own background — the block's
  background came entirely from the theme's `plain.backgroundColor`.
  Checked those values directly in `prism-react-renderer`'s bundled
  `dist/index.js`: `vsLight.plain.backgroundColor` is `#ffffff`, identical
  to `apps/web/src/app/globals.css`'s light-theme
  `--ifm-background-surface-color` (also `#ffffff`, the card background) —
  zero separation, a code block on a light-theme card looked like plain
  unstyled text with no visible container. `vsDark`'s `#1E1E1E` vs the
  dark-theme card's `#17171b` was only marginally better.
- Fix: override just `plain.backgroundColor` (spreading the rest of the
  base theme untouched, so all syntax-token colors are unaffected) to
  `var(--ifm-color-emphasis-50)` — reused rather than invented, since it's
  already this app's "sunken surface" token (zebra-striped table rows,
  `mock-tests` card variants, etc.). Checked its actual per-theme values
  in `globals.css` before picking it: light `#f5f6f7` (light gray, clearly
  distinct from the white card), dark `#111114` (distinctly darker than
  the `#17171b` card) — genuinely differentiated in BOTH themes, unlike
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
- No importer-script changes needed for this one — flagged since the user
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
  space to the LEFT only — the card wasn't actually centered between the
  prev/next chevrons, just narrower and offset. Superseded entirely: reverted
  `.content` back to plain `flex: 1` (fills the pane, no width math), and
  moved the sizing into `CourseModulePage/styles.module.css`'s `.container`
  itself: `max-width: min(var(--card-max), calc(100% - var(--card-clearance)))`
  + `margin: 0 auto`. Percentage there resolves against `.container`'s real
  parent width (`.page`/`.content`, i.e. the actual pane), so this both caps
  the column at an A4/Letter-page-like width AND centers it for free —
  first at 820px (interpreting "decrease more than A4 sheet size"), then
  widened 20% to **984px** on a follow-up request ("increase width of
  content area by 20%" — user clarified "content area" = the A4-dimensioned
  card, not the outer pane).
- **Prev/next chevrons pulled in to hug the card's edges, and restyled bare.**
  Two separate user reports: "I want previous and next button to look like
  they are part of the site" (they were a 3.75rem filled circle with
  `--sidebar-bg` background + drop shadow — read as a floating widget) and,
  later, "move previous and next button closer to the content area" (once
  the card was width-capped, the old pane-edge-anchored `.pagination` left
  huge dead gaps on wide screens since it never accounted for the cap).
  - Restyle: `.paginationLink` now matches the site's existing icon-only-
    button convention (see memory `feedback_button_design_language` /
    `admin/access`'s `.actionBtn`) — no border, no fill, no shadow at rest
    OR hover, just an emphasis-600 -> primary color shift on hover. Circle
    shrunk 3.75rem -> 2.75rem to suit a bare glyph.
  - Positioning: since `.pagination` is `position: fixed` (deliberately —
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
    the pane's own edge) to 540px / 1600px — right up against the card.
- **Top utility row (Back to course / x of N / Bookmark) switched from
  flex + `space-between` to CSS grid.** User report: "Content needs to be
  centrally aligned in between buttons too" + "Back to course and Bookmark
  button needs to be left and right aligned respectively." Root cause:
  `justify-content: space-between` on 3 unequal-width children only splits
  the LEFTOVER space into two equal gaps — it doesn't put the middle child
  at the row's true center unless the two outer children happen to be the
  same width, which "Back to course" (text) and the bookmark button (icon)
  never are. Fixed with `display: grid; grid-template-columns: 1fr auto 1fr`
  + `justify-self: start/center/end` on the three children (bookmark
  targeted via `.moduleTopRow > *:last-child` since `ModuleBookmarkButton`
  owns its own styling) — this centers the middle column exactly regardless
  of sibling widths, and strictly pins the other two to the edges. Verified
  live: `backLink` left edge 296px (= pane-left), `bookmark` right edge
  1866px (= row's own right edge minus its 0.75rem padding, exact), counter
  genuinely centered in its own grid column.
- **Diagram/module ordering investigated per user question** ("Are diagrams
  placed in right order... are we matching the exact docusaurus structure
  while importing") — confirmed correct at the code level, not just
  reasoned about:
  - Within a page: `convertAsciiDiagrams()` in the importer scans
    `<AsciiDiagram>` tags left-to-right and replaces each **in place** at
    its original byte offset (`findAsciiDiagramTags` + a single cursor-walk
    reconstruction) — it never collects diagrams and appends them
    elsewhere, so a diagram's rendered position is exactly where it was in
    the `.mdx` source.
  - Across pages: module `orderIndex` comes from walking the actual
    `apps/docs/sidebars/<course>.json` in array order — the same file
    Docusaurus itself uses for its own nav — so course structure is
    preserved by construction, not reconstructed.
  - Where a diagram visually lands near the bottom of a page, that's
    matching the source, not a bug: e.g.
    `solid-principles/open-closed/04-python.mdx` deliberately places its
    architecture diagram at line 404/441 (91% down), immediately before
    "## Key takeaways", as a closing visual summary — verified by grepping
    heading/tag line numbers directly against the source file. Compare
    `single-responsibility/04-python.mdx`, whose diagram sits at line
    14/372 (4% down), right after the "Implementation" heading — same
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
   `apps/api/scripts/import-docusaurus-course.ts` — the script hard-refuses
   any slug not on this allowlist, on purpose (a safety gate, not an
   oversight).
3. **Watch for stale `svgGitTracked` manifest data.** This is the one
   real bug class found so far (session 1, this task): a diagram-manifest
   JSON can say `svgGitTracked: false` for an SVG that IS actually
   committed, if the manifest was generated before the SVG got committed
   and nothing in this repo re-syncs it after the fact. The importer's
   `convertAsciiDiagrams()` hard-stops the WHOLE course on this (by
   design — do not weaken this check to unblock an import). If a course
   hard-stops citing this, cross-check the flagged files against
   `git ls-files apps/docs/static/img/diagrams/` directly; if they ARE
   tracked, it's stale data — patch the manifest JSON's `svgGitTracked`/
   `untrackedSvg` fields (and `summary.json`'s per-course `untrackedSvg`)
   to match real git state, rather than editing the importer. (No reusable
   script for this yet — see Next Action item 3 below; it was a one-off
   scratch fix each of the 6 times so far.)
4. **Run it:**
   `cd apps/api && npx tsx scripts/import-docusaurus-course.ts <slug>`
   (omit the slug to import every course in `TARGET_COURSES` at once).
   It's idempotent (`upsertBySlug`/`upsertImported`) — safe to re-run after
   a content or script fix without creating duplicates.
5. **What it does NOT do, on purpose:** publish the course (always lands
   `status: draft` — an explicit admin-UI publish step is required per
   course after review), or carry over any interactive/executable content
   (e.g. `coding-bootcamp`'s Judge0-backed code-execution exercises depend
   on `apps/docs`'s separate Supabase auth stack — prose/diagrams import
   fine, the interactive widgets just won't work post-import).
6. **Verify after running:** spot-check the DB (`Course` row + `CourseModule`
   count/`orderIndex`/`sectionLabel`), then browse the course live —
   specifically the Course Overview module (duplicate-heading risk if a new
   course's `index.md` also leads with `# <title>` — should already be
   handled by `stripLeadingH1()`, but worth eyeballing), any diagram-bearing
   module (caption present, image loads), and at least one module in each
   language the course covers if it's a per-language-leaf-doc course
   (java/csharp/bash code blocks needed the `prismLanguages.ts` fix — see
   session 3/4 above — a brand-new language not yet in that file's
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
  still present in `import-docusaurus-course.ts` — nothing had reverted
  them, no re-run needed.
- `npx tsc --noEmit`: clean after each change in this session.

## Completed (session 5: full-width content + first live browser verification)
User's screenshot ("messed up the whole layout... needs to be full width")
plus a follow-up "sidebar should be of browser [width]" pointed at real
CSS width caps, and — for the first time this task — browser tools became
available, so this was verified live rather than reasoned from CSS alone.
- Measured live via `javascript_tool` on the actual page at a 2400px
  viewport: `.content` (learn/[slug]/layout.module.css) was hard-capped
  at `max-width: 1600px`, leaving a 464px dead gap before the scrollbar;
  the inner "paper sheet" `.container` (CourseModulePage/styles.module.css)
  was ADDITIONALLY capped at 900px via two back-to-back `.container` rules
  in the same file (the second silently overriding the first's 1200px) —
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
    (was 1600px / 900px) — measured via `getBoundingClientRect()`, not
    just visual inspection.
  - Toggled dark mode live and scrolled to non-comment Java code: real
    per-token-type colors confirmed with my own eyes for the first time
    this task (keywords blue, class names teal, `@Override` yellow,
    strings orange, comments green) — the session-3/4 fix is genuinely
    working, not just passing an isolated repro.
  - Checked the course-home page (`/learn/solid-principles`, no
    `moduleSlug`) too: `CourseModuleIndex` correctly switches to its
    course-switcher view (lists every other course in the sidebar) —
    confirms the session-2 sidebar restoration's *other* view also works,
    not just the module-outline one.
- `npx tsc --noEmit`: clean. Closed the browser tab when done (session's
  own tab-hygiene convention).

## Completed (session 2: bugs found by browsing solid-principles live)

## Completed (session 2: bugs found by browsing solid-principles live)
User published `solid-principles` themselves (not via this script — the
importer never touches `status`) to look at it in the browser, and found
three issues:

1. **Duplicate heading on the Course Overview module** — fixed in
   `import-docusaurus-course.ts`. `apps/docs/docs/solid-principles/index.md`
   (and presumably other courses' top-level index.md files) leads its body
   with `# <same as frontmatter title>` — a common Docusaurus authoring
   habit the importer never stripped, so the reader's own
   `<h1>{module.title}</h1>` plus that leading body H1 rendered the title
   twice. Verified (via `grep`, excluding code-fence false-positives) this
   is the ONLY genuine leading-H1 case across all of solid-principles'
   source files — every per-language leaf doc is clean. Added
   `stripLeadingH1()` (strips only a genuine first-line H1, never a `# `
   inside a later code fence) and applied it at both body-construction
   sites (`loadCourseOverview()` and the general leaf-module loop).
2. **Diagram captions silently dropped** — fixed. `convertAsciiDiagrams()`
   extracted `id`/`mermaidSrc`/`alt` from each `<AsciiDiagram>` tag but
   never `caption`. Checked the reader's sanitize schema
   (`CourseModuleArticle.tsx` extends `rehype-sanitize`'s `defaultSchema`
   with only `'u'`) — `<figure>`/`<figcaption>` are NOT in that allowlist,
   so used the closest allowed equivalent instead: `<p><em>{caption}</em>
   </p>` appended right after the `<img>`.
   - Re-ran `import-docusaurus-course.ts solid-principles` after both
     fixes (safe/idempotent, `upsertBySlug`) and verified directly in the
     DB: Course Overview module's body no longer starts with the
     duplicate heading; a diagram-bearing module now has the
     `<p><em>...</em></p>` caption line after its `<img>`.
3. **No course-navigation sidebar while reading a module — a real
   regression, not a missing feature.** Traced via `git log -S` across
   the whole repo: a component called `CourseModuleIndex` (course
   switcher on the course home page, per-course module outline with green
   completion dots + lock badges + sectionLabel grouping once inside a
   module) was deliberately built 2026-08-22 specifically to REPLACE
   `DashboardSidebar` for the entire `/learn/[slug]` subtree ("the
   generic app nav isn't useful while inside a course" — its own original
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
     unfiltered `git show --stat` as a pure rename — zero content changes
     to `page.tsx`/`[moduleSlug]/page.tsx` themselves) so it would pick up
     `(app)/layout.tsx`'s `DashboardSidebar` — and simply deleted
     `learn/[slug]/layout.tsx` + `layout.module.css` + the
     `CourseModuleIndex` component entirely in the same commit, with no
     replacement. Not a deliberate design change with a documented
     rationale — just dropped.
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
     `[moduleSlug]/` subdirectory's `page.tsx`/`loading.tsx`/`error.tsx` —
     none of their own content needed changes, only their location.
   - `/learn` itself (the top-level course-browsing grid,
     `(app)/learn/page.tsx`) was untouched — stays inside `(app)` with
     `DashboardSidebar`, exactly as documented. Only `/learn/[slug]` and
     `/learn/[slug]/[moduleSlug]` moved back out.
   - Confirmed `/courses/sidebar-list` (the API endpoint the restored
     layout fetches for the course-switcher list) still exists in
     `CourseController.ts` — not something else that had also rotted.
   - `npx tsc --noEmit -p apps/web/tsconfig.json` initially reported 2
     errors pointing at the OLD `(app)/learn/[slug]` path inside
     `.next/types/validator.ts` — confirmed this is just a stale
     Next.js-generated artifact (the file itself says auto-generated),
     deleted `apps/web/.next` and re-ran clean.
   - **Not yet done**: browser verification (no browser tool available
     this session) that the restored sidebar actually renders correctly
     — the course-switcher view on `/learn/solid-principles`, and the
     module-outline-with-completion-dots view on
     `/learn/solid-principles/<any-module-slug>`, plus that `next dev`
     doesn't error on the moved route files.

## Completed (session 3: code-block syntax highlighting was silently broken)
User reported code blocks in the course reader looked plain/monochrome
(one screenshot showed every token — keywords, class names, strings,
comments — in the same flat cyan). Traced to a real, verified, monorepo-
wide bug, not a missing feature or wrong theme choice:

- `CourseModuleArticle.tsx` already renders every fenced code block
  through `@/components/BlogPostPage/CodeBlock.tsx`, which already uses
  `prism-react-renderer`'s `Highlight` (hooks-based) with a real theme —
  this was never actually a "no highlighting exists" situation, contrary
  to my own first assumption a few turns earlier (a bad grep pattern
  missed the existing wiring — flagging my own mistake here, not just the
  user's).
- Root cause, found by reproducing outside the app (a throwaway repro
  script, deleted after): `apps/web/package.json` pinned `react`/
  `react-dom` at an exact `19.2.4`, separate from the monorepo root's
  hoisted `19.2.7` (which every other workspace effectively uses, driven
  by `apps/docs`'s `^19.0.0` range resolving to that version). Since
  `prism-react-renderer` is a root-only dependency (nothing pins a nested
  copy for it), its internal `require('react')` walks up from *its own*
  location in `node_modules` and finds the root's 19.2.7 — a different
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
  repo root — confirmed via `npm install`'s own "removed 2 packages"
  output and directly checking `apps/web/node_modules` that the nested
  copies are gone; the whole workspace now shares one React 19.2.7.
  Re-ran the isolated repro to confirm the fix. Did NOT touch `apps/app`'s
  matching `19.2.4` pin — that app is retiring, out of scope, and nothing
  reported a problem there.
- Also switched `CodeBlock.tsx`'s theme pairing from `themes.github`
  (light) / `themes.dracula` (dark) to `themes.vsLight`/`themes.vsDark` —
  requested as "pick one, some coding style" before the duplicate-React
  bug was found; github's light-mode colors are subtle enough to read as
  "no styling" at a glance, VS Code's are unambiguous in both modes. This
  was already in place *before* the real bug was found and stays as the
  new default regardless.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: clean after the version
  bump + reinstall. Restarted the dev server (killed the stale PID,
  cleared `apps/web/.next`, fresh `npm run dev`) — ready in <1s, no
  compile errors in the log.
- **Not yet done**: browser verification that code blocks actually render
  with proper per-token colors now (no browser tool available this
  session) — the isolated repro proves the mechanism works again, but
  hasn't been seen through the actual page.
- **This fix was necessary but turned out NOT sufficient** — see session 4.
  The user sent a screenshot after this fix showing code still rendering
  in one flat color, plus the restored `CourseModuleIndex` sidebar
  actually working correctly (visible in the same screenshot: course
  name, section-grouped module list, green completion dots, "6 / 36"
  position, Bookmark button, prev/next chevrons — all rendering as
  designed, contrary to the user's "messed up the whole layout" framing
  of that screenshot; the layout itself was fine, only the code color
  was the real problem).

## Completed (session 4: the REAL remaining cause — missing Prism language grammars)
Stopped guessing from code reading alone and reproduced empirically:
rendered the actual production `CourseModuleArticle` component (via
`tsx`, with a throwaway CSS-module stub since Node can't load `.css`
imports directly) using the real `bodyMdx` pulled straight from the DB
for the exact module in the user's screenshot. Result: every single
token — keywords, class names, strings, comments, everything — came back
tagged `"token plain"`, i.e. completely untokenized, not just
miscolored.

- Root cause: `prism-react-renderer` only bundles a small, "a little
  arbitrary" (its own README's words) default set of Prism language
  grammars. Verified directly: `python`/`javascript`/`typescript`/`rust`
  tokenize into real types (keyword/string/function/etc.) out of the box;
  `java`/`csharp`/`bash` come back as 100% `plain` — silently, no error,
  no console warning. This course's per-language leaf docs cover exactly
  JavaScript, TypeScript, Python, Java, C#, Rust — so 2 of 6 languages
  (Java, C#) were guaranteed to render with zero color, plus Bash
  (relevant to other courses, e.g. git-github-actions, even though not
  used in solid-principles).
- Confirmed `prism-react-renderer` v2.4.1 (resolved from `^2.3.0`) exports
  its internal `Prism` instance directly (`import { Prism } from
  'prism-react-renderer'`) — the OLD documented fix recipe
  (`require('prism-react-renderer/prism')`) doesn't apply to this version,
  it has no such subpath export; had to find the real export by reading
  `dist/index.js` directly rather than trusting the README's example.
- Fix: new `apps/web/src/lib/prismLanguages.ts` — points the global
  `Prism` (both `window` and Node's `global`) at prism-react-renderer's
  own internal instance, then `require()`s the missing
  `prismjs/components/prism-{java,csharp,bash,go,sql,yaml,json}` grammar
  files (each is a plain IIFE that self-registers onto whatever `Prism`
  global it finds — this is a *different* Prism ecosystem than the plain
  `prismjs` package the Lexical-based admin editors use directly elsewhere
  in this app, so pointing the global at the wrong one would silently
  fail again). Imported once, for its side effects, at the top of
  `CodeBlock.tsx`.
- Verified twice: (1) isolated repro — `java`/`csharp`/`bash` all produce
  real differentiated token types after the fix, matching what
  `python`/etc. already produced; (2) rendered the real production
  component with the real DB content again — 4 distinct colors now
  present (was 2: pure black text + white background, i.e. nothing).
- `npx tsc --noEmit`: clean. Dev server restarted clean again (killed
  stale PID, cleared `.next`, fresh `npm run dev`, confirmed via `netstat`
  + a live `curl` response after a stray leftover-buffered-output line in
  the log briefly looked like a crash but wasn't — the old killed
  process's tail output landed in the same log file path, not this run).
- Went with `java`/`csharp`/`bash`/`go`/`sql`/`yaml`/`json` as the
  additional set (covers this course's full 6-language spread plus common
  DevOps-adjacent languages likely to show up in other courses,
  e.g. git-github-actions) rather than importing every language
  `prismjs/components/` ships — reasonable default, not exhaustive; add
  more the same way if another course surfaces one still rendering flat.

## Completed (session 1: import + manifest fixes)
- Confirmed all 20 requested course slugs (the original 14 + the 6 new
  ones) show `pending: 0` / `hashMismatches: 0` in
  `apps/docs/diagram-manifests/summary.json` — diagram-conversion-ready.
  `system-design-fundamentals` (not requested) correctly stays out of
  scope, nowhere close (3657/3696 pending).
- Structurally spot-checked `solid-principles`/`design-patterns` (sidebar
  + actual doc files) before running anything — per-language leaf docs
  (`<topic>-overview.mdx`, `-javascript.mdx`, etc.) under a category whose
  own index page is a pure `<DocCardList />` stub, plus a course-level
  index with real prose + `<CourseCurriculum/>`. Both patterns already
  match what the importer's existing logic handles — no script logic
  changes needed for these course *shapes*.
- Added the 6 new slugs to `TARGET_COURSES` in
  `import-docusaurus-course.ts` (the script hard-refuses any slug not on
  this allowlist), plus a header comment explaining the addition and
  flagging `coding-bootcamp`'s known caveat (see Decisions below). Updated
  the "no args = all N target courses" usage comment (14 -> 20).
- **Real bug found and fixed** (in the data, not the script): all 6 new
  courses had a large fraction of diagram-manifest entries with
  `svgGitTracked: false` (100% for 3 of them) — this is what actually
  hard-stopped the first pilot attempt. Cross-checked every flagged SVG
  against `git ls-files apps/docs/static/img/diagrams/` directly and found
  **zero genuinely-untracked files** — 100% stale manifest data (the SVGs
  were committed after their manifests were last generated; no script in
  this repo regenerates `svgGitTracked`, confirmed via Grep across
  `apps/docs`). Patched all 6 manifest JSON files' `svgGitTracked` +
  `untrackedSvg` fields, and `summary.json`'s per-course `untrackedSvg`,
  to match verified real git state, via a one-off scratch Node script
  (not saved as a reusable repo tool — see Next Action).
- Re-ran the import for `solid-principles` (chosen as the pilot: new
  course shape not yet proven through this script, small — 35 diagrams —
  low blast radius). **Succeeded**: 36 modules (35 leaf docs + 1 synthetic
  Course Overview), `status: draft`. Verified via direct DB query — course
  row, module count, `orderIndex` sequencing, and `sectionLabel` grouping
  (e.g. all 7 "Single Responsibility Principle" leaf docs share that
  label) all look correct.
- Found, not fixed (out of scope for an importer — it should copy content
  verbatim, not rewrite it): `open-closed/01-overview.mdx`'s frontmatter
  title uses a literal `--` instead of the em-dash (`—`) other overview
  pages in this same course use. Pre-existing source inconsistency in
  `apps/docs`, worth a pass if/when that course gets a content-quality
  cleanup.
- Wrote this session's findings into memory
  (`sypher-next-docusaurus-importer.md`, updated not replaced) since
  they're durable/reusable facts, not just this task's live state.

## Decisions
- Picked `solid-principles` as the sole pilot import (small, structurally
  representative of the newer multi-language-per-topic course shape) —
  user's own call to make if a different one was wanted, they can redirect.
- `coding-bootcamp` was added to `TARGET_COURSES` (user explicitly listed
  it) but its known caveat still stands: it depends on `apps/docs`'s
  separate Judge0/Supabase auth stack for interactive code-execution
  exercises (see memory `sypher-next-judge0-held`), which this importer
  does not carry over — importing it would bring over prose/diagrams only,
  with any interactive exercise widgets non-functional post-import. Flag
  this again before actually running it, not just noting it in a comment.
- Did not weaken the importer's `svgGitTracked` safety check itself (e.g.
  by making it non-blocking) — fixed the underlying stale data instead,
  since the check is a real, working safety mechanism, just fed stale
  input for these 6 courses specifically.

## Tests/Validation
- `npx tsx scripts/import-docusaurus-course.ts solid-principles`: hard-stop
  on first attempt (stale `svgGitTracked`, zero partial writes — the
  hard-stop-on-failure design worked exactly as intended); succeeded after
  the manifest fix; succeeded again (idempotent update) after the
  heading/caption fixes. Verified via `docker compose exec postgres psql`
  each time: `Course` row, `CourseModule` count = 36, ordering/
  `sectionLabel` grouping, then the corrected `bodyMdx` content directly
  (no leading duplicate H1; a diagram module's caption paragraph present).
- `npx tsc --noEmit -p apps/web/tsconfig.json`: clean after the
  sidebar-restoration file moves (one stale-`.next`-artifact false alarm,
  resolved by deleting `apps/web/.next`).
- Not browser-verified (no browser tool available this session) — the
  restored `CourseModuleIndex` sidebar's two views (course-switcher on
  `/learn/solid-principles`, module-outline-with-completion-dots on any
  module under it) and that `next dev` serves the moved routes without
  error still need an actual look in a browser.
- User independently published `solid-principles` themselves (this
  importer never touches `status`) and found the three session-2 bugs by
  browsing it live — not something this session verified in a browser
  itself.

## Files Modified
- `apps/api/scripts/import-docusaurus-course.ts` (TARGET_COURSES, header
  comments, `stripLeadingH1()`, caption extraction/rendering)
- `apps/docs/diagram-manifests/{sorting-algorithms,search-algorithms,
  solid-principles,design-patterns,git-github-actions,coding-bootcamp,
  summary}.json`
- `Course-Creation-Guide.md` (added an inline-code-for-identifiers row to
  the "Content do's and don'ts" table — see below)
- `apps/web/package.json` (`react`/`react-dom` 19.2.4 -> 19.2.7, matching
  root) + root `package-lock.json` (regenerated by `npm install`)
- `apps/web/src/components/BlogPostPage/CodeBlock.tsx` (theme pair
  github/dracula -> vsLight/vsDark; added the `prismLanguages` side-effect
  import)
- `apps/web/src/components/CourseModulePage/styles.module.css` (new
  `.body p:has(> em:only-child) { text-align: center; }` rule for diagram
  captions; session 5: removed the duplicate/overriding 900px `.container`
  rule and the 1200px cap on the remaining one; session 6: fixed
  `.pagination`'s stale 240px-DashboardSidebar offset + dropped its dead
  1200px cap, added `.container`'s chevron-clearance margin + matching
  768px/640px breakpoint overrides; session 7: `.container` reworked to
  `max-width: min(var(--card-max), calc(100% - var(--card-clearance)))` +
  `margin: 0 auto` (984px A4-like centered card, replaces the fixed
  clearance margin); `.moduleTopRow` switched flex/space-between -> CSS
  grid (`1fr auto 1fr`) with `justify-self` per child; `.paginationLink`/
  `.pagerIcon` restyled to a bare icon button (no fill/border/shadow);
  `.pagination`'s `left`/`right` now derived from the shared `--pane-*`/
  `--card-*` vars to hug the card instead of the pane's outer edge)
- `apps/web/src/app/learn/[slug]/layout.module.css` (session 5: removed
  `.content`'s 1600px max-width cap; session 6: added the thin/
  transparent-until-hover scrollbar treatment matching the sidebar's;
  session 7: reverted the session-6 10%-condense flex/width hack back to
  plain `flex: 1` now that `.container` owns its own width/centering;
  `.shell` gained shared `--pane-left`/`--pane-right`/`--card-max`/
  `--card-clearance` custom properties, read by both this file and
  `CourseModulePage/styles.module.css`)
- `apps/web/src/lib/prismLanguages.ts` (new — registers java/csharp/bash/
  go/sql/yaml/json grammars onto prism-react-renderer's own Prism instance)
- `apps/web/src/components/BlogPostPage/CodeBlock.tsx` (session 8: theme
  object now overrides `plain.backgroundColor` to
  `var(--ifm-color-emphasis-50)` so code blocks are visibly differentiated
  from the surrounding card in both light and dark mode)
- `apps/web/src/components/CourseModuleIndex/styles.module.css` (session
  6: width 280px -> 240px, book icon 80px -> 22px + recolored to
  `--ifm-color-primary`, tightened padding/font-sizes throughout for a
  thinner overall look)

## Files Moved (git mv, content unchanged)
- `apps/web/src/app/(app)/learn/[slug]/{page.tsx,styles.module.css,
  loading.tsx,error.tsx}` -> `apps/web/src/app/learn/[slug]/...`
- `apps/web/src/app/(app)/learn/[slug]/[moduleSlug]/{page.tsx,loading.tsx,
  error.tsx}` -> `apps/web/src/app/learn/[slug]/[moduleSlug]/...`

## Files Restored (verbatim from git history, previously deleted)
- `apps/web/src/components/CourseModuleIndex/{index.tsx,styles.module.css}`
- `apps/web/src/app/learn/[slug]/{layout.tsx,layout.module.css}`

Plus a real DB write from session 1: `solid-principles` Course + 36
CourseModule rows in the local Postgres (docker `api-postgres-1`,
`sypher_next` db), re-updated (idempotent upsert) after the heading/
caption fixes. The course's `status` is now `published` (the user did
this themselves via the admin UI, not this session/script).

## Unrelated small change (mid-session tangent)
User pointed at GitHub's basic markdown formatting guide and asked that
identifiers (function/variable names) mentioned in prose be wrapped in
backticks going forward — confirmed scope as "general rule, not a fix to
existing content." Added one row to `Course-Creation-Guide.md`'s "Content
do's and don'ts" table linking that GitHub doc. Did not also touch
apps/docs's various `add-*` authoring skill files (design-patterns,
solid-principles, etc. are authored through those, not this guide) —
flag if the rule should live there too, since `Course-Creation-Guide.md`
is Sypher Next (apps/web)-specific by its own title.

## Next Action
1. ~~Browser-verify the sidebar, routes, code colors, and width~~ — DONE
   in session 5, live, in an actual Chrome session: all confirmed working
   (sidebar both views, code block colors in dark mode, full-width
   content/container measured via JS). Worth a final look at the OTHER
   already-imported 14 courses' code blocks at some point too (this
   session only checked solid-principles), since the Prism-language-
   grammar bug would have affected any of them using java/csharp/bash.
2. Ask the user which of the remaining 5 staged courses (sorting-
   algorithms, search-algorithms, design-patterns, git-github-actions,
   coding-bootcamp) to import next, and whether one at a time or all at
   once now that the manifest data is fixed.
3. Consider proposing a small reusable
   `refresh-diagram-manifest-git-status.mjs` in `apps/docs/scripts/` so
   the `svgGitTracked`-staleness class of bug doesn't require a one-off
   scratch script again next time.
4. Worth a broader audit at some point: this session only fixed
   apps/web's duplicate-React pin. `apps/app` has the identical `19.2.4`
   exact pin diverging from root's `19.2.7` — not touched (retiring app,
   out of scope, nothing reported broken there) but the same class of bug
   could exist for any hooks-based root-only dependency it uses too.
5. (session 7) Mobile breakpoints (768px/480px) for the new grid top-row
   and card-hugging chevrons were reasoned through but not live-verified —
   `resize_window` doesn't reliably change `window.innerWidth` in this
   browser-tools environment (noted session 5/6 too), so narrow-viewport
   behavior should get an actual look (real device, or a browser resized
   by hand) next time a browser session is available.
6. (session 7) `--card-max`/`--card-clearance` (currently 984px/10rem) are
   this session's own numbers, chosen from the user's literal requests
   ("A4 sheet size", then "+20%") rather than a design-system value — treat
   as adjustable if the user wants the column narrower/wider again, and
   remember to change them in ONE place (`layout.module.css`'s `.shell`)
   since both `.container` and `.pagination` read the same vars.

## Last Updated
2026-09-06

## Handoff Events

- 2026-09-05T20:47:38.229Z — auto-compaction (trigger: auto, session: e3397eef-52e2-4218-b953-18b7ec8a86e6). Verify Status/Next Action above are current.
- 2026-09-06 (session 7) — A4-card rework, chevron restyle, top-row grid fix, diagram-order investigation, and this "how to import" reference section all added post-compaction. Status/Next Action above are current as of this entry.
- 2026-09-06 (session 8) — code-block background differentiation (light/dark) added. Status/Next Action above are current as of this entry.
