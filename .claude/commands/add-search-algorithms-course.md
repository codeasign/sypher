---
description: Generate a module for "Search Algorithms" course
argument-hint: <module-number> <module-topic>
---

# Add Search Algorithms Course Module

Course: **Search Algorithms** — single page per module, algorithm reference with a
multi-step worked example (programiz-style) plus an embedded Judge0 code editor and
a practice/test-case section.

## Course Constants

- Languages (fixed order, every module implements all 9):

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

## Module List (18 modules — pass `<module-number>` 1-18)

1. Linear Search
2. Binary Search
3. Binary Search Variants (first/last occurrence, rotated array)
4. Ternary Search
5. Jump Search
6. Interpolation Search
7. Exponential Search
8. Depth-First Search (Graph/Tree)
9. Breadth-First Search (Graph/Tree)
10. A* Search
11. Two-Pointer Search Patterns
12. Search in 2D Matrix
13. Binary Search on Answer
14. Search in Rotated Sorted Array
15. First & Last Occurrence (Lower Bound & Upper Bound)
16. Graph Search
17. Tree Search
18. Trie Search

## Audience

Write for someone who has **never seen this algorithm before** — a first-time
programmer, not a CS student cramming for interviews. That governs every section
below:

- Plain English first, jargon second. If you use a term like "invariant", "recursion
  depth", "asymptotic", or "amortized", define it in the same sentence in everyday
  words, or don't use it at all.
