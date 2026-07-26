---
title: Python for Test Automation
sidebar_label: Course Home
slug: /python-for-test-automation/
---

# Python for Test Automation

Estimated completion: 4-6 hours - Difficulty: Beginner, no programming background assumed

## What This Is

Python for Test Automation is a short, fast on-ramp for manual testers moving into test automation for the first time. It assumes no programming experience at all, and teaches only what's needed to confidently read and write a basic Python test — not the language in depth.

Every example in this course runs against the same real system used across this site's other automation courses: [`rbac-healthcare-system`](https://github.com/codedbyabhishekc/rbac-healthcare-system), a 4-role (admin/doctor/nurse/patient) healthcare app with an Express + SQLite backend at `http://localhost:5000` (Swagger docs at `/api-docs`) and a frontend at `http://localhost:3002`. You model real data from a real app from the very first module, not toy examples.

This course is deliberately not a substitute for learning the full language — it closes by pointing you toward Python for AI Engineers for depth, and naming realistic next steps (Selenium, Playwright's Python bindings, API testing with `requests`) once you're past this on-ramp.

## Modules

0. Setup
1. Just Enough Python to Read a Test
2. Functions and Imports
3. Setting Up pytest
4. Lists, Dicts, and Sets — Working with Test Data
5. Type Hints for Test Data
6. Calling APIs and Understanding Responses
7. Classes, Briefly
8. Fixtures and pytest Conventions
9. Structuring a Simple Test Project
10. Capstone: Modeling the RBAC Permission Matrix

## How to Use This Course

Each module is one self-contained page: a plain-English explanation, a runnable code example against the RBAC healthcare app, and a short "Try it" exercise you can finish in a few minutes. Work through the modules in order — each one moves quickly toward writing something that resembles a real test rather than dwelling on language theory. By the capstone, you'll model the RBAC app's own permission matrix as Python data and write a pytest test that checks a role against it — the same shape of work you'll do on a real automation team.
