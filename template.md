# Sypher — Master Template & Read Me First

> **Read this before creating or editing any course content on the Sypher platform.**
> This document codifies every pattern, command, and convention used across all courses.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Course Inventory](#2-course-inventory)
3. [Content Generation Commands](#3-content-generation-commands)
4. [Page Structure by Course Type](#4-page-structure-by-course-type)
5. [MDX Safety Rules (Non-Negotiable)](#5-mdx-safety-rules-non-negotiable)
6. [AsciiDiagram Standards](#6-asciidiagram-standards)
7. [Sidebar Conventions](#7-sidebar-conventions)
8. [Navbar Configuration](#8-navbar-configuration)
9. [Feature Toggles](#9-feature-toggles)
10. [Post-Generation Workflow](#10-post-generation-workflow)
11. [Quality Gates](#11-quality-gates)
12. [Cost & Budget Rules](#12-cost--budget-rules)
13. [Common Failure Modes & Fixes](#13-common-failure-modes--fixes)
14. [Quick Reference Charts](#14-quick-reference-charts)

---

## 1. Platform Overview

| Property | Value |
|----------|-------|
| Framework | Docusaurus (static site) |
| Content format | MDX (Markdown + JSX) |
| Sidebar system | Auto-merged from `sidebars/*.json` via `sidebars.js` — never edit `sidebars.js` directly |
| Navbar | Hardcoded in `docusaurus.config.js` between `=== TOPICS ===` and `=== /TOPICS ===` markers |
| Diagram component | `<AsciiDiagram>` (globally registered, no import needed in `.mdx`) |
| Feature toggles | `features.json` — `diagramImages: false` (ASCII), `true` (PNG fallback) |
| Globally registered components | `YouTube`, `PdfEmbed`, `Slideshow`, `AsciiDiagram` — no import needed |

**Directory layout:**

```
docs/<slug>/                  one folder per topic/course
  index.md                    topic landing page (DocCardList stub or full overview)
  <page>.mdx                  individual pages
  <lesson-slug>/              lesson folder (for concept/tool courses)
    overview.mdx
    build-it.mdx
    avoid-mistakes.mdx
    review.mdx

sidebars/<slug>.json          left sidebar for one topic
sidebars.js                   auto-loader — DO NOT EDIT
docusaurus.config.js          navbar items
features.json                 feature toggles
static/img/diagrams/          generated diagram images
```

---

## 2. Course Inventory

| # | Course Slug | Sidebar File | Navbar Label | Type | Sections |
|---|-------------|-------------|--------------|------|----------|
| 1 | `python-for-ai-engineers` | `python-for-ai-engineers.json` | Python for AI (via sidebar) | Concept (4-page lessons) | 9 sections + Practice |
| 2 | `agentic-ai-fundamentals` | `agentic-ai-fundamentals.json` | Agentic AI (via sidebar) | Concept (4-page lessons) | 8 sections |
| 3 | `system-design-fundamentals` | `system-design-fundamentals.json` | System Design (direct link) | Concept (7-page topics) | ~10 sections |
| 4 | `ai-engineering-hands-on` | `ai-engineering-hands-on.json` | Building with AI (direct link) | AI Engineering (3-page lessons) | 10 sections + Capstone |
| 5 | `git-github-actions` | `git-github-actions.json` | Git & GitHub Actions (direct link) | Tool (3-page lessons) | 9 sections + Capstone |
| 6 | `system-design` (case studies) | `system-design-case-studies.json` | (under System Design) | Case Study (7-page) | 4 tiers + Capstone |
| 7 | `build-with-ai` (projects) | `build-with-ai.json` | Build with AI (sidebar) | Project (1-5 pages) | 4 levels |

### Course Type Summary

| Type | Lesson Pages | Best For | Commands |
|------|-------------|----------|----------|
| **Concept** | overview.mdx, build-it.mdx, avoid-mistakes.mdx, review.mdx | Python, Agentic AI | `add-topic-concept` |
| **Tool/Skill** | overview.mdx, build-it.mdx, avoid-mistakes.mdx, review.mdx | Git & GitHub Actions | `add-topic-git-github-actions` |
| **AI Engineering** | overview.mdx, practice-exercise.mdx, general-practice.mdx | AI Engineering Hands-On | `add-topic-ai-engineering` |
| **System Design** | concepts.mdx, deep-dive.mdx, architecture.mdx, tradeoffs.mdx, real-world.mdx, interview.mdx, challenge.mdx | System Design Fundamentals | `add-system-design-course` |
| **Case Study** | requirements.mdx, estimation.mdx, high-level-design.mdx, deep-dive.mdx, tradeoffs.mdx, evolution.mdx, interview-simulation.mdx | System Design Case Studies | `add-system-design-case-study` |
| **Mini Project** | index.md, 01-build.mdx | Build with AI (Level 1) | `add-project-mini` |
| **Intermediate Project** | index.md, 01-build.mdx, 02-improve.mdx | Build with AI (Level 2) | `add-project-intermediate` |
| **Production Project** | index.md, 01-architecture.mdx, 02-build.mdx, 03-deploy.mdx | Build with AI (Level 3) | `add-project-production` |
| **Portfolio Project** | index.md, 01-architecture.mdx, 02-build-core.mdx, 03-build-advanced.mdx, 04-deploy-and-scale.mdx | Build with AI (Level 4) | `add-project-portfolio` |
| **Capstone** | varies (5-18 pages) | All courses | `add-capstone`, `add-system-design-capstone`, `add-topic-git-github-actions-capstone` |

---

## 3. Content Generation Commands

All commands live in `.claude/commands/`. Run as `/add-...` slash commands.

### Build with AI Project Commands

| Command | Level | Duration | Pages | Sections Required |
|---------|-------|----------|-------|-------------------|
| `/add-project-mini` | Level 1 — Mini | 1–3 hours | 2 | `Personal Productivity`, `Email Automation`, `Personal Assistants`, `Developer Tools` |
| `/add-project-intermediate` | Level 2 — Intermediate | Half day | 3 | Flat (no SECTION arg) |
| `/add-project-production` | Level 3 — Production | 1–2 days | 4 | `Enterprise AI`, `AI Agents`, `MCP Projects`, `LangGraph Projects`, `AI SaaS` |
| `/add-project-portfolio` | Level 4 — Portfolio | Multi-day | 5 | Flat (no SECTION arg) |

### Topic/Content Commands

| Command | Purpose | Lesson Pages | Sections |
|---------|---------|-------------|----------|
| `/add-topic-concept` | Full concept course topic | 4 (overview, build-it, avoid-mistakes, review) + Practice | Varies by course |
| `/add-topic-tool` | Full tool/skill course topic | 4 (same as concept) + Practice | Varies by course |
| `/add-topic-ai-engineering` | AI engineering topic | 3 (overview, practice-exercise, general-practice) | 10 sections |
| `/add-topic-git-github-actions` | Git/GHA topic | 3 (overview, practice-exercise, general-practice) | 9 sections |
| `/add-system-design-course` | System design topic | 7 (concepts, deep-dive, architecture, tradeoffs, real-world, interview, challenge) | 5 sections |
| `/add-system-design-case-study` | System design case study | 7 (requirements, estimation, high-level-design, deep-dive, tradeoffs, evolution, interview-simulation) | 4 tiers |
| `/add-capstone` | Course capstone | 5 (index, requirements, milestones, rubric, reference-architecture) | N/A |
| `/add-system-design-capstone` | System design capstone | 18 (full platform design) | N/A |
| `/add-topic-git-github-actions-capstone` | Git/GHA capstone | 9 (build a gated pipeline) | N/A |

### Utility Commands

| Command | Purpose |
|---------|---------|
| `/fix-mdx-bare-operators` | Fix bare `<` before digits in prose |
| `/fix-mdx-errors` | Diagnose and fix MDX compilation errors |
| `/fix-rendered-content` | Auto-fix rendering defects across newly created files |
| `/update-course` | Update existing course content |

---

## 4. Page Structure by Course Type

### 4.1 Concept / Tool Course (4-page lesson)

```
docs/<slug>/<lesson-slug>/
├── overview.mdx              # "should I care, what is this"
│   ├── What You Will Learn
│   ├── Prerequisites
│   ├── Why This Matters
│   ├── The Problem (optional for Reference lessons)
│   ├── The Concept (NO CODE)
│   ├── The Big Picture (AsciiDiagram)
│   └── What's Next (link to ./build-it)
│
├── build-it.mdx              # "hands-on teaching"
│   ├── Breaking It Down (3-5 sections)
│   ├── How It Works Internally (Conceptual only)
│   ├── Build Something Real
│   ├── Performance Considerations (optional)
│   ├── Security Considerations (optional)
│   └── What's Next (link to ./avoid-mistakes)
│
├── avoid-mistakes.mdx        # "what goes wrong"
│   ├── When NOT to Use This
│   ├── The Pattern to Remember
│   ├── Common Mistakes (exactly 5)
│   └── What's Next (link to ./review)
│
└── review.mdx                # "wrap-up and self-test"
    ├── Key Takeaways (exactly 5)
    ├── Recap in 60 Seconds (3 things)
    ├── Further Reading
    └── What Comes Next
```

**Index page content:** What this topic is, Why it matters, Skills gained, Estimated completion time, Difficulty, Prerequisites, Course roadmap, Learning outcomes, Links to every lesson, Practice overview.

**Practice section:** `beginner.mdx` (3 exercises), `intermediate.mdx` (3 exercises), `advanced.mdx` (2 exercises), `solutions.mdx` (complete — never abbreviated).

### 4.2 AI Engineering Course (3-page lesson)

```
docs/ai-engineering-hands-on/<slug>/
├── index.md                  # DocCardList stub
├── 01-overview.mdx           # "Understand It"
│   ├── The Problem Story (no heading)
│   ├── The Concept
│   ├── API / SDK / CLI Reference (table, min 6 entries)
│   ├── The Big Picture Diagram
│   ├── How It Works (min 6 steps, min 3 AsciiDiagrams)
│   ├── Cost, Limits, and Safety
│   ├── When to Use This / When Not To
│   └── Mental Model Check (5 questions)
│
├── 02-practice-exercise.mdx  # "Build It"
│   ├── Setup
│   ├── The Build (min 6 steps, complete code + expected output)
│   ├── Common Errors (min 4)
│   └── What You Just Built (4-6 bullets)
│
└── 03-general-practice.mdx   # "Practice on Your Own"
    ├── Tier 1 — Beginner (3-4 exercises with solutions)
    ├── Tier 2 — Intermediate (3-4 exercises)
    └── Tier 3 — Advanced (2-3 exercises)
```

### 4.3 System Design Fundamentals (7-page topic)

```
docs/system-design-fundamentals/<slug>/
├── index.md                  # DocCardList stub
├── 01-concepts.mdx           # "Build the Mental Model"
│   ├── The Problem Story (no heading)
│   ├── The Insight + Analogy
│   ├── Core Vocabulary (min 8 terms)
│   ├── The Big Picture Diagram
│   ├── How It Works (min 8 steps, min 4 diagrams)
│   ├── Variants and Flavors (min 3)
│   └── Mental Model Check (5 questions)
│
├── 02-deep-dive.mdx          # "Under the Hood" (min 6 diagrams)
├── 03-architecture.mdx       # "Building It at Scale" (min 5 diagrams)
├── 04-tradeoffs.mdx          # "The Hard Choices" (min 4 diagrams)
├── 05-real-world.mdx         # "How Companies Use It" (min 4 diagrams)
├── 06-interview.mdx          # "Ace the Interview" (phrase bank, level-by-level)
└── 07-challenge.mdx          # "Prove It" (Tier 1-3 challenges)
```

### 4.4 System Design Case Study (7-page)

```
docs/system-design/<slug>/
├── index.md                  # DocCardList stub
├── 01-requirements.mdx       # Requirements & API Design
├── 02-estimation.mdx         # Capacity Estimation
├── 03-high-level-design.mdx  # The Blueprint (min 5 diagrams)
├── 04-deep-dive.mdx          # Under the Hood (min 6 diagrams)
├── 05-tradeoffs.mdx          # Trade-offs & Decisions (min 3 diagrams)
├── 06-evolution.mdx          # System Evolution (min 3 diagrams)
└── 07-interview-simulation.mdx # Full Interview Transcript
```

**Diagram quality standard:** Box conventions — `[ ]` services, `(( ))` databases, `< >` queues, `{ }` caches. Every arrow annotated. Every box labeled with role + technology.

### 4.5 Build with AI Projects

#### Mini Project (Level 1)
```
docs/build-with-ai/mini/<slug>/
├── index.md                  # DocCardList stub
└── 01-build.mdx              # "Build It"
    ├── What You'll Build
    ├── Concept in 5 Minutes
    ├── Prerequisites
    ├── Build It (min 6 steps)
    ├── Make It Yours (3 quick personalizations)
    └── What's Next (2 follow-on links)
```

#### Intermediate Project (Level 2)
```
docs/build-with-ai/intermediate/<slug>/
├── index.md                  # DocCardList stub
├── 01-build.mdx              # "Build It" (min 8 steps)
└── 02-improve.mdx            # "Improve and Deploy"
    ├── Improve It (4-6 improvements)
    ├── Deploy It (step-by-step to one target)
    └── Challenge Yourself (3 extensions)
```

#### Production Project (Level 3)
```
docs/build-with-ai/production/<slug>/
├── index.md                  # DocCardList stub
├── 01-architecture.mdx       # "Plan Before You Build" (400-550 lines)
├── 02-build.mdx              # "Build It" (700-1000 lines, min 12 steps)
└── 03-deploy.mdx             # "Improve and Deploy" (400-550 lines)
```

#### Portfolio Project (Level 4)
```
docs/build-with-ai/portfolio/<slug>/
├── index.md                  # DocCardList stub
├── 01-architecture.mdx       # "The Full Plan" (500-700 lines)
├── 02-build-core.mdx         # "Build the Foundation" (700-950 lines, min 10 steps)
├── 03-build-advanced.mdx     # "Build the Advanced Features" (600-850 lines)
└── 04-deploy-and-scale.mdx   # "Deploy and Scale" (500-650 lines)
```

### 4.6 Capstone Types

**Standard Capstone** (for concept/tool courses):
```
docs/<slug>/capstone/
├── index.md                  # Overview + instructions
├── requirements.mdx          # Functional + non-functional requirements
├── milestones.mdx            # 4-6 sequential checkpoints
├── rubric.mdx                # Self-assessment (Functionality 40%, Code 25%, Judgment 20%, Production 15%)
└── reference-architecture.mdx # One possible approach (not THE solution)
```

**System Design Capstone** (18 pages — full platform design):
```
docs/system-design/capstone/
├── index.md                  # Capstone overview
├── 01-brief.mdx              # The Mission
├── 02-architecture-overview.mdx  # Master Plan (min 4 diagrams)
├── 03-auth-and-users.mdx     # Auth subsystem
├── ...through...
└── 18-review.mdx             # What You Built
```

**Git/GitHub Actions Capstone** (9 pages — build a real gated pipeline):
```
docs/git-github-actions/capstone/
├── index.md                  # Capstone overview
├── 01-brief.mdx              # The Mission
├── 02-repo-and-branch-strategy.mdx
├── 03-feature-branch-and-commits.mdx
├── 04-opening-the-pull-request.mdx
├── 05-ci-pipeline.mdx
├── 06-branch-protection-and-gated-checkins.mdx
├── 07-cd-pipeline-and-environments.mdx
├── 08-review-and-merge.mdx
└── 09-review.mdx
```

---

## 5. MDX Safety Rules (Non-Negotiable)

These rules prevent **build-breaking errors** and **rendering defects**. Every generated file must pass all checks.

### Build-Breaking (Prevents Compilation)

| # | Rule | Wrong | Right |
|---|------|-------|-------|
| 1 | No bare `<` before digits in prose | `under <100ms` | `` under `<100ms` `` or `under 100 ms` |
| 2 | No raw `{` or `}` in prose outside fenced code blocks | `the {"key": "val"} dict` | Wrap in fenced code block: `` ```json {"key": "val"} ``` `` |
| 3 | No `:::` admonitions | `:::info Some note` | Use `##` header or bold text |
| 4 | No unescaped colon in frontmatter title | `title: Build: The Story` | `title: "Build: The Story"` |
| 5 | No backtick inside AsciiDiagram content | `` content={`use `echo` `` (backtick in template literal) | Escape as `\`` |
| 6 | AsciiDiagram must use `content` prop, not children pattern | `<AsciiDiagram>{\`...\`}</AsciiDiagram>` | `<AsciiDiagram content={\`...\`} />` |
| 7 | `alt` and `caption` props before `content` on AsciiDiagram | `<AsciiDiagram content={\`...\`} alt="..." />` | `<AsciiDiagram id="..." alt="..." caption="..." content={\`...\`} />` |
| 8 | No blank line inside AsciiDiagram content block | `content={\`line1\n\nline2\`}` | `content={\`line1\nline2\`}` |
| 9 | Import AsciiDiagram only if used | Unused import | Check `grep -c 'AsciiDiagram'` before importing |
| 10 | Unicode arrows only in diagrams | `->` or `<-` | `→ ← ↔ ↑ ↓` |
| 11 | Never hardcode API keys | `api_key="sk-..."` | `os.environ["ANTHROPIC_API_KEY"]` |

### Rendering Defects (Pass Build but Display Broken)

| # | Rule | Problem | Fix |
|---|------|---------|-----|
| 12 | Write .mdx files with explicit UTF-8 encoding | `─` becomes `â"€` on Windows | `open(path, "w", encoding="utf-8")` in Python |
| 13 | Never generate empty AsciiDiagram block | Content under 20 chars = invisible | Minimum 20 chars of meaningful diagram content |
| 14 | Every fenced code block needs matching closing fence | Unclosed fences swallow following content | Count ``` and verify pairs |
| 15 | Frontmatter must start with `---` as first characters | BOM or whitespace before frontmatter | No BOM, no leading whitespace |
| 16 | No "reader"/"user"/"learner" — address as "you" | "The reader will then..." | "You will then..." |

---

## 6. AsciiDiagram Standards

### Component Registration
- `<AsciiDiagram>` is globally registered — no import needed in `.mdx` files.
- Exception: System Design courses sometimes require explicit import: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`

### Required Props
- `id` (required): unique key in format `<topic-slug>/<page-slug>`
- `content` (required): ASCII art as template literal
- `alt` (required): one sentence describing the diagram
- `caption` (optional): short figure label

### Drawing Conventions
- Use Unicode box-drawing: `┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼`
- Use Unicode arrows: `─> ▶ ▼ ◀ ▲`
- **Never** use `+ - |` for boxes
- **Never** use raw `->` or `<-` for arrows — use `→ ← ↔ ↑ ↓`
- `alt` and `caption` must appear BEFORE `content` on the opening tag
- No blank lines inside the `content` template literal

### System Design Box Conventions
| Symbol | Component Type | Example |
|--------|---------------|---------|
| `[ ]` | Services | `[Load Balancer]` |
| `(( ))` | Databases | `((Primary DB))` |
| `< >` | Queues | `<Message Queue>` |
| `{ }` | Caches | `{Redis Cache}` |

### Feature Toggle
```json
// features.json
{
  "diagramImages": false    // renders ASCII (default)
  "diagramImages": true     // renders PNG if it exists, falls back to ASCII
}
```

Generate images: `node scripts/generate-diagrams.js`

### Minimum Diagram Counts by Course Type

| Course Type | Minimum per Page |
|-------------|-----------------|
| Concept/Tool overview | 1 |
| System Design Concepts | 4+ |
| System Design Deep Dive | 6+ |
| System Design Architecture | 5+ |
| System Design Tradeoffs | 4+ |
| System Design Real World | 4+ |
| System Design Case Study HLD | 5+ |
| System Design Case Study Deep Dive | 6+ |
| Build with AI Production | 1 (architecture page) |
| Build with AI Portfolio | 1 (architecture page) |

---

## 7. Sidebar Conventions

### Architecture
- Each topic has its own sidebar file in `sidebars/<slug>.json`
- `sidebars.js` auto-loads all files in `sidebars/` — **never edit `sidebars.js` directly**
- Sidebar IDs are camelCase (e.g., `pythonForAi`, `buildWithAiSidebar`)
- Sidebar ID must match `sidebarId` in the navbar item in `docusaurus.config.js`

### Sidebar Structure by Course Type

**Concept/Tool course** (Python, Agentic AI):
```json
{
  "sidebarId": [
    { "type": "category", "label": "Learn", "collapsible": true, "collapsed": false, "items": [
      { "type": "category", "label": "Lesson Name", "collapsible": true, "collapsed": true, "items": [
        "slug/lesson-slug/overview",
        "slug/lesson-slug/build-it",
        "slug/lesson-slug/avoid-mistakes",
        "slug/lesson-slug/review"
      ]}
    ]},
    { "type": "category", "label": "Practice", "collapsible": true, "collapsed": true, "items": [
      "slug/practice/beginner",
      "slug/practice/intermediate",
      "slug/practice/advanced",
      "slug/practice/solutions"
    ]}
  ]
}
```

**AI Engineering course** (3-page lessons):
```json
{
  "aiEngineeringHandsOnSidebar": [
    { "type": "category", "label": "Section Name", "items": [
      { "type": "category", "label": "Topic Name", "items": [
        "ai-engineering-hands-on/slug/slug-overview",
        "ai-engineering-hands-on/slug/slug-practice",
        "ai-engineering-hands-on/slug/slug-general-practice"
      ]}
    ]},
    { "type": "category", "label": "Capstone Projects", "collapsible": false, "items": [...] }
  ]
}
```

**System Design Fundamentals** (7-page topics):
```json
{
  "systemDesignFundamentalsSidebar": [
    { "type": "category", "label": "Topic Name", "items": [
      "system-design-fundamentals/slug/slug-concepts",
      "system-design-fundamentals/slug/slug-deep-dive",
      "system-design-fundamentals/slug/slug-architecture",
      "system-design-fundamentals/slug/slug-tradeoffs",
      "system-design-fundamentals/slug/slug-real-world",
      "system-design-fundamentals/slug/slug-interview",
      "system-design-fundamentals/slug/slug-challenge"
    ]}
  ]
}
```

**System Design Case Studies:**
```json
{
  "systemDesignCaseStudiesSidebar": [
    { "type": "category", "label": "Beginner Case Studies", "items": [...] },
    { "type": "category", "label": "Intermediate Case Studies", "items": [...] },
    { "type": "category", "label": "Advanced Case Studies", "items": [...] },
    { "type": "category", "label": "AI Case Studies", "items": [...] },
    { "type": "category", "label": "Capstone", "items": [...] }
  ]
}
```

**Build with AI Projects:**
```json
{
  "buildWithAiSidebar": [
    { "type": "category", "label": "Mini Projects", "items": [
      { "type": "category", "label": "SECTION", "items": ["..."] }
    ]},
    { "type": "category", "label": "Intermediate Projects", "items": [...] },
    { "type": "category", "label": "Production Projects", "items": [
      { "type": "category", "label": "Enterprise AI", "items": [...] },
      { "type": "category", "label": "AI Agents", "items": [...] },
      { "type": "category", "label": "MCP Projects", "items": [...] },
      { "type": "category", "label": "LangGraph Projects", "items": [...] },
      { "type": "category", "label": "AI SaaS", "items": [...] }
    ]},
    { "type": "category", "label": "Portfolio Projects", "items": [...] }
  ]
}
```

### Doc ID Convention
- Doc IDs = path relative to `docs/` with no file extension
- Example: `docs/python-for-ai-engineers/setup/overview` → id: `python-for-ai-engineers/setup/overview`

### Thing to Avoid
- Empty categories cause Docusaurus errors — only create a category when it has items
- Build with AI sidebar is shared across all project levels — append to existing, never duplicate

---

## 8. Navbar Configuration

All navbar items go in `docusaurus.config.js` between `=== TOPICS ===` and `=== /TOPICS ===` markers.

**For sidebar-linked topics** (Python, Agentic AI, Build with AI):
```js
{ type: 'docSidebar', sidebarId: 'buildWithAiSidebar', position: 'left', label: 'Build with AI' },
```

**For direct-link topics** (System Design, Git, AI Engineering):
```js
{ to: '/docs/system-design-fundamentals', label: 'System Design', position: 'left' },
```

**Rules:**
- Add each navbar item only once, on the first piece of content generated for that course
- Preserve existing order — append new items after existing ones
- Never remove a navbar item (orphaned items cause build warnings, not errors)

---

## 9. Feature Toggles

Located in `features.json`. Currently has one toggle:

| Flag | false (default) | true |
|------|----------------|------|
| `diagramImages` | Renders ASCII diagrams | Renders PNG images with ASCII fallback |

---

## 10. Post-Generation Workflow

> **IMPORTANT:** Do NOT run `npm start` or `npm run build` on generated content. Use `npm run check:mdx` instead. Full builds are reserved for final deploy.

### Standard Workflow (for all `/add-project-*` and `/add-system-design-*` commands)

1. **Generate content** using slash command
2. **Update sidebar** — append doc IDs to correct sidebar file
3. **Update navbar** — only if this is the first item for that course
4. **Run `/fix-rendered-content`** — auto-fix MDX rendering defects on newly created files
5. **Verify AsciiDiagrams** — run `grep -rn '</AsciiDiagram>' docs/<path>/` to catch children-pattern diagrams
6. **Run `npm run check:mdx`** — check for MDX syntax errors
7. **Fix any errors** — see Common Failure Modes below
8. **Report summary** — file count, line count, diagram count, status

### System Design Course Workflow

1. Generate content
2. Run `npm run start` (unlike other commands — System Design requires a full build to verify)
3. Diagnose errors from build output
4. Fix and re-build (up to 3 rounds per file)
5. Flag persistent failures as `NEEDS MANUAL REVIEW`

### Post-Generation Fix Hook
All content generation commands (`/add-project-*`, `/add-topic-*`, `/add-system-design-*`) auto-run `/fix-rendered-content` as a final step.

---

## 11. Quality Gates

### Universal Gates (Apply to ALL Content)

- [ ] No build-breaking MDX errors (bare `{`, bare `<`, unclosed fences, unescaped colons)
- [ ] No `:::` admonition blocks anywhere
- [ ] No AsciiDiagram uses the children pattern (`</AsciiDiagram>` should not exist — use `/>`)
- [ ] Every AsciiDiagram has `id`, `content`, `alt` props in correct order
- [ ] Every AsciiDiagram has content over 20 characters
- [ ] Every fenced code block has a language tag
- [ ] No hardcoded API keys — all from environment variables
- [ ] No "reader", "user", "learner" — address as "you"
- [ ] All files written with UTF-8 encoding
- [ ] Frontmatter starts with `---` (no BOM, no whitespace before)

### Course-Specific Gates

**Concept/Tool courses:**
- [ ] Each lesson has exactly 4 pages (overview, build-it, avoid-mistakes, review)
- [ ] Exactly 5 common mistakes per lesson
- [ ] Exactly 5 key takeaways per lesson
- [ ] Solutions are complete (never abbreviated)
- [ ] At least 1 AsciiDiagram per lesson (on overview page)

**AI Engineering:**
- [ ] Every SDK method, model string, and CLI flag verified against current docs
- [ ] Cost/rate-limit/safety section present on every Overview page
- [ ] Practice Exercise ends in a working runnable result

**System Design:**
- [ ] Every number is concrete and calculated (not guessed)
- [ ] Every decision has an explicitly rejected alternative
- [ ] Deep dive covers at least 3 competing approaches per component
- [ ] Decision log has minimum 8 entries
- [ ] Interview transcript covers all 5 phases

**Build with AI Projects:**
- [ ] Under $5 budget for completion
- [ ] `.env.example` included with spend guards
- [ ] Cost estimate table on every build page
- [ ] Warning before expensive operations
- [ ] Integration with real (not mock) APIs where possible

**Capstones:**
- [ ] No full solution code provided (architecture and requirements only)
- [ ] Requirements are specific and testable
- [ ] Rubric allows multiple valid implementations
- [ ] Reference architecture explicitly framed as "one possible approach"

---

## 12. Cost & Budget Rules

> Applies to ALL project content that uses paid APIs.

### Starter Code Defaults
- Use cheapest viable model: `claude-haiku-3-5` not Sonnet, `gpt-4o-mini` not `gpt-4o`, `text-embedding-3-small` not large
- Prefer local/free alternatives: Ollama for embeddings, `smtplib` over SendGrid, free APIs (TMDB, ESPN) over paid data providers

### Spend Guards (Required in every project with loops, agents, or repeated API calls)
```python
import os
MAX_ITERATIONS = int(os.environ.get("MAX_ITERATIONS", "5"))
MAX_TOKENS_PER_RUN = int(os.environ.get("MAX_TOKENS_PER_RUN", "10000"))
total_tokens = 0

for i in range(MAX_ITERATIONS):
    if total_tokens > MAX_TOKENS_PER_RUN:
        print(f"Token budget reached at iteration {i}. Set MAX_TOKENS_PER_RUN to increase.")
        break
```

### `.env.example` (Required in every project)
```bash
# Copy to .env — never commit .env
ANTHROPIC_API_KEY=      # free credits at console.anthropic.com
OPENAI_API_KEY=         # optional
MAX_ITERATIONS=5
MAX_TOKENS_PER_RUN=10000
```

### Cost Estimate Table (Required on every build/overview page)
```
## Cost to Build This
| Item | Cost |
|---|---|
| Setup (one-time) | ~$0.00–$0.10 |
| Per run | ~$0.001–$0.02 |
| Free tier sufficient | Yes / Partially |
| Recommended spend cap | $2 |
```

### Warning Before Expensive Operations
Required before embedding large document sets, running multiple agent loops, or paid API calls:
```python
print(f"This will process {len(files)} files and make approximately {estimated_calls} API calls.")
print(f"Estimated cost: ~${estimated_cost:.3f}")
confirm = input("Continue? (y/n): ")
if confirm.lower() != "y":
    print("Aborted.")
    sys.exit(0)
```

---

## 13. Common Failure Modes & Fixes

### MDX Build Errors

| Error Pattern | Root Cause | Fix |
|---|---|---|
| `Expected a closing tag for <word>` — any `<placeholder>` | MDX treats `<word>` as JSX component | Wrap in backticks: `` `<placeholder>` `` |
| `Expected a closing tag for <details>` / `end-tag-mismatch` | `<details>` missing `</details>` | Count every `<details>` and match closing tags |
| `Expected a closing tag for <summary>` | `<summary>` missing `</summary>` | Add `</summary>` before following content |
| Bare `{` / `}` (acorn parse error) | JSON/GraphQL/code with braces outside fenced blocks | Wrap in fenced code block |
| AsciiDiagram renders as blank/empty box (no build error) | Using children pattern instead of `content` prop | Replace `>` before `{ \`` with `content=`, replace `</AsciiDiagram>` with `/>` |
| `end-tag-mismatch` with HTML-like tag | Angle brackets in prose (`if (x < 5)`, `<commit-hash>`) | Move to code fence or wrap in backticks |

### Quick Checks After Generation

```bash
# Check for children-pattern AsciiDiagram (blank render bug)
grep -rn '</AsciiDiagram>' docs/

# Check for bare < before digits (build break)
grep -rnP '<\d' docs/ --include="*.mdx"

# Check for bare braces in prose (doesn't catch all — scan files)
grep -rnP '(?<!`){(?!`)' docs/ --include="*.mdx" | grep -v '```' | grep '{'

# Check for admonition blocks
grep -rn ':::' docs/ --include="*.mdx"

# Check for unescaped colons in frontmatter titles
grep -rn 'title:.*:' docs/ --include="*.md" --include="*.mdx" | grep -v 'title: "' | grep -v 'slug:'

# Check for hardcoded API keys
grep -rnE '(sk-|api_key|API_KEY)\s*=' docs/ --include="*.mdx" --include="*.md" | grep -v 'os.environ' | grep -v '\.env'
```

### Post-Fix Workflow
1. Identify error pattern from build output
2. Apply matching fix from the table above
3. Re-run `npm run check:mdx`
4. Repeat up to 3 times per file
5. Flag persistent failures as `NEEDS MANUAL REVIEW`

---

## 14. Quick Reference Charts

### Command → Sidebar File Mapping

| Command | Sidebar File | Sidebar ID |
|---------|-------------|-----------|
| `/add-project-mini` | `sidebars/build-with-ai.json` | `buildWithAiSidebar` |
| `/add-project-intermediate` | `sidebars/build-with-ai.json` | `buildWithAiSidebar` |
| `/add-project-production` | `sidebars/build-with-ai.json` | `buildWithAiSidebar` |
| `/add-project-portfolio` | `sidebars/build-with-ai.json` | `buildWithAiSidebar` |
| `/add-topic-concept` | `sidebars/<slug>.json` | `camelCaseSlug` |
| `/add-topic-ai-engineering` | `sidebars/ai-engineering-hands-on.json` | `aiEngineeringHandsOnSidebar` |
| `/add-topic-git-github-actions` | `sidebars/git-github-actions.json` | `gitGithubActionsSidebar` |
| `/add-system-design-course` | `sidebars/system-design-fundamentals.json` | `systemDesignFundamentalsSidebar` |
| `/add-system-design-case-study` | `sidebars/system-design-case-studies.json` | `systemDesignCaseStudiesSidebar` |
| `/add-system-design-capstone` | `sidebars/system-design-case-studies.json` | `systemDesignCaseStudiesSidebar` |
| `/add-topic-git-github-actions-capstone` | `sidebars/git-github-actions.json` | `gitGithubActionsSidebar` |
| `/add-capstone` | `sidebars/<slug>.json` | `camelCaseSlug` |

### Lesson Structure Quick Reference

| Course Type | Files per Lesson | Practice Files | Capstone Files |
|-------------|-----------------|----------------|----------------|
| Concept/Tool | 4 | 4 (b, i, a, solutions) | 5 |
| AI Engineering | 3 | (integrated in lesson 3) | 1 (separate command) |
| System Design Fundamentals | 7 | (integrated in challenge.mdx) | — |
| System Design Case Studies | 7 | — | 18 |
| Git & GitHub Actions | 3 | (integrated in lesson 3) | 9 |
| Mini Projects | 2 (index + build) | — | — |
| Intermediate Projects | 3 | — | — |
| Production Projects | 4 | — | — |
| Portfolio Projects | 5 | — | — |

### Writing Style Reminders

- **Tone:** Senior engineer explaining to a colleague — direct, conversational, no narrator distance
- **Second person:** "you will build", "you should already know" — never "the reader", "the learner"
- **No filler:** No "In today's world", "It is worth noting", "In conclusion", "In this article"
- **Concrete over abstract:** "50,000 requests/second" not "many requests"
- **Show, then explain** (Build with AI, Tools) **or explain, then show** (Concept, System Design)
- **No Chinese characters, no DSML artifacts** (`｜`, `<|...|>`)
- **No emoji in technical content** (reserved for informal notes)

---

> **One Last Thing:** Every time you create content, the auto-fix hook runs. But the hook cannot catch everything. Always scan for the three most common defects manually before declaring done:
> 1. `</AsciiDiagram>` (children pattern instead of content prop) — renders blank, no build error
> 2. Bare `{` in prose (JSON/f-strings outside code blocks) — build error that stops the site
> 3. `title: text: more text` (unescaped colon in frontmatter) — parser error at build time