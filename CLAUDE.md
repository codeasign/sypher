# Sypher — Project Guide for Claude Code

Docusaurus learning site. Each topic is a self-contained section with its own
sidebar JSON and navbar link. Static site — no server-side code.

## Project structure

docs/<slug>/          one folder per topic
  index.md            topic landing page
  <page>.mdx          individual pages (.mdx for components)

sidebars/<slug>.json  left sidebar groups and order for one topic
sidebars.js           auto-merges every file in sidebars/ — do not edit manually
docusaurus.config.js  navbar items — add between === TOPICS === markers
features.json         feature toggles (diagramImages on/off)
static/img/diagrams/  generated diagram images

## Sidebar JSON conventions

- Key = camelCase sidebarId e.g. pythonForAi
- Must match sidebarId in the navbar item in docusaurus.config.js
- Doc ids = path relative to docs/ with no file extension
- sidebars.js auto-loads all files in sidebars/ — never edit it to add a topic

## Code snippets

Always use fenced code blocks with a language tag.
Supported: python, bash, json, typescript, javascript, java, yaml

## ASCII diagrams

Every topic page must have at least one AsciiDiagram component.

Props:
- id (required): unique key in format <topic-slug>/<page-slug>
- content (required): ASCII art as template literal
- alt (required): one sentence describing the diagram
- caption (optional): short figure label

Drawing conventions:
- Use Unicode box-drawing: ┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼
- Use arrows: ──> ▶ ▼ ◀ ▲
- Do not use + - | for boxes

Feature toggle in features.json:
- "diagramImages": false  → renders ASCII (default)
- "diagramImages": true   → renders PNG if it exists, falls back to ASCII

Generating images:
  node scripts/generate-diagrams.js --dry-run
  node scripts/generate-diagrams.js
  node scripts/generate-diagrams.js --provider openai
  node scripts/generate-diagrams.js --id python-for-ai/setup
  node scripts/generate-diagrams.js --force

## Globally registered components (no import needed in .mdx)

<YouTube id="VIDEO_ID" title="..." start={N} />
<PdfEmbed src="/pdf/file.pdf" title="..." height={640} />
<Slideshow slides={[{src, alt, caption}]} autoPlay interval={5000} />
<AsciiDiagram id="slug/page" content={`...`} alt="..." caption="..." />

Static assets: images → static/img/  PDFs → static/pdf/  diagrams → static/img/diagrams/


## Current topics

- python-for-ai-engineers — Python for AI Engineers (Sections 1-4: setup, first-program, virtual-environments, variables, strings, lists, tuples, dictionaries, sets, control-flow, loops, functions, modules, file-handling, comprehensions, generators, decorators, context-managers, error-handling, dataclasses, type-hints, logging, classes, inheritance, composition, magic-methods; Section 5: numpy, pandas, data-visualization, json, csv; Section 6: requests, httpx, api-authentication, async-python; Section 7: llm-api-basics, prompt-engineering, structured-output, embeddings, rag, ai-pipelines; Section 8: pytest, docker, ci-cd, packaging; Section 9: project-structure, clean-code, performance; practice section with beginner/intermediate/advanced/solutions)
- agentic-ai-fundamentals — Agentic AI Fundamentals (Sections 1-2: what-is-ai-engineering, llm-fundamentals, tokens-and-context-windows, prompt-engineering-basics, llm-apis-in-practice, system-prompts, prompt-patterns, few-shot-prompting, chain-of-thought-and-reasoning, prompt-templates, structured-output-prompting, prompt-testing-and-iteration; Section 3: what-is-an-agent, agent-vs-chatbot-vs-workflow, anatomy-of-an-agent, reasoning-vs-execution, agent-memory, agent-tools-and-tool-calling, planning-and-decision-making; Section 4: observe-think-act-loop, react-pattern, plan-and-execute, reflection-and-self-correction, loop-safety-and-recovery, human-in-the-loop; Section 5: orchestrator-and-supervisor-patterns, specialist-agents, agent-communication-and-coordination, shared-memory-and-state, when-to-use-multi-agent; Section 6: what-is-mcp, mcp-architecture, mcp-primitives, transports, building-an-mcp-server, building-an-mcp-client, mcp-with-claude-code; Section 7: evaluating-agents, trajectory-evaluation, tool-evaluation, prompt-injection-and-guardrails, observability-logging-and-tracing, cost-and-latency-tracking; Section 8: deployment-patterns, versioning-prompts-and-tools, configuration-management, authentication, scaling-agent-systems, caching-and-retries, monitoring-production-agents)

## Local dev server

`npm run dev` and `npm run start` run plain `docusaurus start`. The blog
now lives in `apps/app` (real Next.js SSR/ISR pages reading Supabase
directly) — `scripts/watch-blog-posts.mjs` / `scripts/bake-blog-posts.mjs`
are Phase-7-disconnected leftovers kept only as a rollback path for one
release cycle; they no longer run as part of `dev`/`start`/`build`.

When debugging/verifying anything in a browser (Puppeteer or otherwise):
1. Check port 3000: `netstat -ano | grep ":3000" | grep LISTENING`
2. Kill any existing process bound to it, then start fresh:
   `nohup npm run start > /tmp/dev-server.log 2>&1 & disown`
3. Poll the log until `"Docusaurus website is running"` appears before
   running checks — don't assume a server from earlier is still valid.
4. If the server's node process gets killed during cleanup, restart it
   again with `npm run start` afterward — don't leave the site down.

## Hard rules

- Never hardcode API keys or secrets in any file
- Never invent external URLs — leave TODO if unsure
- Every code block must have a language tag
- Every topic page must have at least one AsciiDiagram
- AsciiDiagram id values must be unique across the project
- Use .mdx extension for all pages that contain components
- Do not edit sidebars.js directly to add topics
