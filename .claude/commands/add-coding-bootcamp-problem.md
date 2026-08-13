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
    { stdin: '...\n', expectedOutput: '...\n', isSample: true },
    { stdin: '...\n', expectedOutput: '...\n', isSample: true },
    { stdin: '...\n', expectedOutput: '...\n' },
    // ...20 test cases total covering all edge cases; only the first 2 get
    // isSample: true (see Test Case Guidelines below)
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
- **Kotlin** (optional, id 78 — add `kotlin` key with `class Solution { fun ... }`):
  used by some existing problems, not required for new ones, but valid if you want
  it — matching harness key is `kotlin`, not folded into `BASE_LANGUAGE`.

Every `starterCode`/`harness` key must have a working entry in `LANGUAGE_IDS` in
`apps/docs/src/components/CoreEditor/Index.tsx` (verified against RapidAPI's hosted
Judge0 CE `GET /languages`, not the old self-hosted instance). **Do not author**
`python35`, `python36`, `java8`, `csharp_mono52`, `csharp_mono54`, or `rust120` —
those were removed in the 2026-08 RapidAPI migration because their old ids don't exist
on RapidAPI's catalog; a dropdown option using one of them fails every time it's run.
`python27` remains valid (id 70) and is fine to keep authoring where useful.

RapidAPI's `javascript` runtime is an old Node.js that does **not** support `??`
(nullish coalescing), optional chaining (`?.`), or other modern ES syntax — code that
uses them fails with a raw `SyntaxError` at runtime, not a compile error, so it's easy
to miss in review (confirmed empirically: `valid-anagram.mdx`'s harness used `?? ''`
and every submission crashed; `subarray-sum-equals-k.mdx`'s **solutions page**
javascript code shipped with two more `?? 0` uses, same crash). This applies equally
to solutions-page javascript code, not just the harness — `typescript` is unaffected
since it gets transpiled to an older target before running. Stick to `||` for
defaulting and stay otherwise conservative (ES2015-ish) in any `javascript`
harness/starterCode/solution.

**RapidAPI's TypeScript compile step runs with `--lib es2015,dom`, so any
API added to the JS standard library after ES2015 — even ones the plain
`javascript` runtime happily supports at runtime — is a compile-time type
error in `typescript` specifically** (`error TS2339: Property 'values' does
not exist on type 'ObjectConstructor'` for `Object.values`, added in
ES2017). This is the inverse of the syntax issue above: `javascript` fails
at *runtime* on syntax newer than its old Node build supports, while
`typescript` fails at *compile time* on any stdlib API newer than ES2015,
regardless of whether the runtime executing the transpiled output would
have supported it. Confirmed in `heap/task-scheduler.mdx`'s solutions page —
`Object.values(freq)` compiled fine as plain `javascript` but failed
`typescript` outright. Prefer `Object.keys(obj).map(k => obj[k])` over
`Object.values(obj)`, and audit any other post-ES2015 `Object.*`/`Array.*`
static method the same way before using it in a `typescript` snippet.

RapidAPI's `rust` runtime is Rust 1.40 (pre-1.43) -- it does **not** support
the associated-constant form `i32::MAX`/`i32::MIN` (or the `u32`/`usize`/etc.
equivalents), only the older module-path form `std::i32::MAX`. Confirmed
empirically: `i32::MAX` fails with `E0599: no associated item named 'MAX'
found for type 'i32'`, while `std::i32::MAX` compiles and runs fine. Always
use `std::i32::MAX` (etc.) in any `rust` `starterCode`/`harness`/solution
code -- this bit 9 solutions pages that had never been run against the real
compiler before being caught by an audit.

### Harness Guidelines

The harness is the main/driver code that:
1. Reads stdin
2. Parses the input according to the problem spec
3. Calls the user's function
4. Prints the exact sentinel `###SYPHER_JUDGE0_RESULT###` on its own line via an
   **inline** print/echo statement (`print(...)`, `System.out.println(...)`,
   `printf("###SYPHER_JUDGE0_RESULT###\n");`, etc.) directly at the call site in
   `main()` (or equivalent) — never inside a separate helper function. Grading
   extracts everything printed after this line; tooling that audits/inserts markers
   across the whole course also greps for a print call within each entry's span, so
   burying it inside a helper function makes both grading and tooling silently miss it.
5. Prints the actual result immediately after the marker line

Must be provided for: python, python27, javascript, java, cpp, c, csharp, rust, typescript

**The harness owns its own `#include`/`using`/`use` preamble — never rely on the
student's `starterCode` to supply it.** `starterCode` normally has no imports at all
(a plain `class Solution { ... }` or bare function), so if the harness's own driver
code uses `vector`/`cin`/`cout` (C++), `malloc`/`scanf`/`EOF` (C), `List<T>`/`Console`
(C#), or a trait method like `.read_to_string()` (Rust, needs `use std::io::Read;`)
without declaring the corresponding `#include`/`using`/`use` itself, every submission
in that language fails to compile regardless of what the student writes — this has
happened for real (`kth-largest-element.mdx` shipped with zero includes in its C++/C/
C#/Rust harnesses). Give every harness a complete, self-sufficient preamble for its
own driver code, the same way the rest of the course's harnesses already do.

**Never redeclare anything the student's own `starterCode` already declares** — not
just the function/method the student is asked to implement, but also any supporting
type the student's signature references (`ListNode`, `TreeNode`, and similar data
classes/structs that appear in both `starterCode` and would otherwise need to appear
in `harness` too). `composeSourceCode` always places the student's code before the
harness's, so a second declaration of the same name is:
- a hard compile error in Java/C++/C/C#/Rust/Go (duplicate class/struct/function), or
- a silent grading-bypass in Python/JavaScript/TypeScript — the harness's copy
  overwrites the student's, so even a broken student submission can pass.

If the harness needs a data type the student's own `starterCode` will construct
instances of (e.g. building a linked list from stdin to pass into the student's
function), reuse the exact type the student declares — the harness should only add
driver code (`buildList`/`listToStr`-style helpers, stdin parsing, the marker print),
never its own copy of a type or function the student already owns.

**A single backslash immediately followed by `n` inside any `harness`/
`starterCode` template-literal string is corrupted by Babel/MDX's JSX parsing
into a literal embedded newline BYTE, not the two-character escape `\n`** —
this is a root cause, not a per-language quirk: it has shipped in C
(`printf("...\n", ...)`), Go (`fmt.Printf("...\n", ...)`, and Go rune
literals like `'\n'`), corrupting 12+ files across both languages before
being caught by an audit. Whenever a harness/starterCode string in `.mdx`
needs a literal `\n` two-character sequence to survive into the target
language's own source (so THAT language's compiler applies its own escape
interpretation), write it as `\\n` (double backslash) in the `.mdx` source —
never a single backslash. This applies to every curly-brace/string-literal
language in the course, not just C — check Go, Java, C++, C#, Rust, and
TypeScript output the same way when authoring or reviewing a harness.

