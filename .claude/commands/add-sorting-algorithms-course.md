---
description: Generate a module for "Sorting Algorithms" course
argument-hint: <module-number> <module-topic>
---

# Add Sorting Algorithms Course Module

Course: **Sorting Algorithms** — single page per module, algorithm reference with a
multi-step worked example (programiz-style) plus an embedded Judge0 code editor and
a practice/test-case section.

## Course Constants

- Languages (fixed order, every module implements all 9, except module 12 which has
  no code at all):

  | Key | Label |
  |---|---|
  | `python311` | Python 3.11 |
  | `c_gcc13` | C (GCC 13) |
  | `cpp_clang17` | C++ (Clang 17) |
  | `java21` | Java 21 |
  | `csharp_dotnet8` | C# / .NET 8 |
  | `javascript_node20` | JavaScript (Node 20.10.0) |
  | `typescript516` | TypeScript 5.1.6 |
  | `rust179` | Rust 1.79.0 |
  | `go122` | Go 1.22 |

- These keys must match `LANGUAGE_IDS`/`LANGUAGE_LABELS`/`MONACO_LANGUAGES` entries in
  `src/components/CoreEditor/Index.tsx`. The Judge0 `language_id` values behind these
  keys are best-known placeholders against the public Judge0 CE demo — the user is
  deploying a custom Judge0 docker image with the exact versions above; IDs may need
  updating once that instance is live. Do not add new language keys without also
  adding matching entries in `CoreEditor/Index.tsx`.

## Module List (12 modules — pass `<module-number>` 1-12)

1. Bubble Sort
2. Selection Sort
3. Insertion Sort
4. Merge Sort
5. Quick Sort
6. Heap Sort
7. Counting Sort
8. Radix Sort
9. Bucket Sort
10. Shell Sort
11. Tim Sort (hybrid, language built-ins)
12. Comparison & Selection Guide (when to use which)

## Audience

Write for someone who has **never seen this algorithm before** — a first-time
programmer, not a CS student cramming for interviews. That governs every section
below:

- Plain English first, jargon second. If you use a term like "stable sort", "in-place",
  "asymptotic", or "amortized", define it in the same sentence in everyday words, or
  don't use it at all.
