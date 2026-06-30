---
description: Generate a production-quality TOOL/SKILL course topic — for developer tools, frameworks, and platforms (Playwright, Claude Code, LightLLM, OpenRouter style topics). Action-first, not theory-first. Each lesson is paginated into short focused sub-pages, not one long page.
---

# Create a complete tool/skill course topic for: $ARGUMENTS

Read **CLAUDE.md** first and follow every instruction exactly.

This template is for TOOL and SKILL topics — you are teaching someone how to *use* something, configure it, and ship with it. Bias toward action over theory. The person reading this should be able to follow along and produce working output from lesson one.

Never skip required sections. Conditional sections may be omitted when explicitly marked as such — do not pad them with filler.

**Narration rules — non-negotiable:**
- Write in second person, speaking directly to the person learning: "you will build", "you should already know", "your config". Never refer to them in third person as "the reader" or "the learner."
- Never use Docusaurus admonition syntax — no `:::info`, `:::note`, `:::tip`, `:::caution`, `:::danger`, or any `:::` block of any kind, anywhere in lesson content. Use plain `##` headers instead. Example: write `## What You Will Learn` as a normal heading, not `:::info What you will learn`.
- Write entirely in English. Every word in every file must be standard English — no stray characters from other languages, alphabets, or scripts anywhere in headings, prose, code comments, or examples. Before finishing each file, scan it once specifically for any non-English character and replace it with the correct English word.
- Write like a senior engineer explaining something to a colleague at their desk — direct, conversational, no narrator distance.

**Pagination rule — non-negotiable:**
- A single lesson topic is NEVER one long file. It is always split into 4 short sub-pages (see EVERY LESSON IS FOUR PAGES below). No sub-page should run longer than what fits comfortably in 2-3 screens of scrolling. If a sub-page is getting long, that is a signal to trim prose, not a reason to merge pages back together.

---

# COURSE GOALS

The course should teach you to:

- Install and configure the tool correctly the first time
- Understand its core workflow end to end
- Know which configuration option to use and why
- Debug the errors you will actually hit
- Integrate it into a real project or pipeline
- Use it the way a senior engineer would — not just the happy path

Assume you want to be productive with this tool by the end of the course, not just informed about it.

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

Generate an overview page in this exact format (matches the shared site-wide index style):

```
# <Topic Name>

One paragraph: what this course covers and what you build by the end.

## Who this is for

- ...
- ...
- ...
- ...

## Prerequisites

- ...
- ...
- ...

## Learning path

Section 1 -> Section 2 -> Section 3 -> ...

Work through sections in order, or use the sidebar to jump directly to a topic.

## What this covers

- **Section name** — one line description
- **Section name** — one line description
...

Start with [First Lesson](./first-lesson-slug/overview).
```

---

# LESSON TYPES WITHIN A TOOL COURSE

Classify each lesson before writing it:

- **Setup/Install** — getting the tool running (e.g. "Setup", "Installing Playwright")
- **Core skill** — the main workflow you will use daily (e.g. "Locators", "Writing Your First Agent Command")
- **Configuration/Integration** — wiring the tool into something bigger (e.g. "GitHub Actions Integration", "Switching Models via .env")
- **Advanced/Production** — patterns a senior engineer uses (e.g. "Self-Healing Locators", "Parallel Execution")

This classification is not written into the output — it only determines which conditional sections below apply.

---

# EVERY LESSON IS FOUR PAGES

A lesson is a folder docs/<slug>/<lesson-slug>/ containing four short, focused .mdx files. Each page has its own frontmatter and stands alone — someone can read just "Build It" without reading "Overview" first if they already know the concept.

Shared header pattern on every one of the 4 pages: frontmatter with title and sidebar_label, then an H1 matching the page-specific title, then a reading time line.

Only overview.mdx carries the difficulty badge line: Difficulty: Beginner | Intermediate | Advanced

---

## PAGE 1 — overview.mdx

The "should I care, what is this" page. Short and inviting — this is the page someone reads before deciding to commit time to the lesson.

Sections, in order:

**What You Will Learn** — by the end of this lesson you will be able to: (3-4 bullets)

