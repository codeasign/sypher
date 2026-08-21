---
title: API Testing using Python
sidebar_label: Course Home
slug: /api-testing-python/
---

# API Testing using Python

*Estimated completion time: 25–35 hours*

**Difficulty:** Beginner to Advanced

## What This Course Covers

API Testing using Python is the complete reference for testing REST APIs with Python, pytest, and httpx. It starts from the basics — what API testing actually covers, and how a request/response contract differs from clicking through a UI — then moves into writing real requests, real assertions, and real test suites, all the way through schema validation, RBAC-aware permission testing, property-based testing straight from an OpenAPI spec, and a CI pipeline that gates on the results.

Every example in this course runs against the same real system used across this site's other automation courses: [`rbac-healthcare-system`](https://github.com/codedbyabhishekc/rbac-healthcare-system), a 4-role (Administrator/Doctor/Nurse/Patient) healthcare app with an Express + SQLite backend and Swagger docs at `/api-docs`. Python can't import that Node app in-process the way a JavaScript test runner could, so every test here is a real HTTP call against the running backend — **black-box testing**, the way most API test suites in the industry actually work.

The one idea that runs through every module, not just one lesson on it: the app's OpenAPI/Swagger spec is treated as the source of truth for what the API is supposed to do. Tests aren't just "does this endpoint work" — they're "does the real response match what the spec promises," and where the two disagree, that's worth noticing rather than papering over.

## Why This Matters

API testing is where most real-world test automation actually lives — UIs change constantly, but the contract underneath is what mobile clients, other services, and integrations all depend on staying correct. Testers who can write real HTTP-level tests, validate against a spec instead of guessing at behavior, and reason about a permission matrix across roles are the ones who move fastest from manual testing into automation roles. This course builds that skill against a real backend from the first module, not disposable toy examples, so what you practice here transfers directly to a production API test suite.

## Skills You Will Gain

- Write REST API tests in Python with pytest and httpx, both synchronous and async
- Read an OpenAPI/Swagger spec and treat it as the source of truth for expected behavior
- Generate test cases directly from a spec and validate responses against its schema
- Implement JWT authentication once and reuse it across a suite through fixtures
- Test role-based access control (RBAC) across a multi-role permission matrix
- Write negative and edge-case tests that probe how an API fails, not just how it succeeds
- Use property-based testing with Schemathesis to generate spec-driven test cases automatically
- Structure fixtures and test data for a maintainable, non-repetitive suite
- Parameterize tests and wire a suite into CI with meaningful reporting

## Prerequisites

- Basic Python — variables, functions, `for` loops, and a little `class`
- No prior API testing or automation experience required
- Comfortable running a backend service locally (covered in Module 0: Setup)

## Course Roadmap

<CourseCurriculum />

## How to Use This Course

Each module is one self-contained page: a plain-English explanation of the concept, a runnable example against the real RBAC healthcare app, and a short "Try it" exercise you can finish on your own. Work through the modules roughly in order — login and JWT handling are covered once, thoroughly, in Module 4, and every later module reuses the same pytest fixtures instead of re-deriving login logic. By the capstone, you'll design and build a standalone, spec-driven test suite for a part of the app no earlier module covered end to end — the same shape of work you'd do standing up API test coverage on a real team.

This course assumes you already know Python basics — variables, functions, `for` loops, maybe a little `class` — and are new to API test automation specifically. It's black-box by nature: you only need the backend running, not the frontend, and not a copy of the app's source in your test project. It sits alongside this site's other testing courses rather than replacing them — if TypeScript is more your speed, or you want full browser automation with Playwright, those are separate, complementary courses.
