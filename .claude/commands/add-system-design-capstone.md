# /add-system-design-capstone

Generate the System Design Capstone for the Sypher platform.

**Intent:** The capstone is the final test. The student has completed all sections. Now they design a production-ready cloud platform from scratch, making every decision themselves, justified against real constraints. This is not guided — it is assessed. The output is a portfolio artifact they can show in interviews.

## Usage

```
/add-system-design-capstone
```

No arguments — there is only one capstone.

---

## Files to generate

```
docs/system-design/capstone/
├── index.md
├── 01-brief.mdx
├── 02-architecture-overview.mdx
├── 03-auth-and-users.mdx
├── 04-file-storage.mdx
├── 05-notifications.mdx
├── 06-search.mdx
├── 07-chat.mdx
├── 08-payments.mdx
├── 09-recommendations.mdx
├── 10-analytics.mdx
├── 11-ai-assistant.mdx
├── 12-observability.mdx
├── 13-kubernetes.mdx
├── 14-cicd.mdx
├── 15-multi-region.mdx
├── 16-disaster-recovery.mdx
├── 17-ha-and-cost.mdx
└── 18-review.mdx
```

---

## Page 1 — index.md

```md
---
id: capstone
title: Capstone — Production Cloud Platform
sidebar_label: Capstone
---

import DocCardList from '@theme/DocCardList';

# Capstone: Design a Production Cloud Platform

You have reached the capstone. Everything you have learned across this course comes together here.

You are the founding engineer at a Series A startup. The CTO has handed you a napkin sketch and said: build this so it can scale to 10 million users.

Work through each section in order. Every decision is yours to make and justify.

<DocCardList />
```

---

## Page 2 — 01-brief.mdx "The Mission"

**Target length:** 300–400 lines.

**Purpose:** Set the full brief. What are you building? What are the constraints? What does success look like?

**Structure:**

### The Product
A platform that includes: authentication, user management, file storage, notifications, search, chat, payments, recommendations, analytics, and an AI assistant. Write a product brief as if the CTO handed it to you. Make it feel real — give the startup a name, a market, a business model.

### The Constraints
- Budget: $50,000/month infrastructure cap at 10M users
- Launch: MVP in 3 months
- Compliance: GDPR, SOC2
- Availability: 99.9% minimum, 99.99% for payments
- Latency: p99 under 200ms for all user-facing reads

### Scale Targets
- MVP: 10,000 users
- Year 1: 1,000,000 users
- Year 3: 10,000,000 users

### What You Will Build Across This Capstone
Overview of all 15 subsystems with one-sentence description of each.

### How to Use This Capstone
Instructions: read the brief for each subsystem, attempt your own design before reading the provided design, compare and note gaps.

