---
description: Generate a page for the AI & LLM Testing course (Become an AI Quality Engineer)
---

# Add AI & LLM Testing page: {ARGS}

`{ARGS}` = module number, a range, `overview`, `setup`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` (e.g. `add-ai-for-qe-course.md`) and match its
conventions where they don't conflict with this file's own instructions.

## Course

- **Title:** AI & LLM Testing: Become an AI Quality Engineer
- **Slug:** `ai-llm-testing`
- **Path:** `apps/docs/docs/ai-llm-testing/`
- **Positioning:** flagship 2026 course. Hands-on, not theoretical — the
  learner should be running real code against a real local model
  constantly, not reading about testing.
- **Audience:** QA/SDET professionals with basic Python, basic testing
  knowledge, and basic API knowledge. Do NOT assume prior AI/LLM testing
  experience. Do NOT teach Python fundamentals (variables, data types,
  loops, functions, basic classes/syntax) — a separate Python course
  already covers that; if a Python feature is genuinely needed for an
  exercise, give only a short contextual explanation, not a lesson.
- **Core distinction to maintain throughout, called out explicitly at
  least once per relevant page:** "using AI to improve testing" is a
  different activity from "testing AI systems." Never let these blur
  together.
- **Local LLM runtime:** Ollama, used as the practical environment for
  the whole course (not taught as a standalone admin/ops topic — every
  Ollama concept is introduced at the point it's needed for testing work).
- **Fictional company:** Vespera Systems (same company used in the
  AI-for-QE course — keep consistent characterization if that course
  exists in this repo already). Evolves across the course: AI assistant
  giving wrong info → RAG retrieving irrelevant content → a prompt update
  causing regression → a model update changing response quality →
  fluctuating evaluation scores → a failed safety test → rising latency →
  a CI quality gate blocking a release. Use these as the running scenario
  pool, in roughly this order, matched to the modules below.
- **Progressive capstone:** "LLM Quality & Evaluation Framework," built
  incrementally across the course, never handed to the learner complete.
  15 milestones (see Capstone section below) map roughly one-to-one onto
  the modules — each module's page should end by explicitly building the
  next capstone milestone, not just discussing the topic in the abstract.

## Non-negotiable conventions (apply to every page)

- **Beginner-friendly teaching loop for every new concept:** plain-language
  explanation → define terminology → small example → run the example →
  explain the result → apply it to the capstone → introduce a realistic
  failure → diagnose the failure → improve the implementation → explain
  the production implication. Don't skip steps to save space. No huge
  unexplained code blocks, no unexplained jargon, no "you should already
  know...", no unexplained commands.
- **Failure-injection pattern**, used at least once per module past the
  fundamentals: Symptom → Hypothesis → Investigation → Evidence → Root
  Cause → Fix → Prevention. The learner diagnoses a planted failure, not
  just runs a successful example.
- **Engineering-principle pattern**, used wherever Clean Code/SOLID/design
  content appears: Problem → Poor implementation → Maintainability problem
  → Relevant principle → Refactoring → Better implementation → Trade-off.
  Never a generic theory chapter with no code. Never over-engineer the
  framework — flag explicitly when NOT to add an abstraction.
- **"When NOT to use this" sections**, required specifically for: RAG,
  LLM-as-a-judge, embeddings, retries, abstraction/provider boundaries,
  full regression suites, automated evaluation, AI-generated tests. Each
  needs: Use it when / Don't use it when / Trade-offs — as an explicit
  subsection, not folded into prose.
- **Engineering judgment framing** for significant decisions: Problem →
  Constraints → Options → Trade-offs → Decision → Implementation →
  Consequences. Explicitly distinguish "what can we do" from "what should
  we do." No tool/pattern/architecture presented as universally correct.
- **Learning checkpoint** near the end of pages covering a substantial new
  concept: "Before continuing, you should now be able to..." followed by
  2-4 conceptual questions or one small practical task. Don't overuse —
  skip on lighter/connective pages.
- **Never include real credentials, API keys, secrets, PII, or production
  data anywhere** — synthetic data only, even in "bad example" code.
- Diagrams: ASCII may be used during planning/drafting, but final content
  must render as Mermaid via this repo's existing ASCII→Mermaid pipeline
  (author ASCII in `<AsciiDiagram>`, converted at build time by
  `remark-normalize-ascii-diagrams.mjs`) — no raw ASCII in final output.
  Use flowchart/sequenceDiagram/stateDiagram-v2/erDiagram as fits the
  content; don't add a diagram purely for decoration.
- Every module ties into the capstone explicitly — state which milestone
  the module builds, and don't let the capstone feel like a separate
  project bolted on at the end.

## Pages

### Course Overview (`course-overview`)
Frame the course: what an AI Quality Engineer does differently from a
traditional QE, the beginner→practical→intermediate→professional→
production arc, the Build→Run→Observe→Fail→Diagnose→Improve→Automate loop
used throughout, and the "using AI to improve testing" vs "testing AI
systems" distinction stated for the first time here. Introduce Vespera
Systems and the capstone framework goal (without building anything yet).
Diagram: course roadmap showing the module arc and where the 15 capstone
milestones land along it.

### Setup (`setup`, Module 0)
Install Ollama, pull and run a first local model, verify it responds,
set up the Python environment (assume Python already known — this is
about environment, not language). Confirm the learner has actually talked
to a local model by the end of this page. Capstone: Milestone 1 (run a
local model) happens here.

### 01. AI Application Fundamentals
LLM applications, prompt-based systems, AI workflows, AI agents, RAG
systems, AI application architecture, and concretely how AI applications
differ from traditional deterministic software (this is the "why testing
AI is different" foundation every later module leans on). Diagram: AI
application architecture (LLM app / RAG / agent shapes side by side).

### 02. Calling Ollama from Python
The Ollama API, calling it from Python, capturing model responses,
reproducibility considerations (temperature, seed, model version) — the
first real hands-on code of the course. Capstone: Milestone 2 (send
prompts using Python) and Milestone 3 (capture responses). Diagram:
sequence diagram of a Python → Ollama request/response.

### 03. Testing LLM Applications — Foundations
Functional testing for LLM apps, prompt testing, output validation,
structured output/JSON/schema validation, why exact-match assertions
usually fail against LLM output, and the concept of a test oracle for
non-deterministic systems (acceptable output vs. exact expected output).
Capstone: Milestone 4 (create the first LLM test). Failure injection:
a test that flakes because it used exact-match against non-deterministic
output — diagnose and fix.

### 04. Consistency & Non-Determinism
Consistency testing, what "acceptable variation" means, why AI test
results can change even when application code hasn't — sets up Module 13
(Baseline & Reproducibility) without duplicating it. Checkpoint included.

### 05. Hallucination Testing
Factuality, groundedness, unsupported claims, source verification, false
information, contradictory responses, out-of-context answers, building a
small hallucination test dataset, and a first pass at detecting
hallucination automatically (rule-based, before Module 07/08 introduce
semantic/LLM-judge approaches). Vespera scenario: the AI assistant gives
incorrect information. Diagram: hallucination detection flow.

### 06. Evaluation Strategies — Start Simple
Exact matching, rule-based validation, required-field validation, JSON/
schema validation — the deliberately simple evaluation techniques, each
with an explicit Use it when / Don't use it when / Trade-offs subsection.
Capstone: Milestone 5 (add response validation).

### 07. Evaluation Strategies — Semantic & Judge-Based
Semantic similarity, relevance evaluation, groundedness scoring,
LLM-as-a-judge, human evaluation, and combining strategies. Same explicit
Use it when / Don't use it when / Trade-offs treatment as Module 06, plus
false positives/false negatives/evaluator reliability for each technique.
Capstone: Milestone 6 (create evaluation datasets) and Milestone 7 (add
scoring).

### 08. Test the Test — Evaluator Validation
The evaluation framework itself can be wrong. Evaluator validation using
known-good/known-bad examples and human-reviewed datasets, weak
evaluators, incorrect thresholds, judge inconsistency, evaluation drift.
Core question stated explicitly: "how do we know our evaluator is
actually evaluating correctly?" Where practical, write tests for the
evaluation framework itself. Failure injection: a miscalibrated evaluator
that passes bad output — diagnose and fix the evaluator, not the app.

### 09. RAG Fundamentals
Retrieval quality, context relevance, context completeness, chunking,
embeddings, at a practical (not deep ML-theory) level — enough for a QE to
reason about what can go wrong. Diagram: RAG architecture (chunk → embed →
retrieve → generate).

### 10. RAG Testing
Retrieval failures, answer relevance, groundedness, citation validation,
missing documents, conflicting documents, out-of-domain questions, and
explicitly separating retrieval failures from generation failures (a
recurring theme — don't blame the model for a retrieval problem or vice
versa). Vespera scenario: RAG retrieves irrelevant content. Capstone:
Milestone 11 (add RAG evaluation) partially begins here, completed in
Module 11. When NOT to use RAG: explicit subsection.

### 11. RAG Evaluation in the Framework
Wire RAG-specific evaluation (groundedness, citation checks, retrieval-vs-
generation separation) into the capstone framework built so far. Failure
injection: a missing-document case and a conflicting-document case, both
diagnosed using the separation principle from Module 10. Capstone:
Milestone 11 completed.

### 12. AI Safety Testing
Prompt injection, jailbreak testing, toxicity, sensitive information
leakage, PII exposure, unsafe responses, system prompt leakage, malicious
instructions, tool misuse, unauthorized actions, input/output validation,
permission boundaries. All examples must stay defensive and safe — state
this explicitly on the page itself, not just in the command file.
Vespera scenario: a safety test fails. Capstone: Milestone 10 (add AI
safety tests). Diagram: AI security testing flow.

### 13. Baseline & Reproducibility
The baseline-driven workflow: Baseline → run evaluation → record results →
change prompt/model/application → run again → compare → accept or reject.
What to track (model, config, prompt version, dataset version, evaluator
version, test case, score, reason, latency, timestamp, pass/fail, failure
category). Explain concretely why AI test results can shift even with
unchanged app code. Capstone: Milestone 8 (add baseline comparison).

### 14. AI Regression Testing
Prompt versioning, model changes, dataset changes, evaluator changes,
configuration changes, regression suites, baseline comparison in practice,
regression thresholds, detecting quality degradation, reproducible
evaluation. Vespera scenario: a prompt update causes a regression, and
separately a model update changes response quality — treat these as two
distinct regression sources. Capstone: Milestone 9 (add prompt regression
detection). When NOT to run a full regression suite: explicit subsection.

### 15. AI-Assisted Testing
Generating test cases with AI, test data generation, failure analysis,
test maintenance, test optimization, AI-assisted debugging, AI-assisted
test documentation — explicitly reinforce the "using AI to improve
testing" side of the course-wide distinction, contrasted directly against
everything Modules 1-14 taught about testing AI systems. When NOT to trust
AI-generated tests: explicit subsection.

### 16. AI Reliability & Performance Testing
Response latency, timeouts, reliability, error handling, retries,
throughput, concurrent requests, resource consumption, repeatability,
failure classification. Teach the Functional Quality vs. Operational
Quality distinction explicitly — a model can produce great responses and
the application can still fail production requirements on speed/
reliability. When NOT to use retries (they can hide real failures):
explicit subsection. Vespera scenario: latency increases.

### 17. AI Observability
What to capture for investigating AI failures (model, config, prompt
version, dataset version, test case ID, response, score, reason, latency,
timestamp, pass/fail, failure category) and why observability matters more
for non-deterministic systems specifically. Explicit reminder: never log
credentials/secrets/PII/production data — synthetic data only. Capstone:
Milestone 12 (add reporting) begins here.

### 18. Reporting
Turning captured observability data into a QE-readable report (not raw
JSON) — completes Milestone 12. Ties directly to the portfolio-outcome
requirement: this report is part of what makes the final capstone
presentable.

### 19. AI Testing in CI/CD
Pull-request AI smoke tests vs. nightly full evaluation, release
validation, baseline comparison in CI, evaluation thresholds as gates,
regression detection in the pipeline, test artifacts, evaluation reports,
quality gates. Explain concretely why running the full AI suite on every
commit usually isn't practical (cost, latency). Capstone: Milestone 13
(CI/CD) and Milestone 14 (quality gates). Diagram: PR smoke-suite path vs.
nightly full-evaluation path as two parallel flows.

### 20. Clean Code & Design Principles for the Framework
Apply Clean Code/SOLID/separation of concerns/high cohesion/low coupling/
DRY/KISS/YAGNI only where they solve a real problem already visible in the
capstone framework built so far (giant evaluation function, mixed test
data and evaluation logic, reporting coupled to execution, safety tests
tightly coupled, scattered configuration) — each via the required Problem
→ Poor implementation → Maintainability problem → Principle → Refactoring
→ Better implementation → Trade-off pattern. No abstract theory without a
concrete before/after in this framework. Capstone: Milestone 15 begins
(refactor).

### 21. Model Provider Replaceability
A simple provider boundary so Ollama could later be swapped for another
provider — explicitly not a large abstraction layer. Cover why the
abstraction exists, what problem it solves, what trade-off it introduces,
and when this kind of abstraction would be unnecessary (tie back to
Module 20's over-engineering warning). Completes Milestone 15 alongside
Module 20.

### 22. Engineering Judgment
Synthesis module: work through 2-3 significant decisions made across the
capstone build (e.g. why LLM-as-a-judge here but not there, why this much
abstraction and no more, why this regression threshold) using Problem →
Constraints → Options → Trade-offs → Decision → Implementation →
Consequences, explicitly distinguishing "what can we do" from "what should
we do." This is a reflection/synthesis page, not new technique content.

### 23. Failure Injection & Troubleshooting Deep Dive
A dedicated page walking through 3-4 realistic Vespera failures not
already fully diagnosed in earlier modules (e.g. a CI quality gate
blocking a release, fluctuating evaluation scores) using the full Symptom
→ Hypothesis → Investigation → Evidence → Root Cause → Fix → Prevention
pattern, treating the finished capstone framework as the diagnostic tool.

### 24. Portfolio & Interview Preparation
How to present the finished capstone: professional README, architecture
diagram, test strategy, evaluation methodology, sample datasets, baseline
results, regression/failure examples, security tests, reports, CI
pipeline, quality gates, configuration docs, troubleshooting guide,
technical decisions, future improvements. Include the reflection questions
(what problem did I solve, why this evaluation strategy, how did I handle
non-determinism, how did I detect regressions, how did I validate the
evaluator, how would this scale in production) as prompts the learner
answers about their own build. Then scenario-based interview questions
tied directly to course concepts (not a generic interview-prep detour).

### 25. Course Wrap-Up
Recap the progression stated in the source spec (I know how to test
traditional applications → I understand how AI applications behave → I
can design tests for LLM applications → I can evaluate LLM and RAG
quality → I can test AI security and reliability → I can automate AI
regression testing → I can integrate AI quality gates into CI/CD → I can
explain and defend my AI Quality Engineering strategy) as a closing
checkpoint, not new content. Brief.

## Capstone milestones (for cross-reference — do not generate as a separate page; each is built inside the module listed above)

1. Run a local model — Setup
2. Send prompts using Python — Module 02
3. Capture responses — Module 02
4. Create the first LLM test — Module 03
5. Add response validation — Module 06
6. Create evaluation datasets — Module 07
7. Add scoring — Module 07
8. Add baseline comparison — Module 13
9. Add prompt regression — Module 14
10. Add AI safety tests — Module 12
11. Add RAG evaluation — Modules 10-11
12. Add reporting — Modules 17-18
13. Add CI/CD — Module 19
14. Add quality gates — Module 19
15. Refactor and document the framework — Modules 20-21
