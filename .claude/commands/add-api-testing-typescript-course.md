---
description: Generate a module for the API Testing using TypeScript course
---

# Add API Testing using TypeScript module: {ARGS}

`{ARGS}` = module number, a range, `overview`, `setup`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` and match its conventions exactly.

## Course

- **Course title (sidebar/display name):** API Testing using TypeScript
- **Slug:** `api-testing-typescript`
- **Path:** `apps/docs/docs/api-testing-typescript/`
- **Audience:** engineers who know JavaScript/TypeScript basics, new to API
  test automation.
- **Stack:** TypeScript, Jest, Supertest.
- **SUT:** `github.com/codedbyabhishekc/rbac-healthcare-system` — Node/Express/
  SQLite/React RBAC healthcare app, 4 roles (Administrator, Doctor, Nurse,
  Patient), 9×4 permission matrix. Backend runs on `:5000` (Swagger at
  `/api-docs`), frontend on `:3002`.
  - Login test credentials: `admin` / `admin123`.
  - The Swagger spec and permission matrix have gaps by intentional design,
    not by accident. Don't flag them as bugs — instead, scope modules 10,
    11, and 25 to the documented/covered surface so every exercise and
    example is fully buildable. The course itself must still be complete:
    no module should rely on an endpoint or permission rule that doesn't
    exist in the spec.
- **Testing approach:** in-process — import the Express `app` directly and
  drive it with Supertest, not over the network. Call this out explicitly in
  Module 02; it's the core distinction learners need to internalize.

## Conventions

- One page per module — no multi-page overview/build-it/avoid-mistakes/review
  template.
- Friendly, natural conversational English tone throughout — write fluent
  prose, not stiff or translated-sounding phrasing. Read each section back
  as if explaining to a colleague, not documenting a spec.
- No meta-references to module numbers in learner-facing content (don't
  write "as we saw in Module 3" — write "as you saw earlier" or link
  directly).
- Every example runs against the real RBAC backend — no mocked server, unless
  the module's own topic is mocking (Module 16), where mocking is the
  explicit subject.
- Auth handling shown once thoroughly (Module 06), reused via a shared
  helper everywhere after — don't re-derive login logic per module.
- Each module ends with a self-contained "Try it" exercise extending the
  RBAC example, independent of other modules' exercises.
- Diagrams: author as ASCII in the MDX source inside `<AsciiDiagram>`,
  converted to Mermaid at build time via the existing pipeline
  (`remark-normalize-ascii-diagrams.mjs`). Do not hand-author Mermaid syntax
  directly in MDX — keep ASCII as the source of truth.
- Include `console.log` statements where they help learners inspect actual
  request/response data while working through an example (e.g. logging the
  response body before asserting on it, logging a captured JWT). Don't
  scatter them everywhere — use them where seeing the real output builds
  understanding, then show the assertion that replaces the manual check.
- Explain code syntax, not just show it. When introducing a new pattern
  (e.g. `.expect()`, `async/await`, `test.each`, a Jest matcher), briefly
  say what it does and why it's written that way before or after the code
  block — don't drop a snippet with zero explanation and assume it's
  self-evident.
- Before writing a module, fetch the live OpenAPI spec
  (`curl http://localhost:5000/api-docs.json`, fallback
  `http://localhost:5000/api-docs/swagger.json`) and verify every endpoint,
  field, and example against it.

## Pages

### Course Overview (`course-overview`)
What you'll build, prerequisites (TS basics, Node installed), intro to the
RBAC app and its roles, how this course fits alongside your other testing
courses without naming or comparing specific ones.

### Setup (`setup`, Module 0)
Verify Node/TypeScript/Jest install, clone the RBAC repo, install deps,
start the backend on `:5000`, confirm Swagger loads at `/api-docs`, run a
smoke request to confirm the environment works before Module 01.

### 01. API Testing Foundations
What API testing covers vs UI testing, the request/response contract,
where API tests fit in a test pyramid, why teams invest in this layer.

### 02. In-Process vs Black-Box Testing
The two ways to test an API: real HTTP calls vs importing the app directly.
What each approach can and can't catch. Why this course tests in-process.
**Diagram:** request path — test → app import vs test → HTTP → server.

