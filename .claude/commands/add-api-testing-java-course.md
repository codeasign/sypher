---
description: Generate a module for the API Testing using Java course
---

# Add API Testing using Java module: {ARGS}

`{ARGS}` = module number, a range, `overview`, `setup`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` (e.g. `add-api-testing-python-course.md`) and match its
conventions exactly.

## Course

- **Course title (sidebar/display name):** API Testing using Java
- **Slug:** `api-testing-java`
- **Path:** `apps/docs/docs/api-testing-java/`
- **Audience:** engineers who know Java basics, new to API test
  automation.
- **Stack:** JUnit 5, RestAssured, Maven (or Gradle — pick one and stay
  consistent; Maven is the more common default for this kind of course
  unless the repo's other Java tooling suggests otherwise).
- **SUT:** `github.com/codedbyabhishekc/rbac-healthcare-system` — Node/
  Express/SQLite/React RBAC healthcare app, 4 roles (Administrator, Doctor,
  Nurse, Patient), 9x4 permission matrix. Backend runs on `:5000` (Swagger
  at `/api-docs`), frontend on `:3002`.
  - Login test credentials: `admin` / `admin123`.
  - The Swagger spec and permission matrix have gaps by intentional design,
    not by accident. Scope every module to the documented/covered surface
    so all examples and exercises are fully buildable — no module relies on
    an endpoint or rule that doesn't exist in the spec.
  - Before writing any module, fetch the live OpenAPI spec
    (`curl http://localhost:5000/api-docs.json`, fallback
    `http://localhost:5000/api-docs/swagger.json`) and verify every
    endpoint, field, and example against it. Every code example and "Try
    it" exercise must map to a real, existing API — never invent a
    plausible-sounding endpoint or field.
- **Testing approach:** black-box HTTP — Java calls the running RBAC
  backend over real HTTP via RestAssured, same as any external client.
- **Central framing:** the OpenAPI/Swagger spec is the anchor for the whole
  course, not just one module's topic. Every module frames its tests as
  "does the real response match what the spec promises," not just
  code-first testing. Module 05 (Reading the OpenAPI Spec) is the reference
  point every later module links back to.
- **Explicitly out of scope:** In-Process vs Black-Box testing (not
  applicable — Java can only test this Node/Express backend over real HTTP,
  never in-process). Everything else the TypeScript course covers IS in
  scope for this course (see full page list below) — unlike the condensed
  Python course, this course is full-depth.

## Conventions

- One page per module — no multi-page overview/build-it/avoid-mistakes/
  review template.
- Friendly, natural conversational English tone throughout — write fluent
  prose, not stiff or translated-sounding phrasing. Read each section back
  as if explaining to a colleague, not documenting a spec.
- No meta-references to module numbers in learner-facing content (don't
  write "as we saw in Module 3" — write "as you saw earlier" or link
  directly).
- Every example runs against the real RBAC backend — no mocked server.
- Auth handling shown once thoroughly (Module 04), reused via a shared
  RestAssured `RequestSpecification`/helper class everywhere after — don't
  re-derive login logic per module.
- Each module ends with a self-contained "Try it" exercise extending the
  RBAC example, independent of other modules' exercises.
- Include `System.out.println` (or a logging equivalent, pick one and stay
  consistent) statements where they help learners inspect actual
  request/response data while working through an example (e.g. printing
  the response body before asserting on it, printing a captured JWT).
  Don't scatter them everywhere — use them where seeing the real output
  builds understanding, then show the assertion that replaces the manual
  check.
- Explain code syntax, not just show it. When introducing a new pattern
  (e.g. `given().when().then()`, `@Test`, `@BeforeAll`,
  `@ParameterizedTest`), briefly say what it does and why it's written
  that way — don't drop a snippet with zero explanation.
- Before writing any module, fetch the live OpenAPI spec and verify every
  endpoint, field, and example against it (see SUT notes above).
- Diagrams: author as ASCII in the MDX source inside `<AsciiDiagram>`,
  converted to Mermaid at build time via the existing pipeline
  (`remark-normalize-ascii-diagrams.mjs`). Do not hand-author Mermaid syntax
  directly in MDX.

## Pages

### Course Overview (`course-overview`)
What you'll build, prerequisites (Java basics, JDK installed, Maven/Gradle
familiarity not required), intro to the RBAC app and its roles, why this
course treats the OpenAPI spec as the source of truth rather than testing
endpoints ad hoc.

### Setup (`setup`, Module 0)
Verify JDK/Maven install, clone the RBAC repo, install deps, start the
backend on `:5000`, confirm Swagger loads at `/api-docs`, fetch the OpenAPI
JSON, run a smoke request (a first passing JUnit test) to confirm the
environment works.

### 01. API Testing Foundations
What API testing covers vs UI testing, the request/response contract, why
testing against a spec (not just against current behavior) catches more
bugs.

