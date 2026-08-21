---
description: Generate a module for the API Testing using Python course
---

# Add API Testing using Python module: {ARGS}

`{ARGS}` = module number, a range, `overview`, `setup`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` (e.g. `add-api-testing-typescript-course.md`) and match
its conventions exactly.

## Course

- **Course title (sidebar/display name):** API Testing using Python
- **Slug:** `api-testing-python`
- **Path:** `apps/docs/docs/api-testing-python/`
- **Audience:** engineers who know Python basics, new to API test
  automation.
- **Stack:** pytest, httpx (not `requests` — httpx is the 2026-relevant
  choice: async support, HTTP/2, requests-like syntax).
- **SUT:** `github.com/codedbyabhishekc/rbac-healthcare-system` — Node/
  Express/SQLite/React RBAC healthcare app, 4 roles (Administrator, Doctor,
  Nurse, Patient), 9x4 permission matrix. Backend runs on `:5000` (Swagger
  at `/api-docs`), frontend on `:3002` (this course never touches the
  frontend — black-box HTTP against the backend only).
  - Login test credentials: `admin` / `admin123`. Seeded accounts otherwise
    use `pass@123` (e.g. `doctor1`, `nurse1`, `patient1`).
  - The Swagger spec and permission matrix have gaps by intentional design,
    not by accident. Scope every module to the documented/covered surface
    so all examples and exercises are fully buildable — no module relies on
    an endpoint or rule that doesn't exist in the spec.
  - Before writing any module, fetch the live OpenAPI spec. This app does
    **not** expose a plain JSON endpoint at `/api-docs.json` or
    `/api-docs/swagger.json` (both return the Swagger UI's HTML shell, not
    JSON) — the real spec is embedded inside a dynamically generated
    `/api-docs/swagger-ui-init.js` as `options.swaggerDoc`. Fetch that file
    and extract the JSON with a regex (Module 05 teaches this exact
    technique to learners; don't shortcut it by using Node/`swagger-jsdoc`
    to introspect the spec instead — verify it the same way a learner
    following this course would). Verify every endpoint, field, and example
    against the extracted spec and the route source. Every code example and
    "Try it" exercise must map to a real, existing API — never invent a
    plausible-sounding endpoint or field.
- **Testing approach:** black-box HTTP — Python can't import the Node/
  Express app in-process, so every test is a real HTTP call against the
  running backend, from a completely separate Python project (never inside
  the cloned RBAC repo).
- **Central framing:** the OpenAPI/Swagger spec is the anchor for the whole
  course, not just one module's topic. Every module frames its tests as
  "does the real response match what the spec promises," not just
  code-first testing. Module 05 (Reading the OpenAPI Spec) is the reference
  point every later module links back to.
- **Full-depth course**, not a condensed on-ramp: this course now covers
  the same breadth as the TypeScript and Java editions (security testing,
  database verification, mocking/isolation, flaky-test prevention, test
  framework architecture, coverage, parallel execution, smoke/performance
  testing all included — see the full page list below). Where a topic only
  makes sense for an in-process suite (e.g. TypeScript's "In-Process vs
  Black-Box Testing" module, or mocking an internal dependency the app
  itself uses), adapt it honestly to what black-box testing can actually
  do instead of porting the in-process version unchanged — see Modules 14
  and 15 below for how the database-testing and mocking modules are
  reframed for a black-box, cross-process course.

## Conventions

- One page per module — no multi-page overview/build-it/avoid-mistakes/
  review template.
- Friendly, natural conversational English tone throughout — write fluent
  prose, not stiff or translated-sounding phrasing. Read each section back
  as if explaining to a colleague, not documenting a spec.
- No meta-references to module numbers in learner-facing content (don't
  write "as we saw in Module 3" — write "as you saw earlier" or link
  directly). The one exception this course makes: a handful of modules do
  say "Module N" explicitly when pointing back to a specific fixture or
  finding introduced earlier (e.g. "the `login_as` fixture from Module 4").
  If you ever renumber pages, grep the whole course for `Module [0-9]` and
  fix every stale cross-reference — this has bitten this course before.
- Every example runs against the real RBAC backend — no mocked server,
  except Module 15 (Mocking + Isolation), where mocking your own test
  infrastructure — never the app itself — is the explicit subject.
- Auth handling shown once thoroughly (Module 04), reused via a shared
  `@pytest.fixture` (`login_as`, defined in `conftest.py`) everywhere
  after — don't re-derive login logic per module. pytest fixtures are
  auto-discovered by every test file with no import needed, unlike a
  manually-imported helper module — lean on that.
- Each module ends with a self-contained "Try it" exercise extending the
  RBAC example, independent of other modules' exercises.
- Include `print()` statements where they help learners inspect actual
  request/response data while working through an example (e.g. printing
  the response JSON before asserting on it, printing a captured JWT). Don't
  scatter them everywhere — use them where seeing the real output builds
  understanding, then show the assertion that replaces the manual check.
- Explain code syntax, not just show it. When introducing a new pattern
  (e.g. `httpx.Client`, `async def`, `@pytest.fixture`,
  `@pytest.mark.parametrize`, `respx`), briefly say what it does and why
  it's written that way — don't drop a snippet with zero explanation.
- Before writing any module, fetch and verify against the live app (see SUT
  notes above) rather than trusting an earlier module's notes to still be
  accurate.
- Diagrams: author as ASCII in the MDX source inside `<AsciiDiagram>` (id,
  content, alt, caption — never author `mermaidSrc` by hand, that gets
  added by the separate diagram-conversion pipeline). Keep diagrams
  landscape-oriented (roughly 1.3:1–3.5:1 width:height) and compact — a
  handful of boxes, matching the ASCII original's footprint, not an
  elaborate multi-column layout.

## Pages

### Course Overview (`course-overview`)
What you'll build, prerequisites (Python basics, Python 3.10+ installed),
intro to the RBAC app and its roles, why this course treats the OpenAPI
spec as the source of truth rather than testing endpoints ad hoc.

### Setup (`setup`, Module 0)
Verify Python/pip install, clone the RBAC repo and run the backend on
`:5000` (separate from the Python project — this course is black-box), seed
the database, confirm Swagger loads at `/api-docs`, set up a `rbac-api-tests`
Python project in its own folder with a venv, install `pytest`/`httpx`, run
a smoke request to confirm the environment works.

### 01. API Testing Foundations
What API testing covers vs UI testing, the request/response contract, why
testing against a spec (not just against current behavior) catches more
bugs.

### 02. pytest + httpx Setup & First Request
Installing `pytest`, `httpx`, project structure, `pytest.ini`/`pyproject.toml`
config, writing and running a first passing test with `httpx.get()`.

### 03. Async/Sync Requests with httpx
`httpx.Client` vs `httpx.AsyncClient`, when to use each, `pytest-asyncio`
basics, running your first async test, `asyncio.gather` for real concurrent
requests.

### 04. Authentication + JWT
Calling the login endpoint (`admin`/`admin123`), capturing the JWT, building
reusable `@pytest.fixture`s in `conftest.py` (`api_client`, `login_as`) that
every later module relies on instead of re-deriving login logic.

### 05. Reading the OpenAPI Spec
Fetching the real spec (see SUT notes — it's embedded in
`swagger-ui-init.js`, not at a plain JSON URL), extracting it with a regex,
parsing paths/schemas/components. This is the reference module — call out
explicitly that every later module will point back here.
**Diagram:** spec -> generated test mapping.

### 06. Generating Test Cases from the Spec
Turning spec paths and methods into a checklist of test cases, deriving
expected status codes and response shapes directly from the spec rather
than guessing. Worth surfacing a real, verified gap: the spec's documented
response codes under-report what the app actually returns (e.g. no `401`/
`403` listed on protected endpoints).

### 07. CRUD Testing via Spec-Documented Endpoints
Testing Create/Read/Update/Delete endpoints exactly as documented in the
spec, verifying request/response bodies match declared schemas, proving
persistence with a read-after-write check rather than trusting the write's
own response.

### 08. Assertions + Response Validation Against the Spec
Status code assertions (with useful failure messages), header checks, body
shape assertions checked against what the spec declares — not just what
the code currently returns.

### 09. Schema + Contract Validation
Validating request bodies with `jsonschema` directly against the spec's own
declared `requestBody` schemas, and response bodies with hand-written
Pydantic models (since this app's spec doesn't declare response schemas at
all — a real, verified asymmetry worth naming explicitly).

### 10. RBAC + Permission Matrix
Testing the same spec-documented endpoint across all 4 roles, data-driven
test generation via `@pytest.mark.parametrize`, expected allow/deny
outcomes per role as verified against the real route code (the spec itself
has no role-level field to check against).
**Diagram:** role x endpoint permission matrix.

### 11. Negative + Edge-Case Testing
Invalid tokens, missing/malformed fields, boundary values — testing against
the error responses the spec declares, confirming this app's actual
behavior (e.g. 403 for invalid tokens, verified against its own tests).

### 12. API Security Testing
JWT payload tampering (signed, not encrypted), SQL injection resistance,
and a real, verified parameter-tampering gap (`POST /api/appointments`
never checks `patient_id` against the authenticated user).

### 13. Fixtures + Test Data Management
pytest fixtures for setup/teardown, a `get_first_user_with_role` fixture
factory, and this repo's real seed-data quirk: SQLite `AUTOINCREMENT`
means the same seeded user gets a different ID after every reseed, so
hardcoded IDs quietly break.

### 14. Database Testing
Verifying writes by opening the RBAC app's SQLite file directly (same
machine, shared filesystem, not shared process — a black-box course needs
its own answer for how to reach a file it doesn't own), alongside the
existing API-based verification. Cover this app's lack of per-test
database isolation honestly, and the practical workarounds (assert on what
you created, not on totals).

### 15. Mocking + Isolation
Reframed for black-box testing: there's no app internals to reach into and
mock (no import, no shared process), so the only legitimate mocking
surface is your own test infrastructure's `httpx` calls, via `respx` —
useful for testing your own retry/helper logic under conditions a real
server won't reliably reproduce. Show, concretely, why mocking a request to
the real app under test (e.g. faking the login response) would silently
defeat the entire suite's purpose.

### 16. Flaky Test Prevention
Shared state (reproduce the RBAC repo's own shipped, genuinely flaky
`backend/tests/auth.test.js` bug — registering a `patient1` that collides
with the seeded one — from the Python side, over HTTP, without needing to
run the JS suite), JWT timestamp precision, unclosed database connections
(`sqlite3` connections without `try`/`finally`), and hardcoded
`time.sleep()` waits vs. polling a real condition.

### 17. Parameterized Testing
`@pytest.mark.parametrize` in depth: `pytest.param(..., id=...)` for
readable test IDs, stacking multiple `@parametrize` decorators for a
cartesian product, and where it stops being worth it.

### 18. Test Framework Architecture
Organizing a growing suite: `conftest.py` as the "how" (fixtures), resource-
named test files as the "what," `pytest.ini`/`conftest.py` living at the
project root, and nested `conftest.py` files as pytest's native way to
scope fixtures to one area without a manual `helpers/` package.

### 19. API Test Coverage
Why running this course's tests together has none of an in-process suite's
shared-process problems (no import side effects at all). Endpoint coverage
(reusing the Module 06 checklist) vs. code coverage — and the honest limit
that `pytest-cov` can only measure the Python test project's own code, not
the separate Node app's route coverage, since black-box testing runs in a
different process entirely.

### 20. Property-Based Spec Testing with Schemathesis
Using Schemathesis to auto-generate test cases directly from the OpenAPI
spec (loaded via the Module 05 extraction helper, not a plain URL),
property-based testing against the contract, and how it independently
rediscovers a real gap from Module 11 by generated input instead of a
hand-written case.

### 21. Reporting + CI
`pytest-html`/Allure reporting, GitHub Actions: check out both the RBAC
backend and the Python test project, start the backend as a background
service, poll its health endpoint until ready (a black-box suite has to do
this itself — there's no in-process import to lean on), seed the database,
run `pytest`, publish the report as an artifact, required PR check.
**Diagram:** CI pipeline stages.

### 22. Parallel Test Execution
`pytest-xdist` (`-n auto`). Unlike an in-process suite, this course's
plain-HTTP tests parallelize almost for free (no shared port, no shared
process — the server just handles concurrent requests like any real
traffic). The one real exception: Module 14's direct SQLite file access can
collide under concurrent workers (`database is locked`) — cover mitigation
via a connection `timeout` or `pytest.mark.xdist_group`.

### 23. Smoke + Performance Testing
`@pytest.mark.smoke` (registered in `pytest.ini`) filtered via `pytest -m
smoke`, response-time assertions with `time.perf_counter()`, and where this
ends and real load testing begins — mention Locust specifically since it's
Python-native and a natural next step for this audience.

### 24. Capstone: Full Spec-Driven Test Suite
Build a complete spec-driven suite for a not-yet-covered RBAC area: parse
the spec, generate the test case checklist, write auth/CRUD/RBAC-matrix/
negative-case tests, validate against schema, wire into CI (nothing to add
there — it's already covered by the existing workflow's file-matching
pattern).
**Diagram:** end-to-end suite architecture.