- Short sentences. One idea per sentence. No stacked subordinate clauses.
- Prefer a concrete example over an abstract claim ("if you have 10 boxes and check
  each one" beats "given an input of size n").
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
has always used.

The entire page body is wrapped in a single `<DetailsPageWithIDE>` component with
three regions, in this order:

1. **Explanation** (children) — Sections 1-6 below: Summary, Pseudocode, Worked
   Example, Complexity, Applications, Practice (test case table). Rendered full-width,
   above the IDE.
2. **IDE** — rendered by `DetailsPageWithIDE` itself from `starterCode`/`harness`/
   `testCases`, full-width, between explanation and solutions.
3. **Solutions** (`solutions` prop) — Section 7: the same per-language reference
   implementation as `starterCode`, as tabbed code blocks, rendered full-width below
   the IDE.

Frontmatter must include `hide_table_of_contents: true` (the two-pane IDE layout needs
the extra width).

Required imports (in addition to `AsciiDiagram`, `Tabs`, `TabItem`, `CodeBlock`):
```
import DetailsPageWithIDE from '@site/src/components/DetailsPageWithIDE/Index';
```

Opening wrapper (immediately after imports, before Section 1):
```
<DetailsPageWithIDE
  meta={{ id: 'search-algorithms/{slug}', timeLimitSeconds: 2, memoryLimitKb: 262144 }}
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

- `meta.id` = `search-algorithms/{module-slug}` — must be unique across the project.
- `starterCode` = the SAME reference-solution implementation rendered in the
  `solutions` prop's tabs (pre-filled, not a blank stub — this is a reference/explainer
  course).
- `harness` = a per-language stdin/stdout wrapper: reads the test case's `stdin`,
  parses it into the function's actual parameter types, calls the starterCode function,
  and prints a result that exactly matches `expectedOutput` (including trailing
  newline). Judge0 diffs stdout against `expectedOutput` exactly.
- Design the stdin/stdout text encoding per module based on its parameter shape:
  - array + target: line 1 = space-separated array (empty line if empty), line 2 = target
  - graph traversal: line 1 = node count N, then N lines of `node neighbor1 neighbor2 ...`
    (adjacency list), then 1 line = start node; output = space-joined visit order
  - weighted graph + heuristic (e.g. A*): same as above but neighbors are
    `node:weight`, plus one line for the heuristic map (`node:h node:h ...`) and a
    goal-node line; output = space-joined path
  - pair/tuple return values: print space-joined on one line (e.g. `"1 3\n"`)
  - matrix input: line 1 = row count, then that many space-separated rows, then a
    target/query line
  - Keep the encoding as simple as the parameter shape allows; document any non-obvious
    encoding choice as a one-line comment near the harness definition (in this spec, not
    in the generated page).

Page body (children), in this exact order:

**Section 1 — Summary**
- 2-3 short sentences in plain English: what the algorithm does and the one main
  idea behind it, told like you'd explain it to a friend with no CS background.
- End with one line stating roughly how fast/slow it is in everyday terms (e.g. "it
  checks every item once, so it gets slower the more items you have" instead of
  bare Big-O notation). Do not introduce Big-O here — that's Section 4.

**Section 2 — Pseudocode**
- Language-agnostic step-by-step pseudocode, written as short numbered plain-English
  steps (not formal notation) — someone who has never coded should be able to follow
  each line as an instruction, like a recipe. This is the iterative formulation.
- If the algorithm has a natural recursive formulation (binary search and its
  variants, DFS, tree/trie search, A*, anything divide-and-conquer), add a second,
  clearly labeled "Recursive Version" pseudocode block right after the iterative one.
  Skip this for algorithms with no natural recursive shape (linear/jump/interpolation/
  exponential search, two-pointer patterns) — don't force one in.

**Section 3 — Worked Example** (the core section — this is what changed)
- Pick ONE small concrete example (4-8 elements for arrays; a small graph/tree/trie
  with 5-9 nodes for graph/tree/trie modules) and carry it through EVERY diagram in
  this section — the reader traces one case start to finish, the same way programiz's
  binary-search page reuses `[3, 4, 5, 6, 7, 8, 9]` searching for `4` across its whole
  diagram sequence.
- Render the example as a NUMBERED SEQUENCE of `<AsciiDiagram>` components — typically
  3-7 diagrams, however many steps the algorithm naturally takes on the chosen
  example. This replaces the old single "one diagram total" approach.
- Immediately after each diagram, add 1-2 plain-English sentences saying what just
  happened and why (which comparison was made, which pointer/pivot/element moved, why)
  — a running narration interleaved with the diagrams, not one paragraph at the end.
- Every diagram needs a unique `id`: `search-algorithms/{module-slug}/step-{N}` (IDs
  must be unique across the whole project per CLAUDE.md).
- Follow CLAUDE.md's ASCII diagram drawing conventions (Unicode box-drawing, no
  `+ - |`, `content` prop not children, `alt`/`caption` before `content`, no blank
  lines inside the template literal).
- State any precondition simply where it first matters (e.g. "this only works if the
  list is already sorted — like looking up a word in a dictionary") — skip if none.

**Section 4 — Complexity**
- Best, Average, Worst time, and Space — each as one plain-English phrase with the
  Big-O in parentheses, e.g. "If you're lucky and the target is the very first thing
  you check, this is instant (`O(1)`)." Keep this course's plain-English-first voice;
  don't drop into a bare textbook table with no explanation.

**Section 5 — Applications**
- 3-5 concrete, verifiable real-world uses — standard library implementations, named
  systems/tools/protocols that actually use this algorithm. No generic filler like
  "used in many applications."

**Section 6 — Practice**
- Exactly 5 test cases per module (shared across all 9 languages — same inputs/outputs)
- Format per test case: input, expected output, one-line plain-English note on what
  it's testing (e.g. "what happens if the value isn't there", "an empty list",
  "just one item")
- Provide the test cases as a table only (columns: #, Input, Expected Output, What
  It Tests). Do NOT generate runnable per-language assertion blocks (no JUnit/pytest/
  Jest/xUnit) — the interactive IDE from `DetailsPageWithIDE` replaces them.
- The same 5 test cases (as `{stdin, expectedOutput}` pairs matching this table) go in
  the `testCases` prop on the page-level `<DetailsPageWithIDE>` wrapper.
- After the table, add the single line: "Run the test cases above directly in the
  editor to verify your solution." This is the last line of the children content,
  immediately before the closing `</DetailsPageWithIDE>` tag.

**Section 7 — Solutions** (goes in the `solutions` prop, not in page body children)
- Tabbed code block per language, all 9: Python 3.11, C (GCC 13), C++ (Clang 17),
  Java 21, C# / .NET 8, JavaScript (Node 20.10.0), TypeScript 5.1.6, Rust 1.79.0, Go 1.22
- Each implementation complete and runnable — function signature, full body, no
  pseudocode
- Consistent function signature across languages for the same module (e.g. all take
  `(array, target)` and return an index or -1)
- Tab `value` per language must match the `starterCode`/`harness` keys exactly (see
  Course Constants table above)

## Generation Rules

- Pseudocode and algorithm explanation apply once per module, language-agnostic —
  do not repeat per language
- All 9 language implementations must produce identical output for identical input
  (same behavior on ties, duplicates, and edge cases)
- The `solutions` prop's Tabs are visible reference material even though the same
  implementation also lives in `starterCode` — do not remove or shorten them
- No filler narrative — short sentences, skip transitions
- File output: `docs/search-algorithms/{module-number}-{slug}.mdx`
- Sidebar: auto-append to `sidebars.js` under "Search Algorithms" category
- Run `/fix-rendered-content` as a final step after generating the page
