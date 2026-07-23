# Convert ASCII diagrams to Mermaid: {ARGS}

`{ARGS}` = one or more course slugs under `apps/docs/docs/` (e.g.
`python-for-ai-engineers`, `agentic-ai-fundamentals system-design-fundamentals`),
or a narrower path within one (e.g. `system-design-fundamentals/grpc`).

Converts every `<AsciiDiagram>` in the given course to a rendered Mermaid
diagram, while preserving the original ASCII as data on the page (nothing is
deleted). This does **not** touch prose, code samples, or anything outside
`<AsciiDiagram>` components.

## Flow — strict phase gate, one course at a time

Run these four phases **in order, to completion, for the whole course**,
before touching the next course (if more than one slug was given). Do not
interleave — don't convert-one/verify-one/move-on. A course is not done
until Phase 3 passes for every single diagram found in Phase 1.

```
1. FIND    — enumerate every <AsciiDiagram> in the course needing conversion
2. CONVERT — for every one found: write Mermaid, render it, wire it in
3. VERIFY  — re-check the whole course is actually done, then build
4. REPORT  — only now say the course is complete; move to the next course
```

---

## What "convert" means here

The `AsciiDiagram` component (`apps/docs/src/components/AsciiDiagram/index.jsx`)
already supports this via one optional prop:

- `mermaidSrc="/img/diagrams/<hash>.svg"` — when set, the component shows this
  rendered SVG as the diagram image instead of the raw ASCII text, and
  automatically writes the original `content` into a `data-ascii-source`
  attribute on the `<img>` — so the original is preserved in the page's HTML,
  just no longer the visible rendering.

A diagram is only "converted" once it has all three: a rendered Mermaid SVG,
a `mermaidSrc` prop pointing at it, and its original `content` still intact
underneath. Rendering alone is not conversion. Writing the `.mmd` file alone
is not conversion. **Never delete or rewrite the `content` prop** unless
it's already corrupted garbage (see Corrupted content below).

---

## Phase 1 — FIND

Enumerate every candidate across the *entire* course before converting
anything:

```bash
COURSE="{ARGS}"
grep -rl '<AsciiDiagram' --include="*.mdx" --include="*.md" "apps/docs/docs/$COURSE" 2>/dev/null
```

Then narrow to what's actually left to do — files with `<AsciiDiagram>` that
do **not** already have `mermaidSrc=` (already-converted ones are a safe
skip, this command is idempotent):

```bash
grep -rL 'mermaidSrc' $(grep -rl '<AsciiDiagram' --include="*.mdx" "apps/docs/docs/$COURSE") 2>/dev/null
```

Report the total count of remaining `<AsciiDiagram>` occurrences (a file can
have more than one) before starting Phase 2. This list is your checklist —
Phase 3 re-runs this exact query and must get zero results.

## Phase 2 — CONVERT ALL

For every file Phase 1 flagged, and every `<AsciiDiagram>` in it without
`mermaidSrc`, do all of the following. Don't consider any diagram "done"
until it's rendered *and* wired — a half-finished diagram (only a `.mmd`
file, or only a render) is not converted.

### 2a. Write the Mermaid

1. Read the diagram's `content` (the original ASCII/Unicode-box-drawing) and
   the prose immediately around it for context.
2. Write a faithful Mermaid equivalent — `flowchart`/`graph` for
   architecture/relationship diagrams, `sequenceDiagram` for
   request/response or step-by-step interactions, `erDiagram` if it's
   entity-relationship. Preserve box contents, labels, and arrow
   directions/meaning exactly. Don't invent connections or drop labels.
3. Save it as its own file:
   `.cache/ascii-to-mermaid/<course-page-slug>-N.mmd` (N = 1-based index of
   that diagram within its file, in source order). Plain Mermaid source
   only, no markdown fences in the `.mmd` file.

**Pick a starting orientation from the ASCII's shape — it won't get you
all the way there, but it cuts down on iterate-render-check cycles.**
Before writing the first draft, measure the original: longest line length
(chars) and number of lines. That's a rough proxy for whether the source
diagram was itself wide (many boxes side by side) or tall (a long vertical
chain) — start `flowchart LR` for a tall/narrow source, `TD` for a
wide/short one, on the theory that a straight direction-preserving port
tends to inherit the same shape problem the original had.

