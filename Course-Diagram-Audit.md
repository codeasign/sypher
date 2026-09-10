# apps/web diagram and caption audit + repair

Diagnosed 2026-09-10. Repaired 2026-09-11. All writes went through the
authenticated apps/api management API; no wholesale course reimport; course IDs,
module IDs, slugs, order, section metadata, access grants and published status
were preserved. No git-tracked files hold course content — the changes are DB
rows and Bunny CDN assets.

## Final state (2026-09-11)

Full re-audit of all 37 courses / 1,304 modules / 949 imported SVG references
across 18 courses (`node apps/api/scripts/audit-course-diagrams.mjs`):

| Signal | Before | After |
|---|---:|---:|
| Imported `<img>` NOT wrapped in `<figure>` | 949 | **0** |
| SVGs with the grey edge-label paragraph defect | 13 | **0** |
| Captions present in source but absent from the DB body | 225 | **0** |
| Ordinary paragraphs matched by the caption CSS selector | 74 | **0** |
| Diagrams matched to a source (no unresolved) | 949 | 949 |

- 912 of the 949 figures now carry a `<figcaption>` (544 from a caption the
  importer had already stored as `<p><em>…</em></p>`, 225 restored from the
  source `caption` attribute, 143 from the source `title` attribute in
  git-github-actions). The remaining **37** figures (all in git-github-actions)
  are intentionally caption-less: their source `<AsciiDiagram>` has only an
  `alt` long-description and no `caption`/`title`, and `alt` is not reused as a
  visible caption.
- SVG themes now: 936 `blackboard-v3` (healthy, untouched) + 13 `blackboard-v4`
  (the repaired ones). Healthy diagram URLs were left exactly as they were.
- `changedSourceHash` is still non-zero for some courses. That is expected and
  was deliberately left alone — the live diagram content is preserved rather
  than reimported from a drifted source.

## What was wrong (diagnosis, 2026-09-10)

Screenshot page:
`https://next.sypher.local/learn/typescript-for-test-automation/just-enough-typescript-to-read-a-test`

1. **Grey box behind an edge label.** The Mermaid SVG contains an `edgeLabel`
   `<span>` wrapping a nested `<p style="background-color: rgba(232,232,232,0.8)">`.
   The blackboard-v3 normaliser overrode `.edgeLabel span` / `rect` / `polygon`
   but never the nested `<p>`, so its explicit light-grey background showed
   through over the dark diagram. 13 SVGs across 5 courses hit this exact shape.
2. **Missing captions.** The importer at commit `c4e7bec2` emitted only
   `<img src alt>` and discarded the `<AsciiDiagram caption>`. 225 captions
   across 11 courses were never stored. A later importer emitted
   `<p><em>caption</em></p>`, which is why 544 other diagrams did have caption
   text in the DB.
3. **Prose styled as a caption.** `styles.module.css` styled `img + p` and
   `p:has(> em:only-child)`, so the ordinary paragraph after any diagram was
   centred and shrunk. 74 paragraphs across 8 courses were affected.

## What was changed

### Preventive code (git-tracked, uncommitted)

- `apps/api/src/lib/diagramSvg.ts` — shared `readableBlackboardSvg` (blackboard-v4:
  strips a prior `data-sypher-theme` block, adds `#<id> .edgeLabel,#<id> .edgeLabel *`
  background overrides that DO reach the nested `<p>`) and `diagramSvgFilename`
  (`<stem>.blackboard-v4-<sha256-12>.svg`, content-addressed so a corrected asset
  gets a fresh immutable URL).
- `apps/api/src/lib/diagramMarkup.ts` — `renderDiagramFigure(url, alt, caption?)`
  emits `<figure><img/><figcaption?/></figure>` (caption optional, escaped once);
  `diagramCaption(caption, title)` prefers caption then title and returns
  `undefined` otherwise (never `alt`); `assertImportedDiagramCaptions` requires a
  `/svgs/` `<img>` to be inside a `<figure>`, allows an image-only figure, and
  rejects an empty or duplicated `<figcaption>`. Ignores fenced code blocks.
- `apps/api/src/controllers/CourseController.ts` — runs `assertImportedDiagramCaptions`
  on module create / import / update.
- `apps/web/src/components/CourseModulePage/markdownSchema.mjs` — reader
  sanitizer schema extended with `figure` / `figcaption` (all other restrictions
  kept). `CourseModuleArticle.tsx` uses it. `styles.module.css` dropped the broad
  `img + p` / `p:has(em)` rules and styles only `figure` / `figcaption`.
- `apps/api/scripts/import-docusaurus-course.ts` — future imports produce v4
  content-hashed SVGs and `<figure>` markup.

### Repair (DB + CDN, not git)

- `apps/api/scripts/repair-course-diagrams.mjs` — idempotent, dry-run by default.
  Per module: wraps every bare `/svgs/` `<img>` in `<figure>`, folds an existing
  trailing `<p><em>caption</em></p>` verbatim into `<figcaption>`, else restores
  the caption from the source manifest (`caption` then `title`). For the 13 grey
  SVGs it fetches the CURRENT CDN bytes, re-normalises them with the shared v4
  helper, uploads under a new content-hashed name in the SAME folder, and swaps
  only those 13 URLs. Applies via the authenticated API with a per-module
  preflight-snapshot check; re-running makes zero changes. Ran staged over 18
  courses on 2026-09-11 (reports in
  `C:\Users\admin\AppData\Local\Temp\sypher-diagram-repair-backups\repair-*.json`).
- Pre-repair backup of all 37 courses / 1,304 modules:
  `C:\Users\admin\AppData\Local\Temp\sypher-diagram-repair-backups\course-bodies-backup-2026-09-10T18-29-27-925Z.json`.

## Verification

- `node apps/api/scripts/audit-course-diagrams.mjs` (all 949, updated to use the
  reader's real sanitizer schema and to recognise the v4 override): every course
  `bareImportedImg 0`, `graySvgDefect 0`, `missingCaptions []`,
  `styledProseParagraphs 0`, `unmatched 0`; 13 SVGs `blackboard-v4`, rest v3, all
  HTTP 200.
- `node --test apps/api/scripts/diagram-safeguards.test.mjs` — 14 tests, green
  (nested grey-`p` override, SVG idempotence + content-hash filename, figure
  contract incl. image-only + empty/duplicate rejection, fenced-code / non-svg
  ignore, renderer escaping, caption fallback, reader sanitizer keeps
  figure/figcaption while stripping `<script>` and NOT wrapping a plain
  paragraph after a bare image).
- Browser (authenticated): `typescript-for-test-automation/just-enough-typescript-to-read-a-test`
  and `/functions-and-imports`, `python-for-test-automation/setup`,
  `git-github-actions` overview pages — grey label boxes gone, captions render as
  a small muted centred `<figcaption>` (or absent for the 37 caption-less),
  following prose is ordinary body text.

## Reusable commands

    cd apps/api
    node scripts/audit-course-diagrams.mjs [--course <slug>...] [--captions-only]
    node scripts/repair-course-diagrams.mjs [--apply] [--course <slug>...] [--report <path>] [--out-dir <dir>]
    node --test scripts/diagram-safeguards.test.mjs
