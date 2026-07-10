---
description: Generate a module for "Sorting Algorithms" course
argument-hint: <module-number> <module-topic>
---

# Add Sorting Algorithms Course Module

Course: **Sorting Algorithms** — single page per module, algorithm reference + practice.

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

## Page Format — single page per module

The entire page body is wrapped in a single `<DetailsPageWithIDE>` component with
three regions, in this order. Exception: module 12 (Comparison & Selection Guide) has
no code or practice section, so it does NOT use `DetailsPageWithIDE` — leave it as a
plain summary page.

1. **Explanation** (children) — Sections 1-4: Summary, Pseudocode, ASCII Diagram,
   How It Works, plus Section 5 (Practice test case table). Rendered full-width,
   above the IDE.
2. **IDE** — rendered by `DetailsPageWithIDE` itself from `starterCode`/`harness`/
   `testCases`, full-width, between explanation and solutions.
3. **Solutions** (`solutions` prop) — Section 6: the same per-language reference
   implementation as `starterCode`, as tabbed code blocks, rendered full-width below
   the IDE.

Frontmatter must include `hide_table_of_contents: true` (modules 1-11 only).

Required imports (in addition to `AsciiDiagram`, `Tabs`, `TabItem`):
```
import DetailsPageWithIDE from '@site/src/components/DetailsPageWithIDE/Index';
```

Opening wrapper (immediately after imports, before Section 1):
```
<DetailsPageWithIDE
  meta={{ id: 'sorting-algorithms/{slug}', timeLimitSeconds: 2, memoryLimitKb: 262144 }}
  testCases={[ /* 5 entries, see Section 5 */ ]}
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
Closing tag `</DetailsPageWithIDE>` goes at the very end of the page, after Section 5
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

**Section 1 — Short Summary** (goes FIRST, immediately after the opening
`<DetailsPageWithIDE>` tag; modules 1-11 only)
- 2-3 short sentences in plain English: what the algorithm does and the one main
  idea behind it, told like you'd explain it to a friend with no CS background.
- End with one line stating roughly how fast/slow it is in everyday terms (e.g. "it
  compares neighbors over and over, so it gets a lot slower as the list grows"
  instead of bare Big-O notation). Do not introduce a Big-O table here — that's
  covered informally in Section 4.

**Section 2 — Pseudocode**
- Language-agnostic step-by-step pseudocode, written as short numbered plain-English
  steps (not formal notation) — someone who has never coded should be able to follow
  each line as an instruction, like a recipe.

**Section 3 — ASCII Diagram**
- One `<AsciiDiagram>` visualizing the algorithm's core mechanic on a concrete small
  input (per the drawing conventions in CLAUDE.md — Unicode box-drawing, no `+ - |`)
- `id` = `sorting-algorithms/{module-slug}`, unique across the project
- Keep the example tiny (4-7 elements) so a first-timer can trace it by eye

**Section 4 — How It Works**
- Core idea in plain language — reuse the friend analogy from Section 1 if useful,
  don't restate it word-for-word
- Walk through how the diagram in Section 3 demonstrates the core idea, step by step
- Explain "in-place" and "stable" in one plain sentence each, only if relevant to
  this algorithm (e.g. "it doesn't need extra space to work — it rearranges the
  same list" / "if two items are equal, it leaves them in the order they started
  in") — skip whichever doesn't apply
- One plain-English line on how fast it is best case vs worst case (e.g. "if the
  list is already sorted, it barely does any work; if it's in the worst possible
  order, it has to compare almost everything against everything else") — no
  complexity notation required, but include it in parentheses for readers who do
  want it, e.g. "(this is called O(n²) time)"
- Skip formal correctness proofs and alternative-algorithm comparisons — those
  belong in more advanced material, not a first pass

**Section 5 — Practice** (modules 1-11 only; module 12 has no Practice section)
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

**Section 6 — Solutions** (goes in the `solutions` prop, not in page body children;
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
  "best when you need to save memory"), no code snippets, no `DetailsPageWithIDE`,
  no practice section required
- No filler narrative — short sentences, skip transitions
- File output: `docs/sorting-algorithms/{module-number}-{slug}.mdx`
- Sidebar: auto-append to `sidebars.js` under "Sorting Algorithms" category
- Run `/fix-rendered-content` as a final step after generating the page
