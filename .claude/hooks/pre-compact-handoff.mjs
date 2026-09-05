#!/usr/bin/env node
// PreCompact hook (marker-only, non-blocking).
//
// Fires when Claude Code is about to compact the conversation. This script
// does NOT summarize task state (it has no model access) and does NOT
// touch source files or run git commands. It only appends a timestamped
// marker line to memory-bank/current-task.md as a safety-net reminder that
// compaction happened, so whoever reads the file next knows to verify
// freshness. Always exits 0 — a bug here must never block compaction or
// the user's actual work.

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const TARGET = join(PROJECT_DIR, "memory-bank", "current-task.md");
const SECTION_HEADER = "## Handoff Events";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const raw = readStdin();
  let trigger = "unknown";
  let sessionId = "unknown";
  try {
    const input = JSON.parse(raw);
    trigger = input.trigger || input.compaction_reason || "unknown";
    sessionId = input.session_id || "unknown";
  } catch {
    // Non-JSON or empty stdin — proceed with defaults, never fail the hook.
  }

  const timestamp = new Date().toISOString();
  const line = `- ${timestamp} — auto-compaction (trigger: ${trigger}, session: ${sessionId}). Verify Status/Next Action above are current.\n`;

  try {
    mkdirSync(dirname(TARGET), { recursive: true });
    if (!existsSync(TARGET)) {
      appendFileSync(TARGET, `# Current Task Handoff\n\n${SECTION_HEADER}\n\n${line}`);
    } else {
      const content = readFileSync(TARGET, "utf8");
      if (content.includes(SECTION_HEADER)) {
        appendFileSync(TARGET, line);
      } else {
        appendFileSync(TARGET, `\n${SECTION_HEADER}\n\n${line}`);
      }
    }
  } catch {
    // Never block compaction on a filesystem hiccup.
  }

  process.exit(0);
}

main();
