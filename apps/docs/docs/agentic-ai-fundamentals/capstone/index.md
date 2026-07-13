---
title: Capstone Project
sidebar_label: Capstone
---

# Capstone: OmniSage Research Assistant

You will build OmniSage — a production-ready research assistant agent that accepts natural-language questions, plans multi-step research tasks, and produces cited, scored, professionally formatted reports. This is not a chatbot that generates text. It is an autonomous agent that orchestrates multiple tools, retrieves live data from the web and GitHub, queries databases, remembers conversation history, recovers from failures, evaluates its own output, and exports a report you would be proud to show in a portfolio or interview.

## What you'll build

OmniSage is a Plan-and-Execute research agent connected to at least three MCP servers (web search, GitHub, database). It accepts a research question, generates a structured plan, executes each step by calling the right MCP tool, reflects on the results, retries failed calls with exponential backoff, logs every decision with full tracing, evaluates the completeness and accuracy of its own output, produces per-claim confidence scores with citations, and exports a final professional report. Every action is observable through structured logs and traces.

## Time estimate

25–40 hours, broken down as follows:

| Phase | Hours |
|-------|-------|
| Core agent loop with planning | 8–12 |
| MCP server integration (3+ servers) | 6–10 |
| Memory, logging, and tracing | 4–6 |
| Self-evaluation, citations, confidence scoring | 4–6 |
| Report generation and export | 3–4 |
| Integration, testing, and polish | 4–6 |

## Skills this draws on

- [System Prompts](../system-prompts/overview) — design the agent's persistent persona and behavior guardrails
- [Prompt Patterns](../prompt-patterns/overview) — apply persona, template, and chain-of-thought patterns
- [Structured Output Prompting](../structured-output-prompting/overview) — generate confidence scores, citations, and report sections as typed JSON
- [What Is an Agent?](../what-is-an-agent/overview) — understand autonomy, tool use, and memory as core properties
- [Anatomy of an Agent](../anatomy-of-an-agent/overview) — model, orchestrator, tools, memory, safety layer
- [Agent Memory](../agent-memory/overview) — implement short-term and long-term conversation memory
- [Agent Tools and Tool Calling](../agent-tools-and-tool-calling/overview) — define tool schemas and dispatch tool calls
- [Planning and Decision Making](../planning-and-decision-making/overview) — implement dynamic replanning on failure
- [Observe-Think-Act Loop](../observe-think-act-loop/overview) — the fundamental execution cycle
- [ReAct Pattern](../react-pattern/overview) — interleave reasoning traces with tool actions
- [Plan and Execute](../plan-and-execute/overview) — separate planning from execution with a persistent plan document
- [Reflection and Self-Correction](../reflection-and-self-correction/overview) — agent critiques its own output before presentation
- [Loop Safety and Recovery](../loop-safety-and-recovery/overview) — timeouts, turn limits, circuit breakers
- [Human in the Loop](../human-in-the-loop/overview) — approval gates for high-risk export actions
- [MCP Primitives](../mcp-primitives/overview) — tools, resources, and prompts on MCP servers
- [Building an MCP Server](../building-an-mcp-server/overview) — scaffold custom MCP servers
- [Building an MCP Client](../building-an-mcp-client/overview) — connect agents to MCP servers
- [Web Search Server](../web-search-server/overview) — live web search and page fetching
- [GitHub Server](../github-server/overview) — search repos, read issues and PRs
- [Database Server](../database-server/overview) — safe SQLite/PostgreSQL queries
- [Custom MCP Server](../custom-mcp-server/overview) — build any additional server you need
- [Evaluating Agents](../evaluating-agents/overview) — design a multi-level evaluation framework
- [Trajectory Evaluation](../trajectory-evaluation/overview) — measure tool-call efficiency and correctness
- [Tool Evaluation](../tool-evaluation/overview) — measure per-tool invocation and error rates
- [Prompt Injection and Guardrails](../prompt-injection-and-guardrails/overview) — defense-in-depth for external data sources
- [Observability, Logging, and Tracing](../observability-logging-and-tracing/overview) — structured logs, OpenTelemetry spans
- [Cost and Latency Tracking](../cost-and-latency-tracking/overview) — track per-session token usage and cost
- [Caching and Retries](../caching-and-retries/overview) — cache LLM responses, retry with backoff
- [Monitoring Production Agents](../monitoring-production-agents/overview) — SLIs, SLOs, dashboards, alerting

## How this works

1. **Read [Requirements](./requirements)** — what the project must do
2. **Read [Milestones](./milestones)** — suggested checkpoints so you don't get lost
3. **Build it yourself** — refer back to course lessons as needed
4. **Self-assess against the [Rubric](./rubric)**
5. **Compare your approach to the [Reference Architecture](./reference-architecture)** — only after you've built your own version

Start with [Requirements](./requirements).