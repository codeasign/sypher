# Sypher — Claude Code Guide

The full project reference lives in `AGENTS.md` at repo root — read it,
along with `memory-bank/current-task.md`, before doing any substantial work.
`AGENTS.md` is the single source of truth for project architecture,
conventions, and rules; nothing here duplicates it.

## Usage-Limit Handoff (reactive)

If you see any usage-limit, rate-limit, or quota message from the platform
during a session — even mid-task — immediately update
`memory-bank/current-task.md` with full current state (Status, Completed,
In Progress, Remaining, Next Action) before the session ends. Do this even
if it interrupts what you're doing. This cannot be predicted or polled in
advance — it is purely reactive to seeing the message.
