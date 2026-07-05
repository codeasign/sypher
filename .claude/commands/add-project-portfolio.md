# /add-project-portfolio

Generate a complete Level 4 Portfolio Project for the Build with AI course on the Sypher platform.

**Intent:** Large multi-day builds. Resume and interview-worthy. Enterprise architecture, real deployment, production concerns throughout. The student finishes with a system they can demo in interviews and extend in real work.

## Usage

```
/add-project-portfolio TOPIC="Multi-Agent Research Platform" SLUG="multi-agent-research-platform"
```

## Arguments

- `TOPIC` — Project display name
- `SLUG` — URL-safe kebab-case
- No SECTION — all portfolio projects are flat under "Portfolio Projects"

---

## CRITICAL

**Run with Claude Sonnet.** These projects are complex and fast-moving.
Verify every API, auth flow, deployment target, and SDK version.
Never hardcode secrets. No pseudocode. Everything runs.

---

## Files to generate

```
docs/build-with-ai/portfolio/$SLUG/
├── index.md
├── 01-architecture.mdx
├── 02-build-core.mdx
├── 03-build-advanced.mdx
└── 04-deploy-and-scale.mdx
```

---

## Page 1 — index.md

Standard DocCardList stub.

---

## Page 2 — 01-architecture.mdx "The Full Plan"

**Target length:** 500–700 lines.

**Opening — The Real Problem (no heading)**
3 paragraphs. Enterprise context. Who would buy this. What it replaces. Why it's hard to build well.

**Mandatory sections:**

### What You'll Build
The complete system with every component, integration, and user-facing capability. Think product spec, not tutorial intro.

### System Architecture
Full diagram — every service, data store, external integration, and communication pattern.

### Component Breakdown
For each major component: responsibility, technology choice with rationale, interface to other components.

### Technology Decisions
Table — minimum 8 decisions with trade-offs.

### Data Architecture
Schemas, storage choices, migration strategy for each data type.

### Security Architecture
Auth model, authorization boundaries, secrets management, network policies.

### Project Milestones
How the 4 pages map to a real build sequence — what exists after each page.

**Frontmatter:**
```
---
id: $SLUG-architecture
title: "$TOPIC — Architecture"
sidebar_label: Architecture
sidebar_position: 1
---
```

Same MDX safety rules.

---

## Page 3 — 02-build-core.mdx "Build the Foundation"

**Target length:** 700–950 lines.

Builds the core system — the minimum that works end-to-end.

**Mandatory sections:**

### Prerequisites
Full setup: packages, environment variables, services to provision, directory structure.

### Build It — Core
Minimum 10 numbered steps. Same standard as production: complete code, run command, expected output, explanation. End state: working core system with a real demo checkpoint.

### Understand the Core
Internals, cost model, bottlenecks, what the code is actually doing at the API level.

**Frontmatter:**
```
---
id: $SLUG-build-core
title: "$TOPIC — Core Build"
sidebar_label: Core Build
sidebar_position: 2
---
```

---

## Page 4 — 03-build-advanced.mdx "Build the Advanced Features"

**Target length:** 600–850 lines.

Builds on the core — adds what makes this portfolio-worthy.

**Mandatory sections:**

### Advanced Features
Minimum 3 advanced features. Each:
- What it adds and why it matters
- Numbered build steps with complete code
- Demo checkpoint
- Common failure mode

Cover at minimum: multi-tenancy or auth, observability, cost controls or rate limiting.

### Testing
Minimum 3 tests:
- Unit test for core logic
- Integration test for a key API interaction
- End-to-end test for the main user flow

**Frontmatter:**
```
---
id: $SLUG-build-advanced
title: "$TOPIC — Advanced Features"
sidebar_label: Advanced Features
sidebar_position: 3
---
```

---

## Page 5 — 04-deploy-and-scale.mdx "Deploy and Scale"

**Target length:** 500–650 lines.

**Mandatory sections:**

### Deploy It
Full production deployment:
- Dockerfile (multi-stage where appropriate)
- Infrastructure config (fly.toml, docker-compose.yml, k8s manifest, or equivalent)
- CI/CD pipeline — GitHub Actions workflow that tests, builds, and deploys on push
- Environment variable management
- Health checks and readiness probes
- Verification the deployed system works

### Monitoring and Observability
- Structured logging setup
- Key metrics to track
- At least one alert to configure
- How to debug a failure in production

### Scale It
- Capacity model: what handles how much load
- First bottleneck and how to address it
- Cost at 10x / 100x load
- What requires architectural rethinking at scale

### Portfolio Presentation
How to present this project in interviews:
- 3-sentence project summary
- 5 technical decisions to highlight
- 3 questions to expect and how to answer them
- What to show in a live demo

**Frontmatter:**
```
---
id: $SLUG-deploy-and-scale
title: "$TOPIC — Deploy and Scale"
sidebar_label: Deploy and Scale
sidebar_position: 4
---
```

---

---

**MDX Safety and Rendering Rules — MANDATORY:**