**Prerequisites** — you should already have/know: (short list). Link to official docs where relevant — see FURTHER READING rules.

**Why This Matters** — ONE to TWO paragraphs. Explain when a working engineer reaches for this specific capability and what breaks or slows down without it. Skip abstract theory — get to the point fast.

**Quick Reference** — required for Setup/Install and Configuration/Integration lessons, optional for Core skill and Advanced/Production lessons. A compact table to scan and come back to later.

**The Big Picture** — a diagram showing how this fits together. Use:
```
<AsciiDiagram id="<slug>/<lesson-slug>/overview" alt="..." caption="Figure 1" content={`...`} />
```

**What's Next** — one sentence: this lesson continues in Build It, where you implement this hands-on. Link to ./build-it.

---

## PAGE 2 — build-it.mdx

The hands-on teaching page. This is where the actual work happens — commands, code, configuration.

Sections, in order:

**Step by Step** — walk through the task as you will actually perform it, in order. Split into 3-5 logical steps. Each step includes: what to do, the exact command or code, what success looks like (expected output), what to do if it does not work (point forward to Avoid Mistakes). Every code block MUST have a language tag. Never show unexplained code.

Tabbed code — use when genuinely equivalent. When the same task has equivalent commands or code in two or more languages, shells, or package managers (e.g. PowerShell vs Bash, TypeScript vs JavaScript), present them as tabs using the Docusaurus Tabs/TabItem components instead of separate sequential code blocks. Import Tabs and TabItem once, at the top of the first code block that uses them, with `import Tabs from '@theme/Tabs';` and `import TabItem from '@theme/TabItem';`. A blank line is required immediately after the opening TabItem tag before the code fence, or the code block will not render correctly. Set the default prop on the tab matching this course's primary platform. Keep tab labels short and recognisable. Do not overuse tabs — most code blocks should remain plain fenced blocks, reserved only for moments where the language or shell genuinely forks.

**Configuration Reference** — required for Configuration/Integration lessons, optional for other lesson types. Include only if there are genuine options/flags/settings worth tabulating.

**How It Works Internally** — optional for all lesson types. Include only if understanding internals materially helps configure or debug the tool. Omit if it would just be trivia.

**Build Something Real** — build something realistic that could go in a real repository. Avoid toy examples. Reuse the same running project across lessons in this course where natural.

**What's Next** — one sentence: continue to Avoid Mistakes to see what commonly goes wrong here and how to debug it. Link to ./avoid-mistakes.

---

## PAGE 3 — avoid-mistakes.mdx

The "what goes wrong and how to fix it" page.

Sections, in order:

**When NOT to Use This** — required for Core skill and Advanced/Production lessons, optional for Setup/Install lessons. Limitations, tradeoffs, alternative tools, situations where this is the wrong choice.

**The Pattern to Remember** — a short block with Pattern, When to use, When NOT to use, Mental model.

**Common Mistakes** — exactly FIVE. Each includes: mistake, why it happens, symptoms, fix.

**What's Next** — one sentence: continue to Review to test what you have learned. Link to ./review.

---

## PAGE 4 — review.mdx

The short wrap-up and self-test page.

Sections, in order:

**Key Takeaways** — exactly FIVE bullets.

**Recap in 60 Seconds** — if you only remember three things: (numbered list of 3).

**Further Reading** — official documentation, GitHub repos, RFCs — see FURTHER READING rules below for what links are allowed.

**What Comes Next** — one paragraph linking naturally to the next lesson's overview page.

---

# FURTHER READING — LINK RULES

Default to real, specific links from official sources for every Further Reading entry — official documentation sites (e.g. playwright.dev/docs/..., docs.github.com/en/actions, nodejs.org/api/...) and official GitHub repositories (e.g. github.com/microsoft/playwright). These are the primary source type for this site and should be used by default, not avoided.

If you have web search available, use it to confirm a specific URL exists before including it — this is the preferred path for getting exact, correct deep links.

If you do not have web search available, link to the most well-known, stable entry point you are confident is correct for that exact tool or library — typically a documentation site's root or top-level section page (e.g. playwright.dev/docs/intro rather than a guessed deep path you cannot verify). Do not invent or guess a specific path, slug, anchor, or query string you are not confident exists.

