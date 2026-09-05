# Current Task Handoff

## Objective
Set up reliable handoff between Claude Code and OpenAI Codex working
interchangeably on this repo, including automatic handoff-state updates
when context usage gets high (compaction) or a usage limit is hit.

## Status
Closed. All handoff scaffolding is committed:
- `dc80bf69` — AGENTS.md, restructured CLAUDE.md, this file, PreCompact
  hook script.
- `77613402` — registered the PreCompact hook in `.claude/settings.json`.
One small cleanup is staged in the working tree, not yet committed by the
user: removing the now-dead `.gitignore` entries for `.claude/settings.json`
/ `.claude/settings.local.json` (see Context and Files Modified).

## Context
- Repo has two parallel instruction files: `AGENTS.md` (provider-neutral,
  read by any agent, primary source of truth) and `CLAUDE.md` (Claude Code
  only — a thin pointer to AGENTS.md plus the reactive usage-limit
  instruction).
- `memory-bank/current-task.md` (this file) is git-tracked by decision —
  travels with the repo across machines/clones and is visible in diffs.
- `.claude/settings.json` and `.claude/settings.local.json` are both
  actually **tracked** in git (confirmed via `git ls-files` and
  `git check-ignore -v`) — the `.gitignore` lines for them were dead
  (gitignore doesn't retroactively untrack already-tracked files). Those
  two lines have been removed from `.gitignore` in the working tree;
  awaiting the user's commit.
- A separate MCP-based memory bank (`@allpepper/memory-bank-mcp`) also
  exists outside this repo for cross-project durable facts — do not
  conflate it with this file. See "Memory systems" section in AGENTS.md.

## Completed
- AGENTS.md created and populated (moved full prior CLAUDE.md content +
  new Git Safety Rules, Agent Handoff Protocol, Memory Systems sections).
- CLAUDE.md restructured to a minimal pointer, no duplicated content.
- memory-bank/current-task.md scaffolded and kept current throughout.
- PreCompact hook script written and dry-run verified (piped fake stdin
  JSON against a throwaway copy of this file — appended a correct
  `## Handoff Events` line, exit 0, no corruption).
- PreCompact hook registered in `.claude/settings.json`, committed.
- Confirmed `.claude/settings.json` / `.claude/settings.local.json` are
  tracked, not gitignored; removed the dead `.gitignore` lines (diff
  reviewed by user, commit pending on their side).

## Remaining
- Real end-to-end confirmation that the PreCompact hook fires during an
  actual auto-compaction event in a live session (only dry-run tested so
  far) — low priority, not blocking, no action needed unless it misfires.
- Exit-code-2 PreCompact blocking mechanism remains explicitly
  unexplored/unimplemented — deferred by decision, pick up only if a
  stronger-than-marker-only handoff is wanted later.

## Decisions
- memory-bank/ is git-tracked, not gitignored (explicit decision: commit
  noise traded for cross-machine portability + PR visibility).
- PreCompact hook ships as marker-only (append a timestamped note); the
  exit-code-2 blocking mechanism was explicitly NOT implemented or tested.
- No content duplicated between CLAUDE.md and AGENTS.md — single source
  of truth is AGENTS.md.
- Dead `.gitignore` entries for `.claude/settings.json` /
  `.claude/settings.local.json` removed rather than left in place, since
  both files are tracked and the lines had no effect.

## Known Issues
- PreCompact hook's exact stdin field names (e.g. `trigger` vs
  `compaction_reason`) came from an unverified research pass, not a live
  hook invocation. The script is defensive (falls back to `"unknown"`
  rather than erroring) so this is a robustness note, not a live bug.
- A crash, forced kill, or a usage-limit cutoff with no warning message
  bypasses both handoff triggers (PreCompact hook and reactive
  usage-limit instruction) entirely — no fully automatic catch-all exists
  for those cases.

## Tests/Validation
- Hook script dry-run tested against a throwaway copy — confirmed correct
  append behavior, exit 0. Real auto-compaction firing not yet observed
  in a live session.

## Files Modified
- `AGENTS.md` (new, committed `dc80bf69`)
- `CLAUDE.md` (restructured, committed `dc80bf69`)
- `memory-bank/current-task.md` (this file, committed, updated repeatedly)
- `.claude/hooks/pre-compact-handoff.mjs` (new, committed `dc80bf69`)
- `.claude/settings.json` (added `hooks.PreCompact`, committed `77613402`)

## Next Action
Await the next task from the user.

## Last Updated
2026-09-05 (session: handoff-system setup — closed)