**This is a heuristic for the first guess, not a substitute for
rendering.** Mermaid's dagre layout doesn't scale linearly from character
counts — a flowchart node's pixel width depends on box padding, font
metrics, arrow-label space, and multi-line wrapping, none of which map
predictably from "N characters in the ASCII source." Every fix batch in
this course's conversion run confirmed the same thing: a plain direction
swap frequently overshot or undershot the target band and needed a second
adjustment (splitting one row into two, shortening a label, tightening
`nodeSpacing`/`rankSpacing`) found only by actually rendering and reading
the resulting `viewBox`. Treat the char-count guess as saving you one
iteration, not zero.

**Known Mermaid layout quirk — disconnected subgraphs ignore `direction`
entirely.** If a flowchart has multiple subgraphs with no edges directly
between them (e.g. three independent "before/after/notes" panels), dagre
stacks them vertically regardless of the outer `flowchart LR` or an inner
`direction LR` — the direction hint only affects nodes that are part of a
connected layout. Fix by adding an invisible link between the subgraphs to
pin them into the same rank: `SubgraphA ~~~ SubgraphB` (three tildes, no
visible line, but it forces horizontal placement). This came up
repeatedly enough across independent fixes in this course that it's worth
trying first whenever a multi-subgraph diagram stays stubbornly portrait
after a direction swap.

**There's also a CSS-level safety net now — it helps one direction, not
both.** `AsciiDiagram`'s `.image` rule used to force `width: 100%`, which
stretched every diagram — including narrow/portrait ones — up to fill the
full content column, inflating a portrait diagram's displayed height even
further. It's now `width: auto; height: auto; max-width: 100%; max-height:
70vh`, wrapped in a scrollable `overflow-x: auto` container (matching the
existing ASCII-fallback pattern). This means a diagram that's naturally
smaller than the content column displays at its own true size instead of
being stretched — so a portrait diagram no longer gets artificially
inflated by the page layout on top of whatever its own aspect ratio is.
**It does not fix a genuinely too-wide diagram** — `max-width: 100%` still
shrinks anything wider than the column, so an extreme ratio still shrinks
its text into illegibility regardless of this CSS. The landscape-band
content fix above is still the real fix for that direction; the CSS change
is a backstop for the portrait direction and for anything that slips
through, not a substitute for getting the Mermaid layout right.

**Special characters in labels — what's actually safe (verified empirically,
don't guess):**

- `&amp;` (for a literal `&`), `&quot;` (for a literal `"`), `&lt;`/`&gt;`
  (for literal `<`/`>`) — all safe inside flowchart node/subgraph labels.
  They render correctly as the intended character.
- **Never use numeric character references** (`&#123;`, `&#125;`, etc.) for
  literal `{`/`}` in a label — confirmed broken: it renders as a stray
  literal `&` character sitting next to the symbol (e.g. `&#123;` inside a
  label renders as `&{`, not `{`). If a label needs a literal `{`/`}` (e.g.
  showing set notation like `{a, b, c}`), just write the bare character
  directly inside the already-quoted label string
  (`["Set = {a, b, c}"]`) — no escaping needed or wanted.
- **Never write HTML-entity-escaped arrows** (`&rarr;`, `&larr;`, etc.) or
  `&amp;`-escaped text inside `sequenceDiagram` `Note`/message text —
  sequence diagrams render notes as plain SVG text, not through HTML, so
  entities are NOT decoded there and show as literal garbled text. Use the
  real Unicode character directly (`→`, `←`) or the literal `&` character,
  not its entity form.
- When converting a course with multiple parallel subagents, they will
  copy whatever entity-encoding style they find in earlier `.mmd` files in
  the same `.cache/ascii-to-mermaid/` directory, assuming it's "the
  convention" — a bad pattern in an early file can silently spread across
  the whole batch. Don't trust "I matched the existing convention" as
  proof of correctness.

**Keep the diagram in a landscape band — this is not optional, and it's not
just about avoiding "too wide."** The component CSS renders the image at
`width: 100%` with the aspect ratio locked (`apps/docs/src/components/AsciiDiagram/styles.module.css`).
That single fact drives both failure modes:

- **Too wide** (e.g. a wide row of many sibling nodes): scaled down to fit
  the page's ~750-900px content column, every label shrinks with it —
  becomes illegible even though it "rendered fine." (`clean-code` was
  4241×169, a 25:1 ratio — after scaling to width, its ~170px height
  became ~30px, unreadable.)
