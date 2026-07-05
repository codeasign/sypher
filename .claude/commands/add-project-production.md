# /add-project-production

Generate a complete Level 3 Production Project for the Build with AI course on the Sypher platform.

**Intent:** 1–2 day projects. Resemble real products. Student builds something that could go live. Architecture decisions, production concerns, and deployment are first-class — not afterthoughts.

## Usage

```
/add-project-production TOPIC="Enterprise RAG System" SLUG="enterprise-rag-system" SECTION="Enterprise AI"
```

## Arguments

- `TOPIC` — Project display name
- `SLUG` — URL-safe kebab-case
- `SECTION` — Must exactly match one of: Enterprise AI, AI Agents, MCP Projects, LangGraph Projects, AI SaaS

---

## CRITICAL

**Run with Claude Sonnet.** Production-grade content — verify every API, auth flow, SDK version, and deployment target.
Never hardcode secrets. No pseudocode. Everything runs.

---

## Files to generate

```
docs/build-with-ai/production/$SLUG/
├── index.md
├── 01-architecture.mdx
├── 02-build.mdx
└── 03-deploy.mdx
```

---

## Page 1 — index.md

Standard DocCardList stub.

---

## Page 2 — 01-architecture.mdx "Plan Before You Build"

**Target length:** 400–550 lines.

**Opening — The Real Problem (no heading)**
2–3 paragraphs. Name a real company pain point this solves. Cite a real-world example if one exists publicly.

**Mandatory sections:**

### What You'll Build
The complete finished system. Be specific about every component, integration, and user-facing behavior.

### Architecture
Full system diagram — every component, data flow, and integration boundary.

```
<AsciiDiagram> covering all components — label every box and arrow
```

### Technology Decisions
Table for each major choice:
| Component | Choice | Why this, not X |

Minimum 6 decisions. State the trade-off accepted for each.

### Data Model
Key entities, fields, storage choice. Schema or TypedDict/Pydantic model where applicable.

### Project Structure
Full directory tree of the finished project.

### API Surface
Every endpoint or tool the system exposes. Method, path/name, input, output, errors.

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

## Page 3 — 02-build.mdx "Build It"

**Target length:** 700–1000 lines. Core page.

**Mandatory sections:**

### Prerequisites
Packages with pinned versions. All environment variables with setup instructions. Services to provision (DB, vector store, queue) — exact commands.

### Build It — Numbered Steps
Minimum 12 steps. Every step:
- Complete runnable code
- Run command
- Expected output verbatim
- What happened and why it matters

Structure the steps as milestones — every 3–4 steps should produce a demoable checkpoint.

### Understand What Happened
After the full build:
- What each major component does internally
- Token/cost breakdown for a typical operation
- Where the bottlenecks are
- What would break first under load

### Common Errors
Minimum 5: exact error, root cause, fix. Cover auth errors, version conflicts, and a logic error specific to this project.

**Frontmatter:**
```
---
id: $SLUG-build
title: "$TOPIC — Build"
sidebar_label: $TOPIC
sidebar_position: 2
---
```

---

## Page 4 — 03-deploy.mdx "Improve and Deploy"

**Target length:** 400–550 lines.

**Mandatory sections:**

### Production Hardening
5–7 specific improvements with complete code:
- Error handling and retries
- Authentication/authorization
- Input validation and sanitization
- Logging and monitoring hooks
- Cost controls (token budgets, rate limiting)
- Caching strategy
- At least one security-specific improvement

### Deploy It
Full deployment to one real target (Railway, Fly.io, AWS, GCP — pick the most appropriate for this project type):
- Dockerfile if containerizing
- Infrastructure-as-code snippet (fly.toml, railway.json, or equivalent)
- Environment variable configuration in the platform
- Health check and verification
- How to monitor it post-deploy

### Scale It
What changes at 10x load:
- The first component to break
- The architectural change required
- Rough cost at scale

### What's Next
2 natural follow-on projects — one at same level, one at Portfolio level — with inline links.

**Frontmatter:**
```
---
id: $SLUG-deploy
title: "$TOPIC — Deploy"
sidebar_label: Deploy
sidebar_position: 3
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

**If `"Production Projects"` does not exist yet,** add it to the `buildWithAiSidebar` array as a top-level category:
```json
{
  "type": "category",
  "label": "Production Projects",
  "collapsible": true,
  "collapsed": true,
  "items": [
    { "type": "category", "label": "Enterprise AI", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "AI Agents", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "MCP Projects", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "LangGraph Projects", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "AI SaaS", "collapsible": true, "collapsed": true, "items": [] }
  ]
}
```
**IMPORTANT:** Only create this category if it does not exist yet. If it already exists (with or without items), just add to it.

**Then** locate `"Production Projects"` → locate child category matching `$SECTION` exactly → append:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/production/$SLUG/$SLUG-architecture",
    "build-with-ai/production/$SLUG/$SLUG-build",
    "build-with-ai/production/$SLUG/$SLUG-deploy"
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