### 03. TypeScript + Jest + Supertest Setup
Installing Jest, Supertest, `ts-jest`/`@types` packages, `tsconfig.json`
for tests, `jest.config`, importing the RBAC `app` export, running a first
passing test.

### 04. Writing Supertest Requests
`request(app).get/post/put/delete`, chaining `.send()`, `.set()`, `.query()`,
reading the response object, first full request/response round trip.

### 05. Async/Await + Jest
Why API tests are async, `async`/`await` in `it()` blocks, avoiding
unhandled promise rejections, common mistakes (forgetting `await`, missing
`return`).

### 06. Authentication + JWT
Calling the login endpoint (`admin`/`admin123`), capturing the JWT, building
a reusable auth helper that every later module imports instead of
re-deriving login logic.
**Diagram:** login → token issued → token reused across requests.

### 07. CRUD API Testing
Testing Create/Read/Update/Delete endpoints on RBAC resources, expected
status codes per operation, verifying state changes persisted.

### 08. Assertions + Response Validation
Status code assertions, header checks, body shape assertions, Jest matcher
patterns (`toMatchObject`, `toHaveProperty`), what makes a good assertion
vs a brittle one.

### 09. Schema + Contract Validation
Validating response shape against a schema (Zod or JSON Schema), catching
contract drift automatically instead of asserting field-by-field.

### 10. OpenAPI Testing
Using the RBAC app's Swagger/OpenAPI spec as a source of truth, validating
responses against the spec, catching undocumented or drifted endpoints.

### 11. RBAC + Permission Matrix
Testing the same endpoint across all 4 roles, data-driven test generation
from a role × endpoint matrix, expected allow/deny outcomes per role.
**Diagram:** role × endpoint permission matrix.

### 12. Negative + Edge-Case Testing
Invalid tokens, missing/malformed fields, boundary values, confirming this
app's actual behavior (e.g. 403 for invalid tokens, verified against its own
tests — don't assume 401).

### 13. API Security Testing
Testing for broken auth, injection-style inputs, excessive data exposure,
verifying role checks can't be bypassed via parameter tampering.

### 14. Test Data + Fixtures
Managing seed data, building fixtures, setup/teardown per suite, handling
this repo's seed data inconsistencies explicitly rather than hiding them.

### 15. Database Testing
Verifying database state directly after API calls, test isolation between
runs, resetting state between suites.
**Diagram:** test isolation/teardown flow.

### 16. Mocking + Isolation
When and how to mock external dependencies while keeping the app and DB
real, `jest.mock` patterns, what NOT to mock in an in-process API test.

### 17. Flaky Test Prevention
Common causes of flaky API tests (shared state, timing, unclosed
connections), how to write deterministic tests, avoiding hardcoded waits.

### 18. Parameterized Testing
`test.each`/`describe.each` for running the same test logic across multiple
inputs, reducing duplication across CRUD and role-matrix tests.

### 19. Test Framework Architecture
Organizing a growing suite: folder structure, shared request builders,
config, separating helpers from specs.
**Diagram:** folder/layer architecture.

### 20. API Test Coverage
What coverage means for API tests, endpoint coverage vs code coverage,
identifying gaps in the current suite.

### 21. Reporting + Diagnostics
Jest HTML reporter or Allure integration, attaching request/response
payloads to failed test reports for debugging without re-running.

### 22. CI/CD + GitHub Actions
Install deps, start the RBAC backend as a background service, run `npm
test`, publish the report as an artifact, wire in as a required PR check.
**Diagram:** CI pipeline stages.

### 23. Parallel Test Execution
Running suites in parallel safely, avoiding shared-state collisions across
parallel workers, Jest's parallelization model.

### 24. Smoke + Performance Testing
Lightweight smoke suite for fast feedback, basic response-time assertions,
where this ends and dedicated performance testing begins.

### 25. Requirements → Test Design
Going from a feature requirement or user story to a test plan, mapping
RBAC permission rules to concrete test cases before writing code.

### 26. Capstone: API Automation
Standalone capstone — design and build a full test suite for a
not-yet-covered RBAC area, applying setup, auth, CRUD, RBAC-matrix,
negative-case, and CI patterns from the course end to end.
**Diagram:** end-to-end suite architecture.
