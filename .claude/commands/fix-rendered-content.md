---
description: Find and fix content that COMPILES but RENDERS wrong — mojibake/gibberish characters, empty AsciiDiagram blocks, and empty or broken code blocks. These pass the MDX build so they don't show as errors, but display as garbage or blank to the reader.
---

# Fix rendered-but-broken content: $ARGUMENTS

$ARGUMENTS = a course slug (e.g. `system-design-basics`, `ai-engineering-hands-on`) or `all`.

## Why this is different from /fix-mdx-errors

`/fix-mdx-errors` catches things that break the **build**. This command catches things that pass the build but are **broken for the reader**: garbled characters, diagram boxes that render empty, code blocks with nothing in them. `npm run build` stays green while the page looks broken — so these are invisible to compile-error tooling and have to be found by scanning content directly.

---

## STEP 1 — SCOPE AND SCAN

Read every `.mdx` file under `docs/$ARGUMENTS/` (or all courses if `all`). For each file, scan for the four defect classes below. Process in batches of 15–20 files, reporting findings per batch — do not disappear into one silent giant pass.

### Defect A — Mojibake / gibberish characters
Double-encoded UTF-8: box-drawing, arrow, and punctuation characters that got mangled into garbage.
- **Detect (box/arrow form):** any occurrence of these telltale byte-sequences: `â”`, `â•`, `â–`, `â†`, `Ã¢â‚¬`, `ÃƒÂ`, `Ã‚Â`, or any run of 3+ consecutive non-ASCII characters inside what should be an ASCII-art diagram.
- **Detect (punctuation form — common and easy to miss):** corrupted em-dashes, en-dashes, curly quotes, and ellipses in prose, which show up as literal sequences like `?????s???,??`, `?£???`, `Ã¢â‚¬â€`, `Ã¢â‚¬â„¢`, or a stray `?` cluster mid-sentence where an em-dash (—), en-dash (–), curly apostrophe (’), or ellipsis (…) belongs. Scan prose for `?????` runs and for `?` characters wedged between two words with no spacing logic — these are corrupted punctuation, not literal question marks.
- **Detect (multi-layer, unrecoverable):** long unbroken runs like `ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬...` or `?£???,?????a??£???,?????` — triple-or-more-encoded; the original character is unrecoverable by simple reversal.

### Defect A2 — Corrupted frontmatter fence rendering as body text
The opening `---` of a file's YAML frontmatter is corrupted (a leading BOM, stray character, or mojibake before or on the `---` line), so Docusaurus fails to recognize the frontmatter and renders the raw `id: ... title: ... sidebar_position: ...` block as visible text at the top of the page.
- **Detect:** the literal strings `id:`, `title:`, `sidebar_position:` appearing in rendered body content, OR a file whose first line is not exactly `---` (check for a leading `?`, BOM byte, whitespace, or any character before the opening `---`).
- This overlaps with `/fix-doc-metadata` but shows up here because the symptom is *visible rendering*, not a build error — the file may still compile.

### Defect B — Empty or whitespace-only AsciiDiagram blocks
An `<AsciiDiagram>` whose template-literal content is empty, only whitespace, or only a single stray character — renders as an empty box or nothing.
- **Detect:** `<AsciiDiagram ...>{`` followed by only whitespace/newlines before `` `}</AsciiDiagram> ``, OR an AsciiDiagram whose entire inner content is under ~20 characters (too small to be a real diagram).

### Defect C — Empty or broken code blocks
A fenced code block (```` ``` ````) with no content between the fences, or an opening fence with no closing fence (which can swallow following content or render blank).
- **Detect:** two consecutive fence lines with only whitespace between them; an odd number of fence markers in the file (unclosed fence); a language-tagged fence (```` ```python ````) immediately followed by a closing fence with nothing between.

### Defect D — Content that got eaten by an earlier defect
When a code fence is unclosed or an AsciiDiagram lost its terminator, everything after it can be absorbed into that block and render as one blank or literal mass. If a file has a suspiciously short rendered body relative to its line count, or large runs of content that appear to be inside a never-closed fence/diagram, flag it.

Present findings as a table: `File | Defect Class (A/B/C/D) | Location (line) | Severity (Recoverable / Needs Regeneration)`.

---

## STEP 2 — CLASSIFY RECOVERABLE VS NEEDS-REGENERATION

Before fixing, decide per defect whether the original content can be recovered or must be regenerated:

- **Defect A, single-layer mojibake** (`â”€` → `─`): **recoverable** by encoding reversal.
- **Defect A, multi-layer mojibake** (long `ÃƒÆ'...` runs): **needs regeneration** — the original bytes are gone; no clean reversal exists. Do not attempt to hand-reconstruct garbage; flag the specific diagram/section for regeneration.
- **Defect B, empty diagram:** **needs regeneration** — there is no original content to recover; the diagram was never written or was lost. The surrounding prose usually describes what the diagram should show — use that to regenerate a correct diagram.
- **Defect C, empty code block:** **needs regeneration** if the surrounding text references code that should be there; **deletable** if it's a stray empty fence with no referent.
- **Defect C, unclosed fence:** **recoverable** — add the missing closing fence at the correct boundary (where the code ends and prose resumes).
- **Defect D:** depends on the root cause (B or C) — fix the root, and the eaten content usually reappears correctly.

