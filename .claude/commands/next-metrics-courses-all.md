---
description: Batch-run /next-metrics-course over the full Sypher Metrics role taxonomy (~32 slugs across 9 roles) on Sypher Next (apps/web + apps/api) — one wave (role group) at a time, never the whole taxonomy in one pass
---

# Batch-create every Metrics course in the taxonomy: $ARGUMENTS

**Usage:** `/next-metrics-courses-all [role-group] [optional detailed requirements]`

`$ARGUMENTS` is optional. With no arguments, this command asks which wave to run before doing anything else — it never blasts the full taxonomy unprompted. Any text after a role-group name is passed through to every `/next-metrics-course` invocation in that wave as extra context (module count override, publish flag intent, etc.).

Examples:

```text
/next-metrics-courses-all

/next-metrics-courses-all Developer

/next-metrics-courses-all "QA / QE"

/next-metrics-courses-all "Engineering Manager" keep each course to 6 modules
```

This is a thin orchestrator over `.claude/commands/next-metrics-course.md` — it does not duplicate that command's authoring rules, architecture reference, or hard rules. **Read `next-metrics-course.md` in full before running this command**; every course this creates follows that command's six-step workflow exactly, once per slug.

---

## The taxonomy (source of truth: `next-metrics-course.md` §"Target role resolution")

| Role group | Slugs |
|---|---|
| Developer | `measuring-developer-productivity`, `measuring-code-review`, `measuring-delivery-speed`, `measuring-rework`, `measuring-code-quality`, `measuring-technical-debt` |
| QA / QE | `measuring-test-effectiveness`, `measuring-test-automation`, `measuring-defects`, `measuring-defect-leakage`, `measuring-test-stability`, `measuring-quality-trends` |
| Engineering Manager | `measuring-delivery`, `measuring-engineering-quality`, `measuring-reliability`, `measuring-team-health`, `measuring-engineering-efficiency`, `measuring-technical-debt-for-managers`, `reading-an-engineering-dashboard` |
| Engineering Leader | `measuring-engineering-performance`, `measuring-engineering-investment`, `measuring-engineering-roi` |
| Product Manager | `choosing-product-metrics`, `measuring-activation`, `measuring-retention`, `measuring-conversion`, `product-metrics-that-mislead` |
| DevOps / SRE | `understanding-dora-metrics`, `measuring-reliability`, `measuring-slos-and-error-budgets`, `measuring-incidents`, `measuring-toil` |
| Agile / Delivery | `understanding-velocity`, `measuring-flow`, `measuring-delivery-predictability` |
| Project Management | `measuring-project-progress`, `measuring-project-risk` |
| Foundation / Cross-role | `designing-metrics`, `reading-metrics-without-being-misled`, `choosing-the-right-chart` |

Note `measuring-reliability` appears in both Engineering Manager and DevOps / SRE — that's intentional (same metric, two different audiences reading it for different decisions), **not** a duplicate to collapse. When both waves run, the distinctness check in Step 1.2 of `next-metrics-course.md` must actually produce two differently-angled courses for it, or the second run should narrow scope until it does.

---

## STEP 1 — RESOLVE THE WAVE

1. If `$ARGUMENTS` names a role group (case-insensitive match against the table above), that group is the wave.
2. If `$ARGUMENTS` is empty, **stop and ask** which wave to run — do not default to "all". Offer the role-group names as options.
3. `all` is a valid explicit answer if the user asks for it after being warned about scale (see Hard Rules) — never assume it.

## STEP 2 — RUN THE WAVE, ONE SLUG AT A TIME

For each slug in the resolved wave, in table order:

1. Check the existing catalog first (`GET /courses/manage/list`, same call `next-metrics-course.md` §1.2 already requires) — if a course for this slug already exists, skip it and report `already exists: <slug>`, don't reimport over it.
2. Otherwise run the full six-step workflow from `next-metrics-course.md` for that slug, passing `--role <resolved-role-kebab-case>` (the role group name, kebab-cased — e.g. `engineering-manager`, `qa`, `devops-sre`) exactly as that command's driver step requires.
3. Complete each course fully (plan → auth → stage → verify calculations → upload charts to `svgs/<slug>/` → link → import → verify live) before starting the next slug. Never interleave partial work across multiple courses.
4. After each course imports successfully, re-run the distinctness check (§1.2) against the now-updated catalog before starting the next slug in the wave — later slugs in the same wave must stay distinct from earlier ones you just created, not just from what existed before the wave started.
5. All courses import as **draft** (never pass `--publish` in a batch run, regardless of what a single `/next-metrics-course` invocation might do) — batch-created content needs a human review pass before going live.

## STEP 3 — REPORT

After the wave finishes (or is interrupted), report per-slug status in taxonomy order:

```
Wave: <role group>
  <slug>          created, N modules, draft
  <slug>          skipped (already exists)
  <slug>          failed at step <N>: <reason>
  ...
Charts: svgs/<slug>/ per course, all under their own subfolder
Total created: <count> / <wave size>
Next: review each course in /manage-courses, publish individually once verified
```

Stop and report immediately (don't silently continue to the next slug) if a course fails verification — a bad course blocking the wave is better than a wave of bad courses.

---

## HARD RULES

- **Never run the full taxonomy in one invocation without an explicit, scale-aware confirmation.** ~32 slugs × ~4–10 modules × chart SVGs is substantial content and Bunny CDN traffic; always run wave-by-wave (one role group at a time) unless the user has explicitly asked for "all" after being told the scale.
- **One slug fully completed before the next starts.** No parallel/interleaved authoring across slugs in a wave.
- **Draft by default, always** — batch runs never pass `--publish`, even if asked to "just do it" for a single course; publishing is a separate, explicit follow-up action per course.
- **Skip, don't overwrite, existing courses** — check the catalog before each slug; this command adds new courses, it does not touch ones that already exist.
- **Role comes from the taxonomy table, never guessed** — same rule as `next-metrics-course.md` §"Target role resolution". If a future slug isn't in the table, stop and ask for its role before creating it (don't add it to the taxonomy unilaterally).
- **Distinctness re-checked per slug within the wave**, not just once at the start — see Step 2.4.
- **Everything else defers to `next-metrics-course.md`** — content rules, mock-dataset discipline, TRY IT format, humanization, chart-upload mechanics, and verification steps are not repeated here; that command is the single source of truth for how one course gets built.
