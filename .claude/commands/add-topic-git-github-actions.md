# /add-topic-git-github-actions

Generate a complete, hands-on Git and GitHub Actions topic for the Sypher platform.

**Intent:** A student reads this topic, follows the exercise verbatim in a real terminal, then proves mastery by solving unguided practice problems. This is not a reference page. It is a lab, with the same engineering rigor as System Design Basics but built for muscle memory instead of interview theory.

## Usage

```
/add-topic-git-github-actions TOPIC="Interactive Rebase" SLUG="interactive-rebase" SECTION="Git Branching and History"
```

## Arguments

- `TOPIC` — Display name (e.g. "Interactive Rebase")
- `SLUG` — URL-safe kebab-case (e.g. "interactive-rebase")
- `SECTION` — Parent section, must exactly match one of: Getting Started, Git Foundations, Git Branching and History, Git Collaboration Workflows, GitHub Actions Fundamentals, CI/CD Pipelines, Advanced GitHub Actions and Gated Delivery, CI/CD as a Quality System

---

## Files to generate

```
docs/git-github-actions/$SLUG/
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

**Target length:** 250–400 lines of MDX. Keep it to the point — no fluff, no filler paragraphs.

**Purpose:** Build real understanding fast. Every topic must cover Windows, macOS, and Linux (Ubuntu) specifically — show the exact commands or steps for each OS where they differ.

**Mandatory structure:**

### 1. The Problem Story (no heading — open cold)
1 paragraph. A real scenario where not knowing this specific capability causes actual pain. Concrete, not generic.

### 2. The Concept
Explain in one plain sentence. Follow with a real-world analogy that maps precisely — not a forced one.

### 3. Command / Syntax Reference
Every command, subcommand, and flag covered in this topic. Format as a table or structured list:
- Exact syntax
- What each flag does
- A one-line example of it in use
- Note Windows vs macOS/Linux differences where applicable (e.g., `dir` vs `ls`, `\` vs `/`)
Minimum 6 entries for Git topics; for GitHub Actions topics, cover every YAML key/property relevant to the topic instead.

### 4. The Big Picture Diagram
One `<AsciiDiagram>` showing the concept's mechanics — a Git DAG showing commits/branches/HEAD movement, or a workflow diagram showing trigger → job → step → runner flow for GitHub Actions topics.

### 5. How It Actually Works — Step by Step
4–6 steps, each explaining what happens internally. Include at least 3 `<AsciiDiagram>` blocks showing state changes across steps.

### 6. When to Use This / When Not To
Concrete signals for reaching for this tool vs. a simpler alternative. Real trade-offs, not hedged both-sides-safe language.

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
- Inside `<AsciiDiagram>` content, never use raw `<`/`>` for arrows or box corners — use Unicode (`→ ← ↔ ↑ ↓ ↕`).
- No bare `<` before digits, ratios, or fractions in prose.
- No raw `{` or `}` in prose outside a fenced code block or inline code — this matters especially here since GitHub Actions YAML and shell commands are full of braces; every command or YAML snippet must be in a proper fenced code block (` ```bash `, ` ```yaml `), never typed as inline prose with raw braces.
- No unescaped colon inside a frontmatter `title` value.
- No `:::info` `:::note` `:::tip` `:::warning` admonitions.
- No "reader", "user", "learner" — address as "you".
- No Chinese characters, no DSML `｜` or `<|...|>` artifacts.
- Numbers must be concrete.

---

## Page 3 — 02-practice-exercise.mdx "Let's Work Together"

**Target length:** 400–600 lines of MDX.

**Purpose:** One single guided exercise the student executes verbatim in a real terminal or real GitHub repo, building the exact muscle memory the Overview page explained conceptually.

**Mandatory structure:**

### 1. Setup
What the student needs before starting: a real Git repo state, a GitHub repo if the topic involves Actions, any prerequisite files. Give the exact commands to get into this starting state if it's not already assumed from a previous topic. Show setup commands for Windows, macOS, and Linux (Ubuntu) where they differ.

### 2. The Walkthrough
Numbered steps. Every step:
- The exact command to run, in a fenced ` ```bash ` block (or the exact YAML for GitHub Actions topics, in a fenced ` ```yaml ` block)
- The expected output, shown verbatim in a fenced code block
- A short explanation of what just happened underneath the hood
- A checkpoint the student can run to verify they're in the right state before continuing

Minimum 8 steps for a Git topic; for GitHub Actions topics, minimum 6 steps covering writing the workflow file, committing/pushing it, and observing the actual run in the Actions tab.

### 3. Common Errors at This Stage
Minimum 4 real errors a student is likely to hit at some point in this exact walkthrough, each with: the exact error message, why it happens, and the fix.

### 4. What You Just Learned
A tight summary — 4–6 bullet points, not a restatement of the whole page.

**Frontmatter:**
```
---
id: $SLUG-practice
title: $TOPIC — Let's Work Together
sidebar_label: Let's Work Together
sidebar_position: 2
---
```

Same MDX safety rules as Page 2. Minimum 2 `<AsciiDiagram>` blocks showing before/after state if the topic involves branch or history changes; optional for pure GitHub Actions topics where a workflow run log is more useful than a diagram.

---

## Page 4 — 03-general-practice.mdx "Practice on Your Own"

**Target length:** 400–600 lines of MDX.

**Purpose:** Unguided practice, leveled by difficulty, so the student proves they can apply this without a script to follow.

**Mandatory structure:**

### Tier 1 — Beginner (3–4 exercises)
Single-command or single-concept tasks. Format per exercise:
- **Task:** a plain-language prompt, no hand-holding
- **Hint** (collapsed under a `<details>` tag if the platform supports it, otherwise clearly labeled "Hint" below the task): one nudge, not the answer
- **Solution:** the exact command(s) and expected outcome, below a clear `### Solution` divider

### Tier 2 — Intermediate (3–4 exercises)
Multi-step tasks combining this topic with at least one prior topic's concept. Same per-exercise format as Tier 1.

### Tier 3 — Advanced (2–3 exercises)
Real-world, ambiguous scenarios — a broken pipeline to fix, a messy history to clean up, a workflow to redesign for a stated constraint (faster builds, tighter security, fewer flaky runs). These should not have exactly one correct answer. Solution section here should walk through the reasoning and one strong approach, explicitly noting other valid approaches exist.

**Frontmatter:**
```
---
id: $SLUG-general-practice
title: $TOPIC — Practice Exercises
sidebar_label: Practice Exercises
sidebar_position: 3
---
```

Same MDX safety rules as Page 2. No `<AsciiDiagram>` required — students should be working in their own terminal, not reading a diagram.

---

## Sidebar entry

Target file: `sidebars/git-github-actions.json`

**If the file does not exist, create it with the full 6-section skeleton:**

```json
{
  "gitGithubActionsSidebar": [
    { "type": "category", "label": "Getting Started", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Git Foundations", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Git Branching and History", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Git Collaboration Workflows", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "GitHub Actions Fundamentals", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "CI/CD Pipelines", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Advanced GitHub Actions and Gated Delivery", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "CI/CD as a Quality System", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Capstone", "collapsible": false, "items": [] }
  ]
}
```

**Then, on every run:** locate the top-level category object whose `"label"` exactly matches `$SECTION`. Insert the topic's sub-category into THAT object's `"items"` array — never append at the top level, never create a duplicate category.

```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "git-github-actions/$SLUG/$SLUG-overview",
    "git-github-actions/$SLUG/$SLUG-practice",
    "git-github-actions/$SLUG/$SLUG-general-practice"
  ]
}
```

If `$SECTION` does not match one of the six topic-tier labels exactly, stop and flag it — do not guess or silently create a new category. The "Capstone" category is reserved for `/add-topic-git-github-actions-capstone` — never insert a regular topic there.

---

## docusaurus.config.js

If not already present, add to navbar:

```js
{ to: '/docs/git-github-actions', label: 'Git & GitHub Actions', position: 'left' }
```

Check the existing navbar array first — only add this once, on the first topic generated.

---

## Diagram quality standard

- Title describes what the diagram shows, not the topic name
- For Git topics: show actual DAG structure — commits as nodes, branches as labeled pointers, HEAD explicitly marked, using `(( ))` for commits, `[ ]` for branch labels
- For GitHub Actions topics: show trigger → job → step → runner flow, or the workflow file's structure mapped to what actually executes
- No blank lines inside the diagram block; always close with explicit `</AsciiDiagram>`
- Arrows use Unicode (`→ ← ↔ ↑ ↓ ↕`), never raw `<`/`>`

---

## Content quality gates

- [ ] Every command shown actually works as written — no pseudocode, no placeholders like `<your-branch>` without explaining what to substitute
- [ ] Let's Work Together page's expected output blocks are realistic, not generic placeholder text
- [ ] General Practice tiers are genuinely different in difficulty, not the same task reworded three times
- [ ] No `<AsciiDiagram>` block has an internal blank line or a self-closing `/>` terminator
- [ ] No unescaped colon inside any frontmatter `title` value
- [ ] The sidebar entry landed in the correct `$SECTION` category, not the top level or Capstone

---

## Pre-flight validation

Run automatically after writing all 4 files — no confirmation needed before running this.

1. Build with `npm run start` and watch for MDX compilation errors in the terminal output.
2. If any file fails, diagnose by the exact error (`ruleId`, file, line, column) from the build output.
3. **Common MDX errors and their fixes:**

   | Error pattern | Root cause | Fix |
   |---|---|---|
   | `Expected a closing tag for <your>` or any `<word>` tag | MDX treats `<word>` in prose as a JSX component. Happens with placeholders like `<your-branch>`, `<your-name>`, `<commit-hash>` | Wrap the placeholder in backticks for inline code: `` `<your-branch>` ``. Or replace `<` and `>` with `&lt;` and `&gt;`. |
   | `Expected a closing tag for <details>` / `end-tag-mismatch` | A `<details>` block (used for exercise hints or answer reveals) is missing its matching `</details>` closing tag | Count every `<details>` in the file and verify each has a matching `</details>`. Add the missing closing tag. |
   | `Expected a closing tag for <summary>` | A `<summary>` inside a `<details>` block is missing its closing `</summary>` tag | Add `</summary>` before the content that follows the summary line. |
   | `end-tag-mismatch` with any HTML-like tag | Angle brackets used in prose outside of code blocks (e.g., `if (x < 5)`, `<your-repo>`, `<commit-hash>`) | Move the content into a fenced code block, or wrap inline references in backticks. |
   | **AsciiDiagram renders as blank/empty box** (no build error) | AsciiDiagram uses `>` `{` `` ` `` (children pattern) instead of `content={` `` ` `` (content prop). The component reads `props.content`, not `props.children` | Replace `>` before `{` `` ` `` with `content=`. Replace `</AsciiDiagram>` with `/>`. Run `grep -rn '</AsciiDiagram>' docs/` after generation to find any remaining children-pattern diagrams. |

4. Apply the matching fix and re-run the build. Repeat up to 3 times per file; flag anything still failing as `NEEDS MANUAL REVIEW` rather than looping indefinitely.
5. Do not print the final summary table until every file builds clean or is explicitly flagged.

---

## Final output

| File | Lines | Diagrams | Quality Gate | Status |
|------|-------|----------|--------------|--------|
| 01-overview.mdx | N | N | ✅/❌ | ✅ |
| 02-practice-exercise.mdx | N | N | ✅/❌ | ✅ |
| 03-general-practice.mdx | N | N | ✅/❌ | ✅ |

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
