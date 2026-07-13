---
title: Authentication
sidebar_label: Lesson Home
---

# Authentication

*Estimated completion time: 45–60 minutes*

**Difficulty:** Advanced

## What This Lesson Covers

Agents that interact with external services — sending emails, querying CRMs, reading cloud storage, posting to Slack — need credentials. Unlike a human user who can type a password or approve a push notification, an agent runs autonomously. Every credential must be available before the task begins, stored securely, and refreshed automatically when it expires.

This lesson teaches you how to authenticate agents to access external tools and APIs using OAuth 2.0, API keys, and service accounts. You will learn to design secure OAuth 2.0 flows that work with unattended agent execution, implement user impersonation patterns so agents act on behalf of a specific user, and manage credentials with secure storage and automated rotation.

## Skills You Will Gain

- Authenticate agents to external APIs using OAuth 2.0, API keys, and service accounts
- Implement the OAuth 2.0 authorization code flow with PKCE for autonomous agents
- Design token refresh strategies that keep agents operational without human intervention
- Use service accounts for non-human identity in cloud platforms (AWS IAM, GCP, Azure)
- Implement user impersonation with OAuth 2.0 on-behalf-of (OBO) token exchange
- Store API keys, tokens, and credentials securely using secret managers and vaults
- Automate credential rotation and handle token expiry gracefully in agent execution loops
- Apply token exchange patterns for multi-hop authentication scenarios

## Prerequisites

You should already understand:

- Basic HTTP authentication concepts (headers, bearer tokens, basic auth)
- OAuth 2.0 grant types and the difference between authorization code and client credentials flows
- How agents select and call tools through the observe-think-act loop
- The tool-calling patterns covered in the Agent Tools and Tool Calling lesson

## Lesson Structure

Each topic in this lesson has four pages:

| Page | What It Covers |
|------|---------------|
| [Overview](./overview) | Core concepts, trade-offs, and the big picture of agent authentication |
| [Build It](./build-it) | Hands-on implementation of API key management, OAuth 2.0 refresh, and service account authentication |
| [Avoid Mistakes](./avoid-mistakes) | Common pitfalls — hardcoded credentials, expired tokens, leaked secrets — and how to fix them |
| [Review](./review) | Key takeaways and self-test to reinforce your understanding |

## Start Here

Begin with the [Overview](./overview) to understand the authentication landscape for autonomous agents.