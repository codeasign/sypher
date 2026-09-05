---
title: AI & LLM Testing
sidebar_label: Course Home
slug: /ai-llm-testing/
---

# AI & LLM Testing

### Become an AI quality engineer

*Estimated completion time: 30 to 40 hours*

**Difficulty:** Beginner to advanced

## What this course covers

AI & LLM Testing is a hands-on course about testing AI systems, not about using AI to write your tests faster. From the very first module you will be running real code against a real, locally-running language model, not reading slides about what a model is. Every technique in this course (output validation, evaluation datasets, LLM-as-a-judge, RAG evaluation, safety testing, regression detection) gets built by hand, run against a real model, broken on purpose, diagnosed, and fixed.

The course draws one line early and holds it for 25 modules: **"using AI to improve testing" is a different activity from "testing AI systems."** This course is entirely about the second one. If a tool or technique here happens to make your day-to-day testing faster too, that is a side effect. The point is learning to test AI-powered software the way it actually breaks.

Every module follows one continuous story at a fictional company called **Vespera Systems**, which is rolling out an internal Helpdesk AI Assistant for its support agents. You will watch it go wrong in realistic ways: wrong answers, irrelevant retrieval, a prompt change that silently regresses quality, a model upgrade that changes behavior, a safety test that fails, latency that creeps up, a CI gate that blocks a release. Each failure becomes the thing you learn to test for.

Alongside the story, you build one real project: the **LLM Quality & Evaluation Framework**, a working evaluation and testing toolkit for LLM applications, assembled incrementally across 15 milestones from Module 0 through Module 21. By the end, it is a portfolio piece you can explain, defend, and extend.

## Why this matters

LLM-powered features break in ways traditional software testing has no vocabulary for: non-determinism, hallucination, silent quality regressions from a one-line prompt change, retrieval that is confidently wrong. Teams are shipping these features today, often without anyone on QE who knows how to test them rigorously. This course builds that specific, currently rare skill set from first principles, against a real model, so you can walk into a team already shipping AI features and know exactly what to test and how.

## Skills you will gain

- Call a real LLM from Python and reason about non-deterministic output
- Build evaluation strategies from simple checks through semantic and LLM-as-a-judge scoring
- Validate your own evaluators so you trust the judge as much as the system it's judging
- Test RAG systems: retrieval quality, generation quality, and the framework to evaluate both
- Run AI safety testing for hallucination, unsafe output, and adversarial input
- Establish baselines and detect AI regressions before they reach production
- Measure and test AI reliability, performance, and observability
- Wire AI testing into CI/CD as an automated release gate
- Apply clean code and design principles to keep an evaluation framework maintainable and provider-agnostic
- Diagnose and troubleshoot real AI-system test failures methodically

## Prerequisites

- Comfortable with basic Python: functions, classes, control flow
- Comfortable with basic software testing: what a test is, how to write an assertion
- Comfortable with basic API concepts: requests, JSON, status codes
- No prior experience testing AI or LLM systems required. That is the subject of this course

## Course roadmap

<CourseCurriculum />

## How to use this course

Work through the modules in order. This is not a reference you dip into randomly. Module 2's `OllamaClient` is what every later module calls. Module 6's validators feed Module 7's evaluation datasets. Module 10's retrieval/generation split is what Module 11 wires into the framework. Module 13's baseline format is what Module 14's regression suite compares against. Nothing is re-explained from scratch the second time it is used.

The shape of the course is a loop, repeated at increasing depth: **Build, Run, Observe, Fail, Diagnose, Improve, Automate.** You will see it first in Module 2 (build a client, run it, observe the response) and again, more seriously, every time a module plants a realistic failure for you to diagnose before showing you the fix. By Module 19 that loop is running inside a CI pipeline instead of by hand.

Modules 20-22 step back and apply real engineering judgment (clean code, design principles, provider abstraction) to the framework you have already built, refactoring it rather than starting over. Modules 23-25 close the course: a deep troubleshooting pass, portfolio and interview preparation, and a short wrap-up.
