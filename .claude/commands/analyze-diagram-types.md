# Analyze diagram types: {ARGS}

`{ARGS}` = a course slug under `apps/docs/docs/` (e.g. `design-patterns`),
a narrower path within one (e.g. `system-design-fundamentals/durability`),
or the literal word `all` for every course with at least one converted
diagram.

Read-only audit. **Makes no file changes** — no conversion, no wiring, no
manifest updates. Reports what Mermaid type each `<AsciiDiagram>` in the
scope would be classified as today, and flags any already-converted
diagram whose actual rendered type disagrees with that classification.

## What this is

A thin reporting wrapper around two purely mechanical scripts — no LLM
judgment happens in this command:

```bash
node scripts/analyze-diagram-types.mjs {ARGS}
```

`{ARGS}` = `all` produces a cross-course report instead of a single-course
one: a table (course, converted count, matches, genuine gaps, semantic
judgment calls, accuracy %) sorted by accuracy ascending — worst first —
followed by an overall summary line and the full flagged list for both
genuine gaps and semantic judgment calls. Accuracy = matches / (matches +
genuine gaps); semantic judgment calls are deliberately excluded from that
denominator (see "What a mismatch means" below — they aren't classifier
failures).

That script itself calls `scripts/classify-diagram-type.mjs` (deterministic
pattern-matching against each diagram's ASCII `content` — see that file's
header for what it detects and why) and cross-references
`apps/docs/diagram-manifests/<course>.json` for conversion state. For any
diagram already converted, it reads the actual rendered SVG's
`aria-roledescription` attribute to find out what type it really is, and
compares that against what the classifier recommends today.

Run it, then present its output directly — do not re-derive or
second-guess the numbers by re-reading diagram content yourself. If a
number looks surprising, that's a cue to spot-check the specific flagged
diagram's source (open the file, read the `content`), not to re-run your
own classification pass.

## What to report

Single course (`{ARGS}` = a slug): total diagrams, converted vs.
not-yet-converted, the recommended-type breakdown for all diagrams, then
the converted set broken into matches / genuine gaps / semantic judgment
calls with accuracy %, followed by the genuine-gap and semantic-call lists
(id, file, recommended type, actual type each).

`{ARGS}` = `all`: the per-course accuracy table described above, an
overall summary line (total converted diagrams checked, overall accuracy
%, genuine-gap count), then the full genuine-gap list across every course
followed by the full semantic-judgment-call list, each clearly labeled.

## Genuine gap vs. semantic judgment call (and what neither means)

Every disagreement between a converted diagram's actual rendered type and
today's classifier recommendation falls into exactly one of two buckets —
the script computes this, don't re-derive it by eye:

- **Genuine gap**: the classifier found real, specific structural evidence
  (a `<<interface>>` stereotype, cardinality notation, etc. — `clear-match`
  confidence, recommending something other than the bare `flowchart`
  default) that disagrees with what's actually there. Worth a look.
- **Semantic judgment call**: the classifier was `ambiguous`, or its
  recommendation was `flowchart` purely because nothing else matched (zero
  structural evidence in either direction) — it has no structural basis to
  contradict whatever was actually chosen. Common cause: the original
  conversion used context the classifier can't see (e.g. "this describes a
  round-trip between two logical actors" even though the ASCII itself is
  just a linear numbered list of boxes). **Not counted against accuracy.**

Neither bucket is a confirmed error — report both as informational, don't
reclassify or re-convert anything as part of this command.

## Hard rules

- Read-only. Never edit an `.mdx` file, never touch `.cache/`, never run
  the manifest updater, never call `/wire-ascii-diagrams` or
  `/convert-ascii-diagrams` from within this command.
- Don't run a separate LLM-driven classification pass "to double check" —
  the whole point of this command is that the script's output is the
  answer. If you distrust a specific result, say so and point at the
  diagram for a human to look at; don't silently overrule it.