- **Too tall** (a portrait-oriented diagram — width *less than* height,
  e.g. one long vertical chain with no branching): scaled *up* to fill the
  same content column, height inflates by the same factor, and the
  diagram ends up dominating the page — visually far bigger than the
  content it holds, usually with a lot of dead vertical space. (`control-flow`
  was 473×740, i.e. *taller than wide* — scaled to a 750px-wide column its
  effective displayed height balloons past 1100px.) Portrait orientation
  is the bug here, not tallness in absolute terms — a wide diagram that
  also happens to be tall (many rows) is fine; a *narrow, portrait* one is
  not.

The fix in both directions is the same goal: land in a **landscape**
aspect ratio, roughly **1.3:1 to 3.5:1 (width:height)** — wider than tall,
but not extremely wide. Concretely:

- **A long single-file vertical chain (`TD`/`BT` with no branching) is
  almost always too narrow/portrait.** If a diagram is just N boxes in a
  line with no siblings, switch it to `LR` instead — a short linear
  pipeline reads fine left-to-right and lands in the landscape band
  naturally. Reserve `TD`/`TB` for diagrams that actually branch or have
  multiple things happening in parallel at some level.
- **A wide row of many (5+) sibling nodes at one level is almost always
  too wide/landscape-extreme.** Stack them (`TD`) or split them across two
  rows via subgraphs instead of one long horizontal row.
- **Match the original ASCII's footprint.** The source diagrams in this
  repo are compact single-screen monospace blocks (a handful of boxes).
  The Mermaid version should be similarly compact — don't expand a simple
  5-box diagram into an elaborate multi-column layout with extra detail
  the original didn't have. Preserve *content*, not *scale*.
- **Keep labels short.** Summarize rather than reproducing long prose
  verbatim inside a node — a label is a caption, not a paragraph. If the
  original box had several lines of detail, keep the line breaks (so it
  stacks vertically inside the node) rather than letting one long line
  push the node — and the whole diagram — wider.

After Phase 2b's render step, check every new SVG's actual dimensions
before wiring anything in — this checks the landscape band, not just a
width ceiling:

```bash
node -e "
const fs = require('fs');
for (const f of fs.readdirSync('apps/docs/static/img/diagrams')) {
  if (!f.endsWith('.svg')) continue;
  const svg = fs.readFileSync('apps/docs/static/img/diagrams/' + f, 'utf8');
  const m = svg.match(/viewBox=\"([^\"]*)\"/);
  if (!m) continue;
  const [, , w, h] = m[1].split(/\s+/).map(Number);
  const ratio = w / h;
  if (w > 1400 || ratio > 3.5 || ratio < 1.3) console.log(f, 'w=' + Math.round(w), 'h=' + Math.round(h), 'ratio=' + ratio.toFixed(2));
}
"
```

Any diagram flagged here — too wide (ratio over ~3.5, or absolute width
over ~1400px) *or* too narrow/portrait (ratio under ~1.3) — needs
restructuring (switch direction between `LR`/`TD`, split a wide row into
two via subgraphs, or shorten labels) and re-rendering before moving on.
Don't wire in a diagram that fails this check just because it rendered
without an error — rendering successfully and looking right at page width
are different things.

**Corrupted content**: if a diagram's `content` is unreadable garbage (a
historical encoding-corruption incident affected some diagrams in this
repo — signatures include repeating `f--,--?s...` runs, or Unicode
box-drawing scrambled into nonsense), it is not recoverable by find-and-
replace. Reconstruct it from surrounding prose and any readable label
fragments still visible in the garbage, replace the corrupted `content`
value with clean regenerated ASCII (Unicode box-drawing:
`┌─┐│└┘├┤┬┴┼`), and proceed with the Mermaid conversion as normal. Flag
these in your final report — they're a different, rarer case than a normal
conversion.

If a course has many files, parallelize this sub-step across subagents (one
agent per file, or small groups of files) — give each agent this same
instruction set plus its assigned file path(s), and have it write its
`.mmd` files and report back which diagrams it converted (with line
numbers) rather than touching the source `.mdx` yet. Do 2b and 2c centrally
yourself once every agent's `.mmd` files exist, so hash naming and the
background flag stay consistent.

### 2b. Render every diagram (background color MUST stay consistent)

Render every new `.mmd` file with `mmdc`, **always** with a transparent
background — never vary this flag between diagrams, courses, or runs. A
mix of transparent and white/colored backgrounds is a visible inconsistency
across the site.

