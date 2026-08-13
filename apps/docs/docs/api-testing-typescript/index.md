---
title: API Testing using TypeScript
sidebar_label: Course Home
slug: /api-testing-typescript/
---

# API Testing using TypeScript

Estimated completion: 25-35 hours - Difficulty: Beginner to Advanced

## What This Is

API Testing using TypeScript is the complete reference for testing REST APIs with TypeScript, Jest, and Supertest. It starts from the basics — what API testing even covers, and how it's different from clicking through a UI — then moves quickly into writing real requests, real assertions, and real test suites, all the way through schema validation, RBAC-aware permission testing, security testing, and a CI pipeline that actually gates on the results.

Every example in this course runs against the same real system used across this site's other automation courses: [`rbac-healthcare-system`](https://github.com/codedbyabhishekc/rbac-healthcare-system), a 4-role (Administrator/Doctor/Nurse/Patient) healthcare app with an Express + SQLite backend and Swagger docs at `/api-docs`. Rather than calling it over the network, this course tests **in-process** — importing the Express `app` directly and driving it with Supertest — so you get fast, deterministic tests with no server process to babysit. That distinction, and why it matters, is the whole subject of the second module.

You test the same app from a growing number of angles as the course progresses — CRUD, schema, the full permission matrix across all 4 roles, negative cases, security — the way you would on a real project, instead of a different disposable example every lesson.

## Modules

0. Setup
1. API Testing Foundations
2. In-Process vs Black-Box Testing
3. TypeScript + Jest + Supertest Setup
4. Writing Supertest Requests
5. Async/Await + Jest
6. Authentication + JWT
7. CRUD API Testing
8. Assertions + Response Validation
9. Schema + Contract Validation
10. OpenAPI Testing
11. RBAC + Permission Matrix
12. Negative + Edge-Case Testing
13. API Security Testing
14. Test Data + Fixtures
15. Database Testing
16. Mocking + Isolation
17. Flaky Test Prevention
18. Parameterized Testing
19. Test Framework Architecture
20. API Test Coverage
21. Reporting + Diagnostics
22. CI/CD + GitHub Actions
23. Parallel Test Execution
24. Smoke + Performance Testing
25. Requirements → Test Design
26. Capstone: API Automation

## How to Use This Course

Each module is one self-contained page: a plain-English explanation of the concept, a runnable example against the RBAC healthcare app, and a short "Try it" exercise you can finish on your own. Work through the modules roughly in order — auth is introduced once, thoroughly, in its own module, and every later module reuses that same helper instead of re-deriving login logic. By the capstone, you'll design and build a standalone test suite for a not-yet-covered part of the RBAC app, applying setup, auth, CRUD, the RBAC matrix, negative cases, and CI end to end — the same shape of work you'd do standing up API test coverage on a real team.

This course assumes you already know JavaScript/TypeScript basics and are new to API test automation specifically. It sits alongside this site's other testing courses rather than replacing them — if you want the fastest possible on-ramp from manual testing first, or full UI automation with Playwright, those are separate, complementary courses.
