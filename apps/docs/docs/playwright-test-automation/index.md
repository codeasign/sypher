---
title: Playwright Test Automation
sidebar_label: Course Home
slug: /playwright-test-automation/
---

# Playwright Test Automation

*Estimated completion time: 30–45 hours*

**Difficulty:** Beginner to Advanced

## What This Course Covers

Playwright Test Automation is a complete, TypeScript-only reference course for [Playwright](https://playwright.dev/), covering everything from your first locator to the 2026 AI/agentic stack — test agents, MCP, and self-healing tests. It is built to be the sole comprehensive reference for the tool, not a breadth-skimming tour: every module is deep enough to stand alone as a reference page you come back to.

Every module runs its examples against the same system under test: [`rbac-healthcare-system`](https://github.com/codedbyabhishekc/rbac-healthcare-system), a real 4-role (admin/doctor/nurse/patient) healthcare app with an Express API, SQLite database, JWT auth, and a documented — and deliberately not fully implemented — role-permission matrix. You test the same app from a growing number of angles as the course progresses, the way you would a real project, instead of a different disposable example every lesson.

## Why This Matters

Playwright's auto-waiting model eliminates an entire category of flaky test that older tools like Selenium require you to work around by hand. But knowing the API surface isn't enough to use it well in a real codebase — you need locators that survive refactors, fixtures that don't repeat setup logic, a permission-matrix testing strategy for role-based apps, and a working sense of when an AI test agent earns its keep versus when a hand-written script is the right call. This course builds all of it, in order, against one real application.

## Skills You Will Gain

- Write resilient locators and web-first assertions that survive UI refactors
- Structure a Playwright project with the Page Object Model and reusable fixtures
- Handle authentication, session state, and role-based access control in tests
- Intercept and mock network requests, and drive API requests directly from Playwright
- Test dynamic and async UI, and run visual/snapshot and cross-browser tests
- Scale a suite with parallelism, sharding, and test isolation, and debug failures efficiently
- Report on and organize a large test suite, and wire it into CI
- Use Playwright's AI/agentic stack — test agents, MCP, and self-healing tests — and know when to reach for them versus a hand-written script

## Prerequisites

- Working knowledge of TypeScript — this course is TypeScript-only
- Basic familiarity with web technologies (HTML, HTTP, DOM)
- No prior test automation experience required — Module 0 covers setup from scratch

## Course Roadmap

<CourseCurriculum />

## Quick Reference

| Resource | Link |
|----------|------|
| Playwright official docs | [playwright.dev/docs](https://playwright.dev/docs/intro) |
| Playwright GitHub | [github.com/microsoft/playwright](https://github.com/microsoft/playwright) |
| System under test | [rbac-healthcare-system](https://github.com/codedbyabhishekc/rbac-healthcare-system) |
| Playwright MCP | [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) |

## How to Use This Course

Each lesson has four pages:

- **Overview** — the concept, why it matters, and when to use it
- **Build It** — hands-on implementation with complete code against the RBAC healthcare app
- **Avoid Mistakes** — common pitfalls and how to fix them
- **Review** — key takeaways and self-test

You can read concept pages in order or jump to a specific lesson. The Build It pages assume you have completed the overview for that lesson.