**Build-breaking (prevent these at generation time):**
- No bare `<` before digits in prose — write "under 100ms" not `<100ms`
- No raw `{` or `}` in prose outside fenced code blocks — wrap all JSON/GraphQL/object examples in a fenced block
- No `:::` admonitions — use plain `##` headers and bold text
- No unescaped colon in frontmatter title — wrap value in quotes if it contains one
- Never backtick inside an AsciiDiagram `content` block — escape as `\`` and `\${`
- Always use the `content` prop pattern for AsciiDiagram — never children:
  - WRONG: `<AsciiDiagram id="..." title="...">{\`...\`}</AsciiDiagram>`
  - RIGHT: `<AsciiDiagram id="..." title="..." content={\`...\`} />`
- `alt` and `caption` props must appear BEFORE `content` on the opening tag — never after the closing backtick
- Never a blank line inside an AsciiDiagram `content` block
- Import AsciiDiagram only if used: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`
- Unicode arrows only in diagrams (`→ ← ↔ ↑ ↓`) — never raw `->` or `<-` inside diagram content
- Never hardcode API keys, tokens, or secrets — always `os.environ` or equivalent

**Rendering defects (pass build but display broken — prevent at generation):**
- Write all `.mdx` files with explicit UTF-8 encoding — on Windows, Python defaults to cp1252 which silently corrupts `─` into `â"€`; always `open(path, "w", encoding="utf-8")`
- Never generate an empty AsciiDiagram block — content under 20 characters is a defect
- Every fenced code block must have a matching closing fence — unclosed fences swallow following content
- Frontmatter must start with exactly `---` as the first characters in the file — no BOM, no whitespace, no stray character before it
- No "reader"/"user"/"learner" — address as "you"

---

## Sidebar entry

Target file: `sidebars/build-with-ai.json`

**If `"Portfolio Projects"` does not exist yet,** add it to the `buildWithAiSidebar` array as a top-level category:
```json
{ "type": "category", "label": "Portfolio Projects", "collapsible": true, "collapsed": true, "items": [] }
```

**Then** locate `"Portfolio Projects"` → append to its `"items"`:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/portfolio/$SLUG/$SLUG-architecture",
    "build-with-ai/portfolio/$SLUG/$SLUG-build-core",
    "build-with-ai/portfolio/$SLUG/$SLUG-build-advanced",
    "build-with-ai/portfolio/$SLUG/$SLUG-deploy-and-scale"
  ]
}
```

---

## docusaurus.config.js

If not already present, add to navbar between the `=== TOPICS ===` and `=== /TOPICS ===` markers:

```js
{ type: 'docSidebar', sidebarId: 'buildWithAiSidebar', position: 'left', label: 'Build with AI' },
```

Check the existing navbar array first — only add this once, on the first project generated for this course.

---

## Cost and Student Budget Rules — MANDATORY

Every project must be completable for under $5 total. Enforce these in every page generated:

**Starter code defaults:**
- Use cheapest viable model by default: `claude-haiku-3-5` not Sonnet, `gpt-4o-mini` not `gpt-4o`, `text-embedding-3-small` not large
- Prefer local/free alternatives where teaching value is equal: Ollama for embeddings and local inference, `smtplib` over SendGrid for email mini projects, TMDB/ESPN free APIs over paid data providers
- Never default to a paid model when a free or local one teaches the same concept

**Spend guards — required in every project with a loop, agent, or repeated API call:**
```python
import os
MAX_ITERATIONS = int(os.environ.get("MAX_ITERATIONS", "5"))
MAX_TOKENS_PER_RUN = int(os.environ.get("MAX_TOKENS_PER_RUN", "10000"))
total_tokens = 0

for i in range(MAX_ITERATIONS):
    if total_tokens > MAX_TOKENS_PER_RUN:
        print(f"Token budget reached at iteration {i}. Set MAX_TOKENS_PER_RUN to increase.")
        break
    # ... call LLM, add response.usage.input_tokens + output_tokens to total_tokens
```

**Every project must include `.env.example`:**
```bash
# Copy to .env — never commit .env
ANTHROPIC_API_KEY=      # free credits at console.anthropic.com
OPENAI_API_KEY=         # optional
MAX_ITERATIONS=5
MAX_TOKENS_PER_RUN=10000
```

**Cost estimate section — required in every overview/build page:**
```
## Cost to Build This
| Item | Cost |
|---|---|
| Setup (one-time) | ~$0.00–$0.10 |
| Per run | ~$0.001–$0.02 |
| Free tier sufficient | Yes / Partially |
| Recommended spend cap | $2 |
```

**Warn before expensive operations:**
Add a confirmation prompt before any operation that embeds a large document set, runs multiple agent loops, or calls a paid API more than once:
```python
print(f"This will process {len(files)} files and make approximately {estimated_calls} API calls.")
print(f"Estimated cost: ~${estimated_cost:.3f}")
confirm = input("Continue? (y/n): ")
if confirm.lower() != "y":
    print("Aborted.")
    sys.exit(0)
```

---

## Pre-flight

`npm run check:mdx` on all generated files. Do NOT run `npm start` or `npm run build`.
