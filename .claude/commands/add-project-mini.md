# /add-project-mini

Generate a complete Level 1 Mini Project for the Build with AI course on Sypher.

**Intent:** Student builds one working AI application in 1–3 hours. One concept. One payoff. Zero fluff. Every line of code runs. Student deploys before closing the tab.

## CRITICAL
Run with Claude Sonnet. Verify every SDK method, model string, package version against current docs. No hardcoded secrets — all from environment variables.

## Usage
```
/add-project-mini TOPIC="Daily AI News Digest" SLUG="daily-ai-news-digest" SECTION="Personal Productivity"
```

## Arguments
- `TOPIC` — Project display name
- `SLUG` — kebab-case, unique across all mini projects
- `SECTION` — Must exactly match one of: Personal Productivity, Email Automation, Personal Assistants, Developer Tools

---

## Files to generate
```
docs/build-with-ai/mini/$SLUG/
├── index.md
├── 01-overview.mdx
└── 02-build.mdx
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

**Target length:** 200–350 lines.

### Structure:
1. **The Problem** (no heading) — 1–2 paragraphs. Real pain. Why this needs to exist.
2. **What You'll Build** — concrete output description. What runs, what the student sees at the end.
3. **Concept in 5 Minutes** — one concept only. One analogy. One diagram (`<AsciiDiagram>` if flow-based). No more.
4. **What You Need** — prerequisites, env vars, packages in a table.
5. **Cost Estimate** — token/API cost for this project per run.

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

**Target length:** 400–600 lines. Core page — everything that matters is here.

### Structure:
1. **Setup** — exact install commands, `.env` template, project structure.
2. **Build It** — complete, runnable code. No pseudocode. No omissions. Every file shown. Commands to run. Expected output shown verbatim.
3. **What Just Happened** — explain the internals in plain language. API calls made, tokens used, SDK behavior.
4. **Make It Yours** — 2–3 small improvements: add scheduling, change the prompt, add email delivery, etc. Each one complete and runnable.
5. **Deploy It** — exact steps to deploy. Railway, Fly.io, cron job, GitHub Actions — whichever fits. Working deployment by end of this section.
6. **Common Errors** — 3 real errors with exact message, cause, fix.

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

## MDX Safety Rules — MANDATORY
- Import AsciiDiagram at top of any file using it: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`
- Every `<AsciiDiagram>` must have `title` prop; no blank line inside; close with `</AsciiDiagram>` never `/>`.
- No bare `<` before digits in prose. No raw `{`/`}` outside code fences. No `:::` admonitions.
- No "reader"/"user"/"learner" — address as "you". No hardcoded API keys.

---

## Sidebar entry
Target: `sidebars/build-with-ai.json`

If it doesn't exist, create with full skeleton:
```json
{
  "buildWithAISidebar": [
    { "type": "category", "label": "Mini Projects", "collapsible": true, "collapsed": true, "items": [
      { "type": "category", "label": "Personal Productivity", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "Email Automation", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "Personal Assistants", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "Developer Tools", "collapsible": true, "collapsed": true, "items": [] }
    ]},
    { "type": "category", "label": "Intermediate Projects", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Production Projects", "collapsible": true, "collapsed": true, "items": [
      { "type": "category", "label": "Enterprise AI", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "AI Agents", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "MCP Projects", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "LangGraph Projects", "collapsible": true, "collapsed": true, "items": [] },
      { "type": "category", "label": "AI SaaS", "collapsible": true, "collapsed": true, "items": [] }
    ]},
    { "type": "category", "label": "Portfolio Projects", "collapsible": true, "collapsed": true, "items": [] }
  ]
}
```

Find the nested category matching `$SECTION` under Mini Projects. Insert:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/mini/$SLUG/$SLUG-overview",
    "build-with-ai/mini/$SLUG/$SLUG-build"
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

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
