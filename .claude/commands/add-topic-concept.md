---
description: Generate a production-quality course topic for a developer tutorial website with Educative, ByteByteGo, and NeetCode-level depth and consistency. Each lesson is paginated into short focused sub-pages, not one long page.
---

# Create a complete course topic for: $ARGUMENTS

Read **CLAUDE.md** first and follow every instruction exactly.

The generated content must feel like it was written by a senior engineer teaching another engineer — not by AI.

Never skip required sections. Conditional sections may be omitted when explicitly marked as such below — do not pad them with filler to satisfy a rule.

Prefer depth over breadth.

**Narration rules — non-negotiable:**
- Write in second person, speaking directly to the person learning: "you will build", "you should already know", "your prompt". Never refer to them in third person as "the reader" or "the learner."
- Never use Docusaurus admonition syntax — no `:::info`, `:::note`, `:::tip`, `:::caution`, `:::danger`, or any `:::` block of any kind, anywhere in lesson content. Use plain `##` headers instead. Example: write `## What You Will Learn` as a normal heading, not `:::info What you will learn`.
- Write entirely in English. Every word in every file must be standard English — no stray characters from other languages, alphabets, or scripts anywhere in headings, prose, code comments, or examples. Before finishing each file, scan it once specifically for any non-English character and replace it with the correct English word.
- Write like a senior engineer explaining something to a colleague at their desk — direct, conversational, no narrator distance.

**Pagination rule — non-negotiable:**
- A single lesson topic is NEVER one long file. It is always split into 4 short sub-pages (see EVERY LESSON IS FOUR PAGES below). No sub-page should run longer than what fits comfortably in 2-3 screens of scrolling. If a sub-page is getting long, that is a signal to trim prose, not a reason to merge pages back together.

---

# COURSE GOALS

The course should teach you to:

- Understand the concept
- Know why it exists
- Know when to use it
- Know when NOT to use it
- Understand internal implementation
- Build something practical
- Debug common problems
- Apply it in production

Assume you want job-ready skills.

---

# NAMING

Convert topic into:

- slug → kebab-case
- sidebarId → camelCase
- Title → Proper Title Case

Each lesson also gets a lesson-slug (kebab-case), used as a folder name — see FILE STRUCTURE.

---

# FILE STRUCTURE

```
docs/<slug>/
    index.md

    <lesson-1-slug>/
        overview.mdx
        build-it.mdx
        avoid-mistakes.mdx
        review.mdx

    <lesson-2-slug>/
        overview.mdx
        build-it.mdx
        avoid-mistakes.mdx
        review.mdx

    ...

    practice/
        beginner.mdx
        intermediate.mdx
        advanced.mdx
        solutions.mdx

sidebars/<slug>.json
```

Every lesson is a folder containing exactly 4 files, never a single `.mdx` file directly under `docs/<slug>/`.

---

# INDEX PAGE

Generate an overview page containing:

