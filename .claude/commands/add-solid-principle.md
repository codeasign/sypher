---
description: Generate a complete SOLID principle topic for the SOLID Principles course — one overview page plus one complete single-file implementation per language (JavaScript, TypeScript, Python, Java, C#, Rust).
---

# /add-solid-principle

Generate a complete SOLID principle with overview and all 6 language implementations.

## Usage

```
/add-solid-principle TOPIC="Single Responsibility Principle" SLUG="single-responsibility" ABBR="SRP"
```

## Arguments

- `TOPIC` — Full principle name
- `SLUG` — kebab-case (e.g. `single-responsibility`)
- `ABBR` — Abbreviation (e.g. `SRP`)
- `SECTION` — Must exactly match one of: SOLID Principles

---

## CRITICAL

**Run with Claude Sonnet.** Code must be idiomatic per language. Verify syntax before writing.
- Every implementation: complete, runnable, single file, no pseudocode
- Show violation FIRST (commented block labeled `// VIOLATION`), then correct implementation
- Use realistic domains: order processing, payment handlers, notification systems, report generators, authentication — never `Animal.makeSound()` or `Shape.draw()`
- No external package imports where avoidable; stdlib only

---

## Files to generate

```
docs/solid-principles/$SLUG/
├── index.md
├── 01-overview.mdx
├── 02-javascript.mdx
├── 03-typescript.mdx
├── 04-python.mdx
├── 05-java.mdx
├── 06-csharp.mdx
└── 07-rust.mdx
```

---

## Page 1 — index.md

```md
---
id: $SLUG
title: $TOPIC ($ABBR)
sidebar_label: $TOPIC
---

import DocCardList from '@theme/DocCardList';

<DocCardList />
```

---

## Page 2 — 01-overview.mdx

**Target length:** 400–600 lines.

**Frontmatter:**
```
---
id: $SLUG-overview
title: "$TOPIC — Overview"
sidebar_label: Overview
sidebar_position: 1
---
```

**Mandatory structure:**

### The Principle (no heading — open cold)
One paragraph. State the principle precisely. Name it. Give the one-sentence definition.

### Why It Exists
What problem existed before this principle was named. Concrete historical/industry context. Not abstract.

### The Violation
A realistic code example showing the violation — complete enough to understand what's wrong. Label the block with a comment `// VIOLATION: [reason]`. Explain exactly what breaks when this code needs to change.

### The Correct Implementation
Same domain, refactored correctly. Explain each structural decision.

### How to Spot Violations in Code Review
Bullet list of concrete signals — method names, class sizes, import counts, parameter lists. Things you can actually grep for or see in a PR.

### Real-World Occurrences
Where this principle is applied in well-known libraries/frameworks (React, Express, Spring, Django, Rust std). Specific, verifiable examples.

### When Strict Adherence Hurts
Honest counter-cases. When over-applying this principle creates unnecessary abstraction. Pragmatic guidance.

**MDX Safety and Rendering Rules — MANDATORY:**
- No bare `<` before digits in prose — write "under 100ms" not `<100ms`
- No raw `{` or `}` in prose outside fenced code blocks — all code examples in fenced blocks with language tag
- No `:::` admonitions — use `##` headers and bold text
- No unescaped colon in frontmatter title — wrap value in quotes
- No "reader"/"user"/"learner" — address as "you"
- Never a blank line inside an AsciiDiagram `content` block
- Always use `content` prop not children for AsciiDiagram: `<AsciiDiagram id="..." title="..." content={\`...\`} />`
- `alt` and `caption` props must appear BEFORE `content` on the opening tag
- Import AsciiDiagram only if used: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`
- Write all files with UTF-8 encoding — cp1252 turns `─` into `â"€`
- Every fenced code block must have a language tag and a matching closing fence
- Frontmatter must start with exactly `---` — no BOM, no whitespace before it

---

## Pages 3–8 — Language implementation pages

Generate one page per language in this order:
- `02-javascript.mdx` — JavaScript (ES2022+, no TypeScript)
- `03-typescript.mdx` — TypeScript (strict mode)
- `04-python.mdx` — Python 3.11+
- `05-java.mdx` — Java 17+
- `06-csharp.mdx` — C# 12 / .NET 8
- `07-rust.mdx` — Rust 2021 edition

**Frontmatter per page:**
```
---
id: $SLUG-<language>
title: "$TOPIC — <Language>"
sidebar_label: <Language>
sidebar_position: <2–7>
---
```

**Target length per page:** 200–400 lines.

**Mandatory structure per language page:**

### Overview paragraph (before the code block)
Start with one paragraph describing the domain and what the violation shows (e.g., "The violation shows a `X` class that handles both A and B... The correct version separates..."). This paragraph is rendered as page text — it introduces the reader to the code they are about to see.

### AsciiDiagram (after overview, before first code block)
Every language page MUST include an AsciiDiagram component showing the architecture of the violation and refactored solution. Add `import AsciiDiagram from '@site/src/components/AsciiDiagram';` after the frontmatter if not already present.

```
import AsciiDiagram from '@site/src/components/AsciiDiagram';

## Implementation

[overview paragraph]

<AsciiDiagram id="$SLUG/<language>" alt="..." caption="..." content={`...`} />

```<language>
// code here
```

IMPORTANT: The diagram must use `content` prop (not children), `alt` and `caption` BEFORE `content`, and no blank lines inside the template literal.

### Implementation
One complete, runnable, single-file implementation. Structure:
1. Comment block at top: `// $ABBR — $LANGUAGE implementation`
2. `// VIOLATION` section (commented out) — shows the wrong way
3. `// CORRECT IMPLEMENTATION` section — the refactored version
4. A `main`/driver function at the bottom that exercises the implementation and prints output
5. Expected output shown in a fenced `bash` block immediately after the code block

### Key Language-Specific Notes
3–5 bullets covering language-specific patterns used (e.g. Python ABCs, Rust traits, TypeScript interfaces, Java generics). Not generic SOLID theory — language mechanics only.

**Same MDX safety rules as overview page.**

---

## Sidebar entry

Target file: `sidebars/solid-principles.json`, top-level key `solidPrinciplesSidebar`.
Each principle is its own top-level category (no outer "SOLID Principles" wrapper — the
course itself is SOLID Principles, so a same-named wrapper would be redundant).

**If the file does not exist, create it:**
```json
{
  "solidPrinciplesSidebar": [
    "solid-principles/index"
  ]
}
```

**On every run:** append a new top-level category for `$TOPIC` to the array:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "solid-principles/$SLUG/$SLUG-overview",
    "solid-principles/$SLUG/$SLUG-javascript",
    "solid-principles/$SLUG/$SLUG-typescript",
    "solid-principles/$SLUG/$SLUG-python",
    "solid-principles/$SLUG/$SLUG-java",
    "solid-principles/$SLUG/$SLUG-csharp",
    "solid-principles/$SLUG/$SLUG-rust"
  ]
}
```

---

## Pre-flight validation

After writing all 8 files run `npm run check:mdx` — MDX syntax only, no full build.
Fix any errors per MDX Safety Rules above. Retry up to 3 times. Flag persistent failures as NEEDS MANUAL REVIEW.
Do NOT run `npm start` or `npm run build`.

## Post-generation diagram verification

After writing all files and fixing MDX errors, run this check to ensure all pages have AsciiDiagrams:

```bash
for f in docs/solid-principles/$SLUG/*.mdx; do
  count=$(grep -c '<AsciiDiagram' "$f")
  name=$(basename "$f")
  if [ "$count" -eq 0 ]; then echo "MISSING DIAGRAM: $name"; fi
done
```

If any file has 0 diagrams, add an AsciiDiagram between the intro paragraph and the first code block. Each page must have at least 1 diagram.

Also run `/fix-rendered-content` after generation to catch any A5 (alt/caption ordering) or Defect E (children prop) issues.

## Batch generation (multiple principles at once)

When generating all 5 SOLID principles, use parallel agents for efficiency. After all agents complete:

1. Verify all 40 files exist (5 principles × 8 files each)
2. Update `sidebars/solid-principles.json` — add all 5 principles as top-level categories
3. Verify every `.mdx` file has at least 1 AsciiDiagram (see verification step above)
4. Run `/fix-rendered-content` on all generated directories
5. Build fails are expected for sidebar context issues unrelated to new content — confirm no MDX syntax errors

---

## Final output

| File | Lines | Language Valid | Status |
|---|---|---|---|
| 01-overview.mdx | N | — | ✅ |
| 02-javascript.mdx | N | ✅ | ✅ |
| 03-typescript.mdx | N | ✅ | ✅ |
| 04-python.mdx | N | ✅ | ✅ |
| 05-java.mdx | N | ✅ | ✅ |
| 06-csharp.mdx | N | ✅ | ✅ |
| 07-rust.mdx | N | ✅ | ✅ |
