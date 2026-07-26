---
description: Generate a module for the Python for Test Automation course (fast on-ramp for manual testers)
---

# Add Python for Test Automation module: {ARGS}

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
first time. Don't assume prior programming comfort — explain concepts in
testing-relevant terms as they come up (e.g. explain what a function is by
relating it to a reusable test step, not with a generic CS-101 example).
Keep every module short and move quickly toward writing something that
resembles a real test — the goal is confidence to start automating, not
deep language fluency. If a concept isn't needed to read or write a basic
Python test, it doesn't belong in this course.

**Overlap check.** `python-for-ai` is an existing, detailed general Python
course — this course is deliberately NOT that. Don't re-teach general
Python syntax in depth here; assume this course may be someone's first-ever
exposure to programming and teach only the minimum needed to get moving,
while pointing them to `python-for-ai` as where to go for deeper general
Python knowledge (see Module 0 and the capstone).

**No single downstream automation course to link to yet.** Unlike the
TypeScript version of this course, there isn't yet a specific Python-based
automation course (Selenium, Playwright's Python bindings, etc.) for the
capstone to point to. Keep the closing note in Module 10 open-ended —
naming the realistic directions (Selenium, Playwright Python, API testing
with `requests`) without claiming a specific Sypher course exists for any
of them, unless told otherwise before generating that module.

## Course

- **Course title (sidebar/display name):** Python for Test Automation
- **Slug:** `python-for-test-automation`
- **Path:** `apps/docs/docs/python-for-test-automation/`
- **Audience:** manual testers with little or no programming background,
  moving into test automation for the first time. Assume no prior
  programming experience at all.
- **SUT:** `github.com/codedbyabhishekc/rbac-healthcare-system`. Backend at
  `http://localhost:5000` (Swagger at `/api-docs`), frontend at
  `http://localhost:3002`. Examples use its real domain shapes (User,
  Appointment, MedicalRecord, roles) so learners are modeling real data
  from the start, not toy examples.
- **Positioning:** the fastest possible path from "I test manually" to "I
  can read and write a basic Python test with confidence." Short,
  testing-only, and explicitly not a substitute for the full `python-for-
  ai` course — it's a fast on-ramp, and it says so.

## Modules

### 0. Setup
- Installing Python, VS Code with the Python extension
- Running a `.py` file for the first time
- One short, encouraging paragraph: this course is a fast path into test
  automation specifically, not a full Python course — `python-for-ai` is
  where to go for deeper general Python knowledge once comfortable here

### 1. Just enough Python to read a test
- Variables, basic types (strings, numbers, booleans), what a function
  call looks like
- Framed as "here's what you'll recognize when you open a test file,"
  moving quickly rather than dwelling on theory

**Dedicated section: ways to use `print()`.** This gets real space, not
just a passing mention — printing is the tool a learner will reach for
constantly from here through the rest of the course, well before pytest
exists to give them a proper pass/fail signal. Cover, each with its own
tiny example:
- **Printing a single value** — the absolute basics, `print(name)`,
  confirming a variable holds what you expect
- **Printing multiple values at once** — `print(name, age)`, and how
  Python separates them with a space automatically
- **Printing with a label so output is readable** — `print("status:",
  status)` — a small habit that matters the moment you're printing more
  than one thing while debugging a test
- **f-strings for readable formatted output** — `print(f"User {name} has
  role {role}")` — introduced here because it's genuinely the most common
  way real Python code prints things, not an advanced feature to save for
  later
- **Printing a dict or list directly** — showing that `print()` handles
  these structures readably on its own, which matters once test data
  (module 4) is a dict or list of dicts rather than a single value
- **Printing to check a value mid-function** — dropping a `print()` inside
  a function temporarily to see what a variable holds partway through,
  framed explicitly as a debugging habit: "add it while you're figuring
  something out, then take it back out once you understand what's
  happening — don't leave debug prints sitting in real test code"
- **Why this matters more once pytest exists** — a short forward-looking
  note (without pointing to a specific module number) that once there's a
  real test runner, failed assertions give you the pass/fail signal, but
  `print()` remains the tool for peeking at *why* something failed while
  you're figuring out a broken test

### 2. Functions and imports
- Writing a simple reusable function — framed as "a function is just a
  reusable test step you can call by name instead of retyping"
- `import` and `from ... import`, since real test projects are never one
  file
- One example: a small helper function (e.g. one that builds a test user)
  in its own file, imported and used elsewhere

### 3. Setting up pytest
- Installing pytest, writing and running the smallest possible test — one
  `assert` statement against something trivial
- Reading pytest's pass/fail output, since that's the first thing a
  manual tester will look at constantly once real tests exist

### 4. Lists, dicts, and sets — working with test data
- `list` and `dict` as the everyday way to model test data — one example
  modeling RBAC user or appointment data as a dict, and a list of them,
  each printed with `print()` so the learner sees the real structure
- `set` — introduced with a genuinely testing-relevant use: checking that
  a list of expected permissions matches a list of actual permissions
  regardless of order, using set operations (`==` between sets, or
  checking one set contains another) — a pattern that comes up constantly
  when comparing API responses to expected data
- A few of the operations worth knowing on each: adding/accessing items
  in a list and dict, checking membership with `in` (works naturally
  across all three), and the basic set operations (union, intersection)
  shown once with a simple example rather than a full tour

### 5. Type hints for test data
- Python's optional type hints (`def foo(name: str) -> bool`) — what
  they're for, and the honest note that Python won't stop you at runtime
  the way TypeScript would, but they still help readability and editor
  autocomplete
- One example adding type hints to the helper function from earlier

### 6. Calling APIs and understanding responses
- Using the `requests` library to hit a real RBAC endpoint
- Working with the JSON response — accessing fields, checking a status
  code — paired with a pytest assertion

### 7. Classes, briefly
- What a class looks like: a small example with `__init__`, one
  attribute, one method
- Framed specifically for what's coming next: Selenium and Playwright's
  Python bindings both use classes for Page Objects — one paragraph
  connecting this to that so the shape feels familiar later, not arbitrary
- Kept deliberately small — just enough to recognize and read a class

### 8. Fixtures and pytest conventions
- `@pytest.fixture` — what a fixture is and why pytest handles shared
  setup this way
- One example: a fixture that provides a logged-in test user's data to
  multiple tests without repeating the setup code in each one

### 9. Structuring a simple test project
- Where test files, fixtures, and `conftest.py` typically live in a
  pytest project
- One example organizing the RBAC helper functions and fixtures built so
  far into a small, sensible project layout

### 10. Capstone: modeling the RBAC permission matrix, and where to go next
- One small exercise: modeling the RBAC app's actual permission matrix
  (from the repo's own README) as a Python dict or small set of classes,
  then writing one pytest test that checks a role against it
- Closing note, open-ended per the instruction above: you now have the
  Python foundation to start automating — whether that's Selenium,
  Playwright's Python bindings, or API testing with `requests`, the
  concepts from this course carry over directly. For deeper general
  Python knowledge, `python-for-ai` is the place to go next.

## Conventions
- Once `print()` is introduced in Module 1, use it in any example before
  pytest is set up (Module 3) so a learner can run and see real output.
  Once pytest exists (Module 3 onward), lean on `assert` statements
  instead of `print()` as the primary way examples show correctness —
  that's the more realistic habit for someone about to write real tests.
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
  it's teaching general Python rather than something testing-specific, cut
  it back and point to `python-for-ai` instead