- What this topic is
- Why it matters
- Skills gained
- Estimated completion time
- Difficulty
- Prerequisites
- Course roadmap
- Learning outcomes
- Links to every lesson (link to each lesson's `overview` page, e.g. `./first-lesson-slug/overview`)
- Practice overview

---

# LESSON TYPES

Before writing a lesson, classify it as one of:

- **Conceptual** — explains an idea, model, or architecture (e.g. "What is RAG", "What is an Agent")
- **Practical** — teaches a skill you directly apply (e.g. "Building Your First Tool", "Setting Up Playwright")
- **Reference** — a focused explanation of one mechanism (e.g. "Locator Strategies", "Token Budgets")

The classification determines which conditional sections below apply. This classification is not written into the output — it only guides which sections to include.

---

# EVERY LESSON IS FOUR PAGES

A lesson is a folder docs/<slug>/<lesson-slug>/ containing four short, focused .mdx files. Each page has its own frontmatter and stands alone — someone can read just "Build It" without reading "Overview" first if they already understand the concept.

Shared header pattern on every one of the 4 pages: frontmatter with title and sidebar_label, then an H1 matching the page-specific title, then a reading time line.

Only overview.mdx carries the difficulty badge line: Difficulty: Beginner | Intermediate | Advanced

---

## PAGE 1 — overview.mdx

The "should I care, what is this" page. Short and inviting.

Sections, in order:

**What You Will Learn** — by the end of this lesson you will be able to: (3-4 bullets)

**Prerequisites** — you should already understand: (short list). Link to official docs where relevant — see FURTHER READING rules.

**Why This Matters** — minimum TWO substantial paragraphs. Explain real-world importance, where companies use it, why interviews ask about it, why developers struggle with it. Make the case for why this topic matters.

**The Problem** — required for Conceptual and Practical lessons, omit for Reference lessons that are a direct continuation of a problem already established in a prior lesson. Start with a real engineering problem. Explain why naive solutions fail.

**The Concept** — explain in plain English. NO CODE in this section. Use analogies. Build intuition first.

**The Big Picture** — a diagram. Use:
```
<AsciiDiagram id="<slug>/<lesson-slug>/overview" alt="..." caption="Figure 1" content={`...`} />
```

**What's Next** — one sentence: this lesson continues in Build It, where you implement this hands-on. Link to ./build-it.

---

## PAGE 2 — build-it.mdx

The hands-on teaching page.

Sections, in order:

**Breaking It Down** — split into 3-5 logical sections. Each section must include: explanation, production example, complete code, inline comments. Every code block MUST have a language tag. Never show unexplained code.

Tabbed code — use when genuinely equivalent. When the same idea has equivalent code in two or more languages or SDKs (e.g. the Anthropic SDK vs the OpenRouter equivalent, Python vs TypeScript for the same call), present them as tabs using the Docusaurus Tabs/TabItem components instead of separate sequential code blocks. Import Tabs and TabItem once, at the top of the first code block that uses them, with `import Tabs from '@theme/Tabs';` and `import TabItem from '@theme/TabItem';`. A blank line is required immediately after the opening TabItem tag before the code fence, or the code block will not render correctly. Set the default prop on the tab matching this course's primary language. Do not overuse tabs — most code blocks should remain plain fenced blocks, reserved only for moments where the language or SDK genuinely forks.

**How It Works Internally** — required for Conceptual lessons, optional for Practical and Reference lessons (include only if there is genuine internal mechanism worth explaining, e.g. how a hash map resolves collisions — omit rather than pad). Explain what happens behind the scenes: execution flow, memory behavior, lifecycle, runtime behavior. Use diagrams if useful.

**Build Something Real** — build something realistic. Avoid toy examples. Prefer real frameworks and tools relevant to the course. Examples should evolve throughout the course — reuse the same running example across lessons where it makes sense.

**Performance Considerations** — include only if genuinely relevant to this lesson (e.g. database queries, loops over large data, network calls, agent token usage). If not relevant, omit this section entirely — do not write a generic paragraph to satisfy the rule. When included, discuss: time complexity, memory usage, scalability, bottlenecks, optimization opportunities.

**Security Considerations** — include only if genuinely relevant (e.g. auth, user input, secrets, external APIs, prompt injection). If not relevant, omit entirely. When included, explain: common vulnerabilities, safe defaults, validation, authentication, authorization, secrets, production concerns.

**What's Next** — one sentence: continue to Avoid Mistakes to see what commonly goes wrong here and how to debug it. Link to ./avoid-mistakes.

---

## PAGE 3 — avoid-mistakes.mdx

The "what goes wrong and how to fix it" page.

Sections, in order:

**When NOT to Use This** — required for Conceptual and Practical lessons, omit for Reference lessons where the lesson is itself describing a constraint or edge case rather than a tool/pattern choice. Explain: limitations, tradeoffs, alternatives, anti-patterns.

**The Pattern to Remember** — a short block with Pattern, When to use, When NOT to use, Mental model.

**Common Mistakes** — exactly FIVE. Each includes: mistake, why it happens, symptoms, fix.

**What's Next** — one sentence: continue to Review to test what you have learned. Link to ./review.

---

## PAGE 4 — review.mdx

The short wrap-up and self-test page.

Sections, in order:

**Key Takeaways** — exactly FIVE bullets.

**Recap in 60 Seconds** — if you only remember three things: (numbered list of 3).

**Further Reading** — official documentation, specifications, RFCs, books — see FURTHER READING rules below for what links are allowed.

**What Comes Next** — one paragraph linking naturally to the next lesson's overview page.

---

# FURTHER READING — LINK RULES

Default to real, specific links from official sources for every Further Reading entry — official documentation sites (e.g. docs.python.org/3/library/..., docs.anthropic.com/en/api/..., numpy.org/doc/...) and official GitHub repositories. These are the primary source type for this site and should be used by default, not avoided.

If you have web search available, use it to confirm a specific URL exists before including it — this is the preferred path for getting exact, correct deep links.

If you do not have web search available, link to the most well-known, stable entry point you are confident is correct for that exact library or concept — typically a documentation site's root or top-level section page rather than a guessed deep path you cannot verify. Do not invent or guess a specific path, slug, anchor, or query string you are not confident exists.

Use a TODO placeholder only for non-official sources where no verified link is available — a specific blog post, a third-party tutorial, a research paper, a changelog entry, or any resource that is not the library's own official documentation or official GitHub repository. Never invent a URL for these; describe what should go there instead.

---

# PRACTICE SECTION

## beginner.mdx

THREE exercises. One concept per exercise. Each includes: problem, expected input, expected output, hints, constraints.

## intermediate.mdx

THREE exercises. Each combines 2–3 concepts. Use realistic scenarios.

## advanced.mdx

TWO production-style problems. Require architecture decisions.

Total per course: 8 challenges (3 beginner + 3 intermediate + 2 advanced). Across 8 courses this yields 64 challenges platform-wide.

## solutions.mdx

For EVERY exercise include, in full — never abbreviate or summarise: a Problem statement, Key insight, Thinking process (reasoning before code), Solution (complete code with every important line commented), Why this works, Complexity analysis (time and space), Edge cases, and Alternative solutions.

If running low on output budget, prioritise completing every solution in full over adding extra polish to earlier ones.

---

# WRITING STYLE

Write like: Educative, ByteByteGo, NeetCode, Microsoft Learn, Stripe Docs.

Avoid: fluff, marketing language, unnecessary repetition.

Use: short paragraphs, bullet lists, tables where useful, diagrams, practical examples.

Teach before showing code.

---

# CODE REQUIREMENTS

Every code block: language specified, formatted, commented, production-quality, compilable where applicable. No pseudo-code unless explicitly labeled as pseudocode.

---

# MDX SAFETY — NON-NEGOTIABLE

These files are compiled as MDX, not plain Markdown. MDX parses `{` and `<` as the start of JSX expressions and tags respectively, even in prose text outside code blocks. Getting this wrong breaks the entire site build, not just one page.

**Curly braces in prose.** Any `{` or `}` appearing in plain text outside a fenced code block — a dict literal example, an f-string fragment, a JSON snippet mentioned inline — must be wrapped in backticks, e.g. `` `{"key": "value"}` ``, or moved into a proper fenced code block. Never leave a bare `{` in prose.

**Angle brackets in prose.** Any `<` appearing in plain text outside a fenced code block or a valid Markdown link — a comparison like `<100ms` or `<1 second`, a generic type signature like `List<int>`, an HTML-style placeholder like `<your-key-here>` — must be wrapped in backticks, e.g. `` `<100ms` ``, or moved into a code fence. MDX will try to parse `<` followed by anything that is not a letter, `$`, or `_` as a broken JSX tag and fail the build.

**Before finishing each file**, scan it once specifically for any bare `{`, `}`, or `<` sitting in prose text rather than inside a code fence or backticks, and fix every instance found. This check is mandatory on every file, not optional.

---

# SIDEBAR

Generate sidebars/<slug>.json with two top-level categories: Learn, Practice. Inside Learn, each lesson is itself a nested collapsible sub-category containing its 4 pages, in this order: overview, build-it, avoid-mistakes, review.

---

# NAVBAR

Add the new topic as the last item inside === TOPICS === in docusaurus.config.js. Preserve the existing order of all current items.

---

# CLAUDE.md

Append the new topic to the topic list, preserving the existing order.

---

# HARD RULES

- A lesson is ALWAYS 4 pages in a folder (overview, build-it, avoid-mistakes, review) — never one long file
- No sub-page should be longer than 2-3 screens of scrolling — trim prose rather than merge pages
- Never use Docusaurus admonition syntax (:::info, :::note, :::tip, :::caution, :::danger) — use plain ## headers instead
- Write entirely in standard English — no stray characters from other languages or scripts anywhere
- No bare `{`, `}`, or `<` in prose text outside a code fence or backticks — these break the MDX build; see MDX SAFETY section
- Write in second person throughout — address the person directly as "you," never as "the reader" or "the learner"
- Use Tabs/TabItem only where two or more languages or SDKs are genuinely equivalent ways to express the same idea
- Default to real, specific links from official documentation and official GitHub repositories; use TODO only for non-official sources (blog posts, papers, tutorials) where no verified link is available
- Every lesson includes at least one AsciiDiagram (on the overview page)
- Every lesson includes a realistic production example (on build-it)
- Conditional sections (Performance, Security, Internal Working, The Problem, When Not To Use This) follow the per-section inclusion rules above — never force a section that doesn't apply
- Every lesson contains exactly five common mistakes and exactly five key takeaways
- Explain reasoning before code in every solution
- Every solution in solutions.mdx must be complete — never abbreviated
- Use progressive examples that evolve throughout the course where natural
- New topics are appended at the end of existing lists (navbar, CLAUDE.md) — never alphabetised, never reordered
- Prefer depth over breadth
- Produce content suitable for publication without requiring manual editing
