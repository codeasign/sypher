# /add-topic-ai-engineering

Generate a complete, hands-on AI engineering topic for the Sypher platform — teaching a student to build with LLM APIs, local models, MCP, and agents from scratch.

**Intent:** A student reads this topic, builds the exact thing in a real project on their own machine, then extends it through unguided practice. Every API call, SDK method, and config must actually work as written. This is the fastest-aging course on the platform — accuracy about current SDKs, model names, and CLI syntax matters more here than anywhere else.

## CRITICAL — currency of information

This course teaches tools that change monthly: SDK method signatures, model string identifiers, MCP spec versions, CLI flags, pricing. Content generated purely from training data **will** contain stale or invented API details stated with full confidence.

- **Generate this course with a current, web-search-capable model (Claude Sonnet), not DeepSeek from training data alone.**
- For every SDK method, model identifier, CLI command, or API parameter written into a lesson, verify it against current official documentation before committing it — do not rely on memory of what the API looked like at training time.
- Never invent a model string, SDK method, or CLI flag. If unsure whether something is current, web-search the official docs (OpenAI, Anthropic, OpenRouter, Ollama, MCP spec) and cite what you find.
- Where an exact model name or price is used, prefer the current one from official docs; if it can't be verified, describe the capability generically rather than stating a specific unverified identifier.

## Usage

```
/add-topic-ai-engineering TOPIC="Calling the Anthropic API" SLUG="calling-the-anthropic-api" SECTION="Calling LLMs Directly"
```

## Arguments

- `TOPIC` — Display name
- `SLUG` — URL-safe kebab-case
- `SECTION` — Must exactly match one of: Getting Started, Project and Environment Setup, Calling LLMs Directly, Provider Routing and Local Models, Claude Code as a Tool, MCP Servers, Building AI Agents, RAG Systems, LangChain and LangGraph, Evaluating and Trusting AI Systems

---

## Files to generate

```
docs/ai-engineering-hands-on/$SLUG/
├── index.md
├── 01-overview.mdx
├── 02-practice-exercise.mdx
└── 03-general-practice.mdx
```

---

## Page 1 — index.md

```md
---
id: $SLUG
title: $TOPIC
sidebar_label: $TOPIC
---

import DocCardList from '@theme/DocCardList';

<DocCardList />
```

---

## Page 2 — 01-overview.mdx "Understand It"

**Target length:** 500–700 lines of MDX.

**Purpose:** Build real understanding of the capability and its API surface before the student writes code.

**Mandatory structure:**

### 1. The Problem Story (no heading — open cold)
2–3 paragraphs. A real scenario where lacking this capability causes pain — an API bill that blew up from an unbounded loop, a leaked key committed to a public repo, an agent that hallucinated a tool call, a local model chosen when a cloud one was needed or vice versa. Concrete.

### 2. The Concept
Name the capability, one plain sentence, precise real-world analogy.

### 3. API / SDK / CLI Reference
Every method, parameter, model identifier, or CLI flag covered in this topic, in a table:
- Exact syntax (verified current)
- What it does
- One-line usage example
Minimum 6 entries. Every entry must be checked against current official docs — this is the section most likely to go stale, so it's the section that most needs verification.

### 4. The Big Picture Diagram
One `<AsciiDiagram>` showing the flow — request → provider → response for API topics; agent loop (perceive → decide → act → observe) for agent topics; client → MCP server → tool for MCP topics.

### 5. How It Actually Works — Step by Step
Minimum 6 steps explaining what happens under the hood — what the SDK sends over the wire, how tokens are counted and billed, how an agent decides to call a tool, how MCP transports a tool call. Minimum 3 `<AsciiDiagram>` blocks.

### 6. Cost, Limits, and Safety
Concrete: token cost implications, rate limits, how to avoid runaway loops, why keys go in environment variables and never in code. Every topic touches this — building with paid APIs without cost awareness is how students get surprise bills.

### 7. When to Use This / When Not To
Cloud vs local, big model vs light model, agent vs simple call — real trade-offs with a position taken, not both-sides hedging.

### 8. Mental Model Check
5 comprehension questions with answers immediately below each.

**Frontmatter:**
```
---
id: $SLUG-overview
title: $TOPIC
sidebar_label: Overview
sidebar_position: 1
---
```

**MDX Safety Rules — MANDATORY (apply to every page in this topic):**
- Import AsciiDiagram at top of any file using it: `import AsciiDiagram from '@site/src/components/AsciiDiagram';` — the only line allowed to start with the literal word `import`.
- Every `<AsciiDiagram>` must have a `title` prop.
- Never leave a blank line inside an `<AsciiDiagram>{...}</AsciiDiagram>` block. Always close with an explicit `</AsciiDiagram>` — never a self-closing `` `} /> ``.
- Inside `<AsciiDiagram>` content, never use raw `<`/`>` for arrows — use Unicode (`→ ← ↔ ↑ ↓ ↕`).
- No bare `<` before digits, ratios, or fractions in prose.
- No raw `{` or `}` in prose outside a fenced code block or inline code. Critical here — Python dicts, JSON payloads, and f-strings are full of braces; every code snippet must be in a proper fenced code block (` ```python `, ` ```bash `, ` ```json `), never inline prose with raw braces.
- No unescaped colon inside a frontmatter `title` value.
- No `:::info` `:::note` `:::tip` `:::warning` admonitions.
- No "reader", "user", "learner" — address as "you".
- No Chinese characters, no DSML `｜` or `<|...|>` artifacts.
- Never hardcode an API key in any example — always read from an environment variable (`os.environ["ANTHROPIC_API_KEY"]` or equivalent). This is a security teaching point, not just a style rule.

