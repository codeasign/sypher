# Current Task Handoff

## Objective
Fix course-card navigation performance by removing lesson bodies from module
lists, fetching one lesson body at a time, parallelizing independent reads,
and adding loading/error feedback. Certifications are a separate investigation
and remain on hold.

## Status
Course fix complete and committed by the user in `d6589c46`.
The AGENTS.md restart clarification is committed in `1964d5c3`.
Working tree was clean when these commits were verified; only this handoff
update is now uncommitted.

## Completed
- Added `CourseModuleRepository.listMetadataForCourse`, which omits `bodyMdx`
  at the Prisma query rather than stripping it after transfer from PostgreSQL.
- Wired the public course module-list endpoint to metadata-only results. Module
  metadata and completion progress now load concurrently.
- Kept `GET /courses/{slug}/modules/{moduleSlug}` as the individual lesson-body
  endpoint. Its lesson, module-navigation metadata, and completion reads now
  run concurrently after access is confirmed.
- Added a frontend `CourseModuleSummary` type so course and lesson navigation
  cannot depend on `bodyMdx`.
- Parallelized course-page module, bookmark, and related-course reads. Related
  course lookups fan out concurrently.
- Parallelized lesson-page module-navigation, bookmark, and conditional account
  reads.
- Added route-level loading and retryable error feedback for both course and
  lesson pages; non-404 API failures now reach the error boundaries instead of
  silently rendering empty data.
- Confirmed the narrowed `Pick<...>` inputs in `coursePreview.ts` compile in the
  API and web TypeScript projects.
- Removed `scratch/course-perf-chrome/` and the temporary curl cookie file.
- Added the separately requested local dev server restart permission note to
  `AGENTS.md`; committed by the user in `1964d5c3`.

## Decisions
- Browser/Puppeteer verification is explicitly dropped for this task. API-level
  curl benchmarks are the accepted proof because oversized API payloads are the
  confirmed root cause.
- Public module lists contain no lesson body for either locked or unlocked
  modules. The single-module endpoint remains responsible for body delivery and
  locked-body stripping.
- Certifications remain separate and untouched.
- The old pending `.gitignore` note was stale; that work was already committed.

## Curl Benchmark
Target: `agentic-ai-fundamentals` (234 modules), authenticated local API,
five sequential curl runs per endpoint. Times are min / median.

| Endpoint | Before payload | After payload | Before time | After time |
| --- | ---: | ---: | ---: | ---: |
| Course detail | 473 B | 473 B | 23.049 / 28.698 ms | 17.364 / 26.266 ms |
| Module list | 1,530,623 B | 118,675 B | 72.107 / 81.738 ms | 24.555 / 33.068 ms |

The module-list payload fell 92.25%; median response time fell 59.54%.
All 234 list entries were checked: zero contained `bodyMdx`. A separate curl
request for the first lesson (`overview`) contained `bodyMdx` with a 4,150-byte
body, confirming bodies are still delivered individually.

## Tests/Validation
- `npm run build --workspace apps/api` — passed (tsoa generation + TypeScript).
- `npx tsc --noEmit -p apps/web/tsconfig.json` — passed.
- `npm run build --workspace apps/web` — application bundle compiled
  successfully; the later Next.js TypeScript worker launch failed with the
  environment-level `spawn EPERM`.
- API and web lint scripts could not run: ESLint 9 reports that the repo has no
  `eslint.config.js`, `.mjs`, or `.cjs`.
- `git diff --check` — passed before the final handoff update.
- Ports 3002 and 4000 remain listening after validation.

## Known Issues
- Full Next production build cannot finish in this environment because its
  post-compilation worker launch returns `spawn EPERM`.
- Both workspace lint scripts are blocked by the repository's missing ESLint 9
  flat configuration.

## Files Modified
- `memory-bank/current-task.md` — records the user's commits and current hold.

## Next Action
Await the user's instruction to resume certifications; they remain on hold.
When resumed, investigate the single-exam lookup by slug separately from the
completed course fix. Do not launch Chrome/Puppeteer for this task.

## Last Updated
2026-09-05
