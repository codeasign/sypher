# /add-project-portfolio

Generate a complete Level 4 Portfolio Project for the Build with AI course on Sypher.

**Intent:** Student builds a large, resume-worthy AI system. Demonstrates architectural thinking, multi-component integration, production operations, and engineering judgment. Suitable for FAANG interviews and real products.

## CRITICAL
Run with Claude Sonnet. Verify every SDK method, model string, package version. No hardcoded secrets. No pseudocode. Every component must be justifiable in a system design interview.

## Usage
```
/add-project-portfolio TOPIC="Multi-Agent Research Platform" SLUG="multi-agent-research-platform"
```

## Arguments
- `TOPIC` — Project display name
- `SLUG` — kebab-case unique slug (portfolio projects are flat, no sections)

---

## Files to generate
```
docs/build-with-ai/portfolio/$SLUG/
├── index.md
├── 01-brief.mdx
├── 02-architecture.mdx
├── 03-build-core.mdx
├── 04-build-advanced.mdx
├── 05-evaluate.mdx
└── 06-ship.mdx
```

---

## Page 1 — index.md
Standard DocCardList stub.

---

## Page 2 — 01-brief.mdx

**Target length:** 350–500 lines.

### Structure:
1. **The Mission** (no heading) — what this system does, who uses it, why it matters. Make it feel like a real product brief.
2. **System Requirements** — functional and non-functional. Concrete numbers: latency targets, throughput, cost ceiling, availability.
3. **What You'll Build** — every component listed, what the finished system can do end-to-end.
4. **Skills This Demonstrates** — why this belongs in a portfolio. What it shows an interviewer.
5. **Estimated Time and Cost** — hours to build, API cost to run at low volume.

**Frontmatter:**
```
---
id: $SLUG-brief
title: $TOPIC
sidebar_label: Brief
sidebar_position: 1
---
```

---

## Page 3 — 02-architecture.mdx

**Target length:** 500–700 lines.

### Structure:
1. **Full System Diagram** — one very large `<AsciiDiagram>` covering every component. Label technology choices inline (e.g. "Redis — session cache").
2. **Technology Decisions** — table: layer, technology chosen, alternatives rejected, rationale.
3. **Read Path and Write Path** — each as numbered steps with a diagram.
4. **Security and Compliance Architecture** — auth, secrets, audit logging, input/output validation.
5. **Scalability Analysis** — what breaks at 10× load, what the next architecture looks like.
6. **Cost Model** — per-request cost breakdown at multiple scales.

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

## Page 4 — 03-build-core.mdx

**Target length:** 800–1100 lines.

### Structure:
1. **Setup** — complete project scaffold, all config, all installs, `.env` template.
2. **Build the Core** — minimum 10 numbered steps covering the essential working system. Complete code. Run commands. Expected output verbatim. Checkpoints.
3. **Core Integration Test** — one real end-to-end request, real output shown.
4. **What Just Happened** — internals: API calls, token accounting, latency, cost.

**Frontmatter:**
```
---
id: $SLUG-build-core
title: Build $TOPIC — Core
sidebar_label: Build Core
sidebar_position: 3
---
```

---

## Page 5 — 04-build-advanced.mdx

**Target length:** 700–950 lines.

### Structure:
1. **Advanced Features** — 4–5 features that elevate from MVP to portfolio-grade: streaming, multi-tenancy, caching layer, human-in-the-loop, cost guardrails, evaluation hooks. Each complete and runnable.
2. **Observability Stack** — structured logging, distributed tracing, metrics endpoint, health check. Complete implementation.
3. **Test Suite** — 5 meaningful tests covering critical paths. Runnable with `pytest` or equivalent.
4. **End-to-End Verification** — one complex scenario that exercises all major paths.

**Frontmatter:**
```
---
id: $SLUG-build-advanced
title: Build $TOPIC — Advanced
sidebar_label: Build Advanced
sidebar_position: 4
---
```

---

## Page 6 — 05-evaluate.mdx

**Target length:** 350–500 lines.

### Structure:
1. **Evaluation Suite** — build a real eval: golden dataset (minimum 10 examples), scoring function, automated run. Complete, runnable.
2. **Benchmark Results** — show how to interpret the output. What good looks like. What bad looks like.
3. **Regression Guard** — GitHub Actions workflow that runs evals on every PR and blocks merge on regression.
4. **Portfolio Talking Points** — 5 things to highlight when presenting this project in interviews. What the system demonstrates about your engineering judgment.

**Frontmatter:**
```
---
id: $SLUG-evaluate
title: Evaluate $TOPIC
sidebar_label: Evaluate
sidebar_position: 5
---
```

---

## Page 7 — 06-ship.mdx

**Target length:** 400–550 lines.

### Structure:
1. **Dockerize** — complete multi-stage Dockerfile and docker-compose with all services.
2. **Deploy to Production** — exact steps for Railway, Fly.io, or GCP Cloud Run. Working public URL.
3. **CI/CD Pipeline** — complete GitHub Actions: test → eval gate → build → deploy. Blocks on eval regression.
4. **Operate It** — runbook: what to watch, what alerts to set, how to roll back, how to scale.
5. **Extend It** — 3 open-ended challenges that would make this a real product.

**Frontmatter:**
```
---
id: $SLUG-ship
title: Ship $TOPIC
sidebar_label: Ship
sidebar_position: 6
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

Find the `"Portfolio Projects"` category. Insert:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/portfolio/$SLUG/$SLUG-brief",
    "build-with-ai/portfolio/$SLUG/$SLUG-architecture",
    "build-with-ai/portfolio/$SLUG/$SLUG-build-core",
    "build-with-ai/portfolio/$SLUG/$SLUG-build-advanced",
    "build-with-ai/portfolio/$SLUG/$SLUG-evaluate",
    "build-with-ai/portfolio/$SLUG/$SLUG-ship"
  ]
}
```

---

## Pre-flight
Run `npm run check:mdx` after writing all files. Do NOT run `npm start` or `npm run build`.

## Final output
| File | Lines | Status |
|------|-------|--------|
| 01-brief.mdx | N | ✅ |
| 02-architecture.mdx | N | ✅ |
| 03-build-core.mdx | N | ✅ |
| 04-build-advanced.mdx | N | ✅ |
| 05-evaluate.mdx | N | ✅ |
| 06-ship.mdx | N | ✅ |

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
