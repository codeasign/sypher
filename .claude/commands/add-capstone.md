---
description: Generate a portfolio-worthy capstone project for an existing course. Run AFTER the course's Learn and Practice sections already exist. No full solution code — architecture and requirements only, so the learner builds it themselves.
---

# Create a capstone project for the existing course: $ARGUMENTS

Read **CLAUDE.md** first. Read the existing course's `index.md` and lesson files under `docs/<slug>/` before writing anything — the capstone must use the exact skills and tools already taught in that course, not introduce new ones.

This is fundamentally different from a practice problem. A practice problem has one correct solution shown in full. A capstone has a rubric, not a solution — you design and build it yourself. **Never include a full working solution for the capstone itself.**

**Narration rules — non-negotiable:**
- Write in second person, speaking directly to the person doing the capstone: "you will build", "your architecture". Never refer to them in third person as "the reader" or "the learner."
- Never use Docusaurus admonition syntax — no `:::info`, `:::note`, `:::tip`, `:::caution`, `:::danger`, or any `:::` block. Use plain `##` headers and bold text instead.

---

# WHAT MAKES A GOOD CAPSTONE

- Bigger in scope than any single practice problem — combines most/all lessons in the course
- Open-ended enough that two learners could build it differently and both be right
- Produces something the learner could put in a portfolio or show in an interview
- Has clear requirements and a clear "done" definition, even though the path there is open
- Mirrors a real task a working engineer would actually be asked to do

---

# FILE STRUCTURE

```
docs/<slug>/capstone/
    index.md
    requirements.mdx
    milestones.mdx
    rubric.mdx
    reference-architecture.mdx
```

Add this as a new category in `sidebars/<slug>.json`, positioned after Practice.

---

# index.md

```md
---
title: Capstone Project
sidebar_label: Capstone
---

# Capstone: <Project Name>

One paragraph: what you are building and why it matters — frame this as something
a hiring manager would be impressed to see in a portfolio.

## What you'll build

2-3 sentences, concrete and specific. Not "an AI agent" — "a research agent that
takes a topic, searches three sources, cross-references claims, and produces a
cited summary with a confidence score per claim."

## Time estimate

X–Y hours, broken down by phase if helpful.

## Skills this draws on

Bullet list referencing the actual lesson names from this course — prove this
is a true capstone, not generic.

- [Lesson Name](../lesson-slug)
- [Lesson Name](../lesson-slug)
- ...

## How this works

1. Read [Requirements](./requirements) — what the project must do
2. Read [Milestones](./milestones) — suggested checkpoints so you don't get lost
3. Build it yourself — refer back to course lessons as needed
4. Self-assess against the [Rubric](./rubric)
5. Compare your approach to the [Reference Architecture](./reference-architecture) — only after you've built your own version

Start with [Requirements](./requirements).
```

---

# requirements.mdx

```md
---
title: Requirements
sidebar_label: Requirements
---

# Requirements

## Functional requirements

What the system must DO. Numbered, specific, testable.

1. ...
2. ...
3. ...

## Non-functional requirements

Quality bars the solution must meet — not just "it works" but "it works well."

- Performance: ...
- Error handling: ...
- Configuration: ...
- (Security / Observability / Cost — include only what's relevant to this course)

## Constraints

Explicit limits that force real engineering decisions, not infinite scope creep.

- ...
- ...

## What's explicitly out of scope

Prevent scope creep — state clearly what does NOT need to be built.

- ...
- ...

## Suggested tech stack

Tools and libraries already taught in this course — do not introduce anything new.

- ...
```

---

# milestones.mdx

```md
---
title: Milestones
sidebar_label: Milestones
---

# Milestones

Suggested checkpoints. These are not mandatory steps — they exist so you have a
way to know if you're on track. Skip ahead if you prefer.

## Milestone 1 — <Name>

**Goal:** ...

**You'll know this works when:** specific, observable outcome.

**Relevant lessons:** [Lesson](../lesson-slug)

---

## Milestone 2 — <Name>

(same structure)

---

(4-6 milestones total, ordered so each builds on the last)

## Final milestone — Done

**You'll know the capstone is complete when:** restate the core functional
requirements as a checklist.
```

