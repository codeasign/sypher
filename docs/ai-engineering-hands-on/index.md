---
title: AI Engineering Crash Course
sidebar_label: Course Home
---

# AI Engineering Crash Course

*Estimated completion time: 35–50 hours*

**Difficulty:** Intermediate to Advanced

## What This Course Covers

This course teaches you to build real AI applications with LLM APIs, local models, MCP servers, and autonomous agents — from your first API call to a production-ready agent system. Every lesson follows the same structure: understand the concept, build it with real code, avoid common mistakes, and practice on your own.

## Why This Matters

AI engineering is the most in-demand skill in software development. Companies need engineers who can do more than prompt — who can integrate LLMs into applications, build agent systems that take action, connect to tools and data sources, and deploy reliable AI pipelines. This course gives you those skills by building real things from day one.

## Skills You Will Gain

- Call LLM APIs (OpenAI, Anthropic) with proper authentication and error handling
- Stream responses, enforce structured output, and design effective prompts
- Build model routers with fallback between cloud and local models (Ollama)
- Use Claude Code for real development workflows with custom slash commands
- Build MCP servers that expose tools, resources, and prompts
- Design and implement autonomous agents with tool calling and memory
- Build agent loops with safe termination, cost tracking, and error recovery
- Implement multi-step reasoning, planning, and re-planning
- Evaluate and debug agent systems with structured logging and metrics

## Prerequisites

- Python programming — functions, classes, basic async/await
- Familiarity with the command line (terminal, file navigation, environment variables)
- An API key from [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/) (the course covers both)
- No prior LLM or AI experience required

## Course Sections

### [Getting Started](./what-llm-and-api-are/overview)

Understand what an LLM API actually is, set up Python, manage environment variables, and make your first API call.

| Lesson | Description |
|--------|-------------|
| [What an LLM and an API Actually Are](./what-llm-and-api-are/overview) | The mental model for working with LLMs |
| [Installing Python and Using the Terminal](./installing-python-and-terminal/overview) | Set up your development environment |
| [Environment Variables Explained from Zero](./environment-variables-explained/overview) | Secrets management without the mystery |
| [What You Are About to Build and Why](./what-you-are-about-to-build/overview) | The full course roadmap |
| [Get a Key, Make One Call, See It Work](./get-a-key-make-one-call/overview) | Your first working API call |

### [Calling LLMs Directly](./calling-the-openai-api/overview)

Make real API calls to OpenAI and Anthropic, handle streaming, enforce structured output, and design effective prompts.

| Lesson | Description |
|--------|-------------|
| [Calling the OpenAI API](./calling-the-openai-api/overview) | Chat completions with the OpenAI SDK |
| [Calling the Anthropic API](./calling-the-anthropic-api/overview) | Messages API with the Anthropic SDK |
| [Streaming Responses](./streaming-responses/overview) | Real-time token-by-token streaming |
| [Structured Output and JSON Mode](./structured-output-and-json-mode/overview) | Enforce typed JSON responses |
| [Prompt Engineering Fundamentals](./prompt-engineering-fundamentals/overview) | Design prompts that produce reliable output |

### [Provider Routing and Local Models](./light-llms-when-to-use-them/overview)

Choose between cloud and local models, build fallback routers, and run models on your own machine with Ollama.

| Lesson | Description |
|--------|-------------|
| [Light LLMs and When to Use Them](./light-llms-when-to-use-them/overview) | Cost-speed-quality trade-offs |
| [Building a Model Router with Fallback](./building-a-model-router-with-fallback/overview) | Automatic fallback when a model fails |
| [Using OpenRouter for Multi-Provider Access](./using-openrouter/overview) | One API for dozens of models |
| [Running Models Locally with Ollama](./running-models-locally-with-ollama/overview) | Local models for privacy and offline use |
| [Cloud vs Local — Cost and Privacy Trade-offs](./cloud-vs-local-tradeoffs/overview) | Decide when each makes sense |

### [Claude Code as a Tool](./getting-started-with-claude-code/overview)

Use Claude Code for real development workflows, write custom slash commands, automate tasks, and connect MCP servers.

| Lesson | Description |
|--------|-------------|
| [Getting Started with Claude Code](./getting-started-with-claude-code/overview) | Install, configure, and run your first session |
| [Claude Code Workflows for Real Tasks](./claude-code-workflows/overview) | Edit, review, debug, and refactor with AI |
| [Writing Custom Slash Commands](./writing-custom-slash-commands/overview) | Build your own /commands |
| [Automating Dev Tasks with Claude Code](./automating-dev-tasks-with-claude-code/overview) | Automate tests, builds, and deployments |
| [Claude Code with MCP Connectors](./claude-code-with-mcp-connectors/overview) | Connect Claude Code to external tools via MCP |

### [MCP Servers](./what-is-mcp/overview)

Understand the Model Context Protocol, use existing MCP servers, build your own, and connect them to Claude.

| Lesson | Description |
|--------|-------------|
| [What is MCP](./what-is-mcp/overview) | The Model Context Protocol explained |
| [Using Existing MCP Servers](./using-existing-mcp-servers/overview) | Install and configure pre-built servers |
| [Building Your First MCP Server](./building-your-first-mcp-server/overview) | Scaffold an MCP server with Python |
| [Exposing Tools and Resources via MCP](./exposing-tools-and-resources-via-mcp/overview) | Add tools, resources, and prompts to your server |
| [Connecting Your MCP Server to Claude](./connecting-your-mcp-server-to-claude/overview) | Configure your server in Claude Code |

### [Building AI Agents](./what-is-an-ai-agent/overview)

Design and build autonomous agents that perceive, reason, act, and learn — with tool calling, planning, evaluation, and debugging.

| Lesson | Description |
|--------|-------------|
| [What is an AI Agent](./what-is-an-ai-agent/overview) | Agents vs chatbots vs workflows |
| [Tool Use and Function Calling](./tool-use-and-function-calling/overview) | Give your agent the power to act |
| [The Agent Loop](./the-agent-loop/overview) | The perceive-think-act execution cycle |
| [Multi-Step Reasoning and Planning](./multi-step-reasoning-and-planning/overview) | Decompose, plan, execute, re-plan |
| [Evaluating and Debugging Agents](./evaluating-and-debugging-agents/overview) | Log, trace, score, and improve |

## How to Use This Course

Each lesson has three pages:

- **Overview** — the concept, API reference, and mental model
- **Practice Exercise** — a guided build with real code and expected output
- **Practice Exercises** — unguided tiered exercises to prove your skills

You can read in order or jump to a specific lesson. The Practice Exercise pages assume you have completed the Overview for that lesson.