---
description: Audit an existing course's files against the CURRENT version of add-topic-concept.md or add-topic-tool.md and bring it up to date — fixes structure, removes deprecated sections, applies current narration/link/leak rules. Does not blindly regenerate from scratch; preserves existing content where possible.
---

# Update existing course to current standard: $ARGUMENTS

Templates in this project change over time as conventions are refined. A course built under an older template version can drift out of sync — wrong lesson structure, deprecated sections still present, old narration style, outdated link policy. This command brings an existing course back in line with whatever the templates currently say, without a wasteful full rebuild.

$ARGUMENTS is the course slug (e.g. `python-for-ai-engineers`).

---

# STEP 1 — IDENTIFY COURSE TYPE AND READ THE CURRENT TEMPLATE

Check `docs/<slug>/` and the CLAUDE.md topic list to determine whether this course was built as a **concept** course or a **tool** course. If genuinely ambiguous, infer from content (heavy on architecture/why vs heavy on commands/configuration) and state your assumption in the final report.

Read the matching template file completely and fresh — `.claude/commands/add-topic-concept.md` or `.claude/commands/add-topic-tool.md` — never rely on memory of what the rules used to say. Read CLAUDE.md as well.

---

# STEP 2 — AUDIT (report before fixing anything)

Read every file under `docs/<slug>/` and check each item below. Do not fix anything yet — produce a findings table first.

**Structural**
- Is every lesson a folder containing exactly 4 pages (`overview.mdx`, `build-it.mdx`, `avoid-mistakes.mdx`, `review.mdx`)? Flag any lesson that is still a single flat `.mdx` file under `docs/<slug>/` — this is the old pre-pagination format and needs converting.
- Does `sidebars/<slug>.json` correctly nest each lesson's 4 pages under a collapsible sub-category, matching the current SIDEBAR instructions in the template?

**Deprecated sections** — flag any of the following if still present anywhere in the course (these were removed from the templates and should not exist in current content):
- Debugging Checklist
- Production Checklist
- Troubleshooting
- Interview Prep / interview-questions page or any teaser linking to one
- AI Practice Prompt
- Quick Quiz

**Narration and style**
- Any Docusaurus admonition syntax (`:::info`, `:::note`, `:::tip`, `:::caution`, `:::danger`)?
- Any third-person narration ("the reader", "the learner") instead of direct address ("you")?
- Any stray non-English characters or scripts anywhere?

**Link policy**
- Does Further Reading / Prerequisites follow the current rule — real specific links to official documentation and official GitHub by default, TODO only for non-official sources? Flag any section still using blanket TODO-only or any invented/unverifiable URL.

**Structural integrity (leak scan)**
- Search every file for: `DSML`, `tool_calls`, `tool_use`, `invoke name=`, `</think>`, the character ｜ (U+FF5C), and first-person meta-commentary about the writing process itself (e.g. "let me fix this", "let me rewrite", standalone "I'll" not part of a teaching example). Distinguish real leaks from legitimate code comments that teach a before/after pattern.

**MDX build safety**
- Any bare `{`, `}`, or `<` in prose text outside a fenced code block or backticks — these break the MDX build. This includes curly-brace literals (dict/JSON examples), and angle brackets in comparisons (`<100ms`), placeholders (`<your-key>`), or generic type syntax (`List<int>`) written as plain text.

Present the audit as a table: File | Issue | Category (Structural / Deprecated Section / Narration / Link Policy / Leak / MDX Safety) | Severity (Blocking / Cosmetic).

---

# STEP 3 — FIX, IN THIS ORDER

Only proceed once the audit above is complete and reported.

**1. Structural conversions first.** For any lesson still in the old single-file format, convert it into the current 4-page structure. Preserve as much of the existing prose, code examples, and explanations as possible — redistribute the existing content across the 4 pages following the current PAGE 1–4 specs in the template, rather than discarding it and writing fresh content from nothing. Only generate new material to fill genuine gaps (e.g. if the old file had no equivalent of a now-required section).

**2. Remove deprecated sections.** Delete any of the six deprecated sections listed above, wherever found, without leaving orphaned headers or dangling links (e.g. a "Want more interview questions?" link with no destination).

**3. Fix narration.** Convert any third-person passages to direct second-person address. Replace any admonition blocks with plain `##` headers carrying the same content.

**4. Fix link policy.** Upgrade blanket TODO placeholders to real links where the target is official documentation or an official GitHub repository you are confident is correct. Leave TODO only for genuinely non-official sources.

**5. Fix leaks.** Remove any genuine leaked tool-call text or meta-commentary found in the audit. Rewrite the affected section cleanly rather than awkwardly patching around a removed fragment.

**6. Fix MDX safety issues.** Wrap any unescaped curly-brace prose in backticks or move it into a proper code fence.

**7. Regenerate `sidebars/<slug>.json`** to exactly match the current structure of the course after all fixes — every lesson nested correctly, no references to deleted or renamed files.

---

# STEP 4 — VERIFY

Confirm there are no dangling internal links (e.g. links to a removed interview-questions page, links to old single-file lesson paths that no longer exist after restructuring). Confirm every `AsciiDiagram` `id` still matches its file's path after any restructuring.

---

# STEP 5 — REPORT

Print a final summary in this format:

```
Course: <slug>
Template type: concept | tool

Audit findings: <count> issues found across <count> files

Fixed:
- Structural conversions: <count> lessons converted to 4-page format
- Deprecated sections removed: <count>
- Narration fixes: <count>
- Link policy upgrades: <count>
- Leaks removed: <count>
- MDX safety fixes: <count>

Already compliant (no change needed): <list or count>

Sidebar regenerated: yes/no
Build verified clean: yes/no
```

---

# HARD RULES

- Always read the current template fresh in Step 1 — never assume what the rules are from memory, since templates are updated over time and this command may be run long after the last course build.
- Report the full audit before fixing anything — do not silently make structural changes without first showing what was found.
- When converting old single-file lessons to the 4-page format, preserve and redistribute existing content rather than discarding it and writing from scratch — this command updates, it does not rebuild.
- This command must be idempotent — running it again on an already-current course should report zero issues found and make no changes.
- Never leave a dangling link, an orphaned section header, or a sidebar entry pointing at a file that no longer exists.
- If a course is so far out of date that updating would touch nearly every file anyway, say so explicitly in the report and let the person decide whether a full rebuild via `/add-topic-concept` or `/add-topic-tool` would be faster than this command — do not silently default to a full rebuild without flagging it first.
