# Sypher — Project Reference (all agents)

This file is the single source of truth for working in this repo. It is
read by any coding agent — Claude Code, OpenAI Codex, or others. It
contains no tool-specific behavior; agent-specific instructions (e.g. for
Claude Code) live in that tool's own instruction file (`CLAUDE.md`) and
must point back here rather than duplicate this content.

Monorepo with two course platforms:

- **apps/web + apps/api ("Sypher Next")** — DB-backed courses (PostgreSQL via
  Prisma), react-markdown rendered. **All NEW authored/life-skill courses go
  here.** See "Sypher Next course authoring" below.
- **apps/docs** — legacy Docusaurus site (structure below), being phased out;
  no new UI/UX work here.

## Sypher Next course authoring (apps/web)

Canonical reference: `Course-Creation-Guide.md` at repo root.
Life-skill courses: `.claude/commands/next-life-skill.md`.

- Courses/modules/access are **DB rows only** — no files on disk, no sidebar
  JSON, no route files (`/learn/[slug]` catch-alls serve any course).
- Never write course/module/access rows with the Supabase JS client or a
  service-role key. All writes go through apps/api management endpoints,
  authenticated as the seeded dev admin (`admin@sypher.local`, from
  `apps/api/prisma/seed.ts`) via `POST /auth/login` session cookie:
  POST /courses → POST /courses/{id}/modules (strictly in teaching order) →
  PUT /courses/{id}/access/roles → PUT /courses/{id}/status.
- Bulk driver (run from apps/web):
  `node scripts/import-authored-course.mjs --api http://localhost:4000
  --course <slug> --name "<Name>" --input scratch/<dir>
  [--roles FREE_USER,PAID_USER] [--publish]`
  Idempotent (updates existing modules by slug); order of creation = free
  preview window (first ceil(n*0.2) by orderIndex).
- `POST /courses` accepts an optional explicit `slug`; module slugs derive
  from titles (slugify). Draft is the default; publish only after verifying.
- Course has `category` ("tech" | "life-skills") and `relatedCourses`
  (CSV of slugs); driver flags: --category / --related.
- Module body rules: plain markdown rendered by react-markdown — NO JSX
  components, NO import statements, NO Docusaurus admonitions, NO leading
  `# H1` (the reader page renders `<h1>{module.title}</h1>` itself).
- TRY IT format (all courses): every dialogue line in quotes; 2-3 exercises
  per TRY IT; visible `**Suggested answer:**` directly below each exercise —
  never `<details>` collapses.
- Local dev: Docker Postgres on :5433 first (`cd apps/api && docker compose
  up -d postgres`), then API (:4000) and web (:3002); verify at
  `https://next.sypher.local` (Caddy HTTPS — plain localhost breaks secure
  session cookies).

## Corporate portal (apps/web + apps/api)

Full guide: `Corporate-User-Guide.md` at repo root. Test accounts +
fixture: `Corporate-Test-Accounts.md` (`apps/api/scripts/seed-corporate-test.ts`).

- **`corporate.sypher.local`** is the SAME apps/web app as
  `next.sypher.local` — `apps/web/src/middleware.ts` keys off the
  `corporate.` host prefix and redirects it into the `/corporate/*` route
  tree. Add `127.0.0.1 corporate.sypher.local` to hosts + `caddy reload`
  (`Caddyfile` has the block).
- Flow: `/corporate` (enter company code → `POST /companies/resolve`) →
  `/corporate/login` (company-branded → `POST /auth/login/company`, which
  re-checks the code, credentials, `user.companyId` membership AND
  `Company.accessUntil` before setting a session) → COMPANY_HR lands on
  `/corporate/admin`, everyone else on the main app.
- **Company admin = `Company.adminEmail`** — setting it in the main
  `/admin/access` Company Grants form auto-provisions a `COMPANY_HR`
  account + set-password email (fire-and-forget). No mail server? use
  `POST /access/companies/{id}/admin-invite-link`.
