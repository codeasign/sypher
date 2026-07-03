# /add-project-intermediate

Generate a complete Level 2 Intermediate Project for the Build with AI course on Sypher.

**Intent:** Student builds a multi-concept AI application in half a day. Combines 2–3 AI techniques. Production-quality output. Deployable by end of the project.

## CRITICAL
Run with Claude Sonnet. Verify every SDK method, model string, package version. No hardcoded secrets.

## Usage
```
/add-project-intermediate TOPIC="Chat With PDFs" SLUG="chat-with-pdfs"
```

## Arguments
- `TOPIC` — Project display name
- `SLUG` — kebab-case unique slug (no SECTION — all intermediate projects are flat)

---

## Files to generate
```
docs/build-with-ai/intermediate/$SLUG/
├── index.md
├── 01-overview.mdx
├── 02-build.mdx
└── 03-improve.mdx
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

## Page 2 — 01-overview.mdx

**Target length:** 300–450 lines.

### Structure:
1. **The Problem** (no heading) — 2 paragraphs. Real-world pain point.
2. **What You'll Build** — working demo description, final output, screenshot placeholder.
3. **Concepts Required** — 2–3 concepts only, each with one analogy and one diagram (`<AsciiDiagram>`).
4. **Architecture** — one `<AsciiDiagram>` showing the full system before building.
5. **Prerequisites and Cost** — table of env vars, packages, estimated API cost per use.

**Frontmatter:**
```
---
id: $SLUG-overview
title: $TOPIC
sidebar_label: Overview
sidebar_position: 1
---
```

---

## Page 3 — 02-build.mdx

**Target length:** 600–850 lines.

### Structure:
1. **Project Setup** — directory structure, install commands, `.env` template, config files.
2. **Build It — Step by Step** — minimum 6 numbered steps. Each step: complete code, run command, expected output verbatim, one-paragraph explanation, checkpoint.
3. **End-to-End Test** — one real request through the full system with actual output shown.
4. **What Just Happened** — internals: API calls, token flow, latency, cost breakdown.
5. **Common Errors** — 4 real errors with exact message, root cause, fix.

**Frontmatter:**
```
---
id: $SLUG-build
title: Build $TOPIC
sidebar_label: Build
sidebar_position: 2
---
```

---

## Page 4 — 03-improve.mdx

**Target length:** 300–450 lines.

### Structure:
1. **Production Features** — add 3–4 production improvements. Each: task description, complete code, run command, expected result. Cover: error handling, retry logic, caching, logging, streaming, auth — whichever applies.
2. **Deploy It** — full deployment steps to a free/cheap platform (Railway, Fly.io, Vercel, GitHub Actions). Working URL at the end.
3. **Extend It** — 2 independent challenges, each with a hint and a full solution.

**Frontmatter:**
```
---
id: $SLUG-improve
title: Improve $TOPIC
sidebar_label: Improve and Deploy
sidebar_position: 3
---
```

---

## MDX Safety Rules — MANDATORY
- Import AsciiDiagram at top of any file using it: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`
- Every `<AsciiDiagram>` must have `title` prop; no blank line inside; close with `</AsciiDiagram>` never `/>`.
- No bare `<` before digits. No raw `{`/`}` outside code fences. No `:::` admonitions.
- No "reader"/"user"/"learner". No hardcoded API keys.

---

## Sidebar entry
Target: `sidebars/build-with-ai.json` — create if absent (see mini command for full skeleton).

Find the `"Intermediate Projects"` category. Insert:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/intermediate/$SLUG/$SLUG-overview",
    "build-with-ai/intermediate/$SLUG/$SLUG-build",
    "build-with-ai/intermediate/$SLUG/$SLUG-improve"
  ]
}
```

---

## Pre-flight
Run `npm run check:mdx` after writing all files. Do NOT run `npm start` or `npm run build`.

## Final output
| File | Lines | Status |
|------|-------|--------|
| 01-overview.mdx | N | ✅ |
| 02-build.mdx | N | ✅ |
| 03-improve.mdx | N | ✅ |

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
