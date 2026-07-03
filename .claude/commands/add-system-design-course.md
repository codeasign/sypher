# /add-system-design-course

Generate a complete, FAANG-level System Design Fundamentals topic for the Sypher platform.

**Intent:** A complete beginner must be able to read this topic end-to-end and walk into a FAANG system design interview with enough depth, vocabulary, intuition, and pattern recognition to pass. This is not a summary. This is a textbook chapter.

## Usage

```
/add-system-design-course TOPIC="Load Balancing" SLUG="load-balancing" SECTION="Scalability"
```

## Arguments

- `TOPIC` — Display name (e.g. "Load Balancing")
- `SLUG` — URL-safe kebab-case (e.g. "load-balancing")
- `SECTION` — Parent section name (e.g. "Scalability", "Storage", "Networking", "Reliability", "Foundations")

---

## Files to generate

```
docs/system-design-fundamentals/$SLUG/
├── index.md
├── 01-concepts.mdx
├── 02-deep-dive.mdx
├── 03-architecture.mdx
├── 04-tradeoffs.mdx
├── 05-real-world.mdx
├── 06-interview.mdx
└── 07-challenge.mdx
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

## Page 2 — 01-concepts.mdx "Build the Mental Model"

**Target length:** 600–900 lines of MDX.

**Purpose:** Take a complete beginner from zero to genuine intuition. By the end they can explain this concept to someone else. This is the foundation everything else builds on.

**Mandatory structure:**

### 1. The Problem Story (no heading — open cold)
Write a 3–4 paragraph narrative. Tell a real story. A startup goes from 100 users to 1 million. A bank's payment system falls over on Black Friday. An engineer gets paged at 3am. Make the reader feel the pain of NOT having this concept. Do not mention the concept name yet. Build suspense.

### 2. The Insight
One paragraph. Name the concept. Explain it in one plain sentence a 12-year-old could understand. Follow with the real-world analogy — not a tech analogy. Use: traffic lights, post offices, libraries, restaurants, factories, airports. The analogy must map precisely to the technical concept.

### 3. Core Vocabulary
Define every term the student will encounter. Format: term in bold, plain-language definition, then one sentence on why it matters. Minimum 8 terms. No jargon in the definitions.

### 4. The Big Picture Diagram
One large `<AsciiDiagram>` showing the concept at the highest level — the 10,000 foot view. Must be wide enough to show all major components and their relationships. Every box must be labeled. Every arrow must be annotated with what flows along it.

### 5. How It Actually Works — Step by Step
Walk through the concept as a numbered sequence. Minimum 8 steps. Each step:
- What happens
- Which component does it
- Why this step exists (what goes wrong if you skip it)
- One `<AsciiDiagram>` showing the state of the system at this step (not all steps need one — minimum 4 diagrams across this section)

### 6. Variants and Flavors
Most concepts have multiple implementations. Cover at least 3 variants. For each:
- What makes this variant different
- `<AsciiDiagram>` showing the variant's architecture
- When to use it
- When NOT to use it

### 7. Mental Model Check
5 short questions the student can answer in their head to confirm they understood. Not trick questions — genuine comprehension checks. Provide the answers immediately below each question.

**Frontmatter:**
```
---
id: $SLUG-concepts
title: Understanding $TOPIC
sidebar_label: Mental Model
sidebar_position: 1
---
```

**MDX Safety Rules — MANDATORY:**
- Import AsciiDiagram at top: `import AsciiDiagram from '@site/src/components/AsciiDiagram';`
- Every `<AsciiDiagram>` must have a `title` prop
- No bare `<` before digits — write "under 100ms" not `<100ms`
- No bare `{` or `}` in prose — escape as `\{` `\}` if needed
- No `:::info` `:::note` `:::tip` `:::warning` admonitions — write prose instead
- No "reader", "user", "learner" — address as "you"
- No openers like "In this article" or "In this lesson"
- No Chinese characters, no DSML `｜` artifacts
- No filler: "In today's world", "It is worth noting", "In conclusion"
- Numbers must be concrete: "50,000 requests/second" not "many requests"

---

## Page 3 — 02-deep-dive.mdx "Under the Hood"

**Target length:** 700–1000 lines of MDX.

**Purpose:** This is the engineering depth page. After this page the student understands HOW it works internally, not just WHAT it does. This is what separates candidates who pass FAANG interviews from those who don't.

**Mandatory structure:**

### 1. Internal Architecture
A large `<AsciiDiagram>` showing every internal component of the system — not just the black box, but what's inside. Label every subcomponent.

### 2. Data Structures and Algorithms
What data structures power this? Hash tables? Trees? Rings? Queues? For each:
- What structure is used
- Why this structure (what would break if you used something else)
- Time and space complexity
- `<AsciiDiagram>` showing the structure and how data moves through it

### 3. The Request/Write/Read Lifecycle
Walk through exactly what happens when a request hits the system. Every hop. Every decision. Every transformation. Minimum 10 steps. Format as numbered steps with a running `<AsciiDiagram>` that evolves as the request progresses (show the system state at each key moment).

### 4. Consistency and State
How does this component handle state? What happens when:
- A node crashes mid-operation
- The network partitions
- Two writes happen simultaneously
- A read returns stale data
Each scenario: describe what happens, `<AsciiDiagram>` showing the problem, explain the resolution strategy.

### 5. Performance Characteristics
Concrete numbers. Latency at p50, p99, p999. Throughput limits. Memory footprint. CPU cost. These should reflect real-world numbers from public engineering blogs (Cloudflare, Uber, Netflix, Discord, Dropbox). If exact numbers don't apply, explain what factors determine the numbers.

### 6. Configuration and Tuning
What are the knobs? What does each one do? What are the safe defaults vs aggressive settings? Present as a structured breakdown — setting name, what it controls, safe default, when to change it, what breaks if you set it wrong.

**Frontmatter:**
```
---
id: $SLUG-deep-dive
title: $TOPIC — Under the Hood
sidebar_label: Deep Dive
sidebar_position: 2
---
```

Same MDX safety rules. Minimum 6 `<AsciiDiagram>` blocks on this page.

---

## Page 4 — 03-architecture.mdx "Building It at Scale"

**Target length:** 700–900 lines of MDX.

**Purpose:** Show how this component fits into a real production system — not in isolation. This is where the student learns to design WITH this component, not just understand it.

**Mandatory structure:**

### 1. Naive Implementation
Start with the simplest possible implementation. Show it in an `<AsciiDiagram>`. Explain exactly what breaks as you scale:
- At 1,000 users
- At 100,000 users
- At 10,000,000 users
Each scale point: what fails, why, and what the symptoms look like in production (error rates, latency spikes, cascading failures).

### 2. Production-Grade Architecture
The full architecture that handles real scale. One large `<AsciiDiagram>` showing every component — this should be the most detailed diagram in the entire topic. Label everything: component names, data flows, protocols, ports where relevant.

### 3. Integration Patterns
How does this component connect to the rest of the system? Cover at least 4 integration scenarios:
- Integrating with a relational database
- Integrating with a cache layer
- Integrating with a message queue
- Integrating with external APIs or CDNs
For each: `<AsciiDiagram>` + what to watch out for.

### 4. Multi-Region and Global Scale
What changes when you deploy this across multiple datacenters or regions? `<AsciiDiagram>` showing the global topology. Cover: data replication, latency, consistency trade-offs, failover behavior.

### 5. Capacity Planning
How do you size this? Walk through the math:
- Estimate QPS from user count
- Calculate storage requirements
- Determine network bandwidth
- Size the compute
Show the actual calculation steps. Use a realistic example (e.g. "Design for 10M daily active users").

### 6. Deployment and Operations
How do you run this in production?
- How do you deploy with zero downtime
- How do you monitor it (what metrics matter, what alerts to set)
- How do you debug it when something goes wrong
- How do you upgrade it without causing an outage

**Frontmatter:**
```
---
id: $SLUG-architecture
title: $TOPIC at Scale
sidebar_label: Architecture
sidebar_position: 3
---
```

Same MDX safety rules. Minimum 5 `<AsciiDiagram>` blocks.

---

## Page 5 — 04-tradeoffs.mdx "The Hard Choices"

**Target length:** 500–700 lines of MDX.

**Purpose:** Senior and staff engineers think in trade-offs. This page teaches that thinking. Every design decision has a cost — this page makes those costs visible.

**Mandatory structure:**

### 1. The Core Tension
Open with the fundamental trade-off this concept forces you to make. Not multiple trade-offs — the ONE central tension. Write it as a clear statement: "When you choose X, you are explicitly trading Y for Z."

### 2. Decision Matrix
A comprehensive markdown table:
| Decision Point | Option A | Option B | Choose A when | Choose B when |
Cover minimum 6 decision points.

### 3. CAP Theorem Positioning
Where does this component sit in the CAP triangle? Is it CP or AP? What does that mean in practice? What does the system do when the network partitions? `<AsciiDiagram>` showing the partition scenario and what the system does.

### 4. Failure Modes
Minimum 5 failure scenarios. For each:
- **What happens:** Describe the failure precisely
- **Why it happens:** Root cause
- **Blast radius:** What else does it take down
- `<AsciiDiagram>` showing the failure propagation
- **Detection:** How do you know it's happening (symptoms, metrics, alerts)
- **Recovery:** Exact steps to recover

### 5. Anti-Patterns Hall of Shame
Minimum 5 anti-patterns. Teams get these wrong constantly. For each:
- The mistake (what they built)
- Why it seemed reasonable at the time
- What went wrong in production
- The correct pattern

### 6. When NOT to Use This
This section exists because over-engineering is real. Give concrete signals that this component is the wrong choice. What simpler solution would work better? At what scale does this become necessary vs overkill?

**Frontmatter:**
```
---
id: $SLUG-tradeoffs
title: $TOPIC — Trade-offs & Failure Modes
sidebar_label: Trade-offs
sidebar_position: 4
---
```

Same MDX safety rules. Minimum 4 `<AsciiDiagram>` blocks.

---

## Page 6 — 05-real-world.mdx "How Companies Use It"

**Target length:** 500–700 lines of MDX.

**Purpose:** Ground everything in reality. Students learn best from concrete examples. This page also gives them vocabulary and examples to use in interviews ("At Netflix, they solved this by...").

**Mandatory structure:**

### 1. Company Case Studies
Minimum 4 company case studies from real engineering blogs (Netflix, Uber, Discord, Cloudflare, Dropbox, Amazon, Google, LinkedIn, Slack, Twitter/X, DoorDash, Airbnb, Stripe). For each:
- The scale they were operating at
- The specific problem they faced with this component
- What they built or changed
- The result (numbers where available)
- `<AsciiDiagram>` showing their architecture

All information must reflect publicly known engineering decisions from blog posts and conference talks. Do not fabricate specifics.

### 2. Open Source Implementations
What open source systems implement this concept? (e.g. Nginx, HAProxy, Redis, Kafka, Zookeeper, etcd, Cassandra). For each:
- What it is
- How it implements the concept
- Its specific trade-offs vs alternatives
- When engineers choose it

### 3. Cloud Provider Implementations
Cover AWS, GCP, and Azure equivalents:
- What managed service provides this
- How it differs from self-hosted
- Cost/operational trade-offs
- Vendor lock-in considerations

### 4. Lessons Learned
Pull out the 5 most important lessons from the case studies. What patterns appear across companies? What mistakes do they all make first?

**Frontmatter:**
```
---
id: $SLUG-real-world
title: $TOPIC in Production
sidebar_label: Real World
sidebar_position: 5
---
```

Same MDX safety rules. Minimum 4 `<AsciiDiagram>` blocks.

---

## Page 7 — 06-interview.mdx "Ace the Interview"

**Target length:** 600–800 lines of MDX.

**Purpose:** This page is the bridge between understanding and performing. A student who has read pages 1–5 has the knowledge. This page teaches them to SHOW that knowledge under interview pressure.

**Mandatory structure:**

### 1. How This Topic Appears
What forms does this question take at FAANG? List 8–10 actual question phrasings. Categorize them:
- Direct questions ("How does X work?")
- Design questions ("Design a system that uses X")
- Debugging questions ("Our X is showing high latency — walk me through debugging")
- Trade-off questions ("Why would you choose X over Y?")

### 2. What the Interviewer Is Actually Testing
For each question type above, what is the interviewer really evaluating? Not just "knowledge" — what specific signal are they looking for? What distinguishes a 3/4 from a 4/4 answer?

### 3. Level-by-Level Expectations

#### L3/L4 — Junior/New Grad
- Minimum expected knowledge
- Vocabulary they must know
- Concepts they should explain clearly
- What a passing answer looks like (write a sample answer)

#### L5 — Mid-level
- Expected depth of understanding
- Trade-off awareness required
- Example question + model answer at this level

#### L6 — Senior
- Expected to drive the conversation proactively
- Must raise concerns the interviewer didn't ask about
- Must quantify — numbers, estimates, capacity
- Example question + model answer at this level

#### L7/L8 — Staff/Principal
- Expected to discuss org-level impact
- Must connect this to business outcomes
- Must address operational complexity and team ownership
- Example question + model answer at this level

### 4. The FAANG Framework for Answering
A step-by-step framework for answering system design questions involving this concept:
1. Clarify requirements (what to ask, what not to ask)
2. Estimate scale (how to do back-of-envelope for this component)
3. High-level design (what to draw first)
4. Deep dive (what to expand on)
5. Trade-offs (what to volunteer even if not asked)
6. Wrap up (how to close confidently)

### 5. Phrase Bank
Exact phrases that signal expertise. Copy-pasteable vocabulary. Things like:
- "The trade-off here is between X and Y, and at this scale I'd optimize for..."
- "One thing interviewers often want to see is whether you account for..."
- "The failure mode I'd watch for here is..."
Minimum 15 phrases with context on when to use each.

### 6. Red Flags
What do candidates say/do that immediately loses points? Minimum 8 specific red flags with explanations of why each one signals a gap.

### 7. Practice Drills
5 timed prompts the student can practice with:
- 2-minute explain drill: "Explain X as if I've never heard of it"
- 5-minute design drill: "Given this scenario, where does X fit?"
- 10-minute deep dive: Full system design using X

**Frontmatter:**
```
---
id: $SLUG-interview
title: $TOPIC — Interview Playbook
sidebar_label: Interview
sidebar_position: 6
---
```

Same MDX safety rules. No `<AsciiDiagram>` blocks needed — this is text-heavy by design.

---

## Page 8 — 07-challenge.mdx "Prove It"

**Target length:** 400–600 lines of MDX.

**Purpose:** Active recall under realistic conditions. These challenges simulate interview conditions, not textbook exercises.

**Mandatory structure:**

### Tier 1 — Foundation (3 challenges)
Concept verification. Can the student explain the idea precisely?
- Format: Written explanation prompt
- Time limit: 5 minutes each
- Evaluation criteria: What must the answer include to be correct?
- Common mistakes: What do people get wrong on this?
- Model answer: Full correct answer they can compare against

### Tier 2 — Design (3 challenges)
Scenario-based design. Given constraints, design with this component.
- Format: Mini system design prompt with specific scale requirements
- Time limit: 15 minutes each
- Must include: scale estimates, component diagram description, key decisions
- Evaluation rubric: What does a strong answer cover? What does a weak answer miss?
- Model answer: Walk through a strong answer in detail

### Tier 3 — Expert (2 challenges)
Ambiguous, open-ended, no single right answer. Staff-level thinking required.
- Format: Complex multi-constraint scenario
- Time limit: 30 minutes each
- The challenge must require the student to make trade-offs with no clear winner
- Evaluation: List the dimensions a strong answer explores
- Anti-patterns: What weak answers look like
- Discussion: Multiple valid approaches with their respective trade-offs

**Frontmatter:**
```
---
id: $SLUG-challenge
title: $TOPIC — Challenges
sidebar_label: Challenges
sidebar_position: 7
---
```

Same MDX safety rules. No `<AsciiDiagram>` — students must draw their own.

---

## Sidebar entry

Append to `sidebars/system-design-fundamentals.json`:

```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "system-design-fundamentals/$SLUG/$SLUG-concepts",
    "system-design-fundamentals/$SLUG/$SLUG-deep-dive",
    "system-design-fundamentals/$SLUG/$SLUG-architecture",
    "system-design-fundamentals/$SLUG/$SLUG-tradeoffs",
    "system-design-fundamentals/$SLUG/$SLUG-real-world",
    "system-design-fundamentals/$SLUG/$SLUG-interview",
    "system-design-fundamentals/$SLUG/$SLUG-challenge"
  ]
}
```

If `sidebars/system-design-fundamentals.json` does not exist, create it:

```json
{
  "systemDesignFundamentalsSidebar": [
    {
      "type": "category",
      "label": "System Design Fundamentals",
      "collapsible": false,
      "items": []
    }
  ]
}
```

---

## docusaurus.config.js

If not already present, add to navbar:

```js
{ to: '/docs/system-design-fundamentals', label: 'System Design', position: 'left' }
```

---

## Diagram quality standard

Every `<AsciiDiagram>` must meet this bar:

- Title must describe what the diagram shows, not the concept name
- Minimum width: 40 characters of content
- Every box labeled with its role, not just its name
- Every arrow annotated (what flows, in what direction, what protocol)
- Add a legend if more than 5 component types appear
- Use consistent box styles: `[ ]` for services, `(( ))` for databases, `< >` for queues, `{ }` for caches

Example of a high-quality diagram:

```jsx
<AsciiDiagram title="Round-Robin Load Balancer — Request Distribution">
{`
  Clients
  ──────
  [C1] [C2] [C3] [C4]          (concurrent users)
     \   \   /   /
      \   \ /   /
       v   v   v
  ┌─────────────────────┐
  │    Load Balancer     │      [health-checks every 5s]
  │  algo: round-robin   │
  └──┬────┬────┬────┬───┘
     │    │    │    │           (distributes evenly)
     v    v    v    v
   [S1] [S2] [S3] [S4]         (backend servers)
     \    \    /    /
      \    \  /    /
       v    vv    v
    ((Primary DB))             (shared data layer)
`}
</AsciiDiagram>
```

---

## Content quality gates

Before finishing, verify every page against these gates:

- [ ] No page is a list of facts — every page tells a story with cause and effect
- [ ] Every concept is introduced before it is used
- [ ] Every `<AsciiDiagram>` has a `title` prop and clean box-drawing
- [ ] No bare `<` before digits anywhere in prose
- [ ] No admonition blocks (`:::`) anywhere
- [ ] Numbers are always concrete and realistic
- [ ] Each page ends with a one-sentence bridge to the next page (except challenge.mdx)
- [ ] The challenge page has model answers — not just questions
- [ ] The interview page has actual sample answers, not just advice

---

## Final output

Print this summary table after all files are written:

| File | Lines | Diagrams | Quality Gate | Status |
|------|-------|----------|--------------|--------|
| 01-concepts.mdx | N | N | ✅/❌ | ✅ |
| 02-deep-dive.mdx | N | N | ✅/❌ | ✅ |
| 03-architecture.mdx | N | N | ✅/❌ | ✅ |
| 04-tradeoffs.mdx | N | N | ✅/❌ | ✅ |
| 05-real-world.mdx | N | N | ✅/❌ | ✅ |
| 06-interview.mdx | N | N | ✅/❌ | ✅ |
| 07-challenge.mdx | N | N | ✅/❌ | ✅ |

Then run the pre-flight validation:

1. Build with `npm run start` and watch for MDX compilation errors in the terminal output.
2. If any file fails, diagnose by the exact error (`ruleId`, file, line, column) from the build output.
3. **Common MDX errors and their fixes:**

   | Error pattern | Root cause | Fix |
   |---|---|---|
   | `Expected a closing tag for <word>` — any `<placeholder>` in prose | MDX treats `<word>` as a JSX component. Happens with placeholders, type params like `List<String>`, math comparisons | Wrap in backticks: `` `<placeholder>` ``. Or use `&lt;` and `&gt;`. |
   | `Expected a closing tag for <details>` / `end-tag-mismatch` | A `<details>` block is missing its `</details>` closing tag | Count every `<details>` and verify a matching `</details>` exists for each. |
   | `Expected a closing tag for <summary>` | A `<summary>` tag inside a `<details>` is missing `</summary>` | Add `</summary>` before the content after the summary line. |
   | Bare `{` / `}` in prose (acorn parse error) | JSON, GraphQL, or code with `{}` outside fenced code blocks | Wrap in a fenced code block with the appropriate language tag. |
   | **AsciiDiagram renders as blank/empty box** (no build error) | AsciiDiagram uses `>` `{` `` ` `` (children pattern) instead of `content={` `` ` `` (content prop) | Replace `>` before `{` `` ` `` with `content=`. Replace `</AsciiDiagram>` with `/>`. Run `grep -rn '</AsciiDiagram>' docs/` after generation. |

4. Apply the matching fix and re-run the build. Repeat up to 3 times per file; flag anything still failing as `NEEDS MANUAL REVIEW`.
5. Do not print the final summary table until every file builds clean or is explicitly flagged.