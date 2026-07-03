# /add-topic-git-github-actions-capstone

Generate the Git and GitHub Actions Capstone for the Sypher platform.

**Intent:** Every prior topic taught one capability in isolation. The capstone forces the student to combine all of them into one realistic engineering workflow: a real feature built through a real PR, protected by a real CI/CD pipeline, that cannot merge until it passes gated checks. This is not guided reading — it is a project the student actually builds in their own GitHub account, with a working repo as the portfolio artifact at the end.

## Usage

```
/add-topic-git-github-actions-capstone
```

No arguments — there is only one capstone.

---

## Files to generate

```
docs/git-github-actions/capstone/
├── index.md
├── 01-brief.mdx
├── 02-repo-and-branch-strategy.mdx
├── 03-feature-branch-and-commits.mdx
├── 04-opening-the-pull-request.mdx
├── 05-ci-pipeline.mdx
├── 06-branch-protection-and-gated-checkins.mdx
├── 07-cd-pipeline-and-environments.mdx
├── 08-review-and-merge.mdx
└── 09-review.mdx
```

---

## Page 1 — index.md

```md
---
id: capstone
title: Capstone — Ship a Feature Through a Real Gated Pipeline
sidebar_label: Capstone
---

import DocCardList from '@theme/DocCardList';

# Capstone: Ship a Feature Through a Real Gated Pipeline

You have learned Git and GitHub Actions one capability at a time. Now you build one real thing end to end: a small application, a feature branch, a pull request, a CI pipeline that has to pass before anyone can merge, branch protection that enforces it, and a CD pipeline that deploys only after every gate is green.

This capstone lives in a real GitHub repository you create yourself. By the end, you will have a working repo you can link to in interviews and on your resume, showing an actual gated delivery pipeline, not a description of one.

<DocCardList />
```

---

## Page 2 — 01-brief.mdx "The Mission"

**Target length:** 300–400 lines.

**Structure:**

### The Project
A small, realistic application the student builds just enough of to have something worth shipping through a pipeline — pick something genuinely simple to build (a CLI tool, a small API with 2–3 endpoints, a static site generator script) so the focus stays on the Git/CI/CD workflow, not on building a large app. State the exact project explicitly so every student builds the same thing and the walkthrough stays concrete.

### The Constraints
- Main branch must never be broken — nothing merges without passing CI
- Every change goes through a pull request, never a direct push to main
- At least one required status check must block merge until it passes
- Deployment (to a free target — GitHub Pages, or a mock "deploy" job that just echoes success) only happens after merge to main, never from a feature branch

### What You Will Build Across This Capstone
One-sentence overview of each of the 7 remaining pages.

### How to Use This Capstone
Instructions: this one is not read-then-move-on. Actually create the GitHub repo, actually run every command, actually open the pull request. Reading without doing defeats the purpose.

**Frontmatter:**
```
---
id: capstone-brief
title: The Brief
sidebar_label: Brief
sidebar_position: 1
---
```

