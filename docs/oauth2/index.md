---
id: oauth2
title: OAuth 2.0
sidebar_label: Course Home
slug: /oauth2
---

# OAuth 2.0

*Estimated completion time: 20-30 hours*

**Difficulty:** Intermediate

## What This Course Covers

OAuth 2.0 is the industry-standard protocol for authorization. It enables applications to obtain limited access to user accounts on an HTTP service without exposing user credentials. From social login buttons on websites to API access for mobile apps, from machine-to-machine service communication to AI agent tool authorization — OAuth 2.0 powers the authorization layer of virtually every modern web and cloud application. This course covers every OAuth 2.0 grant type, the extension frameworks that build on it, and the security patterns you need to deploy it safely in production.

## Why This Matters

Every time you click "Sign in with Google," every API call from a third-party app, every CI/CD pipeline accessing a cloud provider, and every AI agent invoking a tool with delegated permissions — OAuth 2.0 is the protocol making it possible. It is the foundation of API security for the internet. Misconfiguring OAuth 2.0 — using the wrong flow, mishandling redirect URIs, leaking authorization codes, neglecting CSRF protection — is a common source of critical security vulnerabilities in web and mobile applications. Understanding OAuth 2.0 end to end is essential for any engineer building systems that delegate access.

## Skills You Will Gain

- Understand the four OAuth 2.0 roles — resource owner, client, authorization server, resource server
- Distinguish each grant type and choose the right one for your application architecture
- Implement the Authorization Code flow with PKCE for web and mobile applications
- Configure the Client Credentials flow for machine-to-machine communication
- Use the Device Authorization flow for input-constrained devices
- Understand when and why the Implicit and ROPC flows are deprecated
- Design and enforce OAuth 2.0 scopes for fine-grained access control
- Issue, validate, and rotate access tokens and refresh tokens
- Register and configure OAuth clients with redirect URIs and client secrets
- Protect against CSRF, authorization code interception, redirect URI manipulation, and token leakage
- Use JWT as an access token format and integrate with OpenID Connect
- Implement token exchange, token revocation, and token introspection
- Deploy OAuth 2.0 in microservice and API gateway architectures
- Apply OAuth 2.0 patterns for AI agent and MCP authorization
- Set up OAuth 2.0 with major providers — Google, GitHub, Auth0, and Azure AD
- Write integration tests for OAuth 2.0 flows

## Prerequisites

- Basic understanding of HTTP, REST APIs, and JSON
- Familiarity with authentication concepts — login, session, cookie, token
- No prior OAuth experience required — all concepts are introduced from first principles
- Basic programming skills in at least one language (examples in Python, JavaScript, and Go)

## Course Roadmap

### Section 1: OAuth 2.0 Fundamentals

| Lesson | Description |
|--------|-------------|
| [What Is OAuth 2.0?](./what-is-oauth-2-0/overview) | The problem OAuth solves, core concepts, and the protocol at a glance |
| [OAuth 2.0 Roles](./oauth-2-0-roles/overview) | Resource owner, client, authorization server, resource server — who does what |
| [Grant Types Overview](./grant-types-overview/overview) | The six grant types and when to use each one |
| [Authorization Server Basics](./authorization-server-basics/overview) | Endpoints, client registration, and the authorization decision |
| [OAuth 2.0 Scopes](./oauth-2-0-scopes/overview) | Defining and requesting scoped permissions |

### Section 2: Authorization Code Flow

| Lesson | Description |
|--------|-------------|
| [Authorization Code Flow](./authorization-code-flow/overview) | The standard flow for web applications — step by step |
| [PKCE Extension](./pkce-extension/overview) | Proof Key for Code Exchange — securing public clients |
| [Redirect URI Validation](./redirect-uri-validation/overview) | Protecting against open redirector and code interception attacks |
| [State Parameter and CSRF](./state-parameter-and-csrf/overview) | Using the state parameter to prevent cross-site request forgery |
| [Authorization Code in Practice](./authorization-code-in-practice/overview) | Complete implementation in Python, JavaScript, and Go |

### Section 3: Client Credentials Flow

| Lesson | Description |
|--------|-------------|
| [Client Credentials Flow](./client-credentials-flow/overview) | Machine-to-machine authorization for backend services |
| [Client Authentication Methods](./client-authentication-methods/overview) | Client secret, client assertion, mTLS, and private key JWT |
| [Service Accounts](./service-accounts/overview) | Creating and managing service accounts for automated access |
| [Client Credentials in Practice](./client-credentials-in-practice/overview) | Implementation with API gateways, CI/CD, and microservices |

### Section 4: Other Grant Types

