# /add-system-design-case-study

Generate a complete FAANG-level system design case study for the Sypher platform.

**Intent:** A student must be able to read this case study end-to-end and walk into a FAANG interview having designed this exact system before. Every decision must be justified. Every number must be calculated. Every trade-off must be explicit. This is a worked example of a real interview, not a summary.

## Usage

```
/add-system-design-case-study TOPIC="Design URL Shortener" SLUG="design-url-shortener" SECTION="Beginner Case Studies"
```

## Arguments

- `TOPIC` — Display name (e.g. "Design URL Shortener")
- `SLUG` — URL-safe kebab-case (e.g. "design-url-shortener")
- `SECTION` — Parent section (e.g. "Beginner Case Studies", "Intermediate Case Studies", "Advanced Case Studies", "AI Case Studies")

---

## Files to generate

```
docs/system-design/$SLUG/
├── index.md
├── 01-requirements.mdx
├── 02-estimation.mdx
├── 03-high-level-design.mdx
├── 04-deep-dive.mdx
├── 05-tradeoffs.mdx
├── 06-evolution.mdx
└── 07-interview-simulation.mdx
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

## Page 2 — 01-requirements.mdx "Define the Problem"

**Target length:** 400–600 lines of MDX.

**Purpose:** Teach the student how to gather and frame requirements before touching any design. This is the first thing interviewers evaluate — can the candidate ask the right questions?

**Mandatory structure:**

### 1. The Brief
One paragraph. Set the scene: what is the product, who uses it, what is the business context. Write it as if an interviewer just said it to you cold.

### 2. What Good Requirement Gathering Looks Like
Show the exact dialogue. Write it as a back-and-forth between candidate and interviewer. Minimum 12 exchanges. Cover:
- Clarifying what "success" means
- Identifying the primary use case vs edge cases
- Understanding scale expectations
- Identifying consistency vs availability preferences
- Surfacing hidden requirements the interviewer didn't mention

### 3. Functional Requirements
The final agreed list. Format as: requirement name, one-sentence description, why it matters. Minimum 6 functional requirements.

### 4. Non-Functional Requirements
The constraints that shape the architecture. For each:
- The requirement (e.g. "Availability: 99.99%")
- What it means in concrete terms (e.g. "Less than 52 minutes downtime per year")
- How it constrains design choices
Minimum 8 non-functional requirements covering: availability, latency, throughput, durability, consistency, scalability, security, cost.

### 5. Out of Scope
What are you explicitly NOT building? At least 5 items. Explain why each is excluded.

### 6. The API Contract
Define the public API surface. For each endpoint:
- Method + path
- Request parameters (name, type, required/optional, constraints)
- Response schema
- Error cases
- Rate limits if applicable
Cover all primary use cases.

**Frontmatter:**
```
---
id: $SLUG-requirements
title: Requirements & API Design
sidebar_label: Requirements
sidebar_position: 1
---
```

**MDX Safety Rules — MANDATORY:**
- Import AsciiDiagram at top: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`
- Every `<AsciiDiagram>` must have a `title` prop
- No bare `<` before digits — write "under 100ms" not `<100ms`
- No bare `{` or `}` in prose — escape as `\{` `\}` if needed
- No `:::info` `:::note` `:::tip` `:::warning` admonitions
- No "reader", "user", "learner" — address as "you"
- No openers like "In this article" or "In this lesson"
- No Chinese characters, no DSML `｜` artifacts
- Numbers must be concrete

---

## Page 3 — 02-estimation.mdx "Do the Math"

**Target length:** 400–500 lines of MDX.

**Purpose:** Teach back-of-envelope estimation as a skill. Interviewers don't expect perfect numbers — they expect structured thinking and reasonable assumptions.

**Mandatory structure:**

### 1. Estimation Framework
The 4-step approach: assumptions → traffic → storage → bandwidth. Explain each step before applying it.

### 2. Traffic Estimation
State your assumptions first (DAU, read/write ratio, peak multiplier). Then calculate:
- Requests per day
- Requests per second (average)
- Requests per second (peak — assume 3–10x average)
Show all arithmetic inline. Round to sensible numbers.

### 3. Storage Estimation
Per-record size breakdown (list every field, its type, its byte size). Then:
- Storage per day
- Storage per year
- Storage for 5 years
- Replication factor impact
Show all arithmetic.

### 4. Bandwidth Estimation
- Ingress bandwidth (writes)
- Egress bandwidth (reads)
- CDN offload potential

### 5. Memory Estimation (Cache)
- What percentage of data is hot (80/20 rule)
- How much RAM needed to cache hot data
- Cache hit rate target and its impact on DB load

### 6. Summary Table
A markdown table of all final estimates:
| Metric | Estimate | Notes |
Show: QPS (avg), QPS (peak), Storage/year, Bandwidth (egress), Cache RAM needed

### 7. What These Numbers Mean for Architecture
Translate each estimate into an architectural implication. "50k QPS peak means we need at minimum N servers assuming M RPS per server."

