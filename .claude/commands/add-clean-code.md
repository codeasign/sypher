---
description: Generate the Clean Code course — one principles overview page plus one complete master file per language (JavaScript, TypeScript, Python, Java, C#, Rust) demonstrating every clean code principle in a consistent domain.
---

# /add-clean-code

Generate the complete Clean Code course — all 7 pages in one run.

## Usage

```
/add-clean-code
```

No arguments — generates all 7 pages in sequence.

---

## CRITICAL

**Run with Claude Sonnet.** Every master file is a production-quality reference implementation.
- Consistent domain across all files: **Order Management System** (orders, products, customers, inventory, payments)
- Every principle illustrated with a bad example and a good example in the same domain
- Master files are not tutorials — they are reference implementations a senior engineer would be proud to write
- No external packages; stdlib only
- Every code example complete and runnable

---

## Files to generate

```
docs/software-engineering/clean-code/
├── index.md
├── 01-principles.mdx
├── 02-master-javascript.mdx
├── 03-master-typescript.mdx
├── 04-master-python.mdx
├── 05-master-java.mdx
├── 06-master-csharp.mdx
└── 07-master-rust.mdx
```

---

## Page 1 — index.md

```md
---
id: clean-code
title: Clean Code
sidebar_label: Clean Code
---

import DocCardList from '@theme/DocCardList';

<DocCardList />
```

---

## Page 2 — 01-principles.mdx

**Target length:** 600–900 lines.

**Frontmatter:**
```
---
id: clean-code-principles
title: Clean Code Principles
sidebar_label: Principles
sidebar_position: 1
---
```

**Mandatory structure:**

### What Clean Code Is (no heading — open cold)
2 paragraphs. What distinguishes clean code from working code. The cost of unclean code over time.

### Naming
- Intention-revealing names
- Avoid disinformation
- Make meaningful distinctions
- Pronounceable and searchable names
- Avoid encodings
- Class names: nouns. Method names: verbs.
- Pick one word per concept

Each rule: bad example → good example. All in Order Management domain.

### Functions
- Small — do one thing
- One level of abstraction per function
- Descriptive names
- Minimal arguments (0–2 ideal, 3 maximum, flag arguments are a smell)
- No side effects
- Command/Query separation
- Prefer exceptions to returning error codes
- DRY — extract duplicate code

### Comments
- Comments are a failure to express in code
- Good comments: legal, informative, explanation of intent, warning, TODO
- Bad comments: noise, redundant, misleading, journal, position markers
- Delete commented-out code immediately

### Formatting
- Vertical openness between concepts
- Vertical density for related lines
- Variable declarations near usage
- Dependent functions close together
- Horizontal alignment
- Team rules trump personal preference

### Error Handling
- Use exceptions not return codes
- Write the try-catch-finally first
- Use unchecked exceptions
- Provide context with exceptions
- Don't return null — return empty collections, Optional, Result types
- Don't pass null

### Boundaries
- Wrap third-party APIs
- Use learning tests
- Clean boundaries with interfaces

### Classes
- Small — single responsibility
- High cohesion
- Organizing for change — open/closed
- Isolating from change — dependency injection

### Systems
- Separate construction from use
- Dependency injection
- Scaling up

### Tests (brief — link to dedicated test content)
- One assert per test concept
- FIRST: Fast, Independent, Repeatable, Self-validating, Timely
- Clean tests enable clean code

**MDX Safety and Rendering Rules — MANDATORY:**
- No bare `<` before digits in prose
- No raw `{` or `}` in prose outside fenced code blocks
- No `:::` admonitions
- No unescaped colon in frontmatter title — wrap in quotes
- No "reader"/"user"/"learner" — address as "you"
- AsciiDiagram: `content` prop not children; `alt` and `caption` BEFORE `content`; no blank line inside; self-close `/>` only
- Import AsciiDiagram only if used
- UTF-8 encoding — never cp1252
- Every fenced code block: language tag + matching closing fence
- Frontmatter: exactly `---` first — no BOM, no whitespace

---

## Pages 3–8 — Master language files

Generate one master file per language demonstrating every clean code principle using the Order Management domain.

**Languages in order:**
- `02-master-javascript.mdx` — JavaScript ES2022+
- `03-master-typescript.mdx` — TypeScript strict mode
- `04-master-python.mdx` — Python 3.11+ with type hints
- `05-master-java.mdx` — Java 17+ with records and sealed classes
- `06-master-csharp.mdx` — C# 12 / .NET 8
- `07-master-rust.mdx` — Rust 2021 edition

**Frontmatter per page:**
```
---
id: clean-code-master-<language>
title: "Clean Code — <Language> Master File"
sidebar_label: <Language>
sidebar_position: <2–7>
---
```

**Target length per master file:** 500–800 lines.

**Mandatory structure per master file:**

### Header comment in the code
```
// Clean Code Master File — <LANGUAGE>
// Domain: Order Management System
// Demonstrates: naming, functions, error handling,
//               formatting, classes, boundaries, DRY
```

### The master implementation
One complete, cohesive, runnable Order Management System implementation that naturally demonstrates every principle without feeling forced. Include:

- `Product` — well-named fields, no magic numbers, value object
- `Customer` — meaningful distinctions, intention-revealing
- `Order` — small focused methods, single responsibility, command/query separation
- `OrderValidator` — guard clauses, no null returns, exception with context
- `OrderRepository` — boundary wrapping, interface/trait, dependency injection
- `PaymentProcessor` — error handling, Result/Either type or exception strategy
- `OrderService` — orchestration, one level of abstraction, DRY
- `main`/driver — exercises the full system with realistic data

**After the code block:**

### What This File Demonstrates
Table: Principle | Where in the code | Why this approach.
Cover every principle from `01-principles.mdx`.

### Language-Specific Clean Code Notes
5–8 bullets. Idiomatic patterns for this language that make clean code easier or harder. Specific to the language — not generic advice.

**Same MDX safety rules as principles page.**

---

## Sidebar entry

Target file: `sidebars/software-engineering.json`

Locate `"Clean Code"` → replace its `"items"` with:
```json
[
  "software-engineering/clean-code/clean-code-principles",
  "software-engineering/clean-code/clean-code-master-javascript",
  "software-engineering/clean-code/clean-code-master-typescript",
  "software-engineering/clean-code/clean-code-master-python",
  "software-engineering/clean-code/clean-code-master-java",
  "software-engineering/clean-code/clean-code-master-csharp",
  "software-engineering/clean-code/clean-code-master-rust"
]
```

---

## Pre-flight validation

After writing all 8 files run `npm run check:mdx`. Fix per MDX Safety Rules. Retry up to 3 times.
Do NOT run `npm start` or `npm run build`.

---

## Final output

| File | Lines | Domain Consistent | Language Valid | Status |
|---|---|---|---|---|
| 01-principles.mdx | N | ✅ | — | ✅ |
| 02-master-javascript.mdx | N | ✅ | ✅ | ✅ |
| 03-master-typescript.mdx | N | ✅ | ✅ | ✅ |
| 04-master-python.mdx | N | ✅ | ✅ | ✅ |
| 05-master-java.mdx | N | ✅ | ✅ | ✅ |
| 06-master-csharp.mdx | N | ✅ | ✅ | ✅ |
| 07-master-rust.mdx | N | ✅ | ✅ | ✅ |