- **Email + first login**: all transactional mail goes through
  `apps/api/src/lib/email.ts` → `emailTemplates.ts` → the Brevo/Resend
  rotation; templates: welcome / set-password / password-reset /
  cohort-welcome. Full map + how to enable delivery: `Email-Hookup.md`.
  Provisioned accounts carry `User.mustResetPassword` — passwordless ones
  can't log in until they use their set-password link; ones with an
  admin-set temp password are routed to `/set-password` on first login.
- **First-login onboarding** (`components/FirstLoginOnboarding`, mounted in
  root `app/layout.tsx`): an app-wide blocking modal — EVERY role, BOTH
  hosts — for `User.onboardedAt IS NULL`: choose handle, pick one of 10
  preset avatars (`public/avatars/`, `scripts/gen-avatars.mjs`) or upload,
  accept Terms/Privacy/Refund. `POST /auth/onboard`. Runs AFTER the
  `mustResetPassword` step. Skipped only on the pre-auth screens. See
  memory `sypher-next-first-login-onboarding`.
- **Local email**: `EMAIL_TRANSPORT=smtp` in `apps/api/.env` routes every
  transactional email to an SMTP server (the docker-compose `greenmail`
  service, or an external GreenMail) instead of Brevo/Resend — read it via
  `docker logs -f api-greenmail-1` or IMAP on `:3143`. `SMTP_*` env vars
  configure host/port/auth. Unset `EMAIL_TRANSPORT` for real delivery
  (production never sets it). Standalone: `greenmail.compose.yml`.
- **Combined testing reference**: `Testing-Accounts-and-Emailers.md` at
  repo root — all test accounts (main + corporate), re-running the
  first-login flows, and reading emails via GreenMail. Deep dives:
  `Test-Accounts.md`, `Corporate-Test-Accounts.md`, `Email-Hookup.md`.
- **`/corporate/admin/*`** (COMPANY_HR only): Groups (create + per-group
  course/sidebar grants), Employees (CSV import: `Full Name, Email Id,
  Department, Role, Manager Name` — Department→group, Role/Manager are
  labels only). Every `/company-admin/*` endpoint scopes to
  `requireCompanyAdmin(user)` → the caller's own `companyId`; no company id
  is ever taken from a path/body.
- **Access model change**: a COMPANY_EMPLOYEE now gets a company course/nav
  item ONLY via a group grant. The Sypher-set company-wide grants
  (`AuthoredCompanyCourseAccess` / `CompanyNavAccess`) are just the
  *ceiling* the portal admin picks subsets from. Resolution
  (`courseAccessInfo`, comment gates, `MockExamController`,
  `AccessController.myNav`) goes through
  `CompanyDirectoryRepository.listCourseIdsForUserGroups` /
  `listNavKeysForUserGroups` (union across the employee's groups,
  `isCompanyAccessActive`-gated).
- **Split-ready**: all new company tables (`CompanyGroup`,
  `CompanyEmployee`, `CompanyGroupMember`, `CompanyGroup{Course,Nav}Access`)
  are **FK-free** with `companyId` on every row, and every read/write goes
  through `CompanyDirectoryRepository` — the single swap point if a
  company's data later moves to a per-company database (this server staying
  the auth/authz + catalog source of truth).
- A "force COMPANY_* accounts through the portal" enforcement point is
  marked-but-not-built in `AuthController.login`, `AuthController.googleCallback`,
  and `middleware.ts`.

## apps/docs project structure (legacy Docusaurus)

docs/<slug>/          one folder per topic
  index.md            topic landing page
  <page>.mdx          individual pages (.mdx for components)

sidebars/<slug>.json  left sidebar groups and order for one topic
sidebars.js           auto-merges every file in sidebars/ — do not edit manually
docusaurus.config.js  navbar items — add between === TOPICS === markers
features.json         feature toggles (diagramImages on/off)
static/img/diagrams/  generated diagram images