Use a TODO placeholder only for non-official sources where no verified link is available — a specific blog post, a third-party tutorial, a paper, a changelog entry, or any resource that is not the tool's own official documentation or official GitHub repository. Never invent a URL for these; describe what should go there instead.

---

# PRACTICE SECTION

## beginner.mdx

THREE exercises. One skill/command/config option per exercise. Each includes: task, expected result, hints, constraints.

## intermediate.mdx

THREE exercises. Each combines 2–3 skills from different lessons. Use realistic scenarios.

## advanced.mdx

TWO production-style problems requiring real configuration/architecture decisions.

Total per course: 8 challenges (3 beginner + 3 intermediate + 2 advanced). Across 8 courses this yields 64 challenges platform-wide.

## solutions.mdx

For EVERY exercise include, in full — never abbreviate or summarise: a Problem statement, Key insight, Thinking process (reasoning before code), Solution (complete code/config with every important line commented), Why this works, Edge cases/gotchas, and Alternative approaches.

If running low on output budget, prioritise completing every solution in full over adding extra polish to earlier ones.

---

# WRITING STYLE

Write like: Educative, official framework docs (Playwright docs, Stripe docs), Microsoft Learn.

Avoid: fluff, marketing language, unnecessary repetition, abstract theory before showing the command.

Use: short paragraphs, tables for reference material, diagrams for flow, exact commands you can copy-paste.

Show the command, then explain it — not the reverse, for Setup/Install and Core skill lessons.

---

# CODE REQUIREMENTS

Every code block: language specified, formatted, commented, copy-paste runnable where applicable. No pseudo-code unless explicitly labeled as pseudocode.

---

# MDX SAFETY — NON-NEGOTIABLE

These files are compiled as MDX, not plain Markdown. MDX parses `{` and `<` as the start of JSX expressions and tags respectively, even in prose text outside code blocks. Getting this wrong breaks the entire site build, not just one page.

**Curly braces in prose.** Any `{` or `}` appearing in plain text outside a fenced code block — a config object example, a template variable, a JSON snippet mentioned inline — must be wrapped in backticks, e.g. `` `{port: 8000}` ``, or moved into a proper fenced code block. Never leave a bare `{` in prose.

**Angle brackets in prose.** Any `<` appearing in plain text outside a fenced code block or a valid Markdown link — a comparison like `<100ms` or `<1 second`, a placeholder like `<your-api-key>`, a generic type signature — must be wrapped in backticks, e.g. `` `<100ms` ``, or moved into a code fence. MDX will try to parse `<` followed by anything that is not a letter, `$`, or `_` as a broken JSX tag and fail the build.

**Before finishing each file**, scan it once specifically for any bare `{`, `}`, or `<` sitting in prose text rather than inside a code fence or backticks, and fix every instance found. This check is mandatory on every file, not optional.

---

# SIDEBAR

Generate sidebars/<slug>.json. Top-level categories match the course's natural sections (e.g. Getting Started, Core Skills, Advanced, Integration). Within each category, each lesson is itself a nested collapsible sub-category containing its 4 pages, in this order: overview, build-it, avoid-mistakes, review.

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
- Use Tabs/TabItem only where two or more languages, shells, or SDKs are genuinely equivalent ways to do the same thing
- Default to real, specific links from official documentation and official GitHub repositories; use TODO only for non-official sources (blog posts, papers, tutorials) where no verified link is available
- Every lesson includes at least one AsciiDiagram (on the overview page)
- Every lesson includes a realistic production example (on build-it)
- Conditional sections follow the per-section inclusion rules above based on lesson type — never force a section that doesn't apply
- Every lesson contains exactly five common mistakes and exactly five key takeaways
- Explain reasoning before code in every solution
- Every solution in solutions.mdx must be complete — never abbreviated
- New topics are appended at the end of existing lists (navbar, CLAUDE.md) — never alphabetised, never reordered
- Prefer action over theory — this is a tool/skill course, not a concepts course
- Produce content suitable for publication without requiring manual editing
