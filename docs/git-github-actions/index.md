---
title: Git and GitHub Actions
sidebar_label: Course Home
---

# Git and GitHub Actions

*Estimated completion time: 25–35 hours*

**Difficulty:** Beginner to Advanced

## What This Course Covers

This course teaches Git from the ground up — from your first commit to production CI/CD pipelines. You will learn version control fundamentals, branching strategies, collaboration workflows, and GitHub Actions for automated testing and deployment. Every topic follows the same structure: understand the concept, build it with real commands, avoid common mistakes, and practice on your own.

## Why This Matters

Git is the universal version control system in software engineering. GitHub Actions is the most widely used CI/CD platform. Together they form the foundation of modern software development — every engineer needs to master both to collaborate effectively, automate quality gates, and ship reliable software.

## Skills You Will Gain

- Initialize repositories, stage changes, commit, and navigate history
- Branch, merge, rebase, and resolve conflicts with confidence
- Use collaborative workflows: pull requests, code review, forking
- Automate testing and deployment with GitHub Actions
- Build CI/CD pipelines with matrix builds, caching, and environments
- Implement quality gates, branch protection, and security scanning
- Debug and optimize pipelines for speed and reliability

## Prerequisites

- Basic terminal usage (navigating directories, running commands)
- A GitHub account (free tier is sufficient)
- No prior Git experience required

## Course Sections

### [Getting Started](./what-version-control-is/what-version-control-is-overview)

Set up Git, learn the terminal basics, and create your first repository.

| Lesson | Description |
|--------|-------------|
| [What Version Control Is and Why You Need It](./what-version-control-is/what-version-control-is-overview) | The problem Git solves |
| [Using the Terminal — The Only Commands You Need](./using-the-terminal/using-the-terminal-overview) | Navigate, create, edit, and run commands |
| [Installing Git and Configuring It](./installing-git/installing-git-overview) | Set up Git on your machine |
| [What GitHub Is and Creating Your Account](./what-github-is/what-github-is-overview) | Create your GitHub profile |
| [Your First Repository — Start to Finish](./your-first-repository/your-first-repository-overview) | Init, commit, push — end to end |

### [Git Foundations](./what-is-version-control/what-is-version-control-overview)

Master the core Git commands every developer uses daily.

| Lesson | Description |
|--------|-------------|
| [What Is Version Control](./what-is-version-control/what-is-version-control-overview) | Mental model for tracking changes |
| [Git Init, Add, and Commit](./git-init-add-commit/git-init-add-commit-overview) | The three-step save cycle |
| [The Git Staging Area](./git-staging-area/git-staging-area-overview) | Stage selectively before committing |
| [Git Log and History](./git-log-and-history/git-log-and-history-overview) | Read and search commit history |
| [Gitignore and Git Attributes](./gitignore-and-git-attributes/gitignore-and-git-attributes-overview) | Exclude files and configure behavior |
| [Git Reset, Revert, and Checkout](./git-reset-revert-checkout/git-reset-revert-checkout-overview) | Undo changes at every level |
| [Git Remotes, Push, and Pull](./git-remotes-push-pull/git-remotes-push-pull-overview) | Sync with GitHub |
| [Git Stash](./git-stash/git-stash-overview) | Save work-in-progress without committing |

### [Git Branching and History](./git-branching/git-branching-overview)

Branch, merge, rebase, and rewrite history with confidence.

| Lesson | Description |
|--------|-------------|
| [Git Branching](./git-branching/git-branching-overview) | Create, switch, and manage branches |
| [Git Merging](./git-merging/git-merging-overview) | Combine branches with merge commits |
| [Resolving Merge Conflicts](./resolving-merge-conflicts/resolving-merge-conflicts-overview) | Handle conflicting changes |
| [Git Rebasing](./git-rebasing/git-rebasing-overview) | Linearize history with rebase |
| [Interactive Rebase and History Rewriting](./interactive-rebase-history-rewriting/interactive-rebase-history-rewriting-overview) | Squash, reorder, and edit commits |
| [Cherry-Picking Commits](./cherry-picking-commits/cherry-picking-commits-overview) | Selectively apply commits across branches |
| [Git Bisect and Blame](./git-bisect-and-blame/git-bisect-and-blame-overview) | Find when and why a bug was introduced |
| [Git Tags and Releases](./git-tags-and-releases/git-tags-and-releases-overview) | Mark releases with tags |

### [Git Collaboration Workflows](./forking-and-pull-requests/forking-and-pull-requests-overview)

Collaborate effectively with pull requests, code review, and advanced Git features.

| Lesson | Description |
|--------|-------------|
| [Forking and Pull Requests](./forking-and-pull-requests/forking-and-pull-requests-overview) | Contribute to any repository |
| [Code Review Workflow](./code-review-workflow/code-review-workflow-overview) | Review, comment, and approve changes |
| [GitHub Issues and Project Boards](./github-issues-project-boards/github-issues-project-boards-overview) | Track work and manage projects |
| [Git Hooks](./git-hooks/git-hooks-overview) | Automate checks before commits |
| [Git Submodules](./git-submodules/git-submodules-overview) | Include one repository inside another |
| [Git Worktrees](./git-worktrees/git-worktrees-overview) | Work on multiple branches simultaneously |

