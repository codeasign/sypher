---
title: Authorization
sidebar_label: Course Home
---

# Authorization

*Estimated completion time: 25-35 hours*

**Difficulty:** Intermediate

## What This Course Covers

Authorization is the gatekeeper of every secure system. It determines who can do what with which resources — and it is fundamentally different from authentication. This course covers the full authorization landscape: from HTTP basic auth and session cookies to OAuth 2.0, OpenID Connect, JWT, fine-grained access control, and authorization patterns for AI agents and LLM-powered systems. You will learn not just how to implement each mechanism, but when to use it and what trade-offs it carries.

## Why This Matters

Every API call, every database query, every agent tool invocation, and every user action passes through an authorization decision. Getting it wrong means data breaches, privilege escalation, compliance failures, and broken user experiences. As systems grow from monolithic apps to distributed microservices to multi-agent AI systems, authorization becomes the hardest security problem to get right. Modern AI platforms like Claude, ChatGPT, and Copilot all rely on authorization boundaries to scope what an agent can see and do. Understanding these patterns is essential for any engineer building production systems.

## Skills You Will Gain

- Distinguish authentication from authorization and choose the right mechanism for each scenario
- Implement HTTP Basic Auth, Digest Auth, and API key schemes
- Build session-based authentication with cookies and secure storage
- Issue and validate JSON Web Tokens (JWT) with signing and encryption
- Implement OAuth 2.0 authorization flows — authorization code, implicit, client credentials, device code
- Extend OAuth 2.0 with OpenID Connect for identity verification
- Design and enforce Role-Based Access Control (RBAC) with role hierarchies
- Implement Attribute-Based Access Control (ABAC) for fine-grained policies
- Secure APIs with scopes, permissions, and policy enforcement points
- Apply the Principle of Least Privilege and defense-in-depth
- Protect against common authorization vulnerabilities — CSRF, SSRF, privilege escalation, token leakage
- Implement authorization in microservice architectures with API gateways and service mesh
- Design authorization for AI agents and LLM tool-calling systems
- Configure MCP authorization for AI agent tool access
- Manage secrets, tokens, and credentials in production environments
- Set up Multi-Factor Authentication (MFA) and Single Sign-On (SSO)
- Implement password hashing, salting, and secure storage
- Design and audit permission models for multi-tenant systems

## Prerequisites

- Basic programming knowledge — you should be comfortable with functions, HTTP requests, and JSON
- Familiarity with web APIs and RESTful services
- No prior security experience required — all concepts are introduced from first principles

## Course Roadmap

### Section 1: Foundations of Authentication and Authorization

| Lesson | Description |
|--------|-------------|
| [Authentication vs. Authorization](./authentication-vs-authorization/overview) | The fundamental distinction and why it matters |
| [HTTP Basic and Digest Auth](./http-basic-digest-auth/overview) | The simplest auth mechanisms and their security trade-offs |
| [API Keys](./api-keys/overview) | Generating, validating, and rotating API keys |
| [Session-Based Authentication](./session-based-authentication/overview) | Cookies, session stores, and secure session management |
| [Password Hashing and Storage](./password-hashing-and-storage/overview) | bcrypt, argon2, salting, and secure password practices |
| [Multi-Factor Authentication](./multi-factor-authentication/overview) | TOTP, SMS, hardware keys, and recovery codes |

### Section 2: Token-Based Authentication

| Lesson | Description |
|--------|-------------|
| [JWT Fundamentals](./jwt-fundamentals/overview) | Structure, signing, verification, and common claims |
| [JWT Signing and Encryption](./jwt-signing-and-encryption/overview) | HMAC, RSA, ECDSA, and JWE for encrypted tokens |
| [Access and Refresh Tokens](./access-and-refresh-tokens/overview) | Short-lived access tokens, long-lived refresh tokens, rotation |
| [Token Storage and Security](./token-storage-and-security/overview) | Secure storage on client and server, token revocation |
| [Stateless vs. Stateful Tokens](./stateless-vs-stateful-tokens/overview) | Trade-offs between self-contained tokens and server-side sessions |