**This corruption is not specific to `\n` — any single backslash followed by
a character JS itself recognizes as an escape (`\r`, `\t`, `\0`, etc.) is
just as vulnerable, and `\r` has now shipped for real** (`backspace-string-
compare.mdx`'s Rust `trim_end_matches('\r')` and Go `== '\r'` trailing-
carriage-return trims, both meant to strip a `\r` left over from CRLF line
endings) — `\r` gets silently decoded into a literal embedded carriage-return
BYTE the same way `\n` does, producing a Rust "character constant must be
escaped" compile error or corrupting a C/Go string literal outright,
depending on where it lands. Treat the whole class of single-backslash JS
escape sequences as suspect when reviewing a harness for this bug, not just
`\n` specifically — write `\\r`, `\\t`, etc. (doubled) whenever the target
language needs the literal two-character escape sequence to survive.

**Never write a `printf`/format-string call whose literal is split across two
physical lines in the `.mdx` source** — a raw embedded newline byte inside the
string (as opposed to a `\n` escape) makes GCC read it as an unterminated
string literal and hard-fail to compile. This has shipped twice (`three-sum`,
`remove-duplicates`, `reverse-linked-list`, `linked-list-cycle`,
`merge-k-sorted-lists` all had one) — always keep a `printf("...")` call's
format string on a single line in the source you write, however long.

**When a harness builds a linked list from stdin by prepending nodes (`node.next
= head; head = node;`), the loop MUST iterate in descending/reverse order** —
either walk a pre-read array from `n - 1` down to `0`, or reverse an
already-collected sequence (`.rev()` in Rust, `reversed(...)` in Python) before
prepending. Scanning stdin values in ascending order while prepending silently
reverses the constructed list. This shipped in `merge-k-sorted-lists.mdx`
(Java/C++/C) and `reverse-linked-list.mdx` (Java) — the C/Python/JS/C#/Rust/TS
harnesses for the same problems already used the correct descending pattern,
so copy from a language you know is already right, not from memory.