If `scripts/render-mermaid-manifest.mjs` exists in the repo, reuse it as-is
— it already does this correctly (hashes each `.mmd` by content, renders to
`apps/docs/static/img/diagrams/<hash>.svg` via
`mmdc -i <file> -o <out> -b transparent`, retries once on failure, writes a
manifest). Run it from `apps/docs`:

```bash
node ../../scripts/render-mermaid-manifest.mjs docs
```

If it doesn't exist, write it (or an equivalent) rather than inlining a
one-off `mmdc` call per diagram. Confirm `@mermaid-js/mermaid-cli` is a
devDependency of `apps/docs` first (`npm install --save-dev
@mermaid-js/mermaid-cli` if missing).

Any renders that fail: retry once, then log the diagram and error and move
on — never leave the whole course conversion blocked by one bad diagram.

**Spot-check the render output before wiring anything in** — this is not
optional, it's how the numeric-entity bug above was caught:

```bash
grep -lE '&amp;\{|&amp;\}|&amp;#[0-9]' apps/docs/static/img/diagrams/*.svg
```

Any match is a real bug in that diagram's source label — fix the `.mmd`
(usually: strip the numeric entity down to the bare character) and
re-render before moving to 2c.

### 2c. Wire every diagram in

For every converted diagram, add `mermaidSrc="/img/diagrams/<hash>.svg"` as
a new prop on its `<AsciiDiagram>` tag, using the hash from the manifest.
Nothing else about the tag changes — `id`, `content`, `alt`, `caption` all
stay exactly as they were (or, for the corrupted-content case, `content`
becomes the regenerated clean ASCII).

If a diagram isn't already wrapped in `<AsciiDiagram>` (rare — a plain
` ``` ` fence instead), convert it into one: give it a new unique `id`
following the `<topic-slug>/<page-slug>` convention, `content` = the
original text verbatim, plus `mermaidSrc` and a short `alt`.

Do this for **every** diagram found in Phase 1 before moving to Phase 3 —
don't stop partway through a large batch. Rendering all diagrams first and
then getting sidetracked (e.g. debugging one bad render) without coming
back to wire the rest is the single most common way this command gets left
half-done.

## Phase 3 — VERIFY ALL

Only after every diagram from Phase 1 has gone through 2a/2b/2c:

1. **Completeness check** — re-run the exact Phase 1 query and confirm it
   returns nothing:

   ```bash
   grep -rL 'mermaidSrc' $(grep -rl '<AsciiDiagram' --include="*.mdx" "apps/docs/docs/$COURSE") 2>/dev/null
   ```

   Any file this still lists means Phase 2 isn't actually finished — go
   back and wire it. Do not proceed to the build check while this is
   non-empty.

2. **Build check** — run a full production build and confirm it's green:

   ```bash
   cd apps/docs && npm run build
   ```

   Pre-existing broken-anchor warnings (unrelated marketing pages) are fine
   to ignore. Any new MDX compile error means a wiring mistake — find and
   fix it, don't leave the course in a broken state.

Only when both checks pass does the course count as done.

## Phase 4 — REPORT

```
Course: <slug>
Files with AsciiDiagram: <count>
Diagrams found: <count>
Already converted (skipped): <count>
Newly converted: <count>
Corrupted content regenerated: <count> (list files)
Render failures: <count> (list diagram + error)
Completeness check: pass/fail
Build: green/red
Page URLs where a diagram was converted: <list — apps/docs/docs/<file> maps
  to a URL path, e.g. docs/<course>/<topic>/overview>
```

Now move to the next course slug (if `{ARGS}` listed more than one) and
repeat Phase 1 from the top for it — don't carry any state between courses
except the shared `mmdc`/manifest tooling.

---

## Hard rules

- Never delete or touch `content` on a diagram that isn't corrupted —
  preservation of the original is the entire point of `mermaidSrc` +
  `data-ascii-source`.
- Never touch anything outside `<AsciiDiagram>` components in scope — no
  prose edits, no code-sample edits, no reformatting.
- Background must be transparent on every single render, no exceptions —
  that's what "consistent" means here.
- Don't run `git add`/`commit`/`push` — leave changes in the working tree
  for review, same as every other content-fix command in this repo.
- Re-running this command on an already-converted course must be a safe
  no-op (skip anything with `mermaidSrc` already set).
- Don't report a course as converted, and don't move to the next course,
  until Phase 3's completeness check AND build both pass.