---

## STEP 3 — REPORT BEFORE FIXING

Present the full defect table plus the recoverable/regeneration split. Do not fix anything until this is reported. Give a clear count: how many defects are clean mechanical fixes vs how many require regenerating a diagram or code block from surrounding context.

---

## STEP 4 — FIX

**Defect A, single-layer mojibake — encoding reversal (do this as a bulk pass first):**
Reverse the double-encoding by reinterpreting the UTF-8-decoded string as Windows-1252 bytes and re-decoding as UTF-8. This is lossless for single-layer corruption. Use `-Encoding UTF8` on every read and write so the fix itself doesn't re-corrupt. After the bulk pass, re-scan — anything still showing gibberish is multi-layer and falls to regeneration.

**Defect A, punctuation mojibake (`?????s???,??` and similar) — targeted replacement:**
The encoding-reversal pass above fixes most of these automatically. For any that survive (because the corruption is lossy — a `?` cluster where the original byte is genuinely gone), infer the intended punctuation from context and replace: a `?????s???,??` between two clauses is almost always an em-dash (`—`); mid-word `?` in a contraction is a curly apostrophe (`'`) → straighten to `'`; a trailing `?` cluster after a clause is often an ellipsis (`…`) or em-dash. When the intended character is genuinely ambiguous, default to the simplest ASCII that reads correctly (plain `-` or rewording) rather than guessing an exotic character. Do not leave literal `?????` runs in prose.

**Defect A2, corrupted frontmatter fence — repair the fence:**
Ensure the file's first three bytes are exactly `---` with no BOM, leading whitespace, or stray character before it. Strip any leading `?`, BOM (U+FEFF), or whitespace so `---` is the literal start of the file. Confirm the closing `---` of the frontmatter block is intact and that `id`, `title`, `sidebar_label`, `sidebar_position` are all inside the fence. After the fix, the frontmatter should stop rendering as body text.

**Defect A, multi-layer — regenerate:**
Read the prose immediately around the corrupted diagram. It almost always describes what the diagram depicts. Regenerate a correct `<AsciiDiagram>` matching that description, following the project's diagram conventions (`[ ]` services, `(( ))` databases, `< >` queues, `{ }` caches, Unicode arrows, title prop, explicit closing tag, no internal blank lines).

**Defect B, empty diagram — regenerate from context:**
Same approach: use the surrounding prose (and the diagram's own `title`/`alt`/`caption` props, which usually survive even when the body is empty) to regenerate the intended diagram.

**Defect C, empty code block — regenerate or delete:**
If surrounding text references specific code, regenerate it correctly for the topic (real, runnable, matching the lesson). If it's a stray empty fence with no referent, delete it cleanly without leaving a dangling blank line.

**Defect C, unclosed fence — close it:**
Find where the code actually ends (where prose resumes) and insert the closing fence there.

**Defect D — fix root cause:**
Once B/C are fixed, re-render and confirm the previously-eaten content now displays correctly.

Apply all project MDX safety rules while fixing: Unicode arrows in diagrams, explicit `</AsciiDiagram>` close, no internal blank lines in diagrams, no raw `{`/`}` in prose, correct fence languages.

---

## STEP 5 — VERIFY

After fixing each batch:
1. Run `npm run build` — confirm still green (these fixes shouldn't break compilation, but confirm).
2. Spot-check by re-scanning the fixed files for the same defect patterns — confirm zero remaining mojibake sequences, zero empty diagrams, zero empty/unclosed fences.
3. For regenerated diagrams and code, sanity-check that the new content actually matches what the surrounding prose says it should show — a regenerated diagram that's technically valid but describes the wrong thing is still a defect.

---

## STEP 6 — REPORT

```
Scope: <slug or all>
Files scanned: <count>

Defects found:
  A — mojibake (single-layer, reversed): <count>
  A — mojibake (multi-layer, regenerated): <count>
  B — empty diagrams (regenerated): <count>
  C — empty/broken code blocks (regenerated/deleted): <count>
  C — unclosed fences (closed): <count>
  D — eaten content (recovered via root fix): <count>

Files still flagged NEEDS MANUAL REVIEW: <list>
Build verified clean: yes/no
```

---

## HARD RULES

- Report the full defect audit before fixing anything.
- Never hand-retype multi-layer mojibake into "something that looks plausible" — if the original is unrecoverable, regenerate from the surrounding prose's description, don't guess at mangled bytes.
- A regenerated diagram or code block must match what the surrounding text says it shows — technical validity isn't enough, it has to be the *right* content.
- Any bulk file rewrite must use `-Encoding UTF8` on read and write, or it will re-introduce the exact mojibake it's fixing.
- Process in batches with per-batch reporting — never one silent pass across a whole course.
- Do not run this against a course while it is still being generated in another session — file races will corrupt in-flight writes. Only run on a settled course.