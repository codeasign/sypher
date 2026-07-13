---
title: Capstone Project
sidebar_label: Capstone
---

# Capstone: AI Research Assistant

You will build a production-ready AI Research Assistant — a FastAPI web service that accepts research questions, retrieves relevant context from a technical document collection using RAG, generates grounded answers with structured citations, caches frequent queries, and logs everything for observability. When you are done, you will have a containerised, deployable service you can show in any interview.

## What you'll build

A REST API that takes a research question like "What is the difference between supervised and unsupervised learning?", retrieves the most relevant passages from an ingested document collection (RAG), uses an LLM with structured output to produce a cited answer, caches identical questions for low-latency repeat queries, and exposes observability endpoints for health checks and request logs. All wrapped in a Docker container with a CI/CD pipeline.

## Time estimate

20–30 hours, broken down as:

- **Milestones 1–2 (project setup + ingestion):** 4–6 hours
- **Milestones 3–4 (RAG + API):** 8–10 hours
- **Milestone 5 (observability + caching):** 4–6 hours
- **Milestone 6 (containerisation + CI/CD):** 4–6 hours

## Skills this draws on

- [Project Structure](../project-structure/overview) — organising code into an installable package
- [Async Python](../async-python/overview) — FastAPI is async-native; RAG retrieval and LLM calls run concurrently
- [HTTPX](../httpx/overview) — async HTTP for internal service calls
- [LLM API Basics](../llm-api-basics/overview) — calling Anthropic / OpenAI with system prompts
- [Prompt Engineering](../prompt-engineering/overview) — crafting prompts that produce grounded, cited answers
- [Structured Output](../structured-output/overview) — enforcing JSON schemas on LLM responses
- [Embeddings](../embeddings/overview) — generating and storing vector embeddings for semantic search
- [RAG](../rag/overview) — the full retrieval-augmented generation pipeline
- [AI Pipelines](../ai-pipelines/overview) — multi-stage pipeline with error handling per stage
- [Logging](../logging/overview) — structured logging with file and console handlers
- [Error Handling](../error-handling/overview) — graceful handling of API failures, timeouts, and bad inputs
- [Decorators](../decorators/overview) — timing and logging decorators for pipeline stages
- [Context Managers](../context-managers/overview) — resource cleanup for HTTP clients and vector store sessions
- [Dataclasses](../dataclasses/overview) — typed data models for requests, responses, and intermediate state
- [Type Hints](../type-hints/overview) — fully annotated function signatures
- [Pytest](../pytest/overview) — unit tests with fixtures, parametrisation, and mocking
- [Docker](../docker/overview) — multi-stage Dockerfile with health checks
- [CI/CD](../ci-cd/overview) — GitHub Actions: lint, test, build, deploy
- [Packaging](../packaging/overview) — `pyproject.toml` for the installable package
- [Clean Code](../clean-code/overview) — single-responsibility functions, clear naming, docstrings
- [Performance](../performance/overview) — `@lru_cache` and persistent caching for repeated queries
- [JSON](../json/overview) — serialising requests and responses
- [API Authentication](../api-authentication/overview) — bearer token auth for the service itself

## How this works

1. Read [Requirements](./requirements) — what the project must do
2. Read [Milestones](./milestones) — suggested checkpoints so you do not get lost
3. Build it yourself — refer back to course lessons as needed
4. Self-assess against the [Rubric](./rubric)
5. Compare your approach to the [Reference Architecture](./reference-architecture) — only after you have built your own version

Start with [Requirements](./requirements).