### 02. JUnit 5 + RestAssured Setup & First Request
Installing RestAssured and JUnit 5 via Maven, project structure, `pom.xml`
config, writing and running a first passing test with
`given().when().get()`.

### 03. Anatomy of a RestAssured Test
`given()/when()/then()` chaining, reading the response object, first full
request/response round trip. Cover `RequestSpecification` and
`ResponseSpecification` properly here (not just in passing): what they are,
building a reusable `RequestSpecification` via
`RequestSpecBuilder`/`RequestSpecification.Builder` (base URI, base path,
default headers, content type, logging filters), passing it into
`given().spec(...)`, and why centralizing this avoids repeating base
URI/headers in every test. This is the foundation Module 04 builds on when
adding auth to the shared spec.

### 04. Authentication + JWT
Calling the login endpoint (`admin`/`admin123`), capturing the JWT, building
a reusable auth helper (a shared `RequestSpecification` or utility class)
that every later module imports instead of re-deriving login logic.

### 05. Reading the OpenAPI Spec
Fetching and parsing the spec JSON, understanding paths/schemas/
components, how Swagger UI maps to the raw spec. This is the reference
module — call out explicitly that every later module will point back here.
**Diagram:** spec → generated test mapping.

### 06. Generating Test Cases from the Spec
Turning spec paths and methods into a checklist of test cases, deriving
expected status codes and response shapes directly from the spec rather
than guessing.

### 07. CRUD Testing via Spec-Documented Endpoints
Testing Create/Read/Update/Delete endpoints exactly as documented in the
spec, verifying request/response bodies match declared schemas.

### 08. Assertions + Response Validation Against the Spec
Status code assertions, header checks, body shape assertions
(`Hamcrest` matchers) checked against what the spec declares — not just
what the code currently returns.

### 09. Schema + Contract Validation
Validating full response payloads against the spec's schema definitions
(e.g. via RestAssured's JSON Schema validation module), catching contract
drift automatically.

### 10. RBAC + Permission Matrix
Testing the same spec-documented endpoint across all 4 roles, data-driven
test generation from a role × endpoint matrix using `@ParameterizedTest`,
expected allow/deny outcomes per role as declared (or scoped, given
intentional gaps) in the spec.
**Diagram:** role × endpoint permission matrix.

### 11. Negative + Edge-Case Testing
Invalid tokens, missing/malformed fields, boundary values — testing against
the error responses the spec declares, confirming this app's actual
behavior (e.g. 403 for invalid tokens, verified against its own tests).

### 12. API Security Testing
Testing for broken auth, injection-style inputs, excessive data exposure,
verifying role checks can't be bypassed via parameter tampering.

### 13. Fixtures + Test Data Management
`@BeforeEach`/`@BeforeAll` setup/teardown, managing seed data, handling
this repo's seed data inconsistencies explicitly.

### 14. Database Testing
Verifying database state directly after API calls, test isolation between
runs, resetting state between suites.

### 15. Parameterized Testing
`@ParameterizedTest` with `@CsvSource`/`@MethodSource` for running the same
test logic across multiple spec-derived inputs, reducing duplication across
CRUD and role-matrix tests.

### 16. Mocking + Isolation
When and how to mock external dependencies (e.g. WireMock) while keeping
the real backend and DB in play for the tests that need them, what NOT to
mock in a black-box API test.

### 17. Flaky Test Prevention
Common causes of flaky API tests (shared state, timing, unclosed
connections), how to write deterministic tests, avoiding hardcoded waits
or `Thread.sleep`.

### 18. Test Framework Architecture
Organizing a growing suite: package structure, shared request builders,
config, separating helpers from tests.

### 19. API Test Coverage
What coverage means for API tests, endpoint coverage vs code coverage,
identifying gaps in the current suite.

### 20. Reporting + CI
JUnit HTML/Allure reporting, GitHub Actions: install deps, start the RBAC
backend as a background service, run `mvn test`, publish the report as an
artifact, required PR check.
**Diagram:** CI pipeline stages.

### 21. Parallel Test Execution
Running suites in parallel safely (JUnit 5 parallel execution config),
avoiding shared-state collisions across parallel threads.

### 22. Smoke + Performance Testing
Lightweight smoke suite for fast feedback, basic response-time assertions,
where this ends and dedicated performance testing begins.

### 23. Requirements → Test Design
Going from a feature requirement or user story to a test plan, mapping
RBAC permission rules to concrete test cases before writing code.

### 24. Capstone: Full Spec-Driven Test Suite
Build a complete spec-driven suite for a not-yet-covered RBAC area: parse
the spec, generate the test case checklist, write auth/CRUD/RBAC-matrix/
negative-case tests, validate against schema, wire into CI.
**Diagram:** end-to-end suite architecture.
