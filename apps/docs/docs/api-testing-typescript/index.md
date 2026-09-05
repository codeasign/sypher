---
title: API Testing using TypeScript
sidebar_label: Course Home
slug: /api-testing-typescript/
---

# API Testing using TypeScript

*Estimated completion time: 25 to 35 hours*

**Difficulty:** Beginner to advanced

## What this course covers

API Testing using TypeScript is the complete reference for testing REST APIs with TypeScript, Jest, and Supertest. It starts from the basics, what API testing even covers and how it differs from clicking through a UI, then moves quickly into writing real requests, real assertions, and real test suites, all the way through schema validation, RBAC-aware permission testing, security testing, and a CI pipeline that actually gates on the results.

Every example in this course runs against the same real system used across this site's other automation courses: [`rbac-healthcare-system`](https://github.com/codedbyabhishekc/rbac-healthcare-system), a 4-role (Administrator/Doctor/Nurse/Patient) healthcare app with an Express + SQLite backend and Swagger docs at `/api-docs`. Rather than calling it over the network, this course tests **in-process**, importing the Express `app` directly and driving it with Supertest, so you get fast, deterministic tests with no server process to babysit. That distinction, and why it matters, is the whole subject of the second module.

You test the same app from a growing number of angles as the course progresses: CRUD, schema, the full permission matrix across all 4 roles, negative cases, security. That mirrors how you would work on a real project, instead of a different disposable example every lesson.

## Why this matters

Most production API test suites live in the same language as the rest of the team's codebase, and for a huge share of teams today that is TypeScript. Being able to write fast, in-process API tests, not just slower black-box HTTP calls, is what lets a suite run in seconds instead of minutes and gate every pull request instead of running once a night. This course builds that skill against a real Express backend, covering the same ground a real team's API test suite has to cover: auth, CRUD, schema, permissions, security, and CI.

## Skills you will gain

- Write REST API tests in TypeScript with Jest and Supertest
- Distinguish in-process testing from black-box HTTP testing, and know when to use each
- Implement JWT authentication once and reuse it across a suite through helpers
- Validate responses against a schema and against an OpenAPI spec
- Test role-based access control (RBAC) across a multi-role permission matrix
- Write negative, edge-case, and security-focused tests
- Structure fixtures, test data, and database state for a maintainable suite
- Mock and isolate dependencies, and prevent flaky tests before they start
- Parameterize tests, measure coverage, and wire a suite into CI/CD with GitHub Actions

## Prerequisites

- Basic JavaScript/TypeScript: variables, functions, `async`/`await`
- No prior API testing or automation experience required
- Comfortable running a backend service locally (covered in Module 0: Setup)

## Course roadmap

<CourseCurriculum />

## How to use this course

Each module is one self-contained page: a plain-English explanation of the concept, a runnable example against the RBAC healthcare app, and a short "Try it" exercise you can finish on your own. Work through the modules roughly in order. Auth is introduced once, thoroughly, in its own module, and every later module reuses that same helper instead of re-deriving login logic. By the capstone, you will design and build a standalone test suite for a not-yet-covered part of the RBAC app, applying setup, auth, CRUD, the RBAC matrix, negative cases, and CI end to end, the same shape of work you would do standing up API test coverage on a real team.

This course assumes you already know JavaScript/TypeScript basics and are new to API test automation specifically. It sits alongside this site's other testing courses rather than replacing them. If you want the fastest possible on-ramp from manual testing first, or full UI automation with Playwright, those are separate, complementary courses.