### Section 3: OAuth 2.0 and OpenID Connect

| Lesson | Description |
|--------|-------------|
| [OAuth 2.0 Overview](./oauth-2-0-overview/overview) | Roles, grant types, and the authorization framework |
| [Authorization Code Flow](./authorization-code-flow/overview) | The most secure OAuth flow for web applications |
| [PKCE Extension](./pkce-extension/overview) | Securing public clients against authorization code interception |
| [Client Credentials Flow](./client-credentials-flow/overview) | Machine-to-machine authorization for backend services |
| [Implicit and Device Code Flows](./implicit-and-device-code-flows/overview) | Legacy and input-constrained device authorization |
| [OpenID Connect](./openid-connect/overview) | Identity layer on top of OAuth 2.0 |
| [Scopes and Permissions](./scopes-and-permissions/overview) | Fine-grained access scoping in OAuth |

### Section 4: Access Control Models

| Lesson | Description |
|--------|-------------|
| [Role-Based Access Control](./role-based-access-control/overview) | Roles, permissions, role hierarchies, and assignment |
| [Attribute-Based Access Control](./attribute-based-access-control/overview) | Policy evaluation with user, resource, and environment attributes |
| [Relationship-Based Access Control](./relationship-based-access-control/overview) | ReBAC for social and multi-tenant systems |
| [Policy-Based Access Control](./policy-based-access-control/overview) | Declarative policies with OPA and Cedar |
| [Principle of Least Privilege](./principle-of-least-privilege/overview) | Granting minimum necessary access |
| [Defense in Depth](./defense-in-depth/overview) | Layered authorization controls |

### Section 5: API and Microservice Authorization

| Lesson | Description |
|--------|-------------|
| [API Gateway Authorization](./api-gateway-authorization/overview) | Centralized auth at the gateway layer |
| [Service-to-Service Auth](./service-to-service-auth/overview) | mTLS, service accounts, and workload identity |
| [Authorization in GraphQL](./authorization-in-graphql/overview) | Field-level and resolver-level authorization |
| [Rate Limiting and Throttling](./rate-limiting-and-throttling/overview) | Protecting authorization endpoints from abuse |
| [Audit Logging](./audit-logging/overview) | Recording authorization decisions for compliance |

### Section 6: Authorization for AI Agents and LLMs

| Lesson | Description |
|--------|-------------|
| [Agent Authorization Models](./agent-authorization-models/overview) | Scoping what an AI agent can see and do |
| [Tool-Calling Authorization](./tool-calling-authorization/overview) | Permissions per tool invocation |
| [MCP Authorization](./mcp-authorization/overview) | Authorization in the Model Context Protocol |
| [Human-in-the-Loop Authorization](./human-in-the-loop-authorization/overview) | Approval gates for sensitive agent actions |
| [Auditing AI Agent Actions](./auditing-ai-agent-actions/overview) | Tracing and logging authorization decisions in agent systems |

### Section 7: Production Authorization

| Lesson | Description |
|--------|-------------|
| [Secrets Management](./secrets-management/overview) | Vault, environment variables, and secret rotation |
| [Multi-Tenant Authorization](./multi-tenant-authorization/overview) | Isolating data and permissions across tenants |
| [Single Sign-On](./single-sign-on/overview) | SAML, OIDC, and federated identity |
| [Authorization Testing](./authorization-testing/overview) | Testing auth policies, penetration testing, and fuzzing |
| [Common Vulnerabilities and Mitigations](./common-vulnerabilities-and-mitigations/overview) | CSRF, SSRF, privilege escalation, token leakage, and more |

## How to Use This Course

Each lesson has four pages:

- **Overview** — the concept, why it matters, and when to use it
- **Build It** — hands-on implementation with complete code
- **Avoid Mistakes** — common pitfalls and how to fix them
- **Review** — key takeaways and self-test

You can read concept pages in order or jump to a specific lesson. The Build It pages assume you have completed the overview for that lesson.