- Short sentences. One idea per sentence. No stacked subordinate clauses.
- Prefer a concrete example over an abstract claim ("swap two neighbors if the left
  one is bigger" beats "compare adjacent elements and exchange if out of order").
- No interview-prep framing, no "common follow-up question" asides, no comparison
  tables of tradeoffs unless a single plain-language sentence can't say it — this is
  a first pass, not a reference manual.

## Page Format — single page per module, IDE + practice included

Baseline reference for the explanation sections' structure:
[programiz.com/dsa/binary-search](https://www.programiz.com/dsa/binary-search) — a
numbered sequence of step-by-step diagrams over one fixed example, followed by
pseudocode, complexity, and applications. This course keeps its own plain-English
"explain it to a first-timer" voice (see Audience above) but adopts that structural
flow for the explanation, wrapped in the same embedded-IDE/practice format the course
has always used. Exception: module 12 (Comparison & Selection Guide) stays a plain
summary page — no code, no diagrams, no IDE, no changes needed to it.

The entire page body (modules 1-11) is wrapped in a single `<DetailsPageWithIDE>`
component with three regions, in this order:

1. **Explanation** (children) — Sections 1-6 below: Summary, Pseudocode, Worked
   Example, Complexity, Applications, Practice (test case table). Rendered full-width,
   above the IDE.
2. **IDE** — rendered by `DetailsPageWithIDE` itself from `starterCode`/`harness`/
   `testCases`, full-width, between explanation and solutions.
3. **Solutions** (`solutions` prop) — Section 7: the same per-language reference
   implementation as `starterCode`, as tabbed code blocks, rendered full-width below
   the IDE.

Frontmatter (modules 1-11) must include `hide_table_of_contents: true` (the two-pane
IDE layout needs the extra width).

Required imports (in addition to `AsciiDiagram`, `Tabs`, `TabItem`, `CodeBlock`):
```
import DetailsPageWithIDE from '@site/src/components/DetailsPageWithIDE/Index';
```

Opening wrapper (immediately after imports, before Section 1):
```
<DetailsPageWithIDE
  meta={{ id: 'sorting-algorithms/{slug}', timeLimitSeconds: 2, memoryLimitKb: 262144 }}
  testCases={[ /* 5 entries, see Section 6 */ ]}
  starterCode={{ python311: `...`, c_gcc13: `...`, cpp_clang17: `...`, java21: `...`, csharp_dotnet8: `...`, javascript_node20: `...`, typescript516: `...`, rust179: `...`, go122: `...` }}
  harness={{ python311: `...`, c_gcc13: `...`, cpp_clang17: `...`, java21: `...`, csharp_dotnet8: `...`, javascript_node20: `...`, typescript516: `...`, rust179: `...`, go122: `...` }}
  defaultLanguage="python311"
  solutions={
    <Tabs>
      <TabItem value="python311" label="Python 3.11">...</TabItem>
      <TabItem value="c_gcc13" label="C (GCC 13)">...</TabItem>
      <TabItem value="cpp_clang17" label="C++ (Clang 17)">...</TabItem>
      <TabItem value="java21" label="Java 21">...</TabItem>
      <TabItem value="csharp_dotnet8" label="C# / .NET 8">...</TabItem>
      <TabItem value="javascript_node20" label="JavaScript (Node 20.10.0)">...</TabItem>
      <TabItem value="typescript516" label="TypeScript 5.1.6">...</TabItem>
      <TabItem value="rust179" label="Rust 1.79.0">...</TabItem>
      <TabItem value="go122" label="Go 1.22">...</TabItem>
    </Tabs>
  }
>
```
Closing tag `</DetailsPageWithIDE>` goes at the very end of the page, after Section 6
(the explanation/practice children) — the `solutions` prop is passed as JSX in the
opening tag, not as page body content.

- `meta.id` = `sorting-algorithms/{module-slug}` — must be unique across the project.
- `starterCode` = the SAME reference-solution implementation rendered in the
  `solutions` prop's tabs (pre-filled, not a blank stub — this is a reference/explainer
  course).
- `harness` = a per-language stdin/stdout wrapper: reads the test case's `stdin`
  (line 1 = space-separated array, empty line if empty), parses it into an array, calls
  the starterCode sort function, and prints the sorted array space-joined on one line
  (matching `expectedOutput` exactly, including trailing newline). Judge0 diffs stdout
  against `expectedOutput` exactly.

Page body (children, modules 1-11), in this exact order:

**Section 1 — Summary**
- 2-3 short sentences in plain English: what the algorithm does and the one main
  idea behind it, told like you'd explain it to a friend with no CS background.
- End with one line stating roughly how fast/slow it is in everyday terms (e.g. "it
  compares neighbors over and over, so it gets a lot slower as the list grows"
  instead of bare Big-O notation). Do not introduce Big-O here — that's Section 4.

**Section 2 — Pseudocode**
- Language-agnostic step-by-step pseudocode, written as short numbered plain-English
  steps (not formal notation) — someone who has never coded should be able to follow
  each line as an instruction, like a recipe. This is the iterative formulation.
- If the algorithm has a natural recursive formulation (merge sort, quick sort), add
  a second, clearly labeled "Recursive Version" pseudocode block right after the
  iterative one. Skip this for algorithms with no natural recursive shape (bubble,
  selection, insertion, counting, radix, bucket, shell sort).

**Section 3 — Worked Example** (the core section — this is what changed)
- Pick ONE small concrete example list (6-10 elements, deliberately out of order,
  including at least one repeated value where relevant to stability) and carry it
  through EVERY diagram in this section — the reader traces one case start to finish,
  the same way programiz's binary-search page reuses one fixed array across its whole
  diagram sequence.
- Render the example as a NUMBERED SEQUENCE of `<AsciiDiagram>` components — typically
  4-8 diagrams, however many passes/steps the algorithm naturally takes on the chosen
  example (one diagram per pass for bubble/selection/insertion sort; one per
  merge/partition step for merge/quick sort; etc). This replaces the old single "one
  diagram total" approach.
- Immediately after each diagram, add 1-2 plain-English sentences saying what just
  happened and why (which pair was compared/swapped, which pivot was chosen, which
  sublists were merged) — a running narration interleaved with the diagrams, not one
  paragraph at the end.
- Every diagram needs a unique `id`: `sorting-algorithms/{module-slug}/step-{N}` (IDs
  must be unique across the whole project per CLAUDE.md).
- Follow CLAUDE.md's ASCII diagram drawing conventions (Unicode box-drawing, no
  `+ - |`, `content` prop not children, `alt`/`caption` before `content`, no blank
  lines inside the template literal).