## Sidebar JSON conventions

- Key = camelCase sidebarId e.g. pythonForAi
- Must match sidebarId in the navbar item in docusaurus.config.js
- Doc ids = path relative to docs/ with no file extension
- sidebars.js auto-loads all files in sidebars/ — never edit it to add a topic

## Code snippets

Always use fenced code blocks with a language tag.
Supported: python, bash, json, typescript, javascript, java, yaml

## ASCII diagrams

Every topic page must have at least one AsciiDiagram component.

Props:
- id (required): unique key in format <topic-slug>/<page-slug>
- content (required): ASCII art as template literal
- alt (required): one sentence describing the diagram
- caption (optional): short figure label

Drawing conventions:
- Use Unicode box-drawing: ┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼
- Use arrows: ──> ▶ ▼ ◀ ▲
- Do not use + - | for boxes

Feature toggle in features.json:
- "diagramImages": false  → renders ASCII (default)
- "diagramImages": true   → renders PNG if it exists, falls back to ASCII

## Mermaid diagram sources (.mmd)

Applies to ALL diagram work in apps/docs AND apps/web:

- English-only text inside diagrams — translate non-English labels, never copy them
- Choose diagram type from source structure: actor message exchanges → sequenceDiagram,
  fielded structures/implementers → classDiagram, state machines → stateDiagram-v2,
  entity relations → erDiagram, otherwise flowchart;
  `node scripts/classify-diagram-type.mjs` classifies automatically (~99% accuracy)
- Every .mmd must pass `node scripts/check-landscape-band.mjs <file>` with exit 0:
  width ≤1400px, aspect ratio 1.3–3.5 (this IS the landscape-mode rule);
  classDiagrams may render portrait (width cap only);
  EXCEPTION: after 7+ failed restructure attempts on one diagram, gate may be
  relaxed for that case — ship best variant and note it
- Render with the blackboard theme (`scripts/mermaid-blackboard.config.json`);
  gate PASS writes hash-named SVGs to apps/docs/static/img/diagrams/;
  never bulk-rerun render-mermaid-manifest.mjs (no skip-if-exists) — render single
  fixed files directly with mmdc + patch the manifest
- Never trim nodes/labels/content to fit layout — restructure instead;
  never downgrade a classDiagram to a flowchart
