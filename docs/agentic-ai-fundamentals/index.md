---
title: Agentic AI Fundamentals
sidebar_label: Course Home
---

# Agentic AI Fundamentals

*Estimated completion time: 35–47 hours*

**Difficulty:** Intermediate to Advanced

## What This Course Covers

This course bridges the gap between basic prompt engineering and building autonomous AI agents that perceive, reason, act, and learn. You will start by understanding what agents are and how they differ from chatbots and deterministic workflows. From there you will build each component of an agent system — memory, tools, planning, execution loops — until you have a complete working agent architecture. The course culminates in multi-agent systems and the Model Context Protocol (MCP), preparing you to design and deploy production-grade agent systems that connect to real tools and data sources.

## Why This Matters

Every major AI platform — Anthropic, OpenAI, Google, Microsoft — is investing heavily in agentic systems. The ability to design systems that do not just generate text but take action, make decisions, and recover from errors is the skill that separates prototype builders from production engineers. By the end of this course, you will have built agentic systems from scratch and understand the architectural patterns used in production deployments today.

## Skills You Will Gain

- Design and build autonomous agents with tool-calling, memory, and planning
- Distinguish between agents, chatbots, and workflows — and choose the right architecture
- Implement the observe-think-act loop with safe execution boundaries
- Add structured memory (short-term, long-term, episodic) to agent systems
- Build tool-calling infrastructure with error handling and validation
- Implement reasoning patterns: ReAct, Plan-and-Execute, reflection
- Add safety loops, rate limiting, and human-in-the-gate oversight
- Debug and recover from failed agent runs gracefully
- Design orchestrator, supervisor, and specialist multi-agent architectures
- Implement inter-agent communication with structured message protocols
- Manage shared state across multiple agents with conflict resolution
- Build MCP servers and clients using the official protocol and SDKs
- Configure and use MCP within Claude Code for production workflows
- Build and deploy MCP servers for filesystem, GitHub, databases, web search, and Slack
- Design and implement custom MCP servers using the Python and TypeScript SDKs
- Evaluate agent performance across outcome, trajectory, and step-level metrics
- Implement prompt injection defenses and guardrails for production safety
- Set up observability, logging, and tracing with OpenTelemetry
- Track per-session cost and latency and optimize them systematically
- Deploy agent systems with CI/CD pipelines, Docker, and blue-green deployment strategies
- Version prompts and tool definitions with rollback and migration support
- Manage configuration across environments with layered config systems and secrets management
- Authenticate agents to call external APIs with OAuth 2.0, service accounts, and token management
- Scale agent systems horizontally with load balancing, rate limiting, and async queues
- Cache LLM responses and implement retry strategies with exponential backoff and circuit breakers
- Monitor production agents with SLIs/SLOs, dashboards, and alerting

## Prerequisites

- Python programming — functions, classes, async/await
- Basic familiarity with LLM APIs — you should have called an API like Anthropic or OpenAI at least once (covered in [LLM APIs in Practice](./llm-apis-in-practice/overview) if you need a refresher)
- Understanding of prompts and system messages (covered in [Prompt Engineering Basics](./prompt-engineering-basics/overview))
- Basic knowledge of JSON for tool definitions

## Course Roadmap

<CourseCurriculum />

## How to Use This Course

Each lesson has four pages:

- **Overview** — the concept, why it matters, and when to use it
- **Build It** — hands-on implementation with complete code
- **Avoid Mistakes** — common pitfalls and how to fix them
- **Review** — key takeaways and self-test

You can read concept pages in order or jump to a specific lesson. The Build It pages assume you have completed the overview for that lesson.