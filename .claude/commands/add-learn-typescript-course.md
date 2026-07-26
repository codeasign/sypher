---
description: Generate a module for the Learn TypeScript course (simple tone, full language coverage)
---

# Add Learn TypeScript module: {ARGS}

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

**Simple tone, full coverage — hold both at once.** This course covers the
whole TypeScript language, beginner through advanced, but every module —
including the advanced ones — must stay simple, plain-English, and
code-first. "Covers everything" is about topic breadth, not about writing
density or jargon. A module on conditional types should read just as
plainly as a module on basic types: short explanation, small runnable
example, short explanation of what it does. If a topic feels like it needs
dense prose or a long theoretical build-up to explain, that's a sign to
simplify the explanation further, not a license to write more densely.
No comparison tables, no "under the hood" digressions, no discussion of
edge cases unless a learner would realistically hit them. If a concept has
a simple 90%-of-the-time version and a more nuanced version, lead with the
simple version always, and only add the nuance if it's genuinely necessary
to use the feature correctly.

**No meta-references to module numbers in the actual page content.** The
numbering in this spec ("Module 0," "Module 3," etc.) is for organizing
this command file only — it tells you what order to write things in and
what a module can assume the learner already knows. It is NOT something to
write into the learner-facing page itself. Never write phrases like "as
covered in Module 2," "in Module 5 you'll learn," "building on Module 3,"
or any other reference to a module by number inside the actual content a
learner reads. If you need to reference something taught earlier, describe
it in plain language instead — "remember how we typed a function's return
value earlier? we're doing the same thing here" reads naturally; "as shown
in Module 4" does not. The page should read like a person explaining
something to another person sitting next to them, not like a cross-
referenced technical manual.

**Overlap check.** `typescript-for-test-automation` is a different,
separate course scoped specifically to testing patterns — don't merge or
cross-reference it. This course teaches the language itself end to end,
nothing testing-specific, and doesn't assume the learner is heading into
test automation at all.

## Course

- **Course title (sidebar/display name):** Learn TypeScript
- **Slug:** `learn-typescript`
- **Path:** `apps/docs/docs/learn-typescript/`
- **Audience:** engineers with basic JavaScript knowledge, zero TypeScript
  experience at the start. By the end, comfortable with the full language
  including its more advanced corners — not just the basics.
- **Examples:** one consistent, simple sample domain chosen in Module 0
  (e.g. a small to-do list or a simple library/book-tracking app) reused
  throughout, including in the advanced modules. Keeping one familiar
  domain the whole way through means an advanced concept like a mapped
  type is explained against something the learner already understands,
  not a new, harder-to-follow example.
- **Positioning:** the whole TypeScript language, taught simply. Nothing
  is skipped for being "too advanced" — it's taught plainly instead of
  being cut. If a learner finishes this course, they should be able to
  read and write TypeScript confidently across the full range of what
  they'll encounter in real codebases and library type definitions.

## Modules

### 0. Setup
- Install TypeScript (`npm install -g typescript` or per-project), run
  `tsc --init`
- One simple `tsconfig.json` — `strict: true` and the basics, explained in
  a sentence or two each, not a deep dive
- How to run a `.ts` file (`ts-node`, or compile-then-run) — pick one
  simple path and stick with it
- Introduce the sample domain in one or two sentences

### 1. Why TypeScript
- One short, plain explanation: TypeScript adds types to JavaScript so
  mistakes get caught before running the code, not after
- One tiny before/after example: a JS bug that TypeScript would have
  caught immediately

### 2. Basic types
- `string`, `number`, `boolean`, arrays
- Before anything else: introduce `console.log()` in one or two sentences
  as the way to actually see what a value is while running code — this is
  the first time it's used, and it gets used constantly from here on
- Simple annotated examples for each basic type, each one printed with
  `console.log()` so the learner runs the example and sees the real value,
  not just reads typed code on a page

### 3. Objects and interfaces
- Describing the shape of an object with an `interface`
- One example modeling something simple from the sample domain
- Optional (`?`) and readonly properties, one clear example each

### 4. Type aliases
- `type` as another way to name a shape, shown against the same example
  from the interfaces module
- One plain-English line on when people reach for `type` vs `interface` —
  simple guidance, not the full theoretical distinction

### 5. Functions
- Typing parameters and return values
- One example each: typed parameters, a typed return value, an optional
  parameter, a default parameter
- Arrow function syntax shown once, briefly

### 6. Arrays and working with lists
- Typing an array of a specific shape (e.g. `Book[]`)
- Looping through a typed array and using its properties safely
- One simple example using `.map()` or `.filter()` with a typed array,
  since these show up constantly in real code

