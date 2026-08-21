# Diagram conversion status: {ARGS}

`{ARGS}` = optional course slug(s) under `apps/docs/docs/` to scope the
report to (e.g. `system-design-fundamentals`). If empty, report on every
course.

Reports the current ASCII-to-Mermaid diagram conversion status per course,
from the git-tracked manifest at `apps/docs/diagram-manifests/`.

## Steps

1. Refresh the manifest so the report reflects current disk state, not a
   stale snapshot:

   ```bash
   node scripts/update-diagram-manifest.mjs --all
   ```

   (Pass the specific slug(s) from `{ARGS}` instead of `--all` if scoping
   to fewer courses — this is always safe to re-run, idempotent, and never
   removes an entry unless the corresponding `<AsciiDiagram>` is gone from
   source.)

2. Read `apps/docs/diagram-manifests/summary.json`. Each entry has
   `course`, `totalDiagrams`, `converted`, `pending`.

3. Render a Markdown table, one row per course (or just the scoped ones
   from `{ARGS}`), columns in this order:

   `Course | Total | Finished | Pending | % Done`

   - `% Done` = `converted / totalDiagrams * 100`, one decimal place, `—`
     if `totalDiagrams` is 0.
   - Sort rows by `Total` descending (surfaces the biggest backlogs first).
   - Add a final `**Total**` row summing every column, with the overall
     `% Done` computed the same way from the summed totals — this must
     match `summary.json`'s own `totalDiagrams`/`totalConverted`/
     `totalPending` top-level fields; if it doesn't, the manifest is out of
     sync and step 1 needs to be re-run.

4. Below the table, call out any course at 0% done and the single largest
   contributor to the pending total, so the backlog priority is obvious at
   a glance.

Don't run any actual conversion (`/convert-ascii-diagrams`) as part of this
command — it's read-only reporting.
