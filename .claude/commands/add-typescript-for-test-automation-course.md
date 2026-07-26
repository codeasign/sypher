---
description: Generate a module for the TypeScript for Test Automation course (fast on-ramp for manual testers)
---

# Add TypeScript for Test Automation module: {ARGS}

`{ARGS}` = module number, a range, `index`, `setup`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` and match its conventions exactly — frontmatter,
sidebar wiring, file naming.

**Structure — one page per module, non-negotiable.** If the codebase
contains other content templates (e.g. a 4-page overview/build-it/avoid-
mistakes/review pattern like `add-topic-concept.md`), do NOT use them for
this course. Each module is exactly ONE file — a complete, standalone page
covering that module's full content in one go. Match the flat, single-
file-per-module structure used by this project's other course commands
(check `.claude/commands/` for the others if unsure), not any other
template found elsewhere in the docs. If genuinely unsure which structure
applies, stop and ask before generating rather than defaulting to a
different template.

**No meta-references to module numbers in the actual page content.** The
numbering in this spec ("Module 0," "Module 3," etc.) is for organizing
this command file only — it tells you what order to write things in and
what a module can assume the learner already knows. It is NOT something to
write into the learner-facing page itself. Never write phrases like "as
covered in Module 2," "in Module 5 you'll learn," "building on Module 3,"
or any other reference to a module by number inside the actual content a
learner reads. If you need to reference something taught earlier, describe
it in plain language instead. The page should read like a person
explaining something to another person sitting next to them, not like a
cross-referenced technical manual.

**Audience is specific — a manual tester, not a general learner.** This
course assumes someone who tests software for a living but may have
little or no programming background, moving into test automation for the
first time. Don't assume prior JavaScript comfort — explain programming
concepts in testing-relevant terms as they come up (e.g. explain what a
function is by relating it to a reusable test step, not with a generic
CS-101 example). Keep every module short and move quickly toward writing
something that resembles a real test — the goal is confidence to start
automating, not deep language fluency. If a concept isn't needed to read
or write a basic typed test, it doesn't belong in this course.

**Overlap check.** `learn-typescript` is the full language course — this
course is deliberately NOT that. Don't re-teach general TypeScript syntax
in depth here; assume this course is someone's first-ever exposure to
typed code and teach only the minimum needed to get moving, while pointing
them to `learn-typescript` as where to go deeper afterward (see Module 0
and the capstone).

## Course

- **Course title (sidebar/display name):** TypeScript for Test Automation
- **Slug:** `typescript-for-test-automation`
- **Path:** `apps/docs/docs/typescript-for-test-automation/`
- **Audience:** manual testers with little or no programming background,
  moving into test automation for the first time. Assume no JavaScript or
  TypeScript experience at all.
- **SUT:** `github.com/codedbyabhishekc/rbac-healthcare-system`. Backend at
  `http://localhost:5000` (Swagger at `/api-docs`), frontend at
  `http://localhost:3002`. Examples use its real domain shapes (User,
  Appointment, MedicalRecord, roles) so learners are modeling real data
  from the start, not toy examples.
- **Positioning:** the fastest possible path from "I test manually" to "I
  can read and write a basic typed test with confidence." Short,
  testing-only, and explicitly not a substitute for the full `learn-
  typescript` course — it's a fast on-ramp, and it says so.

## Modules

### 0. Setup
- Installing Node.js and TypeScript
- **Visual Studio Code setup**: installing VS Code, the TypeScript
  language features it has built in, and a couple of extensions worth
  having from day one (ESLint, Prettier) — explained simply, as "these
  give you helpful red squiggly lines and auto-formatting, not something
  to worry about configuring deeply yet"
- Running a `.ts` file for the first time
- One short paragraph, framed encouragingly: this course is a fast path
  into test automation specifically, not the full TypeScript language —
  once you're comfortable here, `learn-typescript` is where to go to learn
  the language in full depth

### 1. Just enough TypeScript to read a test
- The small set of syntax a manual tester will see constantly when they
  open an existing test file: basic types, what an interface looks like,
  what a typed variable looks like
