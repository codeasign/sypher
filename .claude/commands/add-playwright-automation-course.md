---
description: Generate a module for the Playwright Test Automation course
---

# Add Playwright Test Automation module: {ARGS}

`{ARGS}` = the module number to generate (e.g. `7`), a range (`7-9`), `index`
for the landing page, `setup` for the setup page, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` and match its conventions exactly — frontmatter shape,
sidebar wiring, `<AsciiDiagram>` usage, component imports, file naming. This
command specifies *what* to cover; existing commands define *how* a Sypher
course page is structured. Where they conflict, existing conventions win.

**Overlap check — do this first.** Sypher already has a Learn Web Automation
course covering Playwright with multiple languages. Before generating, read
that course's module list and report any module here that substantially
duplicates it. Surface the overlap and wait for a decision rather than
silently generating a near-duplicate page.

## Course

- **Slug:** `playwright-test-automation`
- **Path:** `apps/docs/docs/playwright-test-automation/`
- **Audience:** engineers who know TypeScript basics (or have completed
  `typescript-for-test-automation`) and are new to Playwright. No prior
  Playwright or framework-design experience assumed.
- **Language:** TypeScript only, `@playwright/test` runner.
- **System under test (SUT):** `github.com/codedbyabhishekc/rbac-healthcare-system`
  — React + Express + SQLite + JWT + Swagger, 4-role RBAC healthcare app
  (admin / doctor / nurse / patient). Every module's examples run against
  this app so learners see the same RBAC permission matrix tested from multiple
  angles across this course and the `supertest-api-testing` course.
- **Positioning:** the "ultimate" Playwright course — one-stop, sole
  comprehensive reference for the tool, including the 2026 AI/agentic stack
  (test agents, MCP, self-healing), not just classical scripted automation.
  Depth over breadth-skimming; each module should be usable as a standalone
  reference page, not just a tutorial step.

## Modules

### 0. Setup
- Fork the RBAC repo (not clone — Module 20's CI module needs a repo the

> **Verified against the actual repo (README, checked July 25, 2026):** backend runs
> on `:5000`, frontend on `:3000`. Backend setup: `cd backend && npm install
> && mkdir database`, then a `.env` with `PORT=5000`, `JWT_SECRET=...`,
> `NODE_ENV=development`, then `npm start` (or `npm run dev`). Seed with
> `npm run seed` — creates 3 Admins, 8 Doctors, 7 Nurses, 15 Patients, 22
> Appointments, 15 Medical Records. Default admin: `admin` / `admin123`.
> Swagger docs live at `http://localhost:5000/api-docs`. Frontend: `cd
> frontend && npm install && npm start`.
>
> **Known gap, use it deliberately:** the repo's own README marks its Role
> Permissions Matrix as "Not Completely Implemented." Don't silently work
> around this — assert against the README's stated matrix as the spec, and
> let any mismatch surface as a legitimate failing test. That's a more
> realistic teaching moment than a hand-built app with no bugs to find.

  learner owns)
- `backend/` and `frontend/` install + run instructions; seed script
  (`npm run seed`) for the 4 role accounts and sample data
- Install Playwright (`npm init playwright@latest`), verify with `npx
  playwright test --list`
- Confirm both servers running before any module begins — walk this setup
  yourself on a clean machine before publishing

### 1. Why Playwright, and how it differs
- Auto-waiting model vs. Selenium's explicit waits — why this eliminates a
  category of flaky test
- Browser contexts vs. browser instances — isolation model
- Trace viewer, UI mode, and codegen as first-class citizens, not add-ons

### 2. Project structure and config
- `playwright.config.ts` anatomy: projects, use, reporter, webServer
- Running the backend+frontend automatically via `webServer` config so
  `npx playwright test` is a single command
- Environment-specific config (local vs CI base URLs)

### 3. Locators
- `getByRole`, `getByLabel`, `getByText`, `getByTestId` — priority order and
  why role-based locators survive refactors
- Locator chaining and filtering (`.filter()`, `.first()`, `.nth()`)
- When to fall back to CSS/text, and why it should be rare
- Applied to the app's dashboards: locating role-conditional UI elements (e.g.
  "Add Patient" button visible only for doctor/nurse)

### 4. Actions and web-first assertions
- `click`, `fill`, `check`, `selectOption`, `uploadFile` — auto-waiting
  guarantees behind each
- `expect(locator)` assertions vs. generic `expect(value)` — why web-first
  assertions retry and generic ones don't
- Anti-pattern callout: no `waitForTimeout`, no manual polling

### 5. Authentication and session state
- Programmatic login vs. UI login for setup speed
- `storageState` — capturing and reusing auth per role (admin/doctor/nurse/
  patient) so most tests skip the login flow
- Global setup (`globalSetup`) authenticating each of the 4 roles once per run
- Project-level `use: { storageState }` to run whole suites as a given role

### 6. Page Object Model
- POM structure for a role-based app: shared `BasePage`, per-dashboard page
  objects (`DoctorDashboardPage`, `PatientDashboardPage`, etc.)
- Component objects for shared UI (`Modal`, `Notification`) reused across
  page objects
- Where POM breaks down for permission-matrix testing, and the alternative
  (role-parameterized page objects) used in Module 10

### 7. Fixtures
- Custom fixtures extending base `test` — injecting an authenticated page
  per role without repeating login logic
- Worker-scoped vs. test-scoped fixtures — DB seed reset as a worker fixture
- Fixture composition: combining auth fixture + API-seeded test-data fixture

### 8. Network interception and mocking
- `page.route()` for stubbing backend responses — isolating frontend tests
  from backend state
- Asserting on outgoing requests (headers, payload) without mocking the
  response — verifying the frontend sends the right JWT/role claims
- When to mock vs. when to hit the real the backend (contrast with the
  Supertest course's in-process approach)

### 9. API requests from Playwright
- `request` fixture and `APIRequestContext` — seeding/verifying state via
  API calls inside a UI test (hybrid testing)
- Speeding up setup: creating test patients/appointments via API instead of
  UI, then verifying via UI
- Where this overlaps with `supertest-api-testing` and where it doesn't
  (hybrid flows only exist here)

### 10. Testing the RBAC permission matrix

> **Ground truth (from the repo's own README) — assert against this table,
> not an assumed one:**
>
> | Action | Admin | Doctor | Nurse | Patient |
> |---|---|---|---|---|
> | View all users | ✅ | ❌ | ❌ | ❌ |
> | Delete users | ✅ | ❌ | ❌ | ❌ |
> | View all appointments | ✅ | ❌ | ✅ | ❌ |
> | View own appointments | ❌ | ✅ | ❌ | ✅ |
> | Schedule appointments | ❌ | ❌ | ✅ | ❌ |
> | Complete appointments | ❌ | ✅ | ❌ | ❌ |
> | Cancel appointments | ❌ | ✅ | ✅ | ❌ |
> | Create medical records | ❌ | ✅ | ❌ | ❌ |
> | View medical records | ✅ | ✅ | ❌ | ✅ (own only) |
>
> The README itself flags this matrix as not fully implemented — treat
> mismatches between this table and actual API behavior as real bugs the
> suite should catch, not as a spec to be silently adjusted around.

- Data-driven tests: same spec parameterized across each of the 4 roles, asserting
  allowed vs. denied UI elements and actions
- Table-driven pattern for the full permission matrix (role × resource ×
  action) so adding a role/resource doesn't mean writing new specs
- Negative testing: attempting to access another role's dashboard directly
  via URL

### 11. Handling dynamic and async UI
- Waiting for network-driven state changes (patient list refresh after
  create) without arbitrary timeouts
- `waitForResponse` / `waitForLoadState` for genuinely async operations that
  auto-waiting locators don't cover
- Debugging flaky waits with trace viewer

### 12. Visual and snapshot testing
- `toHaveScreenshot()` — baseline management, per-OS/browser snapshot
  handling, updating baselines deliberately (not blindly)
- Masking dynamic content (timestamps, generated IDs) before comparison
- When visual testing earns its maintenance cost vs. when it's noise

### 13. Cross-browser and responsive testing
- `projects` config for Chromium/Firefox/WebKit
- Mobile viewport emulation against the app's dashboards
- Deciding what actually needs cross-browser coverage vs. running once

### 14. Parallelism, sharding, and test isolation
- Worker parallelism model and why shared DB state breaks it
- Per-worker DB isolation strategies for the app's SQLite backend (in-memory
  DB per worker, or transactional rollback)
- Sharding for CI (`--shard`)

### 15. Debugging and troubleshooting
- UI mode walkthrough — time travel, watch mode
- Trace viewer: network tab, console, DOM snapshots at each step
- `codegen` for scaffolding new specs, and why it's a starting point, not a
  final answer
- Debugging flaky tests systematically: retries as a diagnostic, not a fix

### 16. Accessibility testing
- `@axe-core/playwright` integration — running automated a11y checks against
  the app's forms and dashboards
- Interpreting violations, prioritizing what's worth fixing vs. false
  positives
- Keyboard navigation testing (tab order, focus management) on the login
  and patient-record forms

### 17. Reporting
- Built-in HTML reporter — reading trace links from failures
- JSON/JUnit reporters for CI integration
- Custom reporter basics: when a built-in reporter isn't enough

### 18. Test organization and tagging
- `test.describe`, `test.step` for readable trace output
- Tagging (`@smoke`, `@regression`) and running subsets via `--grep`
- Splitting suites: fast PR-gate subset vs. full nightly run

### 19. Continuous integration
- GitHub Actions workflow: install, run the backend+frontend as services,
  run Playwright, upload trace/report artifacts on failure
- Caching browsers and `node_modules` between runs
- Running against the learner's own fork (why forking in Setup mattered)

### 20. Comparing UI-level and API-level testing
- Capstone module, cross-linked with `supertest-api-testing`
- Same RBAC permission scenario tested at both levels: what each layer
  catches that the other doesn't (UI: rendering/access-control bugs in the
  frontend; API: business-logic bugs regardless of UI)
- Guidance on where to invest test effort in a real role-based system

### 21. Playwright test agents (Planner / Generator / Healer)
- `npx playwright init-agents` — what the three built-in agents do: Planner
  turns a goal into a test plan, Generator writes the spec, Healer repairs a
  failing test against the current DOM
- Running the agent workflow against an RBAC flow (e.g. "book an appointment
  as a patient, verify it appears on the doctor's dashboard") and reviewing
  what it generates before committing
- Why generated tests are a first draft, not a merge-ready PR — the review
  discipline this requires (locator quality, assertion correctness, no
  hardcoded waits slipping in from generation)

### 22. Playwright MCP and driving the browser from an AI client
- What MCP is in this context: a standardized bridge exposing Playwright's
  browser tools (`browser_click`, `browser_navigate`, `browser_snapshot`,
  etc.) to any MCP-capable LLM client (Claude Code, Claude Desktop, Cursor)
- Installing Microsoft's reference server (`@playwright/mcp`) and connecting
  it to explore RBAC interactively — an agent inspecting the
  accessibility tree and clicking through a role's dashboard without a
  pre-written script
- Accessibility-tree snapshots vs. screenshots as the agent's view of the
  page, and why tree-based context is both cheaper and more reliable than
  vision for most flows
- Session persistence via `storageState` so an MCP-driven agent doesn't
  re-authenticate (and burn tokens) on every interaction

### 23. Self-healing tests and AI-assisted maintenance
- How a Healer agent repairs a test broken by a selector or markup change —
  what it can fix (locator drift) vs. what it can't (an actual regression it
  should instead fail on)
- The failure mode to teach explicitly: over-confident agents "fixing" a
  test into passing over a real bug — guardrails (diff review, no
  auto-merge of healed tests)
- Where self-healing earns its keep on RBAC's suite (UI copy/markup
  churn) vs. where a real assertion failure must stay red

### 24. When to use agents vs. when to write the test yourself
- Decision framework: iterative reasoning about unfamiliar page state →
  agent/MCP; executing a known, stable flow → hand-written script (cheaper,
  deterministic, faster in CI)
- Cost and speed tradeoffs — agentic runs consume meaningfully more tokens
  and time than a scripted `npx playwright test`; reserve agents for
  exploration, spec generation, and healing, not routine CI execution
- Closing the loop: agent-generated draft → human review → committed,
  version-controlled spec that runs deterministically in CI thereafter

## Conventions to enforce across all modules
- Every code example runs against the actual RBAC repo — no fabricated app
  or generic to-do-list examples
- Every locator example uses `getByRole`/`getByLabel`/`getByText` unless the
  module is explicitly demonstrating a fallback
- Every assertion is a web-first `expect(locator)...` — flag any generic
  `expect(value)` as needing justification in module review
- No `waitForTimeout` or hardcoded sleeps anywhere in example code
- Each module ends with a "Try it" exercise extending RBAC example
  (new role scenario, new assertion, new fixture) rather than a disconnected
  practice problem
