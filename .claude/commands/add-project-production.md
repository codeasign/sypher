# /add-project-production

Generate a complete Level 3 Production Project for the Build with AI course on Sypher.

**Intent:** Student builds a production-grade AI system in 1–2 days. Enterprise patterns. Real architecture decisions. Deployed, monitored, tested.

## CRITICAL
Run with Claude Sonnet. Verify every SDK method, model string, package version. No hardcoded secrets. No pseudocode.

## Usage
```
/add-project-production TOPIC="Enterprise RAG System" SLUG="enterprise-rag-system" SECTION="Enterprise AI"
```

## Arguments
- `TOPIC` — Project display name
- `SLUG` — kebab-case unique slug
- `SECTION` — Must exactly match one of: Enterprise AI, AI Agents, MCP Projects, LangGraph Projects, AI SaaS

---

## Files to generate
```
docs/build-with-ai/production/$SLUG/
├── index.md
├── 01-overview.mdx
├── 02-architecture.mdx
├── 03-build.mdx
├── 04-improve.mdx
└── 05-deploy.mdx
```

---

## Page 1 — index.md
Standard DocCardList stub.

---

## Page 2 — 01-overview.mdx

**Target length:** 400–550 lines.

### Structure:
1. **The Problem** (no heading) — 3 paragraphs. Enterprise-grade real-world problem with concrete consequences.
2. **What You'll Build** — complete system description, every component named, what runs at the end.
3. **Concepts Required** — 3–5 concepts, each with analogy and diagram.
4. **Design Decisions** — minimum 3 architecture decisions made upfront with trade-offs stated and positions taken.
5. **Prerequisites, Cost, and Limits** — env vars, packages, API cost estimate at production scale, rate limits.

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

## Page 3 — 02-architecture.mdx

**Target length:** 400–500 lines.

### Structure:
1. **Full System Diagram** — one large `<AsciiDiagram>` showing every component, data flows, protocols.
2. **Component Breakdown** — table: component name, technology choice, why this over alternatives.
3. **Data Flow** — read path and write path each as numbered steps with a diagram.
4. **Security Architecture** — auth, secrets management, input validation approach.
5. **Scalability Notes** — where this design breaks and what the next evolution looks like.

**Frontmatter:**
```
---
id: $SLUG-architecture
title: $TOPIC Architecture
sidebar_label: Architecture
sidebar_position: 2
---
```

---

## Page 4 — 03-build.mdx

**Target length:** 800–1100 lines.

### Structure:
1. **Setup** — project structure, all config files, all install commands, complete `.env` template.
2. **Build It — Numbered Steps** — minimum 10 steps. Each: complete code, run command, expected output verbatim, one-paragraph explanation, checkpoint command.
3. **Integration Test** — one full end-to-end request through the system with real output.
4. **What Just Happened** — API calls, token flow, latency breakdown, cost per request.
5. **Common Errors** — 5 real errors with exact message, root cause, fix.

**Frontmatter:**
```
---
id: $SLUG-build
title: Build $TOPIC
sidebar_label: Build
sidebar_position: 3
---
```

---

## Page 5 — 04-improve.mdx

**Target length:** 400–550 lines.

### Structure:
1. **Production Hardening** — 4–5 improvements: retry with exponential backoff, circuit breaker, input validation, structured logging, cost guardrails. Each complete and runnable.
2. **Observability** — add tracing, metrics, health endpoint. Complete code.
3. **Testing** — write 3 meaningful tests for the most critical path. Complete, runnable test code.
4. **Independent Challenges** — 3 challenges at Extend / Harden / Enterprise Scenario levels. Each with hint and complete solution.

**Frontmatter:**
```
---
id: $SLUG-improve
title: Improve $TOPIC
sidebar_label: Improve and Test
sidebar_position: 4
---
```

---

## Page 6 — 05-deploy.mdx

**Target length:** 300–400 lines.

### Structure:
1. **Dockerize** — complete Dockerfile and docker-compose.yml. Runs locally first.
2. **Deploy to Cloud** — exact steps for Railway or Fly.io. Working URL at end.
3. **GitHub Actions CI** — complete workflow file: test → build → deploy on push to main.
4. **Monitor It** — what metrics to watch, what alerts to set, how to read logs.

**Frontmatter:**
```
---
id: $SLUG-deploy
title: Deploy $TOPIC
sidebar_label: Deploy
sidebar_position: 5
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

Find the nested category matching `$SECTION` under `"Production Projects"`. Insert:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/production/$SLUG/$SLUG-overview",
    "build-with-ai/production/$SLUG/$SLUG-architecture",
    "build-with-ai/production/$SLUG/$SLUG-build",
    "build-with-ai/production/$SLUG/$SLUG-improve",
    "build-with-ai/production/$SLUG/$SLUG-deploy"
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
| 02-architecture.mdx | N | ✅ |
| 03-build.mdx | N | ✅ |
| 04-improve.mdx | N | ✅ |
| 05-deploy.mdx | N | ✅ |

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