---

# rubric.mdx

```md
---
title: Self-Assessment Rubric
sidebar_label: Rubric
---

# Self-Assessment Rubric

Use this to evaluate your own build. There is no single right answer — this
rubric tells you what "portfolio-worthy" looks like, not what exact code to write.

## Functionality (40%)

| Criteria | What "excellent" looks like |
|---|---|
| ... | ... |
| ... | ... |

## Code/Configuration quality (25%)

| Criteria | What "excellent" looks like |
|---|---|
| ... | ... |

## Engineering judgment (20%)

Did the implementation make and justify real tradeoffs? List 3-4 specific decision
points this project forces, and what a strong vs weak answer looks like for each.

## Production readiness (15%)

| Criteria | What "excellent" looks like |
|---|---|
| ... | ... |

## How to use this rubric

Score yourself honestly against each section. A portfolio-worthy result scores
strong on Functionality and Engineering judgment even if Production readiness
is partial — that's expected for a learning project. Use weak scores to identify
which course lessons to revisit.
```

---

# reference-architecture.mdx

```md
---
title: Reference Architecture
sidebar_label: Reference Architecture
---

# Reference Architecture

**Build it yourself first.** Read this only after attempting your own solution. Seeing an approach before you've made your own decisions defeats the purpose of a capstone.

## One possible approach

High-level architecture — diagram + explanation of ONE reasonable way to build
this. Explicitly frame it as "a" reference, not "the" solution.

<AsciiDiagram
  id="<slug>/capstone-reference-architecture"
  alt="..."
  caption="One possible architecture for this capstone"
  content={`...`}
/>

## Key design decisions and why

For each major decision point from the rubric's "Engineering judgment" section,
explain the reasoning behind one reasonable choice — not to dictate the answer,
but to model how to think about the tradeoff.

### Decision: ...

**One reasonable choice:** ...
**Why:** ...
**A valid alternative:** ...

(repeat for 3-4 decision points)

## What this reference does NOT include

Be explicit that this shows architecture, not full code — pseudocode or
structural snippets only, never a complete working implementation.

## Common pitfalls at this scale

5 mistakes specific to capstone-scale projects (different from per-lesson
common mistakes — these are about integration, scope, and architecture, not
syntax).
```

---

# HARD RULES

- Never use Docusaurus admonition syntax (`:::info`, `:::note`, `:::tip`, `:::caution`, `:::danger`) anywhere in content — use plain `##` headers and bold text instead
- No bare `{`, `}`, or `<` in prose text outside a code fence or backticks — these break the MDX build. Wrap comparisons like `<100ms`, type signatures like `List<int>`, or config literals like `{"key": "value"}` in backticks, or move them into a proper code fence. Before finishing each file, scan it once for this pattern.
- Write in second person throughout — address the person directly as "you," never as "the reader" or "the learner"
- Never write a full working solution for the capstone — architecture, requirements, and rubric only
- Every requirement must be specific and testable, not vague ("handles errors gracefully" is bad; "returns a structured error object with a retry-after hint when the API is rate-limited" is good)
- Reference only lessons and tools that actually exist in this course's Learn section — verify by reading the course files first
- Milestones must be genuinely sequential — each should be buildable using only what previous milestones produced
- The rubric must allow multiple valid implementations to score well — never write criteria that assume one specific architecture
- Reference architecture must explicitly frame itself as "one possible approach," never "the correct solution"
- Never invent URLs — use TODO placeholders
- Update `sidebars/<slug>.json` to add a Capstone category after Practice
- Do not modify the navbar — capstones live inside an existing topic's sidebar, no new top-level nav item