---

## Page 3 — 02-practice-exercise.mdx "Build It"

**Target length:** 400–600 lines of MDX.

**Purpose:** One guided build the student runs on their own machine, in a real project, producing a working result.

**Mandatory structure:**

### 1. Setup
Exact prerequisites: Python version, packages to `pip install` (with a `requirements.txt` snippet), API keys needed and how to set them as environment variables, any local tooling (Ollama installed, Claude Code installed) with the exact install commands. If this topic builds on a project state from a prior topic, state which and how to get there.

### 2. The Build — Step by Step
Numbered steps. Every step:
- The exact code to write, in a fenced ` ```python ` block (or ` ```bash ` / ` ```yaml ` / ` ```json ` as appropriate)
- The exact command to run it
- The expected output, shown verbatim in a fenced block
- A short explanation of what happened
- A checkpoint to verify state before continuing
Minimum 6 steps. The end state must be a working, runnable thing — not a fragment.

### 3. Common Errors at This Stage
Minimum 4 real errors: missing/invalid API key, rate limit hit, wrong model string, package version mismatch, Ollama not running, etc. Each with exact error message, cause, and fix.

### 4. What You Just Built
4–6 bullet summary.

**Frontmatter:**
```
---
id: $SLUG-practice
title: $TOPIC — Practice Exercise
sidebar_label: Practice Exercise
sidebar_position: 2
---
```

Same MDX safety rules as Page 2. `<AsciiDiagram>` optional — a real terminal output or code result usually teaches more here than a diagram. Include one only if it clarifies a flow.

---

## Page 4 — 03-general-practice.mdx "Practice on Your Own"

**Target length:** 400–600 lines of MDX.

**Purpose:** Unguided, leveled practice proving the student can apply this without a script.

**Mandatory structure:**

### Tier 1 — Beginner (3–4 exercises)
Single-capability tasks. Per exercise: **Task** (plain prompt), **Hint** (one nudge), **Solution** (exact working code + expected result below a `### Solution` divider).

### Tier 2 — Intermediate (3–4 exercises)
Combine this topic with a prior topic's capability. Same format.

### Tier 3 — Advanced (2–3 exercises)
Open-ended real scenarios — a script hitting rate limits to redesign with backoff, a cloud call to convert to a local Ollama fallback, an agent that loops forever to bound. No single correct answer; solution walks through reasoning and one strong approach, noting alternatives.

**Frontmatter:**
```
---
id: $SLUG-general-practice
title: $TOPIC — Practice Exercises
sidebar_label: Practice Exercises
sidebar_position: 3
---
```

Same MDX safety rules as Page 2. No `<AsciiDiagram>` required.

---

## Sidebar entry

Target file: `sidebars/ai-engineering-hands-on.json`

**If the file does not exist, create it with the full skeleton:**

```json
{
  "aiEngineeringHandsOnSidebar": [
    { "type": "category", "label": "Getting Started", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Project and Environment Setup", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Calling LLMs Directly", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Provider Routing and Local Models", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Claude Code as a Tool", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "MCP Servers", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Building AI Agents", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "RAG Systems", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "LangChain and LangGraph", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Evaluating and Trusting AI Systems", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Capstone Projects", "collapsible": false, "items": [] }
  ]
}
```

**Then, on every run:** locate the top-level category object whose `"label"` exactly matches `$SECTION`. Insert the topic's sub-category into THAT object's `"items"` array — never at the top level, never a duplicate.

```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "ai-engineering-hands-on/$SLUG/$SLUG-overview",
    "ai-engineering-hands-on/$SLUG/$SLUG-practice",
    "ai-engineering-hands-on/$SLUG/$SLUG-general-practice"
  ]
}
```

If `$SECTION` doesn't match one of the six topic-tier labels exactly, stop and flag it. "Capstone Projects" is reserved for `/add-topic-ai-engineering-capstone` — never insert a regular topic there.

---

## docusaurus.config.js

If not already present, add to navbar:

```js
{ to: '/docs/ai-engineering-hands-on', label: 'Building with AI', position: 'left' }
```

Check the existing navbar array first — only add once, on the first topic generated.

---

## Content quality gates

- [ ] Every model string, SDK method, and CLI flag was verified against current official docs, not written from memory
- [ ] No API key is hardcoded anywhere — all from environment variables
- [ ] Every code block is complete and runnable, no pseudocode or unexplained placeholders
- [ ] Cost/rate-limit/safety section present on every Overview page
- [ ] Practice Exercise ends in a working runnable result, not a fragment
- [ ] No `<AsciiDiagram>` block has an internal blank line or self-closing `/>` terminator
- [ ] No unescaped colon in any frontmatter `title`
- [ ] Sidebar entry landed in the correct `$SECTION` category

---

## Pre-flight validation

Run automatically after writing all 4 files — no confirmation needed.

1. `npm run check:mdx` — MDX syntax only, no webpack, no SSR, no full site build.
2. On failure, diagnose by exact error and apply the matching MDX Safety Rule fix.
3. Re-run; repeat up to 3 times per file; flag persistent failures as `NEEDS MANUAL REVIEW`.
4. Do not print the summary table until all files build clean or are flagged.

---

## Final output

| File | Lines | Diagrams | Verified APIs | Status |
|------|-------|----------|---------------|--------|
| 01-overview.mdx | N | N | ✅/❌ | ✅ |
| 02-practice-exercise.mdx | N | N | ✅/❌ | ✅ |
| 03-general-practice.mdx | N | N | ✅/❌ | ✅ |

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
