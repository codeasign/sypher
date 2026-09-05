# Current Task Handoff

## Objective
Set up reliable handoff between Claude Code and OpenAI Codex working
interchangeably on this repo, including automatic handoff-state updates
when context usage gets high (compaction) or a usage limit is hit.

## Status
In progress — initial scaffolding just created (this file, AGENTS.md,
restructured CLAUDE.md, PreCompact hook). Not yet exercised across an
actual Claude↔Codex handoff.

## Context
- Repo has two parallel instruction files now: `AGENTS.md` (provider-neutral,
  read by any agent, primary source of truth) and `CLAUDE.md` (Claude Code
  only — a thin pointer to AGENTS.md plus the reactive usage-limit
  instruction).
- `memory-bank/current-task.md` (this file) is git-tracked by decision —
  intended to travel with the repo across machines/clones and be visible
  in diffs.
- `.claude/settings.json` and `.claude/settings.local.json` are gitignored
  in this repo (pre-existing convention) — the PreCompact hook registered
  there is machine-local only; it will not reach Codex or another clone.
- A separate MCP-based memory bank (`@allpepper/memory-bank-mcp`) also
  exists outside this repo for cross-project durable facts — do not
  conflate it with this file. See "Memory systems" section in AGENTS.md.

## Pre-existing Uncommitted Changes
None at time of writing — the user committed the prior large uncommitted
batch (491 files, "Refactoring and UI Upgrades", commit `4f537f1f`) during
this session, before this handoff scaffolding was created. Working tree
was clean at the time this file was created.

## Changes Made By Current Agent
- Created `AGENTS.md` (root) — moved nearly all prior CLAUDE.md content
  here verbatim, plus new Git Safety Rules, Agent Handoff Protocol, and
  Memory Systems sections.
- Restructured `CLAUDE.md` (root) — now a thin pointer to AGENTS.md plus
  the reactive usage-limit handoff instruction. No project content
  duplicated.
- Created `memory-bank/current-task.md` (this file).
- Created `.claude/hooks/pre-compact-handoff.mjs` — marker-only PreCompact
  hook script (appends a timestamped note to this file on auto-compaction;
  does not summarize task state itself, does not touch source files, does
  not run git commands).
- Updated `.claude/settings.json` — registered the PreCompact hook
  (matcher: "auto") pointing at the script above.

## Completed
- AGENTS.md created and populated.
- CLAUDE.md restructured to minimal pointer.
- memory-bank/current-task.md scaffolded.
- PreCompact hook script + settings.json registration shipped (marker-only,
  non-blocking).

## In Progress
- Nothing else in flight for this task as of this writing.

## Remaining
- Empirically verify PreCompact hook fires as expected and appends
  correctly (not yet tested end-to-end in a real compaction event).
- Decide, in a future session, whether to explore the PreCompact
  blocking mechanism (exit code 2) to force a real state-write before
  compaction — explicitly deferred, not implemented, per user decision.
- No corresponding Codex-side instruction file was created/checked in
  this session (out of scope — Codex reads AGENTS.md natively by
  convention, no repo changes needed for that half).

## Decisions
- memory-bank/ is git-tracked, not gitignored (explicit user decision,
  tradeoff: commit noise vs. cross-machine portability + PR visibility).
- .claude/settings.json remains gitignored / machine-local — accepted as
  a known limitation rather than changed.
- PreCompact hook ships as marker-only (append a timestamped note); the
  exit-code-2 blocking mechanism is explicitly NOT implemented or tested
  this session — flagged as a follow-up only.
- No content duplicated between CLAUDE.md and AGENTS.md — single source
  of truth is AGENTS.md.

## Known Issues
- PreCompact hook's exact stdin field names (e.g. `trigger` vs
  `compaction_reason`) were reported by a research subagent and not
  independently verified against a live hook invocation — the script is
  written defensively (falls back gracefully if expected fields are
  missing) but the exact payload shape should be confirmed empirically.
- A crash, forced kill, or a usage-limit cutoff with no warning message
  bypasses both handoff triggers entirely (see AGENTS.md Risks — no gap
  section moved there; keeping this instance-specific in Known Issues).

## Tests/Validation
- Not yet run. Next session should trigger a real auto-compaction (or
  simulate the hook's stdin manually) and confirm a marker line actually
  lands in this file.

## Files Modified
- `AGENTS.md` (new)
- `CLAUDE.md` (restructured)
- `memory-bank/current-task.md` (new, this file)
- `.claude/hooks/pre-compact-handoff.mjs` (new)
- `.claude/settings.json` (modified — added `hooks.PreCompact`)

## Next Action
Verify the PreCompact hook fires correctly (see Tests/Validation), then
consider this handoff-setup task complete pending that confirmation.

## Last Updated
2026-09-05 (session: initial handoff-system scaffolding)
