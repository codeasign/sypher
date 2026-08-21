---
description: Generate a page for the AI Quality Engineering with RAGAS course
---

# Add AI Quality Engineering with RAGAS page: {ARGS}

`{ARGS}` = module number, a range, `overview`, `setup`, or `all`.

**Before writing anything**, read an existing course command in
`.claude/commands/` (e.g. `add-ai-llm-testing-course.md`) and match its
conventions where they don't conflict with this file's own instructions —
this course has a stricter accuracy/runnability discipline than the
others and a more compact module structure. Read this entire file before
generating anything; the constraints below apply to every single page,
not just the ones that repeat them.

## The single most important instruction for this course

**Don't optimize for impressive prose. Optimize for runnable artifacts and
technical correctness.** Every code example, command, file reference, and
piece of output shown must be real and internally consistent. If you
cannot verify a RAGAS API, metric, CLI command, or piece of output is
correct, do not invent a plausible-sounding version — either verify it
against the actual installed RAGAS version/docs first, or write the
surrounding lesson so it doesn't depend on the unverified detail. This
rule overrides "sounds good" writing every time the two conflict.

## Course

- **Title:** AI Quality Engineering with RAGAS
- **Slug:** `ai-qe-ragas`
- **Path:** `apps/docs/docs/ai-qe-ragas/`
- **Core philosophy — read this before writing anything:** this is an AI
  Quality Engineering course, NOT a RAGAS API tutorial. Every page teaches
  the learner to think like a QE testing an AI system — quality risks,
  test strategy, test data, evaluation, observability, failure analysis,
  reproducibility, regression testing, automation, CI/CD quality gates.
  RAGAS is the evaluation tool used to do this, not the subject of the
  course. If a page's content would only be useful to someone memorizing
  RAGAS's API surface, rewrite it around the QE question that API answers.
- **Audience:** QA Engineers, QE Engineers, SDETs, Test Automation
  Engineers, Test Leads, and Test Managers who already know traditional
  testing but are new to AI testing, LLMs, RAG, and RAGAS specifically.
  These are experienced testers, NOT beginner programmers. Explain AI
  concepts from first principles. Do NOT explain basic programming
  concepts (variables, loops, functions, basic syntax) — assume that
  fluency. Connect every new AI concept to a familiar QE concept the
  learner already has: test case, oracle, expected behavior, regression,
  baseline, defect, reproducibility, quality gate, failure analysis, risk,
  coverage.
- **Stack:** Ollama (local models — the course's continuous hands-on
  playground, used in every module, never an isolated one-off setup
  module) and RAGAS (evaluation library) with Python.
- **One running project, reused throughout — not per-lesson toy examples:**
  Golden Dataset → Local RAG → RAGAS Evaluation → Failure Analysis →
  Model Comparison → CI/CD. Every module extends this same project.
  Small, fully isolated examples are acceptable ONLY when teaching one
  narrow concept in isolation before folding it back into the main
  project — never as a substitute for extending the real project.
- **AI quality is broader than correctness — don't reduce it to "did the
  model give the right answer."** Dimensions to draw from as appropriate
  (not all in every lesson): correctness, faithfulness, relevance,
  retrieval quality, completeness, consistency, hallucination, robustness,
  safety, clarity, tone, user friendliness, latency, cost.
- **Final course goal — every module should be building toward the
  learner being able to answer these two questions by the end:**
  "How do I know whether my AI/RAG system is actually getting better?"
  and "When my AI evaluation fails, how do I determine whether the
  problem is the test data, retrieval, prompt, model, evaluator, or
  quality gate?" The capstone (Module 15) must visibly demonstrate this
  diagnostic workflow, not just assemble components.

## Required teaching loop (every concept, every module)

CONCEPT → EXAMPLE → HANDS-ON → BREAK IT → OBSERVE → DIAGNOSE → FIX →
QE LESSON. This is not optional structure — "BREAK IT / OBSERVE / DIAGNOSE
/ FIX" means the learner deliberately causes a real failure in their own
running project and works through it, every module past the earliest
foundational ones. The "QE LESSON" step explicitly names the transferable
testing principle, tying the AI-specific technique back to general QE
practice.

## Non-negotiable content rules