- Probe geometry (cheap render + viewBox check) before gating; iterate until in-band
- Blackboard-theme layout levers: wrap long labels with `<br/>` (labels hard-cap ~260px),
  ≤3 top-level clusters, inter-cluster edges attach at cluster level only
  (edges from internal nodes collapse the subgraph's `direction`),
  fans stay inside one cluster, connect isolated subgraph nodes or they ignore `direction`,
  declare explicit `direction` per top-level subgraph,
  NO quoted edge labels (`-->|"..."|`) on cross-subgraph edges — they flatten the
  whole layout; use unquoted `-- text -->` there (quoting is fine inside a cluster)
- Known syntax traps: `--> A["x"] & B["y"]` chaining after a label is invalid;
  `end` must sit on its own line; never put `->` inside a mermaid Note (decodes
  pre-lex and parses as an arrow — recast as flowchart). Near-miss rescues:
  `wrappingWidth`, `nodeSpacing`, `rankSpacing`, `sequence.actorMargin/messageMargin`
  init tuning
- sequenceDiagram messages/notes: UNWRAP labels to single lines so text widens the
  actor span (opposite of flowchart wrapping)
- A chain wider than 1400px even fully unwrapped: split into two disconnected LR
  chains stacked vertically, order carried by numbered step titles
- Batch/agent runs: write only to manifest-given exact mmdFile paths,
  skip-if-exists (files on disk are the checkpoint), workers never edit manifests/MDX
- Wiring chain once a course's sources are gate-green:
  make-rehash-map.mjs → wire-mermaid-rehash.mjs → update-diagram-manifest.mjs <slug>
  (fresh unwired tags need wire-mermaid-from-map.mjs instead of the rehash variant)
- apps/docs/diagram-manifests/ is the git-tracked source of truth;
  .cache/ascii-to-mermaid/*.mmd is disposable build output

Generating images:
  node scripts/generate-diagrams.js --dry-run
  node scripts/generate-diagrams.js
  node scripts/generate-diagrams.js --provider openai
  node scripts/generate-diagrams.js --id python-for-ai/setup
  node scripts/generate-diagrams.js --force

## Globally registered components (no import needed in .mdx)

<YouTube id="VIDEO_ID" title="..." start={N} />
<PdfEmbed src="/pdf/file.pdf" title="..." height={640} />
<Slideshow slides={[{src, alt, caption}]} autoPlay interval={5000} />
<AsciiDiagram id="slug/page" content={`...`} alt="..." caption="..." />

Static assets: images → static/img/  PDFs → static/pdf/  diagrams → static/img/diagrams/

## Current topics

- python-for-ai-engineers — Python for AI Engineers (Sections 1-4: setup, first-program, virtual-environments, variables, strings, lists, tuples, dictionaries, sets, control-flow, loops, functions, modules, file-handling, comprehensions, generators, decorators, context-managers, error-handling, dataclasses, type-hints, logging, classes, inheritance, composition, magic-methods; Section 5: numpy, pandas, data-visualization, json, csv; Section 6: requests, httpx, api-authentication, async-python; Section 7: llm-api-basics, prompt-engineering, structured-output, embeddings, rag, ai-pipelines; Section 8: pytest, docker, ci-cd, packaging; Section 9: project-structure, clean-code, performance; practice section with beginner/intermediate/advanced/solutions)
- agentic-ai-fundamentals — Agentic AI Fundamentals (Sections 1-2: what-is-ai-engineering, llm-fundamentals, tokens-and-context-windows, prompt-engineering-basics, llm-apis-in-practice, system-prompts, prompt-patterns, few-shot-prompting, chain-of-thought-and-reasoning, prompt-templates, structured-output-prompting, prompt-testing-and-iteration; Section 3: what-is-an-agent, agent-vs-chatbot-vs-workflow, anatomy-of-an-agent, reasoning-vs-execution, agent-memory, agent-tools-and-tool-calling, planning-and-decision-making; Section 4: observe-think-act-loop, react-pattern, plan-and-execute, reflection-and-self-correction, loop-safety-and-recovery, human-in-the-loop; Section 5: orchestrator-and-supervisor-patterns, specialist-agents, agent-communication-and-coordination, shared-memory-and-state, when-to-use-multi-agent; Section 6: what-is-mcp, mcp-architecture, mcp-primitives, transports, building-an-mcp-server, building-an-mcp-client, mcp-with-claude-code; Section 7: evaluating-agents, trajectory-evaluation, tool-evaluation, prompt-injection-and-guardrails, observability-logging-and-tracing, cost-and-latency-tracking; Section 8: deployment-patterns, versioning-prompts-and-tools, configuration-management, authentication, scaling-agent-systems, caching-and-retries, monitoring-production-agents)
- playwright-test-automation — Playwright Test Automation (TypeScript-only, `@playwright/test`; SUT is `github.com/codedbyabhishekc/rbac-healthcare-system`, a 4-role RBAC healthcare app; backend `:5000` with Swagger at `/api-docs`, frontend pinned permanently to `:3002`; Module 0: setup only so far — 24 further modules planned per `.claude/commands/add-playwright-automation-course.md`, covering locators through AI test agents/MCP/self-healing)
- learn-typescript — Learn TypeScript (Pareto-structured, one flat page per module rather than the 4-page overview/build-it/avoid-mistakes/review pattern; sample domain is BookHaven, a small online bookstore API reused throughout; 00-setup then Tier 1 core fundamentals 01-08 (basic-types-and-inference, objects-interfaces-and-type-aliases, functions, union-and-literal-types, type-narrowing, classes, generics, modules-and-project-structure), Tier 2 high-value tools 09-12 (utility-types, async-await-and-promises, working-with-external-code, enums-vs-union-literals), Tier 3 reference/long-tail 13-17 (advanced-generics, conditional-and-mapped-types, decorators-and-metadata, module-system-depth, configuration-and-tooling), and an 18-capstone module; exercises are embedded per-module ("Try it" for Tier 1/2, "Recognize it" for Tier 3) rather than a separate practice/ folder)

## Local dev server

`npm run dev` and `npm run start` run plain `docusaurus start`. The blog
now lives in `apps/app` (real Next.js SSR/ISR pages reading Supabase
directly) — `scripts/watch-blog-posts.mjs` / `scripts/bake-blog-posts.mjs`
are Phase-7-disconnected leftovers kept only as a rollback path for one
release cycle; they no longer run as part of `dev`/`start`/`build`.

When debugging/verifying anything in a browser (Puppeteer or otherwise):
1. Check port 3000: `netstat -ano | grep ":3000" | grep LISTENING`
2. Kill any existing process bound to it, then start fresh:
   `nohup npm run start > /tmp/dev-server.log 2>&1 & disown`
3. Poll the log until `"Docusaurus website is running"` appears before
   running checks — don't assume a server from earlier is still valid.
4. If the server's node process gets killed during cleanup, restart it
   again with `npm run start` afterward — don't leave the site down.

## Hard rules

- Never hardcode API keys or secrets in any file
- Never invent external URLs — leave TODO if unsure
- Every code block must have a language tag
- Every topic page must have at least one AsciiDiagram
- AsciiDiagram id values must be unique across the project
- Use .mdx extension for all pages that contain components
- Do not edit sidebars.js directly to add topics

## Git Safety Rules (all agents)

- Run `git status` and `git diff` before starting substantial work, and again before
  any command that could discard uncommitted work.
- NEVER run git reset --hard, git clean, git checkout -- <path>, git restore, or git
  stash on files you did not create this session, without explicit user approval.
- NEVER commit automatically. Only commit when the user explicitly asks, in this
  session, for that specific commit.
- NEVER force-push.
- Treat all pre-existing uncommitted changes as intentional and valuable, even if
  their purpose isn't obvious — investigate before assuming something is stale or
  disposable.

## Agent Handoff Protocol

Before starting substantial work:
1. Run `git status` and `git diff --stat`.
2. Read `memory-bank/current-task.md` if it exists.
3. If `current-task.md` and `git diff` disagree (e.g. current-task.md claims a file is
   unmodified but git diff shows changes, or vice versa) — TRUST git diff. Flag the
   mismatch to the user before proceeding; do not silently overwrite either source.

Before stopping / ending a session (including being interrupted or running low on
context):
1. Update `memory-bank/current-task.md`: move finished items to Completed, log new
   Decisions and Known Issues, update Files Modified from actual `git status` output
   (not memory), write a concrete Next Action.
2. Do not commit as part of this step unless explicitly asked.

## Agent Autonomy Boundary

Even when approval_policy is set to never (auto-accept), stop and ask the
user before: making architectural decisions, choosing between multiple
valid implementation approaches, or taking any action that would be hard
to reverse. Only proceed without asking for routine, unambiguous
implementation work.

## Memory systems (two distinct, do not conflate)

- **MCP memory bank** (`@allpepper/memory-bank-mcp`, root outside this repo) —
  cross-project durable facts and decisions, accessed via MCP tools, not a file in
  this working tree. Use for knowledge that outlives this repo/task.
- **`memory-bank/current-task.md`** (this repo, git-tracked) — repo-local, travels
  with the working tree via git, describes the CURRENT task's live state only. Any
  agent working in this repo (Claude Code, Codex, etc.) reads and writes this file
  directly as part of the handoff protocol above. It is not a knowledge base — it is
  a live handoff document, expected to be rewritten as work progresses.
