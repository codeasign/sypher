---
title: AI Quality Engineering with RAGAS
sidebar_label: Course Home
slug: /ai-qe-ragas/
---

# AI Quality Engineering with RAGAS

### Test AI systems like a QE, using RAGAS as the tool — not the subject

*Estimated completion time: 20–28 hours*

**Difficulty:** Intermediate to Advanced

## What This Course Covers

This is an AI Quality Engineering course. RAGAS is the evaluation tool you'll use throughout it, not the thing you're here to memorize the API of. Every module asks the same question a QE always asks — what's the quality risk here, and how do I get evidence about it — and then answers it against one real, running project instead of a slide.

You build that one project across all 15 modules: a **golden dataset** you engineer and validate by hand, a **local RAG system** running on Ollama, a **RAGAS evaluation suite** you run against your own system, a **failure-analysis workflow** for when a score looks wrong, a **model comparison** run fairly, and a **CI/CD quality gate** that blocks a regression before it ships. Nothing is handed to you pre-built — you write it, you break it on purpose, and you diagnose what broke.

## Why This Matters

Traditional test oracles assume a deterministic system: same input, same expected output, pass or fail. RAG and LLM-based systems don't give you that. A QE who only knows `assertEquals` has no way to answer "is this AI feature actually working," let alone "is it getting *better* or *worse* over time." This course builds the specific skill of evaluating a non-deterministic system with the same rigor you'd bring to a deterministic one — engineered test data, reproducible evaluation, root-cause failure analysis, and a CI gate — using tools (Ollama, RAGAS) that run entirely on your own machine.

## Skills You Will Gain

- Engineer a golden dataset — positive, negative, edge, ambiguous, unanswerable, and hallucination-trap cases — and validate it before trusting it
- Build a real local RAG system with Ollama: chunking, embeddings, retrieval, generation
- Run and interpret RAGAS metrics (faithfulness, response relevancy, context precision/recall, and more) against your own system
- Diagnose a low evaluation score down to test data, retrieval, prompt, model, or the evaluator itself
- Build and validate an LLM-as-a-judge evaluator
- Compare two models fairly, accounting for variance and statistical significance
- Evaluate user experience as a distinct axis from correctness
- Wire evaluation into a CI/CD pipeline as a real quality gate

## Prerequisites

- Comfortable with traditional software testing — test cases, oracles, regressions, baselines, coverage, quality gates
- Comfortable with basic Python
- No prior experience with AI, LLMs, RAG, or RAGAS required — that's the subject of this course

## Course Roadmap

<CourseCurriculum />

## How to Use This Course

Work through the modules in order. Module 3's golden dataset is what Module 5's RAG system is tested against, what Module 6 turns into a RAGAS evaluation dataset, and what every later module keeps extending — nothing is rebuilt from scratch the second time it's used. Past the earliest foundational modules, every module follows the same loop: **concept → example → hands-on → break it → observe → diagnose → fix → QE lesson.** You don't just read about a failure mode — you cause a real one in your own project and work it back to root cause, the same way you would in production.

By Module 15, the pieces built across Modules 1–14 connect into one framework that can answer two questions about your own project: is it actually getting better over time, and when an evaluation fails, is the problem the data, the retrieval, the prompt, the model, the evaluator, or the quality gate itself.