**Line-based stdin readers (`splitlines()`/`readline` interfaces in Python,
JavaScript, TypeScript, C#, Rust) must consume a placeholder line for every
value the test data emits, even when that value is empty/zero.** A sub-list
with `n == 0` in a multi-list input (e.g. `merge-k-sorted-lists`) still gets a
blank placeholder line for its (empty) values row in the generated stdin —
skipping the `idx += 1` / extra `read_line()` for that line desyncs every
subsequent read. Token-based readers (`scanf`, C#/Java `Scanner`, C++ `cin >>`)
are naturally immune since they skip whitespace/blank lines automatically —
only fix this in the line-based harnesses, and check each one still holds a
1:1 correspondence between "values printed on stdin" and "lines/read calls
consumed" for every branch, including size-0 branches.

**Rust harnesses reading a `count` line followed by a `values` line MUST call
`read_line()` once per line — verify the call count against how many lines the
problem's stdin format actually has.** `remove-duplicates.mdx` and
`trapping-rain-water.mdx` both shipped reading only the values line, silently
parsing the count line as the values instead (e.g. `nums = [6]` from stdin
`"6\n1 1 1 2 2 3\n"`). Count the `read_line` calls against the stdin format
before shipping.

**Rust structs used as linked-list/tree nodes that a test harness may need to
represent as genuinely cyclic (e.g. `linked-list-cycle`) need a custom
`impl Drop`** that detaches and `std::mem::forget`s the rest of the chain
instead of the default recursive drop — a truly cyclic `Box<ListNode>` chain
double-frees/stack-overflows on the default drop the moment it goes out of
scope. See `linked-list-cycle.mdx`'s rust `starterCode` for the pattern (a
one-time leak in the short-lived judge process, not a real ownership model).
Building the actual cycle also requires raw-pointer (`Box::into_raw`/
`Box::from_raw`) wiring in the harness's `main()`, since safe `Option<Box<T>>`
ownership can't express a node with two owners.

**Rust `usize` arithmetic that subtracts a constant from a length (`n - 2`,
`len() - 1`, etc.) panics on underflow whenever the input is smaller than that
constant** — this hit `three-sum`'s solutions-page code on `n == 1` test data
despite the stated constraint being `n >= 3` (test suites intentionally probe
below/at boundary constraints). Prefer the underflow-safe form of the
comparison (`i + 2 < n` instead of `i < n - 2`) rather than assuming input
always satisfies the stated constraint.

**Rust Floyd's-cycle-style dual-pointer algorithms must check `is_none()`
before unwrapping a pointer that was just advanced two steps** — landing
exactly on the trailing `None` of an even-length acyclic list and then
unwrapping it for a comparison (e.g. `std::ptr::eq(...)`) panics. This was a
real bug in `linked-list-cycle.mdx`'s rust solutions-page code, only exposed
by even-length non-cyclic test inputs specifically.

**When `starterCode`'s rust signature takes a parameter by reference (`nums:
&Vec<i32>`), the solutions-page rust code must use the same `&Vec<i32>` — not
`Vec<i32>` (owned).** This exact mismatch shipped independently in 5 different
problems this session (`two-sum`, `best-time-to-buy-and-sell-stock`,
`product-of-array-except-self`, `two-sum-ii`, `minimum-increment-unique`) —
it's an easy slip since owned `Vec<i32>` params are just as common a Rust
style choice as `&Vec<i32>`, but the two aren't interchangeable and the
harness always calls with whatever `starterCode` declares. If the algorithm
needs an owned/mutable copy internally, clone inside the function body rather
than changing the signature.

**Solutions-page code must return the value the harness expects, matching
`starterCode`'s signature — never copy a canonical LeetCode `void`/in-place
solution verbatim if this course's `starterCode` for that problem returns a
value.** This course's convention (unlike LeetCode's own site) is a return-
value contract in every language, checked by the harness (`result =
rotate(nums, k)`, etc.) — `rotate-array.mdx`'s solutions page shipped with a
`void`/mutate-in-place implementation in 7 of 8 languages (only Python
matched), breaking every one of them. Before writing/reviewing a solutions
page, diff its function signature against `starterCode`'s for the same
language — return type, mutability of reference/pointer params (Rust
`&Vec<T>` vs `&mut Vec<T>`), and arg count must match exactly.

**A rust solutions-page function taking `nums: &Vec<i32>` (immutable
reference, matching `starterCode`) cannot mutate the input in place — clone it
first (`let mut nums = nums.clone();`) if the algorithm needs to sort/swap/
reverse elements**, then return the clone. Don't change the signature to
`&mut Vec<i32>` to make an in-place algorithm easier to write; match what
`starterCode` already declares.

**A Python harness that builds space-separated output via a `for val in
result: print(val, end=' ')` loop followed by a bare `print()` leaves a
trailing space before the newline** — but a JS/TS harness building the same
line via `.join(' ')` (or `.trim()`) does not. Since all languages share one
`expectedOutput` string and grading is an exact match, this silent
cross-language formatting mismatch fails Python (or whichever language uses
the trailing-space loop) even when the algorithm is correct
(`kth-largest-element-stream`, `insert-interval`). Prefer
`print(' '.join(str(x) for x in result))` — matches `.join(' ')` exactly,
no trailing space, no per-value `print()` call needed.

**When a problem's own text says "you may return the answer in any order"
(e.g. `top-k-frequent`), the harness must still produce one canonical output
string for exact-match grading — sort the result before printing, in every
language's harness, not in the solutions-page algorithm.** Leaving order
unsorted bakes in whatever iteration order one particular reference
implementation happened to produce (hash-map iteration order, heap
tie-breaking, etc.), which a differently-implemented but equally correct
submission in another language won't reproduce. Also audit "any order" test
data for genuine ties AT the cutoff (the k-th and (k+1)-th frequency/value
being equal) — those make the *set* of correct answers ambiguous, not just
its order, and must be fixed by adjusting the input, not by sorting.

**This "any order" cutoff-tie check applies just as much to distance-based
top-k problems (k-closest-points-style) as to frequency-based ones, and
checking it by re-running the same reference algorithm proves nothing —
the same algorithm always tie-breaks the same way, so it will "confirm"
its own answer even when a genuine ambiguity exists.** `heap/
k-closest-points.mdx` shipped with 5 of 18 test cases having two or more
*distinct* points tied at the k-th-closest distance (no stated
tie-breaking rule in the problem), invisible to hand-verification because
the verification script reused the same heap-based selection as the
solutions page. It only surfaced when genuinely different algorithms
(sort-based vs. heap-based) were run against the same cases and diverged
on exactly those cases. To check for real: for every test case, sort all
squared-distances and confirm `dists[k-1] != dists[k]` — a strict
inequality, not a re-run of any particular implementation. One nuance:
a tie between two points with the *same coordinates* (true duplicates)
is not a real ambiguity, since either "copy" produces an identical
printed output — only tie-check distinct points.

**Don't call `.strip()` on the whole `sys.stdin.read()` before
`.split('\n')` when a blank line can legitimately appear as input** (e.g. an
empty first line signaling "no intervals", per `insert-interval`) —
`.strip()` eats leading/trailing blank lines along with real whitespace,
shifting every subsequent `data[i]` index by one and desyncing the parse.
Use `sys.stdin.read().split('\n')` (no strip) when a blank line is part of
the input contract, matching how JS/TS's `readline` naturally preserves
empty lines.

**C#, Go, and Rust all drop the trailing `.0` when printing a whole-number
float/double with a bare `Console.WriteLine`/`fmt.Println`/`println!("{}",
...)`** (`2.0` prints as `2`), while Java, Python, and C++'s `setprecision`
don't have this problem. Any problem with a floating-point expected output
needs explicit formatting in every harness: C# `.ToString("F1")`, Go
`fmt.Printf("%.1f\n", ...)`, Rust `println!("{:.1}", ...)` — pick the
decimal-place count the problem actually needs and apply it uniformly, don't
rely on the language default.

**The `n==0` stdin placeholder-line desync bug (documented above for one
language) recurs independently in C#, Rust, and Go wherever a harness
conditionally skips `ReadLine()`/`read_line()`/`scanner.Scan()` based on a
count being zero** (`if (n > 0) { line = ReadLine(); ... }`) — when `n==0`
the intentional blank placeholder line never gets consumed, so the next
conditional read (for `m`) picks up the wrong line. Always call the
line-read unconditionally; make only the *parsing* of that line conditional
on the count being nonzero.

**RapidAPI's C# runtime predates C# 7 and rejects local functions
(`void Foo(int x) { ... }` nested inside a method) and value tuples
(`(int, int)` / `.freq`/`.num` field access) with a cryptic `CS1547`/`CS1525`
parse error that doesn't obviously point at either feature** — rewrite local
functions as `private static` helper methods taking the needed state as
parameters, and replace tuples with a small `int[]` or a plain class/struct.

**RapidAPI's Rust toolchain (~1.40) doesn't support the `f64::INFINITY` /
`f64::NEG_INFINITY` associated-const form** (`error[E0599]: no associated
item named 'INFINITY' found for type 'f64'`) — use the older module path,
`std::f64::INFINITY` / `std::f64::NEG_INFINITY`, same vintage issue as the
already-documented `i32::MAX` case.

**RapidAPI's Rust toolchain (~1.40) also doesn't have `slice::partition_point`**
(stabilized in Rust 1.52 — `error[E0599]: no method named 'partition_point'
found for type '&mut std::vec::Vec<...>'`). This bit `search-suggestions.mdx`'s
rust solution, which needed a manual lower-bound binary search over a sorted
`Vec<String>`. Write the binary search out by hand (`lo`/`hi`/`mid` loop) rather
than reaching for `partition_point`, `binary_search_by`'s newer variants, or any
other slice method — verify any less-common `Vec`/`slice` method against this
toolchain's actual vintage before assuming it's available, the same way the
`i32::MAX`/`f64::INFINITY` associated-const cases already require.

**Avoid `fmax`/`fmin` (and other `<math.h>` functions) in C solutions —
RapidAPI's C compile command doesn't link `libm`, so any `fmax`/`fmin` call
fails at link time with `undefined reference to 'fmax'`, not at compile
time** (the `#include <math.h>` alone isn't enough). Use a plain ternary
(`a > b ? a : b`) instead; it's exactly equivalent for `int`/`double`
arguments here and needs no library.

**Never hardcode a result array's size to the requested `k` in a top-k-style
problem — size it from the actual collection returned (e.g. a
`PriorityQueue`'s final `.size()`), since fewer than `k` distinct
elements can legitimately exist.** A Java `top-k-frequent` solution did
`new int[k]` and looped `k` times over `minHeap.poll()`, throwing a
`NullPointerException` on any test case where the heap held fewer than `k`
entries (e.g. `k=4` but only 3 distinct values in the input).

**`serde_json` (or any external crate) is not available in Rust
harnesses/solutions on RapidAPI — there's no `Cargo.toml`, submissions
compile as a single `rustc` file, so `serde_json::from_str(...)` fails with
`error[E0433]: failed to resolve: ... serde_json`.** For a JSON-array-style
stdin (e.g. `[[1,2],[3,4]]`), hand-parse it: strip the outer brackets and
`.split("],[")`, then `.split(',')` per pair — matching the manual-parse
approach already used by this problem's Java/C#/C harnesses. (`assign-cookies`,
`lemonade-change`, `jump-game`, and `partition-labels` still reference
`serde_json` too — they're the known-malformed files already excluded from
the audit sweep, out of scope until that shape bug is fixed separately.
`group-anagrams` had the same bug and is now fixed.)

**A Java string literal containing a regex escape like `\],\[` needs FOUR
backslashes in the `.mdx` source, not two** — the `.mdx` file is a JS
template literal (`\\` → `\` once), and *that* decoded text is itself a Java
string literal (`\\` → `\` again); a single-doubled `\\],\\[` in the `.mdx`
source decodes to the single-escaped `\],\[` at the Java-source level, which
is an **illegal escape character** in Java (unlike in a regex — Java string
literals only recognize a fixed escape set, and `\[`/`\]` isn't in it).
Write `\\\\],\\\\[` in the `.mdx` source when the target is a Java regex
string containing literal brackets.

**A Go solutions-page snippet that calls `sort.Slice(...)` (or any stdlib
function) must include its own `import "..."` line at the top of the code
block** — solutions pages are shown as complete, copy-pasteable examples, so
a missing import isn't just an audit-tooling gap, it's broken for any real
student who pastes the snippet as shown (`non-overlapping-intervals`'s Go
solution used `sort.Slice` with no `import "sort"` anywhere in the file).

**A `testCases` block written with double-quoted `expectedOutput: "..."`
JSON strings (instead of the usual backtick-`\n`-terminated form) is easy to
author without ever appending the trailing `\n` that every harness's
`print`/`println`/`console.log` actually emits — causing every language to
fail 0/20 uniformly, correct solutions included.** Found across 5 files this
session (`group-anagrams`, `contains-duplicate`, `valid-anagram`,
`longest-consecutive-sequence`, the hash-maps `top-k-frequent`). When a
0/20-across-every-language flag shows up, check the raw `expectedOutput`
strings for a missing trailing `\n` before assuming the algorithm is wrong.

**A JS/TS harness that only registers an `rl.on('line', ...)` handler (no
`'close'` handler) will silently produce no output at all for a genuinely
empty stdin test case (`stdin: ''`)** — Node's `readline` never emits a
`'line'` event when there's no data, so nothing runs. Same root problem, two
other language manifestations: Java's `Scanner.nextLine()` throws
`NoSuchElementException` on empty input (guard with `sc.hasNextLine() ?
sc.nextLine() : ""`), and Rust's `stdin.lock().lines().next().unwrap().unwrap()`
panics on `None` (use `.next().transpose().unwrap().unwrap_or_default()`).
The JS/TS fix: collect lines into an array via `'line'`, then do all the
work inside `'close'`, reading `lines[0] || ''` instead of assuming a line
arrived.

**For a "return elements grouped/in any order" problem where the output is a
*nested* structure (list of lists, not a flat array), canonicalizing for
exact-match grading needs sorting at BOTH levels** — sort each inner group,
then sort the outer list by each group's (now-sorted) first element. Only
sorting one level still leaves grading order-dependent. Applies in every
harness, never in the solutions-page algorithm itself (`group-anagrams`).

**Before treating a solutions-page function as ground truth, read it — a
"conceptual" placeholder that returns `NULL`/empty and comments "would need a
full implementation, here we show the approach" is not a working solution,
even though it looks complete at a glance.** C lacks a standard hash map, so
`group-anagrams`'s C solution was left as exactly this kind of stub; fix by
writing a real (even if O(n²) linear-scan) implementation, not by assuming
the placeholder is intentional.

**C#'s tuple/local-function restrictions (documented above) also show up
disguised as `LinkedList<(int, int)>` field buckets and
`foreach (var (k, v) in list)` deconstruction** — same C# 7+ incompatibility,
different syntax shape. Replace the value-tuple element type with a small
private class (`Key`/`Value` fields) and iterate with a plain `foreach (var
pair in list)`, indexing `pair.Key`/`pair.Value` instead of deconstructing.

**A Rust `get_mut` borrow held across a second `get_mut`/`insert` call on the
same map triggers `error[E0499]: cannot borrow ... as mutable more than once
at a time`, even when the value is read out first** — e.g. `if let
Some((value, _)) = map.get_mut(&key) { ...; *map.get_mut(&key).unwrap() =
...; *value }` keeps `value`'s borrow alive across the second `get_mut`.
Fix: use an immutable `.get(&key)` with a `&(value, _)` pattern to copy the
value out (works for `Copy` types like `i32`), then a separate `.insert()`
call — no overlapping mutable borrows.

**TypeScript has no nested-class syntax — `private class Node { ... }`
inside another class is a parse error (`';' expected`), not a scoping
restriction.** Move the class to module scope, sibling to the outer class,
matching the Java/C# "hoist to top-level" convention already documented
above. Watch for a second trap once it's hoisted: naming it `Node` collides
with the DOM lib's built-in `Node` interface when compiled with `--lib dom`
(`error TS2300: Duplicate identifier 'Node'`) — pick a name that doesn't
shadow a global DOM type (e.g. `CacheNode`).

**A "design"-pattern problem (`Codec`/`ParkingSystem`/etc. with a
separate helper type like `TreeNode`) needs that helper type declared at
true top level — not nested inside the harness's driver class, and not
declared inside a callback closure — or the student's own class can't see
it at all.** This shipped for real in `serialize-deserialize-bst.mdx`
three different ways at once: Java's `TreeNode` was `static class TreeNode`
nested inside `Main` (invisible to the separate top-level `Codec` class
the student writes — `cannot find symbol: class TreeNode`), while
JavaScript's and TypeScript's `class TreeNode`/`insert`/`preorder` helpers
were declared *inside* the `rl.on('close', () => { ... })` callback
(invisible to the student's `serialize`/`deserialize` functions, which are
composed in at module scope, above and outside that closure —
`ReferenceError: TreeNode is not defined` / `TS2304: Cannot find name`).
The fix in both cases is the same: hoist the shared type/helper functions
to true top-level/module scope, leaving only the actual stdin-reading and
the calls into the student's code inside `main()`/the callback. When a
design-pattern harness fails with "symbol not found" for a type the
student's own code obviously needs, check where in the harness that type
is actually declared before assuming the student-facing signature is
wrong.

**An LRU/LFU eviction bucket implemented as `Vec<T>` with `.push()` to add
must evict via `.remove(0)` (the front), never `.pop()` (the back)** —
`.push()` appends in usage order, so the back is the *most* recently used
and `.pop()` silently evicts the wrong (newest, not oldest) entry on every
frequency tie. This is a real algorithm bug, not a RapidAPI-runtime quirk —
verify eviction order explicitly whenever a Vec/array stands in for a queue.

**Test data violating the problem's own stated constraints keeps recurring
and is *not* a "which answer is right" judgment call — fix the test data,
don't reverse-engineer what a language-specific implementation happens to
produce for the invalid input.** Two more instances this session: a
`design-hashmap` case used negative keys against a documented `0 <= key`
constraint (causing `key % capacity` to go negative and index out of bounds
in JS); a `pow-x-n` case used `x=0, n=-1` against an explicit "no zero to a
negative power" constraint (undefined arithmetically, not just
implementation-specific). Replace with valid data preserving the same test
intent, don't touch the algorithm.

**C#'s `Math.Abs(int.MinValue)` throws `OverflowException` — unlike Java's
`Math.abs`, which silently overflows back to the same negative value (and,
for negative-space division algorithms, happens to be the *correct* value by
coincidence).** Cast to a wider type before negating/abs-ing anything that
could be `int.MinValue`: `long dvd = -Math.Abs((long)dividend);` rather than
`dividend = -Math.Abs(dividend);`.

**JS/TS bitwise operators (`<<`, `>>`, `|`, `&`, etc.) force their operands
through `ToInt32` even though JS numbers are 64-bit doubles — doubling a
value via `x <<= 1` silently corrupts it the moment `x` approaches ±2³¹,
while the exact same algorithm using `x *= 2` (plain multiplication, safe up
to 2⁵³) does not.** Any bit-shift used purely as "multiply/divide by a power
of two" in an algorithm whose intermediate values can approach the 32-bit
boundary (e.g. doubling toward `INT_MAX` during a division-by-repeated-
subtraction algorithm) should use arithmetic operators in JS/TS, not
bitwise ones — even though the equivalent Java/C++/C#/C code can safely use
`<<=` on a real 32-bit `int`.

**Node's `console.log(-0)` prints `"-0"`, even though `(-0).toString()` and
`String(-0)` both give `"0"` — a JS/TS harness that logs a computed number
directly can leak a `-0` into graded output when the algorithm can produce
negative zero (e.g. an integer-division result of exactly 0 with a
sign-tracking variable).** Normalize before printing: `console.log(result
=== 0 ? 0 : result)` (`===` treats `-0` and `0` as equal, so this collapses
either sign of zero to plain `0`).

**A "prevent overflow" doubling-loop guard copy-pasted across languages as
`current >= (dividend >> 1)` is an algorithm bug, not a formatting one, when
the surrounding code works in negative-space (dividend and divisor both
negated before the loop) — the correct guard is `current >= (dividend -
current)`.** The `>> 1` form only happens to work for a *positive*-space
variant of the same algorithm; ported verbatim into a negative-space version
it overshoots and produces silently-wrong results on simple inputs like
`1 / 1`. When the exact same buggy line appears in 6+ language tabs of one
solutions page, check whether it was cloned across languages rather than
independently authored per language — the same fix needs applying
everywhere it was copied.

**Always confirm which side of the sentinel marker a harness's `print`s land
on — a harness that computes the result, then prints it, and only
*afterward* prints `###SYPHER_JUDGE0_RESULT###` will grade as blank/wrong
100% of the time, since grading reads only what comes after the marker.**
Easy to miss by skimming, since the code "looks" like it prints everything
it needs to — verify the marker line is literally the last `print`/`println`
statement before the result, not the reverse.

**A Rust harness that builds a tree from a flat level-order array using a
single `Vec<Option<Box<TreeNode>>>` and `.take()`s a node out to attach it as
someone else's child will silently lose that node's own children** — once
`.take()`n, the node's old slot in the Vec is `None`, so a later loop
iteration that tries to reach it via `nodes[parent]` to attach *its*
children finds nothing there and does nothing, no panic, no error. This
broke `build_tree` identically across 10 files in one session (any tree
harness with the standard "parent index / child index" loop). The fix is a
two-phase approach: first do a pure-index BFS pass computing `left_idx`/
`right_idx: Vec<Option<usize>>` for every position with no ownership
involved, then recursively construct bottom-up from those indices
(`fn build(idx, arr, left_idx, right_idx) -> Box<TreeNode>`). Verify by hand
against a >3-node tree before trusting it — this bug produces no compile or
runtime error, only a silently-truncated tree, and it's easy to "fix" the
narrower borrow-checker complaint it also throws (below) without touching
the real bug.

**A Rust solutions-page tree function written against `Rc<RefCell<TreeNode>>`
when the exercise's own `starterCode`/harness `TreeNode` is a plain `Box`
(or vice versa) won't compile (`expected struct Box, found struct Rc`) — and
either side could be the one that's wrong.** Check which convention the
*harness's own* `build_tree`/traversal helpers actually use (that's ground
truth, since it's what real students compile against) and make `starterCode`
and the solution match it, not the other way around. If the harness's own
`main()` truly needs shared/interior mutability the `starterCode` signature
doesn't offer (e.g. it calls the function with an owned clone rather than
`&mut`), the `starterCode` signature itself is the bug and must be fixed to
match what the harness's `main()` actually calls it with.

**`Rc<RefCell<T>>` traversal that takes `&n.borrow().left` directly (instead
of cloning it into a local first) triggers "temporary value dropped while
borrowed"** — `n.borrow()` returns a `Ref` guard that's dropped at the end
of the expression, so a reference borrowed through it can't outlive the
statement. Clone the `Option<Rc<...>>` (cheap, just bumps the refcount) into
a local binding, then pass `&that_local` to the recursive call.

**A "detect the swapped/misplaced node(s)" algorithm (BST recovery, etc.)
that assumes a match will always be found crashes (null/None dereference,
`AttributeError`, `NullReferenceException`) on any input where nothing
actually needed fixing** — and test suites for this exact problem shape
routinely include "already valid, nothing to swap" cases on purpose. Guard
the final fix-up step with a null/None check on both tracked
nodes/values before touching them, in every language, not just the one
where a crash happened to surface first.

**A duplicate value in "find and swap the misplaced node(s)" test data
breaks the standard first/prev/second in-order-inversion algorithm** — it
relies on values being unique to unambiguously identify *which* node holds
which value after detecting an inversion; two nodes sharing a value make the
swap target ambiguous even though no constraint may explicitly forbid
duplicates. Replace with distinct values, verified by hand that the
resulting corrupted tree round-trips back to a valid sorted BST.

**When a harness's own tree/array serializer trims *all* trailing null
markers (not just markers past the last real value), re-serializing after a
transformation (invert, etc.) can introduce brand-new "-1 -1" pairs for
nodes that were *implicitly* leaves in the original input** (the input array
simply ended before reaching them) **but are now *explicitly* serialized as
having no children.** This isn't a bug in the transform — it's an
asymmetry between "array ended early" (input convention) and "explicit null
after transform" (output convention). Verify expected output by running the
harness's own serializer against the transformed structure by hand, not by
eyeballing the input array.

**A level-order tree/array sentinel value (commonly `-1`) that collides with
a legitimately in-range node value (e.g. constraints say
`-1000 <= Node.val <= 1000`) makes some inputs fundamentally unparseable —
any node whose real value equals the sentinel gets silently treated as
"absent."** Redesigning the sentinel convention project-wide is out of
scope for a single-problem fix; the pragmatic fix is to keep test data away
from the colliding value (regenerate the specific cases that hit it) and
note the underlying limitation for whenever that harness's I/O format gets
revisited.

**Before rewriting a language's solution to fix a bug, confirm its shape
actually matches `starterCode` for that language** — a Python solutions
page wrapped in `class Solution: def camelCase(self, ...)` when
`starterCode` (and the harness's call site) is a bare `def snake_case(...)`
free function fails with `NameError: name '...' is not defined` in the
harness, not in the solution itself, which makes the real cause easy to
miss. Check every language's solution against its own `starterCode`
signature shape (free function vs. class method, naming convention) even
when only one specific language is failing.

**A test case built as "valid BST-shaped array" for a BST-specific problem
needs its in-order traversal to actually be ascending — a generic
level-order array that happens to build *some* binary tree isn't
automatically a valid BST.** Verify by hand-tracing the in-order sequence
before trusting a BST test case; several bugs this session came from arrays
that produced a structurally-fine tree that just wasn't sorted.

**JS/TS bugs aren't limited to `\n` — any single backslash before a
non-JS-escape character inside a JSX template literal (`\s`, `\d`, `\w`
inside a regex literal) gets silently dropped by the same JS
string-decoding rule, turning `/\s+/` into `/s+/` (matches literal `s`, not
whitespace) or `/\d/` into `/d/` (matches literal `d`, not a digit) —
completely different, silently-wrong behavior, not a compile error.** This
is invisible from reading the rendered exercise (looks like a normal regex)
and only surfaces as a content mismatch. It does **not** apply to
solutions-page code — those live in markdown fences, not JSX template
literals, so a single backslash there is already correct and must not be
doubled. When auditing a category, grep exercise (not solutions) files for
single-backslash regex escapes (`\s`, `\d`, `\w`, `\b`) the same way the
`\n` sweep already does.

**A Java solution using `Pair<K, V>` (`javafx.util.Pair` or similar) won't
compile on RapidAPI — the class isn't available/importable in that
sandbox.** For BFS-with-distance patterns that reach for `Queue<Pair<String,
Integer>>`, restructure as level-by-level BFS instead (process the entire
current queue size as one batch, increment a single shared counter once per
level) — avoids needing a pair type entirely and is the more idiomatic
approach anyway.

**When every other language's harness sorts its result array before
printing but one language's harness doesn't, that one language will fail
every "any order" test case with an otherwise-correct solution** — check
each language's harness individually for a missing final sort step rather
than assuming a shared post-processing convention was applied uniformly
everywhere.

**C#'s default string comparer (`List<string>.Sort()`, `string.CompareTo`,
`new SortedSet<string>(...)` with no comparer) is culture-sensitive, not a
plain byte/codepoint comparison** — on strings containing digits and
punctuation (e.g. `john00@mail.com` vs `john_newyork@mail.com`) it can
order them differently than Python/JS/Java's default (ordinal) string
sort, causing a content mismatch even though the grouped data itself is
correct. Always pass `StringComparer.Ordinal` explicitly to any C# sort or
sorted-collection constructor used for judge-comparable output, in *both*
the harness and the solutions page — fixing only one still leaves the
other silently re-sorting with the culture-sensitive default.

**A "merge groups and pick a representative attribute" solution (e.g.
accounts-merge picking which account name labels a merged group) that
sets `name = X` unconditionally inside a loop over every group member
picks whichever member is *last* in iteration order, not the intended
first-seen/canonical one** — guard the assignment (`if (name == null)
name = X;`) so it's set once, on the first match, matching what every
other correctly-passing language's solution naturally does by using the
first key encountered.

**A cycle-detection problem (redundant-connection style: "graph started
as a tree, one extra edge added") needs its test data to contain exactly
one cycle** — a graph with `E` edges and `N` nodes has `E - N + 1`
independent cycles when connected; test input with 2+ independent cycles
(e.g. two disjoint components each with their own redundant edge) breaks
the "return the last redundant edge in the input" guarantee, since a
union-find pass returns the *first* cycle-causing edge it finds, which
only matches "the last one" when there's a single cycle. Verify by hand
that `edges.length === nodes.length` for a connected graph *and* that
only one such cycle actually exists before trusting a test case's
`expectedOutput`.

**A `foreach`/`for` loop with no braces around a two-statement body
(marker print + result print) only runs the first statement inside the
loop — the second becomes a standalone statement after the loop ends,
using a loop variable that's now out of scope** (Java/C#: `foreach (var x
in xs) Console.WriteLine(marker); Console.WriteLine(x);` — `x` doesn't
exist outside the loop, `CS0103`/"cannot find symbol"; C: the same shape
compiles but is a hard `error: 'i' undeclared` once optimizations or a
stricter standard catches it) **and it also prints the marker once per
iteration instead of once before the loop.** Always brace multi-statement
loop bodies, and always move the marker print to before the loop, printed
exactly once.

**C#'s `List<List<T>>` does not implicitly convert to
`IList<IList<T>>`** even though `List<T>` converts to `IList<T>` for a
single level — generic covariance doesn't stack. If a solution's method
signature takes `IList<IList<T>>` (the common LeetCode-style C# signature
for a list of lists), build the harness's input collection as
`List<IList<T>>` directly (not `List<List<T>>`), or the call site fails
with `CS1502`/`CS1503` even though the data itself is fine.

**When a graph/adjacency-list problem labels nodes `1..n` (not `0..n-1`)
but internal work still needs a 0-indexed array** (visited flags, BFS
queues, a `result[]` keyed by array position), every neighbor *value*
read from input must be translated (`value - 1`) before it's used as an
index — while the *value itself* (unchanged, still 1-indexed) is what
gets copied into any output that echoes the original labels. Mixing the
two — indexing with a raw 1-indexed value — doesn't silently produce
wrong output; it throws an out-of-bounds/index error on whichever node
has the label equal to `n`, since that's the one value that overflows a
0-indexed array of length `n`.

**RapidAPI's Rust toolchain doesn't implement `Step` for `char`, so `for c
in 'a'..='z'` fails to compile** (`the trait bound char: std::iter::Step
is not satisfied`) — iterate the byte range instead:
`for b in b'a'..=b'z' { let c = b as char; ... }`.

**The C-harness auto-hoisting logic (`composeSourceCode`/
`extractLeadingDataStruct` in the audit tooling, and the equivalent
composition the real submission proxy does) only detects a harness's own
leading `typedef struct { ... } Name;` if it is the very first non-blank
line of the harness body** (right after the `#include` block) — a
descriptive comment placed above the typedef defeats detection, silently
disabling the hoist. When that happens, the struct never gets moved ahead
of the student's/solution's code, so any function returning that type
fails with `unknown type name` (compiled before the typedef) or, if
`starterCode` also (redundantly) declares the same typedef to compensate,
`conflicting types` (declared twice). Put the typedef as the first line
of the harness body; comments describing it can follow on the next
lines, not precede it.

**A "package main" Go harness's `import (...)` block must start at column
0 with no leading whitespace and no characters before the word `import`
on that line** — the composer's Go-preamble detection (`extractPreamble`)
requires the line immediately after `package main` to match
`/^import\s*\(/` exactly. A single leading space (or any obfuscated/
mis-encoded form of the word `import`) makes the whole import block get
treated as ordinary body text instead of being hoisted to the top of the
file — it still compiles as *a* valid Go import syntactically, but ends
up positioned wherever the harness body happens to land relative to the
solution's own code (often after other top-level declarations), which is
a hard syntax error since Go requires imports before any other
declaration. If a Go harness fails with "syntax error: non-declaration
statement outside function body" pointing at an `import (` line midway
through the file, check the raw bytes of that line for stray leading
whitespace or mangled characters, not just what an editor renders.

**A topological-sort/ordering problem (alien dictionary, course
scheduling with partial prerequisites, etc.) where some elements have NO
constraint relative to each other has more than one valid answer** —
exact-string-match grading can't accept "any valid order," so a fixed
`expectedOutput` is only trustworthy when the test's constraints fully
and transitively order every element that appears (no element left with
zero in-degree and zero out-degree relative to the others, no two
elements that are both unconstrained sources). Before trusting a
mismatch as an algorithm bug, check whether multiple independently
correct implementations agree with each other but disagree with
`expectedOutput`, and whether the disagreement is confined to elements
with no edges tying them to a fixed position — if so, redesign the test's
input (add words/edges that pin down every element's relative order)
rather than trying to guess which output happens to match a particular
language's iteration order.

**A harness that reimplements the algorithm itself (its own helper
function plus its own globals) instead of calling the student's/
solution's function is a fundamentally broken harness, not just a
naming collision** — it happens when a harness gets copy-pasted from a
solutions-page reference implementation instead of being written as a
thin stdin-parse → call-the-function → print-the-result wrapper. Symptoms
range from a `backtrack`/helper-name collision (if the solution defines
one too) to the harness silently ignoring the student's code entirely
(if it doesn't collide) — either way, the fix is to rewrite the harness
to call the function via the same signature `starterCode` declares
(e.g. `combinationSum(candidates, candidatesSize, target, &returnSize,
&returnColumnSizes)`), not to patch around the collision.

**C#'s target-typed `new()` (C# 9+, e.g. `Dictionary<K,V> Map = new()
{ {k,v}, ... }`) isn't supported by RapidAPI's C# compiler** and fails
with a wall of confusing `CS9010`/`CS8041` "primary constructor" errors
that don't obviously point at the real cause. Always spell out the type:
`new Dictionary<K,V>() { {k,v}, ... }`.

**Mixed unsigned-index arithmetic where a subtraction could transiently
go negative panics in Rust even when the final result is non-negative**
(`usize` has no negative values, so `row - col + n` panics with "attempt
to subtract with overflow" whenever `col > row`, regardless of `n`
being large enough to make the *final* result valid) — reorder so every
intermediate step stays non-negative: `row + n - col` instead of
`row - col + n`. Other languages' signed integers don't have this
problem, so this class of bug is Rust-only even when the same formula
text appears unchanged across every language's solution.

**When one language's algorithmic *approach* differs from every other
language's for an "any order" problem, its output order can differ too,
even if its harness has no missing sort step and its logic is
correct** — e.g. a subsets/permutations solution using bitmask
enumeration (mask 0 to 2^n-1) produces a different enumeration order
than every other language's recursive include/exclude backtracking, even
though both are equally valid. Confirm this by comparing the failing
language's *approach* to the passing languages', not just checking for
a missing sort step (that's a different bug, [[the missing-sort-step
guidance above]]) — if the approach itself is the odd one out, rewrite it
to match the same algorithmic pattern the other languages use, so the
enumeration order is consistent by construction rather than papered over
with a sort.

**Grading is an exact string match against `expectedOutput` — a whole
file where every `expectedOutput` is missing its trailing `\n` fails
100% of that file's test cases across every language, even when every
solution is correct.** This is easy to miss because each individual
mismatch looks like a content bug (`"true"` vs `"true\n"`), and it's easy
to assume only the specific failing case is wrong rather than checking
whether the *whole file* was authored without the trailing newline.
Before diagnosing individual cases in a file where every test in every
language fails, grep the file for `expectedOutput: '` entries and check
whether ANY of them end in `\n` — if none do, it's a file-wide authoring
gap, not per-case bugs, and every entry needs the same fix.

**A mangled `import` line in a Go harness — a literal `import (`
(backslash-u-0069, not an actual decoded character) with a stray leading
space — has now recurred independently across multiple files this
session.** It silently defeats `composeSourceCode`'s Go-preamble
detection (see the entry above on `/^import\s*\(/` requiring column 0),
producing a "syntax error: non-declaration statement outside function
body" that points at a *different* line than the actual defect. Whenever
a Go harness fails this way, check the raw bytes of the line right after
`package main` specifically — don't assume the mangling was already
caught elsewhere, since it appears to come from some upstream generation
step and can reappear in new files.

**`composeGoPreamble` only merges imports from a snippet whose first line
matches `package main`** — a solutions-page Go snippet (which is just a
bare function, never `package main`-prefixed) contributes ZERO imports
to the composed file, no matter what `import` lines you put inside it.
If a Go solution needs a package the harness doesn't already import
(`math`, `sort`, `strings`, etc.), add it to the **harness's** import
block, not the solution snippet — the latter is silently discarded by
the preamble merge.

**Rust's `str::split()` has no zero-argument form** (unlike Python's
`.split()`, which splits on any whitespace run by default) — `input.trim
().split().map(...)` fails to compile with "this function takes 1
parameter but 0 parameters were supplied". Use `.split_whitespace()`
when porting a Python harness's whitespace-split parsing to Rust.

**A harness that prints the result content before printing the sentinel
marker (not just JS/TS's `rl.on('line')` variant of this bug) puts the
real output before the marker instead of after** — since grading reads
only what comes after the *last* marker occurrence, the graded output
ends up empty/truncated regardless of language. Check the print-call
order directly, not just for the JS-specific event-handler shape this
bug was first found in.

**RapidAPI's C environment doesn't have `<stdint.h>` in the auto-prepended
preamble** (`supplementSolutionPreamble`'s C prefix only adds `stdio.h`/
`stdlib.h`/`string.h`/`stdbool.h`/`limits.h`) — a solution or harness
using `uint32_t`/`uint64_t`/etc. needs its own explicit `#include
<stdint.h>` in the harness, since nothing supplies it by default.

**A C harness that allocates one `int` and passes its address (`&n`) as
a `returnColumnSizes`/`accountsColSize`-style per-row-length array is
passing a pointer to a single value where an array of `m` values is
expected** — reads at index 0 happen to work, everything beyond that
reads adjacent stack memory, causing a segfault for `m > 1` (or silently
wrong values for small `m` if the adjacent memory happens to look
plausible). Always allocate the array with the actual row count and fill
every entry, even when every row happens to share the same width.

**An accumulator initialized to `0` silently produces a wrong answer
`0` instead of an error when every real candidate value is negative** —
this pattern (`maxWealth = 0`, then `if (sum > maxWealth) maxWealth =
sum`) is invisible in testing until a test case exercises all-negative
input, and it's exactly the scenario a problem's own constraints section
warning "some test cases may include 0 or negative values" is telling
you to check for. Initialize to the type's minimum value (or the first
element) whenever the constraints don't guarantee a known-safe floor,
not to a value that happens to work for the common case.

**A harness that normalizes case (`.upper()`/`.toUpperCase()`) on only
one side of what will become a case-sensitive comparison — e.g.
uppercasing the parsed board but leaving the parsed word/needle
untouched — passes when the test data happens to already be consistently
cased, and silently fails the moment a test case uses lowercase.** Check
whether the normalization is applied to *both* operands of the
comparison, and whether every other language's harness for the same
problem does the same normalization (if they don't, the odd one out is
usually the bug, not the norm — remove the stray normalization rather
than adding it everywhere).

**Never encode multi-field input/output as JSON inside `testCases`/harness
I/O — use the course's plain length-prefixed convention instead (a count
line followed by a space-separated values line per array; a bare printed
scalar for the result).** Four early greedy-pattern files
(`assign-cookies`, `lemonade-change`, `jump-game`, `partition-labels`)
were originally authored with `{ input: {...}, expected: {...} }` test
cases and a harness that read/wrote JSON (`json.loads`/`JSON.parse`/
`json.dumps`/`JSON.stringify` per language) — structurally incompatible
with the `{ stdin, expectedOutput }` shape every other problem in the
course uses, so these files were invisible to the standard grading path
entirely until converted. Even after fixing the outer shape, the JSON
encoding itself carries two further traps:
- **Cross-language output-format mismatch**: Python's `json.dumps({"output":
  1})` produces `{"output": 1}` (space after colon), while
  `JSON.stringify`/Java/C++/C#/Go's JSON encoders all produce
  `{"output":1}` (no space) — a single shared `expectedOutput` string can
  only exact-match one of these, so roughly half the languages fail
  regardless of solution correctness.
- **External-crate risk in Rust**: `serde_json::from_str`/`serde_json::json!`
  require a crate RapidAPI's bare-`rustc` Rust runtime does not have
  access to (no Cargo/registry) — almost certainly a compile failure,
  not a runtime one.
Converting to the plain format (count + space-separated values, printed
scalar) sidesteps both issues at once and matches how every other
multi-value-input problem in the course already encodes its I/O — prefer
it over patching JSON per language.

### Test Case Guidelines

Each problem must have **20 test cases** covering:
- Minimum constraints (n=1, n=2)
- Typical cases
- Edge cases (empty, all same, reversed, etc.)
- Negative numbers where applicable
- Large values within constraints
- Duplicates where applicable

Tag exactly the **first 2** test cases with `isSample: true` (no trailing comma issue —
just add the field to those two object literals, leave the rest untagged). CoreEditor's
"Run" button sends only `isSample` cases; "Submit" sends the full 20. Put your two
simplest, fastest-to-eyeball cases first so Run stays a quick sanity check — don't
front-load an edge case or a large-input case there. If a problem can only have 1
meaningful test case, tag that one; never leave zero cases tagged.

**Every `expectedOutput` value must match what the harness actually prints, byte for
byte — grading is an exact string match, not a trimmed one.** Almost every harness
ends its output with one unconditional print call (`println!`, `console.log`,
`print(...)`, etc.), which always appends a trailing newline — so almost every
`expectedOutput` must end in `\n`. An `expectedOutput` authored without one, when the
harness's print is unconditional, fails 100% of that problem's test cases in every
language, even when every solution is correct — a whole-file authoring slip, not a
per-case one, and easy to miss because each individual failure looks like an unrelated
content bug. Multi-line results get `\n` appended once, after the last line, not before
it.

**The one legitimate exception: a harness whose output comes from iterating a
possibly-empty result (`for x in result: print(x)`, `result.forEach(...)`, etc.)
prints nothing at all — not even a bare newline — when that result is empty.** For
those specific cases (and only those), `expectedOutput: ''` (true empty string, no
`\n`) is correct, not a bug — verified directly in n-queens (`n=2`/`n=3`, zero valid
boards, zero `print` calls ever execute) and merge-intervals (zero input intervals,
zero merged intervals printed). Telling the two apart: does the harness's last print
statement execute unconditionally exactly once per test case (needs `\n`), or is it
inside a loop/conditional that can execute zero times for a legitimate input (needs
`''` for exactly those zero-iteration cases, `\n`-terminated for every other case)?
When unsure, this is exactly what `_audit-batch.mjs`'s free static
`MISSING-TRAILING-NEWLINE` pre-check (which already excludes `''` cases) is for — it
runs before any RapidAPI calls, so run it on a new problem before spending a live
audit pass on it. Before finishing a new problem, grep the file for
`expectedOutput: '` and confirm every match ends in `\n'` OR is genuinely `''` for a
verified-zero-output case — don't spot-check a few and assume the rest follow the
same pattern.

**A solutions.mdx page can be a content-generation stub even when its exercise page
looks completely normal** — a fully-formed harness, 20 well-authored test cases, and
starterCode for every language can coexist with a solutions.mdx that's just a mangled
title (`�` where an em dash should be), a single `def <slug_with_underscores>(data):
pass` Python placeholder, and no `Tabs`/`TabItem` structure at all. This is invisible
to the RapidAPI-based audit specifically *because* it looks broken in the right way:
every language reports `NO-SOLUTION-SOURCE` (nothing to submit), and a problem where
every language has `NO-SOLUTION-SOURCE` satisfies `allClean` vacuously — it was never
actually tested, but reports as **CLEAN**. This was found affecting 22 problems
spanning most categories in the course, none of which the batch audits in this
session actually verified despite reporting them clean. Don't trust a CLEAN verdict
at face value — check that `sol[lang]` was actually populated for at least one
language (or grep the solutions.mdx for `TabItem value=`) before concluding a
problem was really exercised.

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

**A language present in `harness`/`starterCode` but missing from the solutions
page's `Tabs` is invisible to the standard audit — it reports `NO-SOLUTION-
SOURCE` for that language and the file still shows overall `CLEAN`, so a
broken harness for that one language can ship undetected indefinitely.**
Found in `sliding-window/maximum-average-subarray.mdx`: the exercise fully
supports Go (starterCode + harness both present), but the solutions page had
no Go tab at all — so the standard audit (which only tests languages with a
reference solution) never actually compiled or ran Go for this problem. The
Go harness's `fmt.Printf("%.5f", ...)` was missing its trailing `\n` (every
other language's harness for the same problem correctly appended one), so
*any* correct Go submission — including a genuinely independent one written
from scratch — failed exact-match grading on every case. This was only
caught by writing and submitting an independent solution in every language
present in the harness, not just the languages the solutions page happens to
cover. When authoring or auditing a problem, cross-check that every language
key in `starterCode`/`harness` has a matching `TabItem` in the solutions
page — a language with an exercise but no solution is a silent audit blind
spot, not a clean file.

## Verification

1. `npm run build` — Docusaurus build must pass with no errors
2. Navigate to each exercise page — verify split layout renders correctly
3. Check each solution page — verify all language tabs work
4. Verify test cases display in the console panel
5. Check hint sections are expandable/collapsible