| Lesson | Description |
|--------|-------------|
| [Device Authorization Flow](./device-authorization-flow/overview) | Authorization for TVs, CLI tools, and input-constrained devices |
| [Implicit Flow (Legacy)](./implicit-flow-legacy/overview) | Why the implicit flow is deprecated and what to use instead |
| [ROPC Flow (Legacy)](./ropc-flow-legacy/overview) | Resource Owner Password Credentials — why it is discouraged |
| [Grant Type Selection Guide](./grant-type-selection-guide/overview) | Decision framework for choosing the right grant type |

### Section 5: OAuth 2.0 Tokens

| Lesson | Description |
|--------|-------------|
| [Access Tokens](./access-tokens/overview) | Opaque tokens vs. structured tokens — when to use each |
| [Refresh Tokens](./refresh-tokens/overview) | Long-lived tokens for seamless session renewal |
| [Refresh Token Rotation](./refresh-token-rotation/overview) | Automatic rotation and reuse detection |
| [Token Formats](./token-formats/overview) | Opaque tokens, JWT access tokens, and reference tokens |
| [Token Revocation](./token-revocation/overview) | Revoking tokens with the RFC 7009 revocation endpoint |
| [Token Introspection](./token-introspection/overview) | Inspecting active token state with the RFC 7662 introspection endpoint |

### Section 6: OAuth 2.0 Extensions

| Lesson | Description |
|--------|-------------|
| [Token Exchange](./token-exchange/overview) | RFC 8693 — exchanging one token for another across trust domains |
| [JWT Bearer Token Flow](./jwt-bearer-token-flow/overview) | RFC 7523 — using JWT as a client assertion or authorization grant |
| [SAML 2.0 Bearer Assertion Flow](./saml-2-0-bearer-assertion-flow/overview) | RFC 7522 — federated authorization with SAML |
| [Rich Authorization Request](./rich-authorization-request/overview) | RFC 9396 — detailed authorization requests with structured data |
| [OAuth 2.0 for First-Party Clients](./oauth-2-0-for-first-party-clients/overview) | Special considerations for apps owned by the same organization |

### Section 7: OAuth 2.0 and OpenID Connect

| Lesson | Description |
|--------|-------------|
| [OAuth 2.0 vs. OpenID Connect](./oauth-2-0-vs-openid-connect/overview) | Authorization vs. authentication — how OIDC builds on OAuth 2.0 |
| [ID Tokens](./id-tokens/overview) | The JWT that carries identity information |
| [UserInfo Endpoint](./userinfo-endpoint/overview) | Fetching identity claims with the UserInfo endpoint |
| [Discovery and Metadata](./discovery-and-metadata/overview) | OpenID Connect Discovery and JWK Set metadata |
| [Hybrid Flow](./hybrid-flow/overview) | Combining Implicit and Authorization Code flows in OIDC |

### Section 8: OAuth 2.0 Security

| Lesson | Description |
|--------|-------------|
| [Common OAuth 2.0 Vulnerabilities](./common-oauth-2-0-vulnerabilities/overview) | Authorization code interception, CSRF, redirect URI manipulation, mix-up attacks |
| [Redirect URI Best Practices](./redirect-uri-best-practices/overview) | Validation strategies, allowlists, and wildcard pitfalls |
| [Client Secret Management](./client-secret-management/overview) | Generating, storing, and rotating client secrets |
| [Confidential vs. Public Clients](./confidential-vs-public-clients/overview) | When to use each and the security implications |
| [OAuth 2.0 Throttling and Rate Limiting](./oauth-2-0-throttling-and-rate-limiting/overview) | Protecting authorization endpoints from abuse and brute force |
| [OAuth 2.0 Security Best Practices](./oauth-2-0-security-best-practices/overview) | OAuth 2.0 Security Best Current Practice (RFC 9700) |

### Section 9: OAuth 2.0 in Practice

| Lesson | Description |
|--------|-------------|
| [OAuth 2.0 with Google](./oauth-2-0-with-google/overview) | Configuring Google OAuth 2.0 for web and mobile apps |
| [OAuth 2.0 with GitHub](./oauth-2-0-with-github/overview) | GitHub OAuth apps and GitHub App installation tokens |
| [OAuth 2.0 with Auth0](./oauth-2-0-with-auth0/overview) | Auth0 as an authorization server — tenants, rules, and actions |
| [OAuth 2.0 with Azure AD](./oauth-2-0-with-azure-ad/overview) | Microsoft identity platform and OAuth 2.0 in Azure |
| [OAuth 2.0 in Mobile Apps](./oauth-2-0-in-mobile-apps/overview) | ASWebAuthenticationSession, Chrome Custom Tabs, and AppAuth |
| [OAuth 2.0 in Single-Page Applications](./oauth-2-0-in-single-page-applications/overview) | The BFF (Backend for Frontend) pattern and PKCE for SPAs |