**MDX Safety Rules — MANDATORY (apply to every page in this capstone):**
- Import AsciiDiagram at top of any file using it: `import AsciiDiagram from '@site/src/components/AsciiDiagram';` — the only line allowed to start with the literal word `import`.
- Every `<AsciiDiagram>` must have a `title` prop.
- Never leave a blank line inside an `<AsciiDiagram>{...}</AsciiDiagram>` block. Always close with an explicit `</AsciiDiagram>` — never a self-closing `` `} /> ``.
- Inside `<AsciiDiagram>` content, never use raw `<`/`>` for arrows or box corners — use Unicode (`→ ← ↔ ↑ ↓ ↕`).
- No bare `<` before digits, ratios, or fractions in prose.
- No raw `{` or `}` in prose outside a fenced code block or inline code. This is critical here — every YAML workflow file, every shell command, and every JSON config must sit inside a proper fenced code block, never typed inline as prose.
- No unescaped colon inside a frontmatter `title` value.
- No `:::info` `:::note` `:::tip` `:::warning` admonitions.
- No Chinese characters, no DSML `｜` or `<|...|>` artifacts.
- Numbers must be concrete.

---

## Page 3 — 02-repo-and-branch-strategy.mdx "Set the Foundation"

**Target length:** 400–500 lines.

**Structure:**
1. Create the GitHub repo (exact steps, `git init` or `gh repo create`, initial commit)
2. Branch strategy for this capstone — trunk-based with short-lived feature branches, explain why over Git Flow for a project this size
3. `<AsciiDiagram>` showing the branch strategy: main branch, feature branch, where CI runs, where the merge happens
4. Initial repo structure — the minimal files needed for the chosen project (from the brief) plus a placeholder CI config location

**Frontmatter:**
```
---
id: capstone-repo-and-branch-strategy
title: Repo and Branch Strategy
sidebar_label: Repo and Branch Strategy
sidebar_position: 2
---
```

Same MDX safety rules as Page 2. Minimum 2 `<AsciiDiagram>` blocks.

---

## Page 4 — 03-feature-branch-and-commits.mdx "Build the Feature"

**Target length:** 400–600 lines.

**Structure:**
1. Create the feature branch (exact command)
2. Build the actual feature from the brief — real, minimal, working code with real commands to create the files
3. Commit strategy — atomic commits with clear messages, exact `git add`/`git commit` sequence shown
4. Push the branch (exact command)
5. `<AsciiDiagram>` showing the commit history on the feature branch diverging from main

**Frontmatter:**
```
---
id: capstone-feature-branch-and-commits
title: Feature Branch and Commits
sidebar_label: Feature Branch and Commits
sidebar_position: 3
---
```

Same MDX safety rules as Page 2. Minimum 1 `<AsciiDiagram>` block.

---

## Page 5 — 04-opening-the-pull-request.mdx "Open the PR"

**Target length:** 400–500 lines.

**Structure:**
1. Opening the PR via GitHub UI and via `gh pr create` — both paths shown
2. Writing a real PR description — what to include (what changed, why, how to test), a template the student can copy
3. Linking the PR to an issue if using GitHub Issues (`Closes #N` syntax)
4. What happens automatically the moment a PR opens — this is the bridge into the CI page next

**Frontmatter:**
```
---
id: capstone-opening-the-pull-request
title: Opening the Pull Request
sidebar_label: Opening the PR
sidebar_position: 4
---
```

Same MDX safety rules as Page 2.

---

## Page 6 — 05-ci-pipeline.mdx "Build the CI Pipeline"

**Target length:** 600–800 lines. This is one of the two most important pages in the capstone.

**Structure:**
1. What CI must verify for this project — lint, test, build, at minimum
2. The full, real, working GitHub Actions workflow YAML for CI, triggered `on: pull_request`, shown in a complete fenced ` ```yaml ` block — every line the student can copy directly into `.github/workflows/ci.yml`
3. Walk through the YAML section by section explaining every key
4. `<AsciiDiagram>` showing the pipeline: PR opened → workflow triggered → jobs run in parallel/sequence → status reported back to the PR
5. Pushing the workflow file and watching it run for the first time — what the student should see in the Actions tab, including what a failing run looks like and how to read the logs
6. Making the CI pipeline actually fail once on purpose (break a test intentionally), observing the red X on the PR, then fixing it and watching it go green — this contrast is the actual lesson

**Frontmatter:**
```
---
id: capstone-ci-pipeline
title: The CI Pipeline
sidebar_label: CI Pipeline
sidebar_position: 5
---
```

Same MDX safety rules as Page 2. Minimum 2 `<AsciiDiagram>` blocks.

---

## Page 7 — 06-branch-protection-and-gated-checkins.mdx "Gate the Merge"

**Target length:** 500–700 lines. This is the other most important page — it's the one explicitly requested as a capstone requirement.

**Structure:**
1. What a gated check-in actually means: the merge button is disabled until specific conditions are met, not just a suggestion or a manual review step
2. Configuring branch protection on `main` — exact GitHub UI steps: require pull request before merging, require the specific CI status check to pass, require at least 1 approving review, optionally require conversation resolution and up-to-date branches before merge
3. `<AsciiDiagram>` showing the gate: PR with CI failing → merge button disabled; PR with CI passing + no approval → still disabled; PR with CI passing + approval → merge enabled
4. Testing the gate — attempt to merge with a failing check, show what the student sees (blocked), then attempt with everything green
5. CODEOWNERS file — requiring specific reviewers for specific paths, shown with a real example file
6. Why gated check-ins matter at scale — connect this to the reliability/incident-prevention framing, not just "GitHub makes you do this"

**Frontmatter:**
```
---
id: capstone-branch-protection-and-gated-checkins
title: Branch Protection and Gated Check-ins
sidebar_label: Gated Check-ins
sidebar_position: 6
---
```

Same MDX safety rules as Page 2. Minimum 2 `<AsciiDiagram>` blocks.

---

## Page 8 — 07-cd-pipeline-and-environments.mdx "Build the CD Pipeline"

**Target length:** 500–700 lines.

**Structure:**
1. The rule: CD only triggers on merge to `main`, never on a feature branch or an open PR — explain why
2. The full, real, working GitHub Actions workflow YAML for CD, triggered `on: push: branches: [main]`, shown in a complete fenced ` ```yaml ` block, deploying to the chosen free target from the brief (GitHub Pages, or a mock deploy job)
3. GitHub Environments — configuring a `production` environment with a required reviewer/approval gate before the deploy job runs, shown with exact setup steps
4. `<AsciiDiagram>` showing the full pipeline end to end: PR merge → CD triggered → environment approval gate → deploy job → live
5. Watching the first real deployment happen, verifying the deployed result

