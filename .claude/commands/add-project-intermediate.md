# /add-project-intermediate

Generate a complete Level 2 Intermediate Project for the Build with AI course on the Sypher platform.

**Intent:** Half-day projects. Combine 2–3 AI concepts. Student builds something genuinely useful — the kind of tool they'd show a colleague.

## Usage

```
/add-project-intermediate TOPIC="Chat With PDFs" SLUG="chat-with-pdfs"
```

## Arguments

- `TOPIC` — Project display name
- `SLUG` — URL-safe kebab-case
- No SECTION — all intermediate projects are flat under "Intermediate Projects"

---

## CRITICAL

**Run with Claude Sonnet.** Verify every API, SDK method, and package version.
Never hardcode secrets. All code must be complete and runnable.

---

## Files to generate

```
docs/build-with-ai/intermediate/$SLUG/
├── index.md
├── 01-build.mdx
└── 02-improve.mdx
```

---

## Page 1 — index.md

Standard DocCardList stub with id, title, sidebar_label.

---

## Page 2 — 01-build.mdx

**Target length:** 500–750 lines.

**Opening — The Real Problem (no heading)**
2–3 paragraphs. Concrete scenario. Real frustration. Make the reader feel it before naming the solution.

**Mandatory sections:**

### What You'll Build
Specific outputs, interactions, integrations. Include a short architecture diagram if the system has 3+ moving parts.

### Concepts You Need
Only what this project introduces. 3–5 concepts max. Each: one paragraph + one concrete example. No re-explaining basics from mini projects.

### Prerequisites
Packages with pinned versions. Environment variable instructions with exact links. Project structure to create upfront.

### Build It
Numbered steps. Minimum 8. Every step:
- Complete runnable code
- Run command
- Expected output verbatim
- What happened (one sentence to one paragraph)

End state: working application the student can demo.

### Understand What Happened
After building, explain the internals:
- What each API call actually did
- Token usage and cost for a typical run
- Performance characteristics
- 3 common mistakes teams make with this pattern

**Frontmatter:**
```
---
id: $SLUG-build
title: $TOPIC
sidebar_label: $TOPIC
sidebar_position: 1
---
```

Same MDX safety rules as add-project-mini.

---

## Page 3 — 02-improve.mdx

**Target length:** 300–450 lines.

**Mandatory sections:**

### Improve It
Turn the basic build into something production-ready. 4–6 specific improvements:
- Each: what to add, exact code, why it matters in production
- Examples: retry logic, streaming, input validation, logging, caching, error handling

### Deploy It
Step-by-step deployment to one real target:
- Railway, Fly.io, or AWS Lambda (pick the most appropriate)
- Dockerfile if containerizing
- Environment variable configuration in the platform
- Verification that it works in production

### Challenge Yourself
3 extensions at different levels. No solutions provided here — this is independent practice.
- Beginner, Intermediate, Advanced

**Frontmatter:**
```
---
id: $SLUG-improve
title: "$TOPIC — Improve and Deploy"
sidebar_label: Improve and Deploy
sidebar_position: 2
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

Target file: `sidebars/build-with-ai.json` (same file as mini).

**If `"Intermediate Projects"` does not exist yet,** add it to the `buildWithAiSidebar` array as a top-level category:
```json
{ "type": "category", "label": "Intermediate Projects", "collapsible": true, "collapsed": true, "items": [] }
```

**Then** locate `"Intermediate Projects"` → append to its `"items"`:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "build-with-ai/intermediate/$SLUG/$SLUG-build",
    "build-with-ai/intermediate/$SLUG/$SLUG-improve"
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