**Frontmatter:**
```
---
id: $SLUG-estimation
title: Capacity Estimation
sidebar_label: Estimation
sidebar_position: 2
---
```

Same MDX safety rules. No `<AsciiDiagram>` needed here — this is math-heavy.

---

## Page 4 — 03-high-level-design.mdx "The Blueprint"

**Target length:** 600–800 lines of MDX.

**Purpose:** Design the system top-down. Start with the simplest thing that could work, then evolve it. Every component must be justified — not just listed.

**Mandatory structure:**

### 1. Starting Point — The Naive Design
The simplest possible system that satisfies functional requirements. Ignore scale for now.
`<AsciiDiagram>` showing the naive design. Explain what each component does and why it's there.

### 2. Identifying the Bottlenecks
What breaks first in the naive design as load increases? Walk through each failure point:
- What component fails
- At what scale it fails
- What the symptoms are (latency spike, error rate, OOM)
`<AsciiDiagram>` showing the failure point highlighted.

### 3. Evolved Design — Handling Scale
The production-ready version. One large `<AsciiDiagram>` showing the full system — this is the main diagram of the entire case study. Every component labeled with:
- Its role
- The technology choice (e.g. "Redis — session cache")
- The protocol connecting it to neighbors

### 4. Component Walkthrough
For each component in the evolved design:
- What it does
- Why this specific technology was chosen over alternatives
- How it connects to other components
- What happens if it goes down

### 5. Data Flow — Read Path
Numbered step-by-step walkthrough of a read request through the system. Every hop. Every decision. `<AsciiDiagram>` showing the read path highlighted.

### 6. Data Flow — Write Path
Numbered step-by-step walkthrough of a write request. `<AsciiDiagram>` showing the write path highlighted.

**Frontmatter:**
```
---
id: $SLUG-high-level-design
title: High-Level Design
sidebar_label: High-Level Design
sidebar_position: 3
---
```

Same MDX safety rules. Minimum 5 `<AsciiDiagram>` blocks.

---

## Page 5 — 04-deep-dive.mdx "Under the Hood"

**Target length:** 700–1000 lines of MDX.

**Purpose:** Pick the 3–4 most interesting/difficult components and go deep. This is where senior candidates differentiate themselves.

**Mandatory structure:**

### Pick the 3–4 hardest problems in this system and deep-dive each one.

For each deep-dive component:

#### Component Name

**The Problem:** What specifically is hard about this component in this system?

**Option A:** First approach. `<AsciiDiagram>`. How it works. Pros. Cons. When it breaks.

**Option B:** Second approach. `<AsciiDiagram>`. How it works. Pros. Cons. When it breaks.

**Option C (if applicable):** Third approach.

**Decision:** Which option is chosen and why, given the specific requirements of this system. Reference the non-functional requirements from page 1.

**Implementation Detail:** Concrete specifics — data structures used, algorithm chosen, configuration values, schema design. Not abstract — precise.

Each deep-dive must include at minimum 2 `<AsciiDiagram>` blocks.

**Frontmatter:**
```
---
id: $SLUG-deep-dive
title: Deep Dive
sidebar_label: Deep Dive
sidebar_position: 4
---
```

Same MDX safety rules. Minimum 6 `<AsciiDiagram>` blocks total.

---

## Page 6 — 05-tradeoffs.mdx "The Decisions"

**Target length:** 400–600 lines of MDX.

**Purpose:** Surface every major architectural decision made in this design and justify it explicitly. A senior candidate volunteers these — the interviewer doesn't have to ask.

**Mandatory structure:**

### 1. Decision Log
A structured log of every significant architectural decision. Format for each:
- **Decision:** What was decided
- **Alternatives considered:** What else was on the table
- **Rationale:** Why this decision was made (reference specific requirements)
- **Trade-off accepted:** What was given up
- **Revisit trigger:** Under what conditions would you reconsider this decision?

Minimum 8 decisions.

### 2. Consistency vs Availability
For this specific system: where does it sit on the CAP spectrum? What is the user-visible impact of choosing availability over consistency (or vice versa)? `<AsciiDiagram>` showing a concrete conflict scenario and how the system resolves it.

### 3. Failure Scenarios
Minimum 4 failure scenarios specific to this system:
- Component fails
- What cascades
- `<AsciiDiagram>` showing the blast radius
- Recovery path and estimated time to recover

### 4. Scaling Limits
At what point does this design break? What is the next architectural evolution needed? `<AsciiDiagram>` showing what the next-generation architecture looks like.

**Frontmatter:**
```
---
id: $SLUG-tradeoffs
title: Trade-offs & Decisions
sidebar_label: Trade-offs
sidebar_position: 5
---
```

Same MDX safety rules. Minimum 3 `<AsciiDiagram>` blocks.

---

## Page 7 — 06-evolution.mdx "How It Evolves"

**Target length:** 400–500 lines of MDX.

**Purpose:** Show how the system design changes as requirements evolve. Real systems are never designed once — they evolve. This page teaches evolutionary thinking.

**Mandatory structure:**