### Section 10: OAuth 2.0 for Microservices and APIs

| Lesson | Description |
|--------|-------------|
| [API Gateway and OAuth 2.0](./api-gateway-and-oauth-2-0/overview) | Validating tokens at the gateway with Kong, Envoy, and AWS API Gateway |
| [Service-to-Service OAuth 2.0](./service-to-service-oauth-2-0/overview) | Token exchange and delegation across service boundaries |
| [OAuth 2.0 Scope Enforcement](./oauth-2-0-scope-enforcement/overview) | Enforcing scopes at the API layer with policy engines |
| [OAuth 2.0 Audit Logging](./oauth-2-0-audit-logging/overview) | Tracking token issuance, usage, and revocation |

### Section 11: OAuth 2.0 for AI Agents

| Lesson | Description |
|--------|-------------|
| [OAuth 2.0 for AI Agent Tools](./oauth-2-0-for-ai-agent-tools/overview) | Delegating user authorization to AI agent tool calls |
| [MCP and OAuth 2.0](./mcp-and-oauth-2-0/overview) | Authorization patterns in the Model Context Protocol |
| [User-Delegated Agent Authorization](./user-delegated-agent-authorization/overview) | Flows where users authorize agents to act on their behalf |
| [Scoping Agent Access](./scoping-agent-access/overview) | Fine-grained scopes and token-level restrictions for AI agents |

### Section 12: Production OAuth 2.0

| Lesson | Description |
|--------|-------------|
| [Building an Authorization Server](./building-an-authorization-server/overview) | Implementing OAuth 2.0 endpoints with a framework |
| [OAuth 2.0 Testing](./oauth-2-0-testing/overview) | Testing OAuth 2.0 flows with integration tests and mock servers |
| [OAuth 2.0 Compliance](./oauth-2-0-compliance/overview) | OAuth 2.0 conformance profiles and certification |
| [OAuth 2.0 Monitoring and Observability](./oauth-2-0-monitoring-and-observability/overview) | Metrics, logging, and alerting for authorization infrastructure |
| [OAuth 2.0 and Regulatory Compliance](./oauth-2-0-and-regulatory-compliance/overview) | OAuth 2.0 in regulated environments — GDPR, HIPAA, SOC 2 |

## How to Use This Course

Each lesson has four pages:

- **Overview** — the concept, why it matters, and when to use it
- **Build It** — hands-on implementation with complete code
- **Avoid Mistakes** — common pitfalls and how to fix them
- **Review** — key takeaways and self-test

You can read concept pages in order or jump to a specific lesson. The Build It pages assume you have completed the overview for that lesson.

## Quick Reference

| Resource | Link |
|----------|------|
| RFC 6749 (OAuth 2.0) | [datatracker.ietf.org/doc/html/rfc6749](https://datatracker.ietf.org/doc/html/rfc6749) |
| RFC 6750 (Bearer Token) | [datatracker.ietf.org/doc/html/rfc6750](https://datatracker.ietf.org/doc/html/rfc6750) |
| RFC 6819 (OAuth 2.0 Threat Model) | [datatracker.ietf.org/doc/html/rfc6819](https://datatracker.ietf.org/doc/html/rfc6819) |
| RFC 7636 (PKCE) | [datatracker.ietf.org/doc/html/rfc7636](https://datatracker.ietf.org/doc/html/rfc7636) |
| RFC 7009 (Token Revocation) | [datatracker.ietf.org/doc/html/rfc7009](https://datatracker.ietf.org/doc/html/rfc7009) |
| RFC 7662 (Token Introspection) | [datatracker.ietf.org/doc/html/rfc7662](https://datatracker.ietf.org/doc/html/rfc7662) |
| RFC 8693 (Token Exchange) | [datatracker.ietf.org/doc/html/rfc8693](https://datatracker.ietf.org/doc/html/rfc8693) |
| RFC 9700 (Best Current Practice) | [datatracker.ietf.org/doc/html/rfc9700](https://datatracker.ietf.org/doc/html/rfc9700) |
| OAuth 2.0 for Browser-Based Apps | [datatracker.ietf.org/doc/html/rfc9700](https://datatracker.ietf.org/doc/html/rfc9700) |
| OpenID Connect Core | [openid.net/specs/openid-connect-core-1_0.html](https://openid.net/specs/openid-connect-core-1_0.html) |
| OAuth.net | [oauth.net](https://oauth.net) |
| OAuth 2.0 Playground | [oauth.com/playground](https://oauth.com/playground) |
| Auth0 Learning Resources | [auth0.com/docs](https://auth0.com/docs) |