- **RAGAS accuracy discipline:** never invent metrics, APIs, CLI commands,
  dataset requirements, thresholds, evaluation behavior, or benchmark
  results. Never teach an arbitrary threshold rule like "0.8 means good" —
  explain that thresholds depend on use case, dataset, baseline, risk,
  evaluator, human judgment, and historical results. Keep RAGAS concepts
  aligned with the actual version being taught/installed.
- **Golden datasets are engineered artifacts, not AI output taken on
  faith.** Cover source of truth, reference answers, expected behavior,
  positive/negative/edge/ambiguous/unanswerable/hallucination-trap/
  adversarial cases, dataset validation, versioning, review. Never imply
  an LLM-generated dataset is automatically "golden" — it must be reviewed
  and validated by the learner before use.
- **Model comparison must teach experimental fairness:** hold dataset,
  questions, retrieval configuration, prompts, and evaluation
  configuration constant; vary only the one thing being tested. Cover
  quality, latency, cost, consistency, statistical significance,
  confidence intervals, and practical vs. statistical significance.
- **User experience is a distinct, required evaluation axis** —
  understandable, concise, friendly, appropriately toned, useful,
  well-structured, appropriate for the intended user. A technically
  correct response can still be a poor user experience; teach this
  explicitly, don't just imply it.
- **Every hands-on artifact must be genuinely runnable.** Never incomplete
  code, fake commands, invented APIs, mismatched filenames/arguments, or
  fabricated output. If a command is shown, it must match the supplied
  implementation exactly. If a file is referenced, either provide it or
  state clearly that it must already exist from an earlier module.