### 1. Phase 1 — MVP (0 to 100k users)
Architecture at this scale. `<AsciiDiagram>`. What corners are cut deliberately. Cost estimate.

### 2. Phase 2 — Growth (100k to 10M users)
What changes and why. `<AsciiDiagram>`. What is added, what is replaced, what is dropped.

### 3. Phase 3 — Scale (10M to 100M+ users)
What changes at this scale. `<AsciiDiagram>`. What requires a fundamental rethink vs incremental improvement.

### 4. Feature Extensions
3 common feature requests that would change the architecture:
- Feature name
- What it requires architecturally
- What it breaks in the current design
- How you'd add it

### 5. Cost Optimization
At Phase 3 scale, what are the top 3 cost optimization strategies? Concrete — AWS/GCP service names, configuration changes, architectural patterns.

**Frontmatter:**
```
---
id: $SLUG-evolution
title: System Evolution
sidebar_label: Evolution
sidebar_position: 6
---
```

Same MDX safety rules. Minimum 3 `<AsciiDiagram>` blocks.

---

## Page 8 — 07-interview-simulation.mdx "The Full Interview"

**Target length:** 500–700 lines of MDX.

**Purpose:** Simulate the actual 45-minute interview from start to finish. The student reads this as a worked example of how a strong candidate handles this specific question.

**Mandatory structure:**

### 1. Interview Setup
- Level: L5/L6 (adjust per section — beginner case studies target L4/L5, advanced target L6/L7)
- Time: 45 minutes
- Interviewer persona: brief description

### 2. The Full Transcript
Write the complete interview as a dialogue. Format:
**Interviewer:** [question]
**Strong Candidate:** [answer]

Cover all phases:
- Requirements gathering (5 min)
- Estimation (5 min)
- High-level design (15 min)
- Deep dive (15 min)
- Trade-offs and wrap-up (5 min)

The candidate's answers should model exactly what a strong answer looks like — not perfect, but structured, proactive, and showing trade-off thinking.

### 3. Interviewer Debrief
After the transcript: what did the candidate do well? What would have made it a 4/4 instead of 3/4?

### 4. Common Mistakes on This Question
Minimum 6 mistakes candidates make specifically on this system design question. Each: what they do, why it signals a gap, what to do instead.

### 5. Scoring Rubric
How interviewers score this question at each level:
- What a 1/4 answer looks like
- What a 2/4 answer looks like
- What a 3/4 answer looks like
- What a 4/4 answer looks like

**Frontmatter:**
```
---
id: $SLUG-interview-simulation
title: Interview Simulation
sidebar_label: Interview Simulation
sidebar_position: 7
---
```

Same MDX safety rules. No `<AsciiDiagram>` needed.

---

## Sidebar entry

Determine the correct sidebar file based on SECTION:
- "Beginner Case Studies" → `sidebars/system-design-beginner-cases.json`
- "Intermediate Case Studies" → `sidebars/system-design-intermediate-cases.json`
- "Advanced Case Studies" → `sidebars/system-design-advanced-cases.json`
- "AI Case Studies" → `sidebars/system-design-ai-cases.json`

Append:
```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "system-design/$SLUG/$SLUG-requirements",
    "system-design/$SLUG/$SLUG-estimation",
    "system-design/$SLUG/$SLUG-high-level-design",
    "system-design/$SLUG/$SLUG-deep-dive",
    "system-design/$SLUG/$SLUG-tradeoffs",
    "system-design/$SLUG/$SLUG-evolution",
    "system-design/$SLUG/$SLUG-interview-simulation"
  ]
}
```

---

## Diagram quality standard

Same as add-system-design-course.md:
- Box conventions: `[ ]` services, `(( ))` databases, `< >` queues, `{ }` caches
- Every arrow annotated with what flows and direction
- Every box labeled with role + technology where applicable
- Title must describe what the diagram shows specifically

---

## Content quality gates

- [ ] Requirements page includes actual dialogue, not just a list
- [ ] Every estimation shows the arithmetic, not just the result
- [ ] Main architecture diagram labels technology choices, not just component types
- [ ] Deep dive covers at least 3 competing approaches per component
- [ ] Decision log has minimum 8 entries
- [ ] Interview transcript covers all 5 phases with realistic timing
- [ ] No page is under 400 lines
- [ ] No admonition blocks anywhere
- [ ] No bare `<` before digits anywhere

---

## Final output

Print this summary table:

| File | Lines | Diagrams | Quality Gate | Status |
|------|-------|----------|--------------|--------|
| 01-requirements.mdx | N | N | ✅/❌ | ✅ |
| 02-estimation.mdx | N | N | ✅/❌ | ✅ |
| 03-high-level-design.mdx | N | N | ✅/❌ | ✅ |
| 04-deep-dive.mdx | N | N | ✅/❌ | ✅ |
| 05-tradeoffs.mdx | N | N | ✅/❌ | ✅ |
| 06-evolution.mdx | N | N | ✅/❌ | ✅ |
| 07-interview-simulation.mdx | N | N | ✅/❌ | ✅ |

Then confirm `npm start` compiles clean.