### [GitHub Actions Fundamentals](./github-actions-fundamentals/github-actions-fundamentals-overview)

Automate testing, building, and deployment with GitHub Actions.

| Lesson | Description |
|--------|-------------|
| [GitHub Actions Fundamentals](./github-actions-fundamentals/github-actions-fundamentals-overview) | Core concepts: workflows, jobs, steps, runners |
| [Workflow YAML Syntax](./workflow-yaml-syntax/workflow-yaml-syntax-overview) | Write your first workflow file |
| [Triggers and Events](./triggers-and-events/triggers-and-events-overview) | When workflows run: push, PR, schedule |
| [Jobs, Steps, and Runners](./jobs-steps-runners/jobs-steps-runners-overview) | Structure and execution model |
| [Environment Variables and Secrets](./environment-variables-and-secrets/environment-variables-and-secrets-overview) | Manage configuration securely |
| [Artifacts and Build Outputs](./artifacts-and-build-outputs/artifacts-and-build-outputs-overview) | Share files between jobs |

### [CI/CD Pipelines](./building-a-ci-pipeline/building-a-ci-pipeline-overview)

Build production-grade pipelines for continuous integration and delivery.

| Lesson | Description |
|--------|-------------|
| [Building a CI Pipeline](./building-a-ci-pipeline/building-a-ci-pipeline-overview) | Test every push automatically |
| [Matrix Builds](./matrix-builds/matrix-builds-overview) | Test across OS and language versions |
| [Caching Dependencies](./caching-dependencies/caching-dependencies-overview) | Speed up workflows with caching |
| [Deployment Workflows and Continuous Delivery](./deployment-workflows-cd/deployment-workflows-cd-overview) | Deploy automatically after tests pass |
| [GitHub Environments and Approval Gates](./github-environments-approval-gates/github-environments-approval-gates-overview) | Stage-based deployment with manual gates |
| [Release Automation](./release-automation/release-automation-overview) | Automate changelogs and releases |

### [Advanced GitHub Actions and Gated Delivery](./required-status-checks-gated-checkins/required-status-checks-gated-checkins-overview)

Enforce quality with branch protection, security scanning, and reusable workflows.

| Lesson | Description |
|--------|-------------|
| [Required Status Checks and Gated Check-ins](./required-status-checks-gated-checkins/required-status-checks-gated-checkins-overview) | Block merges on failed checks |
| [CODEOWNERS and Required Reviewers](./codeowners-required-reviewers/codeowners-required-reviewers-overview) | Automate code review assignments |
| [Reusable Workflows and Composite Actions](./reusable-workflows-composite-actions/reusable-workflows-composite-actions-overview) | DRY your pipeline configuration |
| [Branch Protection Rules](./branch-protection-rules/branch-protection-rules-overview) | Enforce policies on critical branches |
| [Security Scanning with CodeQL and Dependabot](./security-scanning-codeql-dependabot/security-scanning-codeql-dependabot-overview) | Automate vulnerability detection |
| [Debugging GitHub Actions Workflows](./debugging-github-actions-workflows/debugging-github-actions-workflows-overview) | Diagnose and fix pipeline failures |

### [CI/CD as a Quality System](./pipelines-as-quality-gates/pipelines-as-quality-gates-overview)

Design pipelines that act as quality gates, not just build scripts.

| Lesson | Description |
|--------|-------------|
| [Pipelines as Quality Gates — The QE Mindset](./pipelines-as-quality-gates/pipelines-as-quality-gates-overview) | Shift quality left with automated gates |
| [Which Quality Gates Actually Matter](./which-quality-gates-matter/which-quality-gates-matter-overview) | Focus on gates that catch real defects |
| [Managing Flaky Tests in CI](./managing-flaky-tests/managing-flaky-tests-overview) | Detect, quarantine, and fix unreliable tests |
| [Test Parallelization and Pipeline Speed](./test-parallelization-pipeline-speed/test-parallelization-pipeline-speed-overview) | Run tests faster with parallel jobs |
| [Pipeline Reliability and Failure Triage](./pipeline-reliability-failure-triage/pipeline-reliability-failure-triage-overview) | Distinguish infrastructure from code failures |
| [Testing Your Pipelines and Workflows](./testing-your-pipelines/testing-your-pipelines-overview) | Validate pipeline changes before merging |

### [Capstone](./capstone/capstone-brief)

Apply everything you have learned in a complete real-world project.

## How to Use This Course

Each lesson has three pages:

- **Overview** — the concept, commands, and mental model
- **Practice Exercise** — a guided build with real commands and expected output
- **Practice Exercises** — unguided tiered exercises to prove your skills

You can read in order or jump to a specific lesson. The Practice Exercise pages assume you have completed the Overview for that lesson.