- Explain "in-place" and "stable" in one plain sentence each at the point they first
  matter in the walkthrough, only if relevant to this algorithm — skip whichever
  doesn't apply.

**Section 4 — Complexity**
- Best, Average, Worst time, and Space — each as one plain-English phrase with the
  Big-O in parentheses, e.g. "If the list is already sorted, this barely does any
  work (`O(n)`)." Keep this course's plain-English-first voice; don't drop into a bare
  textbook table with no explanation.

**Section 5 — Applications**
- 3-5 concrete, verifiable real-world uses — standard library implementations, named
  systems/tools that actually use this algorithm (or, for teaching-only algorithms
  like bubble sort, say so plainly and name what's used instead in practice). No
  generic filler like "used in many applications."

**Section 6 — Practice** (modules 1-11 only; module 12 has no Practice section)
- Exactly 5 test cases per module (shared across all 9 languages — same inputs/outputs)
- Format per test case: input, expected output, one-line plain-English note on what
  it's testing (e.g. "a list that's already in order", "a list in the wrong order",
  "repeated numbers", "an empty list", "just one item")
- Provide the test cases as a table only (columns: #, Input, Expected Output, What
  It Tests). Do NOT generate runnable per-language assertion blocks (no JUnit/pytest/
  Jest/xUnit) — the interactive IDE from `DetailsPageWithIDE` replaces them.
- The same 5 test cases (as `{stdin, expectedOutput}` pairs matching this table) go in
  the `testCases` prop on the page-level `<DetailsPageWithIDE>` wrapper.
- After the table, add the single line: "Run the test cases above directly in the
  editor to verify your solution." This is the last line of the children content,
  immediately before the closing `</DetailsPageWithIDE>` tag.

**Section 7 — Solutions** (goes in the `solutions` prop, not in page body children;
modules 1-11 only)
- Tabbed code block per language, all 9: Python 3.11, C (GCC 13), C++ (Clang 17),
  Java 21, C# / .NET 8, JavaScript (Node 20.10.0), TypeScript 5.1.6, Rust 1.79.0, Go 1.22
- Each implementation complete and runnable — function signature, full body, no
  pseudocode
- Consistent function signature across languages for the same module (e.g. all take
  `(array)` and return the sorted array, in-place where the algorithm is in-place)
- Tab `value` per language must match the `starterCode`/`harness` keys exactly (see
  Course Constants table above)

## Generation Rules

- Pseudocode and algorithm explanation apply once per module, language-agnostic —
  do not repeat per language
- All 9 language implementations must produce identical output for identical input,
  including tie-breaking order for equal elements where stability matters
- The `solutions` prop's Tabs are visible reference material even though the same
  implementation also lives in `starterCode` — do not remove or shorten them
- Module 12 (Comparison & Selection Guide) is a summary page, not a new algorithm —
  format as a simple table across all 11 prior modules (speed, stability, in-place,
  best use case in one plain-English phrase each, e.g. "best for small lists" or
  "best when you need to save memory"), no code snippets, no diagrams, no `DetailsPageWithIDE`,
  no practice section required
- No filler narrative — short sentences, skip transitions
- File output: `docs/sorting-algorithms/{module-number}-{slug}.mdx`
- Sidebar: auto-append to `sidebars.js` under "Sorting Algorithms" category
- Run `/fix-rendered-content` as a final step after generating the page
