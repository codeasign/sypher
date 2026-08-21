---
description: Generate a page for the AI for Quality Engineering course
---

# Add AI for Quality Engineering page: {ARGS}

`{ARGS}` = module number, a range, `overview`, `capstone`, `assessment`,
`further-learning`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` and match its conventions where they don't conflict
with this file's own instructions below (this course shares the same
ASCII→Mermaid diagram pipeline as the API testing courses, but has a
stricter, fixed per-page requirement checklist that those courses don't
use).

## Course

- **Title:** AI for Quality Engineering
- **Subtitle:** Test Generation, Evaluation & Guardrails
- **Slug:** `ai-for-quality-engineering`
- **Path:** `apps/docs/docs/ai-for-quality-engineering/`
- **Audience:** QE professionals, ~2-5 years experience. Assumes testing,
  automation, APIs, basic programming, and CI/CD are already known. This is
  NOT an AI fundamentals course — never explain what an LLM is from
  scratch, never explain what a test is from scratch.
- **Core principle, stated in the overview and echoed throughout:**
  "AI generates. QE validates." Every page should reinforce this — AI is
  never the source of truth, the QE's judgment is.
- **Fictional company:** Vespera Systems — introducing AI capabilities
  (LLM features, RAG systems, AI agents) into its platform alongside
  traditional applications. The learner is the QE owning quality across all
  four surfaces. Use this company consistently across every module's
  scenario as one continuous, evolving narrative — not a fresh unrelated
  example each time. Specifically:
  - Module 3 continues Module 2's exact requirement/scenario.
  - Module 4 breaks Module 3's automation with a realistic app change.
  - Module 7 extends Module 6's LLM feature into a RAG system.
  - Module 8 tests Module 6's feature adversarially.
  - Module 9 extends Module 8's tool-misuse concerns into an agent built on
    the same product domain.
  - Module 10 and the capstone synthesize all of the above into one
    end-to-end pipeline.
- **Priority order (Pareto — reflected in depth, not just order):**
  1. AI test generation, 2. AI automation generation, 3. AI test review,
  4. AI test maintenance, 5. AI test guardrails, 6. LLM testing,
  7. RAG evaluation, 8. AI security, 9. Agent testing,
  10. AI-assisted QE workflows.
  Do not teach every AI testing tool on the market — teach the underlying
  skill and judgment, using one or two representative tools/approaches per
  topic as the vehicle.
- **AI engineering principles — apply only where justified:** separation
  between generation and validation, provider abstraction (swappable AI
  providers/models), evaluation components as first-class testable units,
  clear guardrail boundaries, dependency inversion, testable components,
  clear single responsibilities. Do not force an abstraction into a page
  that doesn't need one.
- **Security & privacy (every page with a code/data example):** never
  hardcode or expose credentials, API keys, secrets, PII, production data,
  or proprietary information — even in a "bad example," keep it obviously
  fake/redacted.

## Conventions

- One page per module — no multi-page overview/build-it/avoid-mistakes/
  review template.
- Friendly, natural conversational English tone throughout — write fluent
  prose, not stiff or translated-sounding phrasing.
- Diagrams: author as ASCII in the MDX source inside `<AsciiDiagram>`,
  converted to Mermaid at build time via the existing pipeline
  (`remark-normalize-ascii-diagrams.mjs`), matching every other course's
  convention. Do not hand-author Mermaid syntax directly in MDX — keep
  ASCII as the source of truth.
- Every module/capstone page must include ALL of these sections, in this
  order: Page purpose, Learning objectives, Concepts, Practical example,
  AI/QE workflow, Code requirements, Vespera Systems scenario, Diagram
  (rendered as Mermaid, authored as ASCII per the convention above),
  Exercise, Failure modes, Security considerations, Guardrails, Production
  considerations, Dependencies. If a section genuinely doesn't apply to a
  given page (e.g. the overview, assessment, or further-learning pages),
  say so explicitly rather than omitting the heading or forcing filler
  content into it.
- Explain code syntax and AI-workflow reasoning, not just show it — a QE
  reader should understand *why* each check/pattern matters, not just see
  it demonstrated.

## Pages

### Course Overview (`overview`)
Sets expectations before Module 1: who this course is for, what it
assumes, what "AI generates, QE validates" means as a working principle,
and introduces Vespera Systems. Include a course-roadmap diagram (ASCII source, converted to Mermaid)
(10 modules grouped into two phases — AI-assisted QE workflows: modules
1-5; testing AI systems themselves: modules 6-9 — converging into the
Module 10 capstone). Skip Practical Example and Exercise sections here
(scene-setting page, not hands-on) rather than forcing placeholders.

### Module 1 — AI-Powered QE
Frame the shift in the QE role as AI enters the SDLC. Distinguish "AI as a
QE productivity tool" from "AI as a system under test" (the two halves of
this course). Introduce the full pipeline shape (Requirement → AI
generates → QE reviews → guardrails → automation → execution → analysis →
report) that Module 10 and the capstone will fully build out — this module
names it, doesn't build it. Diagram (ASCII source): the AI-QE lifecycle diagram.

### Module 2 — AI Test Generation
Generate test scenarios with AI from a Vespera requirement; teach the
weak-test-pattern checklist (missing assertions, weak assertions,
duplicate tests, happy-path bias, missing edge cases). Exercise: given a
batch of AI-generated scenarios (mix of strong/weak), identify and fix the
weak ones. Security: never paste real proprietary requirements into a
third-party AI tool — use sanitized examples.

### Module 3 — AI Automation Generation
Continue Module 2's approved scenario into generated automation code;
teach automation-specific weak patterns (non-determinism, brittle
selectors, incorrect assumptions, poor isolation). Show a deliberately weak
AI-generated version and the QE-corrected version side by side. Match this
repo's established test-framework convention for the code example.
Exercise: fix 2-3 planted issues in AI-generated automation code.

### Module 4 — AI Test Maintenance
Use AI to diagnose and fix a failing test — introduce a realistic Vespera
app change that breaks Module 3's automation. Show one case where AI
correctly fixes it and one where AI's fix papers over a real regression
(explicit failure mode to model). Exercise: given a failing test + log,
distinguish "needs updating" from "reveals a real bug."

### Module 5 — AI Test Guardrails
Formalize Modules 2-4's informal review practices into a concrete
guardrail system: human review, code review, static analysis, security
scanning, quality gates, approval workflows. Include a real automatable
check example (e.g. a lint rule catching a hardcoded secret). Exercise:
given an AI-generated test and this module's quality-gate checklist,
determine pass/fail and which criteria failed.

### Module 6 — Testing LLM Applications
Shift from "AI as QE tool" to "AI as system under test." Cover prompt
testing, output validation (hallucination, factuality, consistency,
regression, negative testing), and evaluation datasets, using a Vespera LLM
feature (e.g. a support-ticket summarizer). Exercise: classify LLM outputs
as hallucinated / factually correct / inconsistent with a prior run.

### Module 7 — RAG Evaluation
Extend Module 6's evaluation-dataset approach to RAG: evaluate retrieval
quality and groundedness/citation accuracy separately from generation
quality. Build a golden dataset; cover LLM-as-a-judge and its limitations
with a concrete example where it disagrees with human evaluation. Diagram (ASCII source):
retrieval and generation shown as separate/parallel evaluation paths.
Exercise: given a retrieved-context + generated-answer pair, assess
relevance, groundedness, and citation accuracy.

### Module 8 — AI Security
Test Module 6's LLM feature adversarially: prompt injection, jailbreaks,
data leakage, tool misuse, context manipulation. Cover input/output
validation, permissions, human approval for high-risk actions. Keep
injection example strings illustrative/educational, never a weaponizable
list. Exercise: given a system prompt and candidate inputs, identify
injection/jailbreak attempts and predict whether guardrails catch them.

### Module 9 — AI Agent Testing
Extend Module 8's tool-misuse concerns into full agent testing: tool calls
and parameters, multi-step workflows, retries/loops/timeouts, permissions,
state, regression. Use a Vespera agent built on the same domain as Modules
6/8 (e.g. an agent that triages support tickets). Exercise: given a logged
agent execution trace, assess whether each step was correct and whether
the final action was safe even if final output looked fine.

### Module 10 — AI-Powered QE Assistant
Synthesis module bridging into the capstone: walk through the full
pipeline (Requirement → Test generation → Review → Guardrails → Automation
→ Execution → Failure analysis → QE report) end to end at a narrated,
walkthrough level, explicitly citing which module taught each stage.
Interface/component sketch only — not a full implementation (that's the
capstone). Explicitly name the "single prompt-chain script" anti-pattern
the capstone must avoid. Exercise: given a new Vespera requirement, sketch
(prose/bullets) what happens at each pipeline stage.

### Capstone — AI-Powered QE Assistant
Build a working (simplified) implementation of the full pipeline as
distinct, separately testable components — generation, review, guardrails,
automation, execution, failure-analysis, and report components, each real
code, not a single prompt-chain script. Review/guardrail components must
be genuinely separate code paths from generation (enforced architecture,
not just described principle). Provider abstraction should be real and
demonstrated (component swappable, not just claimed). Use the most fully
worked Vespera example in the course — payoff of the running narrative
from Modules 1-10. **The most important requirement:** if the resulting
content would read as one script chaining sequential AI calls with no real
component boundaries, restructure before finishing — this is a hard
failure condition for this page, not a style preference. Exercise: extend
the assistant to a second, different Vespera requirement, proving the
components are genuinely reusable.

### Assessment
Cross-cutting, scenario-based judgment questions drawing from every
module (not module-by-module recall) — e.g. spot the weak AI-generated
test, design a guardrail for a given scenario, distinguish retrieval vs.
generation failure in a RAG example, spot an AI security risk, evaluate
whether a given "AI QE assistant" design is well-engineered or a
prompt-chaining anti-pattern. Use real, complete code snippets where code
review is being tested, not pseudocode. Skip Diagram/Exercise/AI-workflow/
Guardrails/Production-considerations sections as separate headings — the
assessment itself is the exercise.

### Further Learning
Closing pointer page, not new instructional content — briefly names
categories the course intentionally scoped down per Pareto (specific
commercial AI test-gen platforms, broader LLMOps ecosystems, deeper
agent-orchestration frameworks) without vendor endorsement. Keep genuinely
brief — don't let this become a second syllabus that undermines the
course's own scoping decisions. Most other sections don't apply here; note
that explicitly rather than forcing them.