### 7. Union types
- "This can be one of a few things" — the plain-English framing before
  any syntax
- One simple example: a status that can only be one of a few specific
  values, and what happens if you try to assign something else

### 8. Type narrowing
- The plain problem this solves: once you have a union type, how do you
  safely handle each possibility?
- `typeof` and simple `if` checks, shown with one clear example — enough
  to use narrowing confidently, not a tour of every narrowing technique

### 9. Classes
- Basic class syntax: constructor, properties, one method
- Access modifiers (`public`, `private`) explained simply — "private just
  means other code can't touch this from outside the class"
- One small example built from the sample domain

### 10. Working with async code
- `async`/`await` with a typed return value
- One simple example: a function that "fetches" (can be simulated) and
  returns a typed result

### 11. Generics
- The plain problem generics solve: writing one function or type that
  works with many different types, instead of copy-pasting a version for
  each one
- One simple, concrete example — a function that wraps any value in a
  simple container type — before anything more complex
- Stay at the "this is genuinely useful and not scary" level; save
  advanced generic patterns for the dedicated advanced generics module

### 12. Utility types
- `Partial`, `Pick`, `Omit`, `Record` — each shown with one small example
  against the sample domain, explained in plain terms ("Partial just
  means every property becomes optional")
- Enough to recognize and use the common ones comfortably

### 13. Enums vs. union literals
- Both shown with the same simple example
- One plain-English line on which one people reach for more often today,
  and why — simple guidance, not a debate

### 14. Working with untyped code
- `@types/` packages, and what to do when a library has none
- Writing a tiny local type for an untyped function, shown as one small
  example
- When `any` is a reasonable shortcut vs. when it's worth avoiding —
  explained plainly, not moralized about at length

### 15. Advanced generics
- Building on the basic generics module: constraints (`extends`) shown
  through one concrete example, generic defaults shown through one more
- Kept as simple and example-led as every other module — this is still
  "here's a useful tool," not a theory lecture

### 16. Conditional and mapped types
- The plain problem these solve: sometimes you want to build a new type
  based on transforming an existing one, automatically
- One small, clear example of each — enough to recognize these patterns
  when reading library type definitions (React, ORMs), and to write a
  simple one yourself
- Explicitly framed as "you'll use these occasionally, not constantly" so
  a learner doesn't feel behind if this feels less immediately natural
  than earlier modules

### 17. Decorators
- What a decorator is, in plain terms: a way to add extra behavior to a
  class or method without changing its code directly
- One small example, plus a note on where learners will actually
  encounter these in the wild (frameworks like NestJS, some ORMs)

### 18. Modules and project structure
- `import`/`export` basics, organizing types across multiple files so
  they're defined once and reused
- One simple example splitting the sample domain's types into their own
  file and importing them elsewhere

### 19. Reading and understanding type errors
- Several real beginner-to-intermediate mistakes shown with the actual
  error message TypeScript gives, translated into plain English
- Include at least one error from a more advanced feature (a generic
  constraint, a conditional type) so learners aren't caught off guard by
  scarier-looking messages later on
- This module exists specifically so learners feel confident reading
  errors, not intimidated by them

### 20. Putting it all together
- One small, complete project using a mix of concepts from across the
  whole course, built against the sample domain — a short program a
  learner can run start to finish
- No new concepts introduced here — just applying what's already been
  taught, across both the simple and advanced material

## Conventions
- Once printing is introduced, use `console.log()` liberally in later
  modules' examples so a learner can actually run the code and see real
  output, not just read it silently
- Write in a friendly, natural conversational English tone throughout —
  explain like a knowledgeable colleague talking a learner through it, not
  a dry spec sheet or terse bullet list. Full sentences and connective
  explanation over clipped fragments, while still staying technically
  precise. This applies equally to every module, including the advanced
  ones — advanced topics get simpler explanations, not denser ones.
- Never reference module numbers inside the actual page content — no "In
  Module 0," "as covered earlier in Module 3," etc. Describe prior
  concepts in plain language instead, never by number.
- Lead with the code example early in every module — don't make a learner
  read several paragraphs before seeing anything runnable
- No jargon without a plain-English explanation the first time it's used
- Every module ends with one small "Try it" exercise a beginner could
  realistically finish in a few minutes — not an open-ended challenge.
  Each exercise must be self-contained and independent: a learner should
  be able to do any single module's exercise on its own, without needing
  to have completed a previous module's exercise correctly first. Don't
  build one running project across exercises where a mistake early on
  breaks a later one — each exercise starts fresh from that module's own
  example code.
- If in doubt about whether to include a topic, include it — this course
  is meant to cover the whole language. If in doubt about how to explain
  it, always choose the simpler explanation.