**Frontmatter:**
```
---
id: capstone-brief
title: The Brief
sidebar_label: Brief
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
- No Chinese characters, no DSML `｜` artifacts
- Numbers must be concrete

---

## Page 3 — 02-architecture-overview.mdx "The Master Plan"

**Target length:** 500–700 lines.

**Purpose:** Before diving into subsystems, establish the full platform architecture. This is the map every other page refers back to.

**Structure:**

### 1. The Full Platform Diagram
One very large `<AsciiDiagram>` showing all 15 subsystems and how they connect. This is the most important diagram in the entire course. Every subsystem labeled. Every major data flow shown. External dependencies (payment provider, email provider, CDN) shown at the boundary.

### 2. Technology Stack Decisions
Master table of every technology choice:
| Layer | Technology | Rationale |
Cover: API gateway, primary database, cache, search engine, message broker, object storage, CDN, container orchestration, observability stack, AI inference.

### 3. Cross-Cutting Concerns
Decisions that apply to every subsystem:
- Service communication: REST vs gRPC vs events (and when to use each)
- Authentication propagation: how auth context flows between services
- Logging standard: structured log format used everywhere
- Error handling standard: how errors propagate and are reported
- Configuration management: how secrets and config reach services

### 4. Data Ownership Map
Which service owns which data? `<AsciiDiagram>` showing data ownership boundaries. Explicit rule: no service reads another service's database directly.

### 5. MVP vs Full Architecture
`<AsciiDiagram>` showing the MVP architecture (what you actually launch with) vs the full architecture. Be explicit about what is cut for MVP and what the upgrade path is.

**Frontmatter:**
```
---
id: capstone-architecture-overview
title: Architecture Overview
sidebar_label: Architecture Overview
sidebar_position: 2
---
```

Same MDX safety rules. Minimum 4 `<AsciiDiagram>` blocks.

---

## Pages 4–17 — Subsystem Pages

For each of the 15 subsystems below, generate a dedicated page following this structure.

**Target length per page:** 500–700 lines.

**Standard structure for every subsystem page:**

### 1. Your Challenge (Before You Read)
A 2-paragraph brief: what this subsystem must do, what the key constraints are, what makes it hard. Encourage the student to sketch their design before reading on.

### 2. Requirements for This Subsystem
Functional and non-functional requirements specific to this subsystem. Reference the global constraints from the brief (latency, budget, availability targets).

### 3. The Design
Full design for this subsystem.
- Main `<AsciiDiagram>` showing the subsystem architecture with all components
- Data model: key entities, fields, storage choice, why
- API surface: key endpoints or events this subsystem exposes
- Read path: step-by-step with `<AsciiDiagram>`
- Write path: step-by-step with `<AsciiDiagram>`

### 4. Key Decisions
3–5 decisions specific to this subsystem. For each: what was decided, what was rejected, why.

### 5. Integration Points
How does this subsystem connect to others in the platform? What events does it emit? What events does it consume? What APIs does it call?

### 6. Failure Modes
2–3 failure scenarios specific to this subsystem. Each: what breaks, blast radius, recovery.

### 7. At Scale
What changes about this subsystem at 10M users vs 10k users? One `<AsciiDiagram>` showing the scaled-up version.

---

**The 15 subsystem pages to generate:**

#### 03-auth-and-users.mdx
- Auth strategy: JWT + refresh tokens + OAuth2
- User service ownership
- Session management at scale
- Social login integration
- MFA implementation
- Password reset flow security

#### 04-file-storage.mdx
- Direct-to-S3 upload pattern with presigned URLs
- Chunked upload for large files
- Virus scanning pipeline
- CDN integration for delivery
- Quota enforcement
- Thumbnail generation pipeline

#### 05-notifications.mdx
- Multi-channel: push, email, SMS, in-app
- Notification fanout for high-follower accounts
- Deduplication
- Preference management
- Delivery guarantees
- Retry and dead letter handling

#### 06-search.mdx
- Full-text search with Elasticsearch or OpenSearch
- Search indexing pipeline from primary DB
- Autocomplete
- Relevance tuning
- Search-as-you-type latency requirements
- Index design for the platform's primary entity type

#### 07-chat.mdx
- WebSocket connection management at scale
- Message storage and retrieval
- Online presence
- Message delivery guarantees
- Group chat fanout
- Chat history pagination

#### 08-payments.mdx
- Stripe integration pattern
- Idempotency keys
- Webhook handling
- Refund flow
- Subscription management
- PCI compliance implications
- Double-charge prevention

#### 09-recommendations.mdx
- Collaborative filtering vs content-based vs hybrid
- Feature store design
- Model serving latency requirements
- Cold start problem
- A/B testing recommendations
- Feedback loop

#### 10-analytics.mdx
- Event collection pipeline
- Lambda architecture vs Kappa
- Real-time vs batch trade-off
- Data warehouse choice
- Dashboard latency requirements
- Data retention and cost

#### 11-ai-assistant.mdx
- LLM selection and routing
- RAG architecture for platform-specific knowledge
- Conversation history management
- Streaming responses via SSE
- Cost per query optimization
- Prompt injection defense
- Rate limiting per user

#### 12-observability.mdx
- Logging: structured logs, aggregation, retention
- Metrics: what to instrument, cardinality limits
- Tracing: distributed trace propagation across services
- Alerting: SLO-based alerts, on-call routing
- Dashboards: what to show, to whom
- Error budgets: how to track and act on them

#### 13-kubernetes.mdx
- Cluster topology: node pools, taints, tolerations
- Resource requests and limits
- HPA and VPA configuration
- Pod disruption budgets
- Namespace strategy per environment
- Secrets management with Vault or Sealed Secrets
- Network policies

#### 14-cicd.mdx
- Pipeline stages: lint → test → build → scan → deploy
- Artifact management
- Environment promotion: dev → staging → production
- Feature flags
- Canary deployments
- Rollback strategy
- Secrets in CI

#### 15-multi-region.mdx
- Active-active vs active-passive
- Data replication strategy per service
- Global load balancing and latency routing
- Conflict resolution for concurrent writes
- Failover automation
- Cost of multi-region

#### 16-disaster-recovery.mdx
- RTO and RPO targets per subsystem
- Backup strategy: frequency, retention, testing
- Runbook structure
- Chaos engineering practice
- DR drill schedule
- Data corruption recovery

#### 17-ha-and-cost.mdx
- High availability patterns per subsystem
- Cost breakdown at 10M users by service
- Top 5 cost optimization strategies with estimated savings
- Reserved vs spot vs on-demand strategy
- Autoscaling to zero for non-critical services
- Budget alerts and guardrails

---

## Page 18 — 18-review.mdx "What You Built"

**Target length:** 300–400 lines.

**Purpose:** Help the student synthesize everything they built and recognize the gaps they should revisit.

**Structure:**

### 1. The Complete System
One final `<AsciiDiagram>` — the full platform with all 15 subsystems integrated. This is the "after" version of the architecture overview diagram.

### 2. What You Should Know Now
A checklist. For each subsystem: 3 things the student should be able to explain without notes.

### 3. Interview Readiness Assessment
Self-assessment: 10 questions. If you can answer all 10 without looking back, you are ready for a FAANG system design interview.

### 4. What to Build Next
3 extensions that would make this a real portfolio project:
- Pick one subsystem and implement it (not just design it)
- Add a subsystem not covered (e.g. video processing, marketplace, live streaming)
- Stress-test one part with load testing and document the results

### 5. Your Next Steps
Links to case studies (Sections 15–18) and the interview masterclass (Section 19) as logical next steps.

**Frontmatter:**
```
---
id: capstone-review
title: Review & What's Next
sidebar_label: Review
sidebar_position: 18
---
```

Same MDX safety rules.

---

## Sidebar entry

Create `sidebars/system-design-capstone.json`:

```json
{
  "systemDesignCapstoneSidebar": [
    {
      "type": "category",
      "label": "Capstone",
      "collapsible": false,
      "items": [
        "system-design/capstone/capstone-brief",
        "system-design/capstone/capstone-architecture-overview",
        "system-design/capstone/capstone-auth-and-users",
        "system-design/capstone/capstone-file-storage",
        "system-design/capstone/capstone-notifications",
        "system-design/capstone/capstone-search",
        "system-design/capstone/capstone-chat",
        "system-design/capstone/capstone-payments",
        "system-design/capstone/capstone-recommendations",
        "system-design/capstone/capstone-analytics",
        "system-design/capstone/capstone-ai-assistant",
        "system-design/capstone/capstone-observability",
        "system-design/capstone/capstone-kubernetes",
        "system-design/capstone/capstone-cicd",
        "system-design/capstone/capstone-multi-region",
        "system-design/capstone/capstone-disaster-recovery",
        "system-design/capstone/capstone-ha-and-cost",
        "system-design/capstone/capstone-review"
      ]
    }
  ]
}
```

---

## Content quality gates

- [ ] Every subsystem page has minimum 3 `<AsciiDiagram>` blocks
- [ ] Every subsystem page has a "Your Challenge" section before revealing the design
- [ ] Architecture overview has a diagram covering all 15 subsystems
- [ ] Every decision has an explicitly rejected alternative
- [ ] All numbers are concrete and consistent with the brief constraints
- [ ] No admonition blocks anywhere
- [ ] No bare `<` before digits anywhere
- [ ] Final review page has the complete integrated platform diagram

---

## Final output

Print this summary table:

| File | Lines | Diagrams | Status |
|------|-------|----------|--------|
| 01-brief.mdx | N | N | ✅ |
| 02-architecture-overview.mdx | N | N | ✅ |
| 03-auth-and-users.mdx | N | N | ✅ |
| ... (all 18 files) | | | |

Then confirm `npm start` compiles clean.