**Frontmatter:**
```
---
id: capstone-cd-pipeline-and-environments
title: CD Pipeline and Environments
sidebar_label: CD Pipeline
sidebar_position: 7
---
```

Same MDX safety rules as Page 2. Minimum 2 `<AsciiDiagram>` blocks.

---

## Page 9 — 08-review-and-merge.mdx "Close the Loop"

**Target length:** 300–400 lines.

**Structure:**
1. Requesting a review (self-review is fine for a solo capstone, but walk through what a real reviewer checks)
2. Responding to review comments — amending commits vs. adding new commits, when to use each
3. The actual merge — squash vs. merge commit vs. rebase-merge, explain the trade-off and which this capstone uses and why
4. Deleting the feature branch after merge, pulling `main` locally to sync
5. Watching the CD pipeline fire automatically from the merge

**Frontmatter:**
```
---
id: capstone-review-and-merge
title: Review and Merge
sidebar_label: Review and Merge
sidebar_position: 8
---
```

Same MDX safety rules as Page 2.

---

## Page 10 — 09-review.mdx "What You Built"

**Target length:** 300–400 lines.

**Structure:**
1. One final `<AsciiDiagram>` — the complete pipeline, start to finish, every gate labeled
2. Checklist: what the student's repo should now contain and do, verifiable item by item
3. Interview readiness self-assessment — 8 questions about CI/CD and gated delivery the student should be able to answer without notes
4. What to extend next: add a second required status check (security scan), add a staging environment before production, add a matrix build across multiple runtime versions
5. Link this repo in your portfolio — explicit encouragement to keep this repo public and reference it

**Frontmatter:**
```
---
id: capstone-review
title: Review and What Comes Next
sidebar_label: Review
sidebar_position: 9
---
```

Same MDX safety rules as Page 2. Minimum 1 `<AsciiDiagram>` block.

---

## Sidebar entry

Target file: `sidebars/git-github-actions.json` — the same shared file used by `/add-topic-git-github-actions`.

If the file doesn't exist yet (capstone run before any topic), create it with the full skeleton first:

```json
{
  "gitGithubActionsSidebar": [
    { "type": "category", "label": "Git Foundations", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Git Branching and History", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Git Collaboration Workflows", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "GitHub Actions Fundamentals", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "CI/CD Pipelines", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Advanced GitHub Actions and Gated Delivery", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Capstone", "collapsible": false, "items": [] }
  ]
}
```

Locate the top-level category object whose `"label"` is exactly `"Capstone"` and replace its `"items"` array with:

