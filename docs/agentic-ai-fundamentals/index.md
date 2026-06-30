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

### Section 1: Foundations

| Lesson | Description |
|--------|-------------|
| [What Is AI Engineering?](./what-is-ai-engineering/overview) | The discipline and scope of AI engineering |
| [LLM Fundamentals](./llm-fundamentals/overview) | How LLMs work under the hood |
| [Tokens and Context Windows](./tokens-and-context-windows/overview) | Tokenization, context limits, and cost |
| [Prompt Engineering Basics](./prompt-engineering-basics/overview) | Structure, roles, and best practices |
| [LLM APIs in Practice](./llm-apis-in-practice/overview) | Calling LLMs from code |
| [System Prompts](./system-prompts/overview) | Persistent behavior via system messages |
| [Prompt Patterns](./prompt-patterns/overview) | Reusable prompt structures |
| [Few-Shot Prompting](./few-shot-prompting/overview) | In-context learning with examples |
| [Chain of Thought and Reasoning](./chain-of-thought-and-reasoning/overview) | Step-by-step reasoning techniques |
| [Prompt Templates](./prompt-templates/overview) | Dynamic prompt construction |
| [Structured Output Prompting](./structured-output-prompting/overview) | JSON and schema-constrained output |
| [Prompt Testing and Iteration](./prompt-testing-and-iteration/overview) | Systematic prompt evaluation |

### Section 2: AI Agents Fundamentals

| Lesson | Description |
|--------|-------------|
| [What Is an Agent?](./what-is-an-agent/overview) | Defining agents and their core properties |
| [Agent vs. Chatbot vs. Workflow](./agent-vs-chatbot-vs-workflow/overview) | Architectural comparison and decision guide |
| [Anatomy of an Agent](./anatomy-of-an-agent/overview) | Components: model, tools, memory, orchestrator |
| [Reasoning vs. Execution](./reasoning-vs-execution/overview) | Separating thinking from doing |
| [Agent Memory](./agent-memory/overview) | Short-term, long-term, and episodic memory |
| [Agent Tools and Tool Calling](./agent-tools-and-tool-calling/overview) | Defining, registering, and invoking tools |
| [Planning and Decision Making](./planning-and-decision-making/overview) | Planning strategies and trade-offs |

### Section 3: Agentic Execution

| Lesson | Description |
|--------|-------------|
| [Observe-Think-Act Loop](./observe-think-act-loop/overview) | The fundamental agent execution cycle |
| [ReAct Pattern](./react-pattern/overview) | Reasoning + acting in interleaved steps |
| [Plan and Execute](./plan-and-execute/overview) | Decompose first, then execute |
| [Reflection and Self-Correction](./reflection-and-self-correction/overview) | Agents that critique and improve their own output |
| [Loop Safety and Recovery](./loop-safety-and-recovery/overview) | Timeouts, retries, circuit breakers |
| [Human in the Loop](./human-in-the-loop/overview) | Approval gates, escalation, oversight |

### Section 4: Multi-Agent Systems

| Lesson | Description |
|--------|-------------|
| [Orchestrator and Supervisor Patterns](./orchestrator-and-supervisor-patterns/overview) | Central coordinator and quality-gate architectures |
| [Specialist Agents](./specialist-agents/overview) | Designing domain-specific agents with bounded competence |
| [Agent Communication and Coordination](./agent-communication-and-coordination/overview) | Message protocols, buses, and conflict resolution |
| [Shared Memory and State](./shared-memory-and-state/overview) | Centralized, event-sourced, and snapshot-based state |
| [When to Use Multi-Agent](./when-to-use-multi-agent/overview) | Decision framework for choosing the right architecture |

### Section 5: Model Context Protocol

| Lesson | Description |
|--------|-------------|
| [What Is MCP?](./what-is-mcp/overview) | The Model Context Protocol and its role in agent tooling |
| [MCP Architecture](./mcp-architecture/overview) | Client-server lifecycle, capability negotiation, transports |
| [MCP Primitives](./mcp-primitives/overview) | Tools, Resources, and Prompts — the three core primitives |
| [Transports](./transports/overview) | stdio and SSE transport layers and deployment trade-offs |
| [Building an MCP Server](./building-an-mcp-server/overview) | Creating a production-grade MCP server with the Python SDK |
| [Building an MCP Client](./building-an-mcp-client/overview) | Connecting agents to MCP servers via custom clients |
| [MCP with Claude Code](./mcp-with-claude-code/overview) | Configuring MCP servers in Claude Code settings.json |

### Section 6: MCP Servers in Practice

| Lesson | Description | Type |
|--------|-------------|------|
| [Filesystem Server](./filesystem-server/overview) | Sandboxed file read/write/search via MCP | Practical |
| [GitHub Server](./github-server/overview) | Issues, PRs, code search, and repo management | Practical |
| [Database Server](./database-server/overview) | Safe SQLite/PostgreSQL querying through MCP | Practical |
| [Web Search Server](./web-search-server/overview) | Live web search and page fetching via Brave API | Practical |
| [Slack Server](./slack-server/overview) | Read, search, and send messages in Slack channels | Practical |
| [Custom MCP Server](./custom-mcp-server/overview) | Scaffolding and deploying bespoke MCP servers | Practical |

### Section 7: Evaluation and Reliability

| Lesson | Description | Type |
|--------|-------------|------|
| [Evaluating Agents](./evaluating-agents/overview) | Three-level evaluation framework for agent systems | Conceptual |
| [Trajectory Evaluation](./trajectory-evaluation/overview) | Measuring tool call sequences for efficiency and safety | Conceptual |
| [Tool Evaluation](./tool-evaluation/overview) | Per-tool invocation, error, and accuracy analysis | Practical |
| [Prompt Injection and Guardrails](./prompt-injection-and-guardrails/overview) | Defense-in-depth against adversarial prompts | Conceptual |
| [Observability, Logging, and Tracing](./observability-logging-and-tracing/overview) | Structured logs, OpenTelemetry spans, and dashboards | Conceptual |
| [Cost and Latency Tracking](./cost-and-latency-tracking/overview) | Per-session cost, latency breakdown, and budget alerts | Conceptual |

### Section 8: Production Agent Systems

| Lesson | Description | Type |
|--------|-------------|------|
| [Deployment Patterns](./deployment-patterns/overview) | CI/CD, Docker, blue-green deployment for agent systems | Practical |
| [Versioning Prompts and Tools](./versioning-prompts-and-tools/overview) | Prompt registries, tool contracts, rollback strategies | Conceptual |
| [Configuration Management](./configuration-management/overview) | Layered config, secrets management, feature flags | Practical |
| [Authentication](./authentication/overview) | OAuth 2.0, service accounts, token management for agents | Conceptual |
| [Scaling Agent Systems](./scaling-agent-systems/overview) | Horizontal scaling, load balancing, rate limiting, queues | Conceptual |
| [Caching and Retries](./caching-and-retries/overview) | LLM response caching, exponential backoff, circuit breakers | Conceptual |
| [Monitoring Production Agents](./monitoring-production-agents/overview) | SLIs/SLOs, dashboards, alerting, incident response | Conceptual |

## How to Use This Course

Each lesson has four pages:

- **Overview** — the concept, why it matters, and when to use it
- **Build It** — hands-on implementation with complete code
- **Avoid Mistakes** — common pitfalls and how to fix them
- **Review** — key takeaways and self-test

You can read concept pages in order or jump to a specific lesson. The Build It pages assume you have completed the overview for that lesson.