- **Never show a precise numeric metric score as if it were a real result
  of running the code.** A specific number like `"faithfulness": 0.42` is
  fabricated output the moment it's presented as what the learner will
  see — the actual number depends on their model, their data, and RAGAS's
  own non-determinism. Instead: (a) describe the DIRECTION and rough
  magnitude of a change ("faithfulness drops sharply — expect it to fall
  by roughly half"), or (b) show the output shape with an explicit
  placeholder (`"faithfulness": <your score — will vary>`), never a bare
  invented decimal presented as ground truth. This applies to every
  metric, every module, no exceptions.
- **Diagram branches must exactly match what the prose actually
  demonstrates.** If a diagram shows N root-cause branches, the page must
  either walk through all N with a real BREAK IT/DIAGNOSE/FIX cycle, or
  the diagram must only show the branches that get a real walkthrough
  (branches covered only by discussion/reasoning, without a hands-on
  repro, must be visually or textually marked as "reasoned about, not
  reproduced in this module" — never presented as equivalent to a
  demonstrated branch). A diagram promising more than the page delivers is
  a defect in the page, fix the mismatch before finishing.
- **Source/evaluation discipline language:** never claim that validation
  "proves" AI correctness or that a metric proves objective truth. Use
  "reduces risk," "provides evidence," "increases confidence," "identifies
  potential problems," "helps detect regressions" instead. Keep this
  distinction visible: Source of Truth → Golden Dataset → System Under
  Test → Evaluation → Result.
- **No fluff.** No motivational filler, generic introductions, marketing
  language, repetitive summaries, unnecessary "Why This Matters"
  sections, fake industry statistics, or exaggerated claims. Every section
  must teach something or let the learner do something. Keep the course
  compact — do not turn every small sub-concept into its own heading if it
  naturally belongs folded into a bigger one.

## Course quality gate — apply to every page before it's considered done

Is the lesson technically correct? Is it useful to a QE specifically? Can
the learner actually perform the exercise as written? Are all required
files/data/code supplied or clearly marked as already existing? Do the
commands shown match the code shown? Does any expected output shown match
the actual supplied input — AND is any numeric metric score shown as a
placeholder/direction rather than a fabricated precise value? Does every
diagram branch have a matching real walkthrough in the prose, or is it
explicitly marked as reasoned-not-reproduced? Are RAGAS claims accurate?
Are examples realistic? Is there unnecessary theory that could be cut?
Does the module build on the artifacts from previous modules? Does it
leave the learner ready for the next module? If any answer is no, fix it
before finishing the page — don't ship it as-is.

## Diagrams

Author as ASCII in the MDX source inside `<AsciiDiagram>`, converted to
Mermaid at build time via the existing pipeline
(`remark-normalize-ascii-diagrams.mjs`) — same convention as every other
Sypher course. Do not hand-author Mermaid syntax directly in MDX. Use a
diagram only where it genuinely improves understanding of a real
architecture or flow (e.g. the RAG pipeline, the evaluation-failure
diagnostic flow, the CI quality-gate flow) — not decoratively. The
diagram-branch-parity rule above applies directly to these ASCII diagrams:
every branch/node the ASCII diagram shows must correspond to something
the prose actually demonstrates, not just a promised-but-undelivered path.

## Pages

15 modules, matching this exact compact progression — do not split any of
these into multiple pages, and do not add extra modules beyond this list.

### Course Overview (`course-overview`)
State plainly what this course is (an AI Quality Engineering course using
RAGAS as its evaluation tool, not a RAGAS tutorial) and what it isn't. No
fluff, no motivational framing — a QE reading this should know exactly
what they'll be able to do by Module 15 and what artifact they'll have
built. State the two final-goal questions from the Course section above
directly. Preview the running-project chain (Golden Dataset → Local RAG →
RAGAS Evaluation → Failure Analysis → Model Comparison → CI/CD) as a
diagram.

### Setup (`setup`, Module 0)
Install Ollama, pull and run a first local model, verify a real response,
set up Python + install RAGAS. Confirm both a working Ollama call and a
working RAGAS import before moving on — this is the minimum bar to start
Module 1's hands-on work immediately, not a standalone module the course
leaves behind.

### 01. Understand AI Quality Problems
Traditional testing vs. AI testing, deterministic vs. non-deterministic
testing, what quality risk looks like for an AI system specifically, and
an AI test strategy framed in QE terms the learner already has (risk,
coverage, oracle). CONCEPT→EXAMPLE→HANDS-ON here means running the same
prompt against Ollama multiple times and observing real non-deterministic
output firsthand — not just being told it's non-deterministic.

### 02. Experiment with Local Models
Continued hands-on Ollama work: running prompt experiments, deliberately
generating an intentionally bad/wrong response, comparing two models on
the same prompt, and observing real variability across repeated runs.
This module is where the learner gets comfortable treating Ollama as a
tool they'll keep using, not a setup step they finished and left behind.

### 03. Build Test Data
What a golden dataset is (an engineered artifact, not a file you get from
an LLM for free), source of truth vs. reference answer, and designing
real test cases: positive, negative, edge/boundary, ambiguous,
unanswerable, and hallucination-trap cases. Hands-on: generate draft test
data with Ollama, then have the learner actually review and correct it by
hand (demonstrate a real case where the AI-generated draft was wrong),
validate the dataset, and version it. This produces the golden dataset
file every later module will use.

### 04. Understand RAG
What RAG is, RAG architecture, documents and chunking, embeddings, vector
search, retrieval, context, generation — at the practical level needed to
build and test one, not deep ML theory. Diagram: RAG pipeline (chunk →
embed → retrieve → generate).

### 05. Build a Small RAG System
Hands-on: build a real, minimal RAG system using Ollama for generation,
using the golden dataset from Module 03 as its test questions. Walk
through its real failure modes concretely by triggering at least one
(e.g. a retrieval miss), not just listing failure-mode names. This system
becomes the "app under test" for every later module.

### 06. Introduce RAGAS
What RAGAS is and how RAG evaluation differs from a traditional
assertion (`assertEquals` doesn't work here — explain concretely why).
Building a RAGAS evaluation dataset from the Module 03 golden dataset and
the Module 05 RAG system, evaluation inputs, running a first real RAGAS
evaluation against the learner's own system, reading real results,
evaluation variability, and local vs. hosted evaluation models (framed
toward the course's local-first Ollama approach).

### 07. Learn Individual Metrics
Faithfulness, response relevancy, context precision, context recall,
context entity recall, noise sensitivity — each demonstrated with a real
run against the learner's own RAG system and dataset, not an abstract
definition. Choosing the right metric for a given question, metric
trade-offs, what a low score actually means, and what to do when metrics
disagree with each other. Explicitly reinforce the "no arbitrary threshold
rules" discipline here — do not say a specific number "means good."

### 08. Debug Evaluation Failures
Start from "the score is low but the answer looks fine" as the real
motivating problem. Debugging faithfulness, response relevancy, context
precision, and context recall failures specifically; distinguishing
retrieval failures, prompt failures, model failures, reference-answer
problems, and evaluator problems from each other. This module is the
clearest application of the full CONCEPT→...→QE LESSON loop: deliberately
break the learner's own project in at least two distinct ways and work
each through a real investigation to root cause. Diagram: the evaluation
failure investigation workflow.

### 09. Build LLM-as-a-Judge Evaluations
What LLM-as-a-judge is, evaluation rubrics, judge prompts, structured
evaluation, pass/fail vs. score-based evaluation, judge consistency, judge
bias, human evaluation vs. LLM evaluation, and validating a judge against
known-good/known-bad cases before trusting it. Hands-on: build a real
LLM-as-a-judge evaluator using Ollama as the local judge, run it against
the Module 03 golden dataset, and validate it.

### 10. Compare Models
Why AI evaluation scores vary, repeatability vs. reproducibility, sampling
and temperature, evaluation variance, baselines, and — the core of this
module — experimental fairness when comparing models: keep dataset,
questions, retrieval config, prompts, and evaluation config constant,
change only the one variable being tested. Cover quality, latency, cost,
consistency, statistical significance, confidence intervals, and practical
vs. statistical significance. Hands-on: build a real model comparison
scorecard comparing two Ollama models fairly on the learner's own project.

### 11. Evaluate User Experience
Correctness vs. user experience as a distinct axis — a technically correct
answer can still be a bad user experience. Response clarity, tone, user
friendliness, conciseness, completeness, readability, professionalism,
custom evaluation criteria, evaluating for different user personas.
Hands-on: build a real UX quality rubric and run it as an additional
evaluation layer on the same project alongside Module 07's metrics.

### 12. Optimize Evaluation
Why RAGAS evaluations are slow, batching, parallel evaluation, caching,
reducing evaluation cost, local evaluation with Ollama specifically, model
size vs. evaluation speed, CPU vs. GPU evaluation, and the quality-vs-
speed trade-off — explicitly framed with a "when NOT to bother optimizing
this yet" angle, not just speed tips. Hands-on: apply one real
optimization to the learner's own evaluation suite and measure real
before/after timing, not a hypothetical number.

### 13. Add CI/CD Quality Gates
AI testing in CI/CD, golden dataset validation in CI, automated RAGAS
evaluation in a pipeline, evaluation baselines, quality gates, absolute
vs. relative thresholds, regression detection, handling evaluation
variance in CI so non-determinism doesn't cause false failures, GitHub
Actions integration, evaluation reports, pull-request quality checks.
Hands-on: wire the learner's own evaluation suite into a real GitHub
Actions workflow with a real quality gate. Diagram: PR quality-check flow
vs. a fuller scheduled/nightly evaluation flow.

### 14. Perform Advanced RAG Testing
Hallucination testing, unanswerable questions, adversarial testing,
prompt injection testing, conflicting information, retrieval boundary
testing, similar documents, multi-part questions, multi-hop questions,
long-context testing, regression testing, model-upgrade testing — each
grounded in a real test added to the learner's own suite, not a separate
demo. Keep any adversarial/injection example content illustrative and
clearly educational, never a usable exploit list.

### 15. Capstone: Build a Complete AI QE Framework
Not a new project — this is where the artifacts already built in Modules
1-14 (golden dataset, local RAG, Ollama integration, RAGAS evaluation,
individual metrics, failure analysis, LLM-as-a-judge, model comparison,
UX evaluation, optimization, CI/CD gates, advanced tests) get connected
into one coherent, demonstrable AI Quality Engineering framework. The
page must explicitly walk through both final-goal questions from the
Course Overview using the learner's own finished project as the answer:
show how the framework demonstrates the system is (or isn't) getting
better, and walk through a real diagnostic case narrowing a failure down
to test data, retrieval, prompt, model, evaluator, or quality gate.
Diagram: final framework architecture, all components connected.
