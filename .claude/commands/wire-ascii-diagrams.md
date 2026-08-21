# Wire ASCII diagrams (batched): {ARGS}

`{ARGS}` = `<course-slug> <count>`, e.g. `system-design-fundamentals 100`.

Converts and wires in the **first `<count>` not-yet-converted**
`<AsciiDiagram>` diagrams in the given course — everything
`/convert-ascii-diagrams` does, but capped to a batch instead of requiring
the whole course to finish in one pass. Built for courses whose pending
backlog is too large for one sitting (e.g. `system-design-fundamentals`,
which has thousands pending) — run it repeatedly and each run picks up
exactly where the last one left off, because "not-yet-converted" is always
recomputed fresh from the manifest, never from a remembered offset.

If `<count>` is omitted, default to 100. If `<count>` is greater than the
number actually pending, just convert everything pending (that's a normal
full finish, not an error).

## Step 0 — read the rules first

Read `.claude/commands/convert-ascii-diagrams.md` completely and fresh —
don't rely on memory of what it says. Every rule in it applies here
unchanged: what "converted" means, the landscape-band gate enforced by
`scripts/check-landscape-band.mjs` in Phase 2b (a real script, not a
manual check — never wire in anything it doesn't report `PASS` for),
transparent-background-always, the special-character escaping gotchas,
the corrupted-content handling, and the hard rule to never touch `content`
on anything that isn't corrupted. The only thing this command changes is
the *scope* of Phase 1 and Phase 3 — batch-sized instead of whole-course.

## Step 1 — refresh the manifest and select the batch

```bash
node scripts/update-diagram-manifest.mjs <course-slug>
```

Read `apps/docs/diagram-manifests/<course-slug>.json`. Its `diagrams` array
is already sorted by file path, then by source-order position within the
file — that ordering is your selection order. Filter to entries where
`converted` is `false` (no `mermaidSrc` at all — this command only handles
fresh conversions, not diagrams with a broken/missing SVG despite having
`mermaidSrc`; those are a different repair, not in scope here), then take
the first `<count>` of what's left.

Report this list before touching anything — file, `id`, and position for
each of the N selected diagrams. This is your checklist for Phase 2 and 3,
same discipline as the FIND phase in the full command.

Classify the whole batch's diagram types in one pass right here, rather
than re-invoking the classifier per diagram inside Step 2 — one process
covering the batch is cheaper than N of them:

```bash
node scripts/classify-diagram-type.mjs <course-slug>
```

Keep this output around; Step 2's Phase 2a instructs looking up each
diagram's `id` in it instead of calling the script again per diagram.

## Step 2 — convert and wire, batch only

Run Phase 2a (write Mermaid), 2b (render), 2c (wire `mermaidSrc` in) from
`convert-ascii-diagrams.md` on exactly this batch — no more, no less. Don't
opportunistically convert a diagram outside the batch just because it's in
the same file as one that is in scope; leave it for the next run. For
Phase 2a's type-classification step, look each diagram's `id` up in the
batch classification you already ran in Step 1 instead of re-invoking
`classify-diagram-type.mjs` per diagram.

## Step 3 — verify the batch, not the whole course

1. Confirm every diagram in the batch has a `check-landscape-band.mjs`
   `PASS` result from Step 2 — this is a lookup against what the script
   already reported, not a fresh eyeball check. Any diagram without a
   recorded `PASS` must not have `mermaidSrc` wired in; if it does, that's
   a process violation — stop and fix it before continuing.
2. Run the production build (`cd apps/docs && npm run build`) and confirm
   it's green — same as the full command's Phase 3 build check.
3. Refresh the manifest again so the new state is git-tracked immediately:

   ```bash
   node scripts/update-diagram-manifest.mjs <course-slug>
   ```

## Step 4 — report

```
Course: <course-slug>
Batch size requested: <count>
Converted this run: <actual count converted — may be less than requested
  if fewer than <count> were pending>
Still pending after this run: <count, from the refreshed manifest>
Build: green/red
Command to continue: /wire-ascii-diagrams <course-slug> <count>
```

## Hard rules (in addition to everything inherited from Step 0)

- Never wire in a diagram that `check-landscape-band.mjs` didn't report
  `PASS` for. No exceptions for "it's close enough" or "I'll fix it later."
- Never convert more than `<count>` diagrams in one run, even if it would
  be convenient to keep going.
- Never touch a diagram that's already converted (`mermaidSrc` already
  set) — this must be safe to run back-to-back without re-doing work.
- Don't run `git add`/`commit`/`push` — same as the full command, leave
  changes in the working tree for review.
- Always refresh the manifest (Step 3.3) before reporting — the report's
  "still pending" number must come from the manifest, not a mental count.
