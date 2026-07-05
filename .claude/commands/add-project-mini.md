# /add-project-mini

Generate a complete Level 1 Mini Project for the Build with AI course on the Sypher platform.

**Intent:** 1–3 hour projects. One core AI concept. Immediate, usable payoff. Student starts from zero and ends with a running application they can actually use. No fluff. No theory for its own sake.

## Usage

```
/add-project-mini TOPIC="Daily AI News Digest" SLUG="daily-ai-news-digest" SECTION="Personal Productivity"
```

## Arguments

- `TOPIC` — Project display name
- `SLUG` — URL-safe kebab-case
- `SECTION` — Must exactly match one of: Personal Productivity, Email Automation, Personal Assistants, Developer Tools

---

## CRITICAL

**Run with Claude Sonnet, not DeepSeek.** API surfaces change monthly.
- Verify every SDK method, model string, package version, and endpoint before writing it.
- Never hardcode API keys — always `os.environ` or equivalent.
- Every code block must be complete and runnable with no pseudocode.

---

## Files to generate

```
docs/build-with-ai/mini/$SLUG/
├── index.md
└── 01-build.mdx
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

## Page 2 — 01-build.mdx

**Target length:** 400–600 lines.

**Opening — The Real Problem (no heading)**
2 paragraphs. What specific pain does this solve? Make it concrete. Name the exact frustration.

**Mandatory sections:**

### What You'll Build
One paragraph + bullet list of exactly what the finished project does. Specific — outputs, triggers, integrations.

### Concept in 5 Minutes
Only the theory required for this project. One mental model. One analogy. One diagram if the flow needs it. Maximum 200 words.

### Prerequisites
Exact packages with versions. Environment variables needed with instructions on where to get each key/token. Project directory to create.

### Build It
Numbered steps. Minimum 6. Every step:
- Exact complete runnable code in a fenced block
- The command to run it
- Expected output shown verbatim
- One sentence explaining what happened

Last step must produce the working application end-to-end.

### Make It Yours
3 quick personalizations the student can make without guidance.

### What's Next
2 natural follow-on projects from the course with inline links.

**Frontmatter:**
```
---
id: $SLUG-build
title: $TOPIC
sidebar_label: $TOPIC
sidebar_position: 1
---
```

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

**If the file does not exist, create it with only the Mini Projects section:**
```json
{
  "buildWithAiSidebar": [
    {
      "type": "category",
      "label": "Mini Projects",
      "collapsible": true,
      "collapsed": false,
      "items": [
        { "type": "category", "label": "Personal Productivity", "collapsible": true, "collapsed": true, "items": [] },
        { "type": "category", "label": "Email Automation", "collapsible": true, "collapsed": true, "items": [] },
        { "type": "category", "label": "Personal Assistants", "collapsible": true, "collapsed": true, "items": [] },
        { "type": "category", "label": "Developer Tools", "collapsible": true, "collapsed": true, "items": [] }
      ]
    }
  ]
}
```
**IMPORTANT:** Do NOT include empty categories for Intermediate, Production, or Portfolio Projects — Docusaurus errors on empty categories. Those are added by their respective commands when they have content.

**If the file already exists:** locate `"Mini Projects"` → locate child category matching `$SECTION` exactly → append:
```json
"build-with-ai/mini/$SLUG/$SLUG-build"
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

After writing all files run `npm run check:mdx`. Do NOT run `npm start` or `npm run build`.
