---
description: Add a new coding bootcamp pattern module or problem with LeetCode-style split layout, solution pages, and Judge0 test cases.
---

# Add a Coding Bootcamp Module or Problem: $ARGUMENTS

Read **CLAUDE.md** first and follow every instruction exactly.

## Structure

Each coding bootcamp pattern module follows this structure:

```
docs/coding-bootcamp/
├── index.mdx                              (landing page — update if adding new module)
└── <pattern-name>/                         (e.g. sliding-window, binary-search)
    ├── index.mdx                           (theory page, sidebar_label: "Theory")
    └── exercises/
        ├── easy/
        │   ├── <problem-name>.mdx          (exercise with ProblemEditor)
        │   └── ...
        ├── medium/
        │   └── ...
        └── hard/
            └── ...
solutions/
├── easy/
│   ├── <problem-name>.mdx                  (solution with deep dive + commented code)
│   └── ...
├── medium/
│   └── ...
└── hard/
    └── ...
```

## Adding a New Pattern Module

If creating a new pattern (e.g. "Sliding Window"), you need:

1. **Theory page**: `docs/coding-bootcamp/<pattern>/index.mdx` — uses `<AsciiDiagram>` for visual explanation, follows the same format as `two-pointers/index.mdx`
2. **Exercise files**: At least 5 problems across Easy (2), Medium (2), Hard (1)
3. **Solution files**: One per exercise, in `solutions/<difficulty>/`
4. **Sidebar update**: `sidebars/coding-bootcamp.json` — add the new pattern category with exercises and solutions
5. **Landing page update**: `docs/coding-bootcamp/index.mdx` — add the new pattern to the list

## Adding a Single Problem

### 1. Exercise MDX File

Location: `docs/coding-bootcamp/<pattern>/exercises/<difficulty>/<problem-name>.mdx`

Frontmatter:
```yaml
---
title: <Problem Name>
sidebar_label: <Short Label>
hide_table_of_contents: true
---
```

Import:
```jsx
import ProblemEditor from '@site/src/components/ProblemEditor/Index';
```

Structure:
```jsx
<ProblemEditor
  meta={{ id: '<problem-slug>', timeLimitSeconds: 2, memoryLimitKb: 262144 }}
  testCases={[
    { stdin: '...\n', expectedOutput: '...\n' },
    // ...20 test cases covering all edge cases
  ]}
  starterCode={{
    python: `def ...`,
    java: `class Solution { ... }`,
    cpp: `class Solution { ... };`,
    typescript: `function ...`,
    javascript: `function ...`,
    rust: `fn ...`,
    c: `...`,
    csharp: `class Solution { ... }`,
  }}
  harness={{
    python: `import sys\n...`,
    java: `public class Main { ... }`,
    // ...per-language harness that reads stdin, calls the function, prints output
  }}
  defaultLanguage="python"
>

# <Problem Name>

**Difficulty:** Easy/Medium/Hard

Problem description...

## Example 1

**Input:** `...`  
**Output:** `...`  
**Explanation:** ...

## Example 2
...

## Input Specification
...

## Output Specification
...

## Constraints
...

## Hints

<details>
<summary>Hint 1</summary>
...
</details>

</ProblemEditor>

---

**📖 View the [detailed solution](../solutions/<difficulty>/<problem-name>)** for a step-by-step walkthrough, multiple approaches, and code in all languages.

## Next

Now try [Next Problem](./next-problem).
```

### Starter Code Guidelines

- **Python**: Function signature with type hints, `# your code here`, `pass`
- **Java**: `class Solution { public ... }` with `return` default
- **C++**: `class Solution { public: ... };` 
- **JavaScript/TypeScript**: Function signature with comment body
- **Rust**: Function signature with type annotations
- **C**: Function signature with pointer params
- **C#**: `class Solution { public ... }`

### Harness Guidelines

The harness is the main/driver code that:
1. Reads stdin
2. Parses the input according to the problem spec
3. Calls the user's function
4. Prints the output in the expected format

Must be provided for: python, python27, javascript, java, cpp, c, csharp, rust, typescript

### Test Case Guidelines

Each problem must have **20 test cases** covering:
- Minimum constraints (n=1, n=2)
- Typical cases
- Edge cases (empty, all same, reversed, etc.)
- Negative numbers where applicable
- Large values within constraints
- Duplicates where applicable

### 2. Solution MDX File

Location: `docs/coding-bootcamp/<pattern>/solutions/<difficulty>/<problem-name>.mdx`

Frontmatter:
```yaml
---
title: <Problem Name> — Solution
sidebar_label:   Solution
---
```

Structure:
```jsx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# <Problem Name> — Solution

## Problem Overview
...

## Brute Force Approach
- Explanation
- Complexity: O(n²) time, O(n) space

## Optimal Approach: <Pattern Name>
- Algorithm steps
- Complexity: O(n) time, O(1) space

## Deep Dive
- Visual walkthrough with ASCII trace
- Edge cases
- Why the approach works

## Code

<Tabs>
  <TabItem value="python" label="Python">
  ```python
  def solution(...):
      # Inline comments explaining each step
      ...
  ```
  </TabItem>
  <TabItem value="java" label="Java">...</TabItem>
  <TabItem value="cpp" label="C++">...</TabItem>
  <TabItem value="javascript" label="JavaScript">...</TabItem>
  <TabItem value="typescript" label="TypeScript">...</TabItem>
  <TabItem value="rust" label="Rust">...</TabItem>
  <TabItem value="c" label="C">...</TabItem>
  <TabItem value="csharp" label="C#">...</TabItem>
</Tabs>

## Key Takeaways
- ...

## Back to Problem
[← Back to Problem](../../exercises/<difficulty>/<problem-name>)
```

Each code block must have inline comments explaining the algorithm step by step.

### 3. Update Sidebar

File: `sidebars/coding-bootcamp.json`

Add the new pattern category and its exercises with solutions:

```json
{
  "type": "category",
  "label": "<Pattern Name>",
  "collapsible": true,
  "collapsed": false,
  "items": [
    "coding-bootcamp/<pattern>/index",
    {
      "type": "category",
      "label": "Exercises",
      "collapsible": true,
      "collapsed": true,
      "items": [
        {
          "type": "category",
          "label": "Easy",
          "items": [
            "coding-bootcamp/<pattern>/exercises/easy/<problem>",
            "coding-bootcamp/<pattern>/solutions/easy/<problem>"
          ]
        },
        { "type": "category", "label": "Medium", "items": [...] },
        { "type": "category", "label": "Hard", "items": [...] }
      ]
    }
  ]
}
```

### 4. Update Landing Page

In `docs/coding-bootcamp/index.mdx`, add the new pattern to the list under `## Patterns`:

```
- **<Pattern Name>** — Brief description of the pattern
```

## Verification

1. `npm run build` — Docusaurus build must pass with no errors
2. Navigate to each exercise page — verify split layout renders correctly
3. Check each solution page — verify all language tabs work
4. Verify test cases display in the console panel
5. Check hint sections are expandable/collapsible