- `console.log()` — introduced right away as the simple way to check what
  a value actually is while running code. This gets used throughout every
  module from here on, well before Jest is introduced, so a learner can
  always check their own work by running a file directly
- Framed as "here's what you'll recognize when you open a test file,"
  moving quickly rather than dwelling on theory

### 2. Functions and imports
- Writing a simple typed function — parameters, a return value — framed
  specifically as "a function is just a reusable test step you can call
  by name instead of retyping"
- Splitting code across files with `import`/`export`, since real test
  projects are never one giant file
- One example: writing a small helper function (e.g. one that builds a
  test user object) in its own file, then importing and using it elsewhere

### 3. Setting up Jest
- Installing Jest and `ts-jest` so TypeScript tests can actually run
- Writing and running the smallest possible test — one `expect` statement
  against something trivial — just to see the whole loop work end to end
  before anything test-automation-specific is introduced
- Reading Jest's pass/fail output, since that's the first thing a manual
  tester will look at constantly once real tests exist

### 4. Typing test data and fixtures
- Modeling something a test actually works with — a user, an appointment
  — as a simple interface
- One example building a small typed fixture object for the RBAC app's
  data, using the helper-function pattern from earlier

### 5. Typing API responses
- Typing what comes back from an API call so autocomplete and type
  checking actually help while writing assertions
- One example against a real RBAC endpoint, paired with a Jest test that
  asserts on the typed response

### 6. Understanding async test code
- `async`/`await` explained specifically in the context of "this is why
  your test function has `async` in front of it, and why you `await` an
  API call before checking its result" — not as an abstract language
  feature
- One Jest test example putting it together: an async test hitting the
  RBAC API and asserting on the typed, awaited result

### 7. Classes, briefly
- What a class looks like: a small example with a constructor, a
  property, and one method
- Framed specifically for what's coming next: most test automation
  frameworks (including the Playwright course this leads into) use
  classes to build Page Objects — one paragraph explaining that
  connection so the shape feels familiar rather than arbitrary when they
  see it again later
- Kept deliberately small — just enough to recognize and read a class,
  not a deep dive into the feature

### 8. Structuring a simple typed test project
- Organizing shared types and helper functions in their own files so
  they're defined once and reused across test files — the shape a manual
  tester will actually work inside from day one on a real automation team
- Where Jest config and test files typically live in a project, so the
  structure feels familiar rather than mysterious

### 9. Capstone: modeling the RBAC permission matrix as types, and where to go next
- One small exercise: modeling the RBAC app's actual permission matrix
  (from the repo's own README) as simple TypeScript types, then writing
  one Jest test that checks a role against it
- Closing note, explicitly linking onward: this is the bridge into
  `playwright-test-automation`, `api-testing-java`, or `api-testing-
  typescript` for actual test automation work, and into `learn-typescript`
  for anyone who wants to go deeper into the language itself now that
  they've seen it in action

## Conventions
- Once `console.log()` is introduced in Module 1, use it in any example
  before Jest is set up (Module 3) so a learner can run and see real
  output. Once Jest exists (Module 3 onward), lean on `expect()`
  assertions instead of `console.log()` as the primary way examples show
  correctness — that's the more realistic habit for someone about to write
  real tests.
- Write in a friendly, natural conversational English tone throughout —
  explain like a knowledgeable colleague talking a learner through it, not
  a dry spec sheet or terse bullet list. Full sentences and connective
  explanation over clipped fragments, while still staying technically
  precise.
- Never reference module numbers inside the actual page content — no "In
  Module 0," "as covered earlier in Module 3," etc. Describe prior
  concepts in plain language instead, never by number.
- Every code example runs against the real RBAC repo — no fabricated app
  or generic to-do-list examples
- Every module ends with one small "Try it" exercise a beginner could
  realistically finish in a few minutes. Each exercise must be
  self-contained and independent — a learner should be able to do any
  single module's exercise on its own without needing a previous module's
  exercise completed correctly first
- Keep this course short on purpose — if a module is starting to feel like
  it's teaching general TypeScript rather than something testing-specific,
  cut it back and point to `learn-typescript` instead