```json
[
  "git-github-actions/capstone/capstone-brief",
  "git-github-actions/capstone/capstone-repo-and-branch-strategy",
  "git-github-actions/capstone/capstone-feature-branch-and-commits",
  "git-github-actions/capstone/capstone-opening-the-pull-request",
  "git-github-actions/capstone/capstone-ci-pipeline",
  "git-github-actions/capstone/capstone-branch-protection-and-gated-checkins",
  "git-github-actions/capstone/capstone-cd-pipeline-and-environments",
  "git-github-actions/capstone/capstone-review-and-merge",
  "git-github-actions/capstone/capstone-review"
]
```

Do not touch the six topic-tier category objects in this file — only the "Capstone" category's items array.

---

## Content quality gates

- [ ] The CI workflow YAML on page 5 is complete and would actually run if pasted into a real repo — no placeholder steps
- [ ] The CD workflow YAML on page 7 is complete and actually deploys to the stated target
- [ ] Branch protection steps on page 6 are exact, current GitHub UI steps, not vague gestures at "configure branch protection"
- [ ] The capstone explicitly demonstrates a blocked merge (failing check) and an unblocked merge (passing check) — not just described, shown
- [ ] No `<AsciiDiagram>` block has an internal blank line or a self-closing `/>` terminator
- [ ] No unescaped colon inside any frontmatter `title` value
- [ ] Every YAML/shell/JSON snippet is in a proper fenced code block, never raw braces in prose

---

## Pre-flight validation

Run automatically after writing all 9 files — no confirmation needed before running this.

1. Build with `npm run start` and watch for MDX compilation errors in the terminal output.
2. If any file fails, diagnose by the exact error (`ruleId`, file, line, column) from the build output.
3. **Common MDX errors and their fixes:**

   | Error pattern | Root cause | Fix |
   |---|---|---|
   | `Expected a closing tag for <your>` or any `<word>` tag | MDX treats `<word>` in prose as a JSX component. Happens with placeholders like `<your-branch>`, `<your-name>`, `<commit-hash>` | Wrap the placeholder in backticks for inline code: `` `<your-branch>` ``. Or replace `<` and `>` with `&lt;` and `&gt;`. |
   | `Expected a closing tag for <details>` / `end-tag-mismatch` | A `<details>` block (used for hints or collapsed content) is missing its matching `</details>` closing tag | Count every `<details>` in the file and verify each has a matching `</details>`. Add the missing closing tag. |
   | `Expected a closing tag for <summary>` | A `<summary>` inside a `<details>` block is missing its closing `</summary>` tag | Add `</summary>` before the content that follows the summary line. |
   | `end-tag-mismatch` with any HTML-like tag | Angle brackets used in prose outside of code blocks (e.g., `<your-repo>`, `<commit-hash>`, `if (x < 5)`) | Move the content into a fenced code block, or wrap inline references in backticks. |
   | **AsciiDiagram renders as blank/empty box** (no build error) | AsciiDiagram uses `>` `{` `` ` `` (children pattern) instead of `content={` `` ` `` (content prop) | Replace `>` before `{` `` ` `` with `content=`. Replace `</AsciiDiagram>` with `/>`. Run `grep -rn '</AsciiDiagram>' docs/` after generation. |

4. Apply the matching fix and re-run the build. Repeat up to 3 times per file; flag anything still failing as `NEEDS MANUAL REVIEW`.
5. Do not print the final summary table until every file builds clean or is explicitly flagged.

---

## Final output

| File | Lines | Diagrams | Status |
|------|-------|----------|--------|
| 01-brief.mdx | N | N | ✅ |
| 02-repo-and-branch-strategy.mdx | N | N | ✅ |
| 03-feature-branch-and-commits.mdx | N | N | ✅ |
| 04-opening-the-pull-request.mdx | N | N | ✅ |
| 05-ci-pipeline.mdx | N | N | ✅ |
| 06-branch-protection-and-gated-checkins.mdx | N | N | ✅ |
| 07-cd-pipeline-and-environments.mdx | N | N | ✅ |
| 08-review-and-merge.mdx | N | N | ✅ |
| 09-review.mdx | N | N | ✅ |

Then run `npm run check:mdx` to confirm zero MDX compilation errors. Do NOT run `npm start` or `npm run build` — full builds are reserved for final deploy only.
