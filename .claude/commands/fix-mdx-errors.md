---
name: fix-mdx-errors
description: Parse a Docusaurus/MDX build error log and fix each reported compilation error in place
---

# /fix-mdx-errors

## Input
Paste the full `npm start` / `npm run build` error output (one or more "Module build failed" blocks) as the command argument or in the message immediately following.

## Procedure

### 1. Parse the log
For each "MDX compilation failed for file" block, extract: file path, `reason`, `ruleId`, `source`, and line/column (or line range).

### 2. Read each failing file in full
Never patch based on the error snippet alone — read the whole file so fixes respect surrounding context (valid JSX prop expressions must not be touched).

### 3. Diagnose by ruleId + source

**`ruleId: acorn`, `source: micromark-extension-mdxjs-esm`, reason "Could not parse import/exports with acorn"**
→ The flagged line begins with the literal word `import` or `export` outside a fenced code block.
→ Fix: wrap the word in inline code (`` `import` ``) if it's referring to the concept, move it into a fenced code block if it's actual code, or rephrase the sentence so it doesn't lead with that keyword.

**`ruleId: end-tag-mismatch`, `source: mdast-util-mdx-jsx`, reason mentions `<AsciiDiagram>` "before the end of paragraph"**
→ A blank line exists inside the `<AsciiDiagram>...</AsciiDiagram>` block, which breaks MDX's JSX-in-paragraph parsing — MDX loses track of the block boundary at the first blank line.
→ Fix: remove blank lines from the diagram content. If the ASCII art needs a visually empty row, use a row of spaces or a `.` placeholder character instead of a truly empty line. Keep the opening and closing tags each on their own line, content flush left.
→ Also check the diagram content for raw `<` / `>` (arrows, box corners). Replace with Unicode (`→ ← ↔ ↑ ↓ ↕`) or escape as `&lt;` / `&gt;`.

**`ruleId: end-tag-mismatch`, `source: mdast-util-mdx-jsx`, reason "Expected a closing tag for `<AsciiDiagram>`" pointing at a single line near the end of the block**
→ The opening tag is non-self-closing (`<AsciiDiagram ...>`, ending in `>` not `/>`), but the block was terminated with a stray self-closing `` `} /> `` after the template literal instead of an explicit `</AsciiDiagram>`. MDX opened a tag expecting children and a real closing tag, never found one, and errors at whatever line comes next.
→ Detect: search the file for the pattern `<AsciiDiagram\b[^>]*>` (no trailing `/`) followed later by `` `} /> `` instead of `` `}</AsciiDiagram> ``.
→ Fix: replace the trailing `` `} /> `` with `` `}</AsciiDiagram> ``. Do not touch this pattern elsewhere in the file — only the immediate template-literal closer for that specific diagram block.
→ Batch check across the tree:
```powershell
Get-ChildItem -Path "D:\jenny\sypher\docs" -Recurse -Filter *.mdx | Where-Object {
    (Get-Content $_.FullName -Raw -Encoding UTF8) -match '(?s)<AsciiDiagram\b[^>]*>\s*\{`.*?`\}\s*/>'
}
```
→ Batch fix:
```powershell
foreach ($file in $affected) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $pattern = '(?s)(<AsciiDiagram\b[^>]*>)(\s*\{`.*?`\})\s*/>'
    $newContent = [regex]::Replace($content, $pattern, '$1$2</AsciiDiagram>')
    if ($newContent -ne $content) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline -Encoding UTF8
    }
}
```

**`ruleId: acorn`, `source: micromark-extension-mdx-expression`, reason "Could not parse expression with acorn"**
→ Two distinct causes share this ruleId — check both:

1. **Escaped-backtick corruption (check this first).** The `<AsciiDiagram>` block's opening or closing has a stray backslash before the backtick: `` >{\` `` instead of `` >{` ``, or `` \`} `` instead of `` `} ``. `\`` is not valid JavaScript at that position, so acorn fails immediately — this produces the exact "column: 3" or "column: 4" signature seen at the very start of the expression. This corruption also defeats the standard self-closing-tag regex fix (Section on `end-tag-mismatch` below), since that regex expects a bare backtick immediately after `{` — the extra backslash breaks the match, so a block can carry both bugs stacked and survive an earlier fix pass untouched.
   → Detect: search for the literal two-character sequence backslash + backtick (`\` followed by `` ` ``) anywhere in the file.
   → Fix: remove the stray backslash so `` \` `` becomes `` ` ``, then re-check the block's closing tag — if it's now a self-closing `` `} /> ``, apply the standard fix from the `end-tag-mismatch` section to make it `` `}</AsciiDiagram> ``.
   → Batch fix (run before the self-closing-tag fix, or combine both in one pass):
   ```powershell
   $content = $content -replace '\\`', '`'
   ```

2. **Genuinely invalid JS in a `{}` expression** (Big-O notation, set notation, an inline pseudo-JSON fragment written as a raw expression instead of inline code).
   → Fix: wrap the whole expression in inline code, e.g. `` `O(n log n)` `` — don't keep it as a raw `{}` expression at all. Inline code renders correctly and reads naturally for notation.

If a file reports this ruleId, check for the escaped-backtick pattern first — it's proven to be the more common cause in this pipeline.

**`ruleId: unexpected-eof`, `source: micromark-extension-mdx-expression`, reason "Unexpected end of file in expression, expected a corresponding closing brace for `{`"**
→ A single unmatched `{` exists in prose with no balancing `}` in the same expression — commonly an inline JSON-ish example (`{ "status": 200 }`) written outside a code fence, or a stray literal brace in a sentence.
→ Fix: if it's a genuine code/data snippet, wrap in a fenced code block or inline code. If it's a stray brace in prose, wrap the phrase in inline code or escape both braces as `&#123;` / `&#125;`.

**`ruleId: unexpected-closing-slash`, `source: micromark-extension-mdx-jsx`**
→ A literal `<` in prose is immediately followed by content containing a `/`, so MDX starts parsing a JSX tag and then hits a `/` where it expects an attribute name or `>`. Common triggers: a ratio/fraction written as `<1/1000>` or `<N/A>`, a comparison like "responds in <100/sec", or a malformed autolink (`<url>` syntax with a broken protocol).
→ Fix: never lead a ratio, fraction, or "less-than" comparison with a raw `<` in prose. Escape as `&lt;` or, preferably, wrap the whole expression in inline code: `` `<1/1000` `` → `` `less than 1 in 1000` `` or `` `1/1000` ``. Word-based comparisons ("under 100ms") are still the safest default per the existing MDX rule.

**`ruleId: unexpected-character`**
→ This ruleId covers two distinct causes — distinguish by the exact message text:

1. **Message mentions "after self-closing slash, expected `>` to end the tag"** (e.g. `Unexpected character 'P' (U+0050) after self-closing slash...`). This is the same root cause family as `unexpected-closing-slash`: a raw `<` in prose gets misparsed as the start of a JSX tag, MDX then finds a `/` and expects `>` immediately after it, but hits a letter or digit instead. Common trigger: a raw `<` before path-like or method-like text containing a slash, e.g. an unescaped `<GET/POST>` label, a placeholder like `<Verb/Path>`, or a ratio/path written with a leading `<` that wasn't caught by the ratio-specific check.
   → Fix: never lead this kind of construct with a raw `<` in prose. Wrap the whole label in inline code (`` `GET/POST` ``) or escape the leading `<` as `&lt;`.
2. **Message mentions non-ASCII/fullwidth characters, or the flagged character doesn't correspond to normal prose** — this is DeepSeek tool-call protocol leakage (`｜`, `<|...|>`-style tokens). Search the flagged line for any fullwidth/invisible/non-standard Unicode character near the reported column.
   → If found: strip the leaked token entirely (it's not meaningful content, just protocol bleed) and re-verify the surrounding sentence still reads correctly.
   → If neither of the above: check for an unquoted JSX attribute value (`attr=value` instead of `attr="value"`) or a stray smart-quote (`"` `"` `'` `'`) adjacent to `{` or `<` — replace with straight quotes or escape.

### 3a. Non-ruleId issue — UTF-8/ANSI mojibake in AsciiDiagram content
Not every broken diagram is an MDX parse error — some pass MDX compilation but render garbage box-drawing characters (`â”€`, `â”‚`, `â–¶` instead of `─│▶`). This happens when a file gets read as Windows-1252/ANSI and re-saved as UTF-8 (e.g. a PowerShell script using `Get-Content`/`Set-Content` without `-Encoding UTF8`), double-encoding the multi-byte box-drawing/arrow characters.
→ Detect: search for `â”` or `â–` in file content — these byte sequences only appear from this specific corruption.
```powershell
$affected = Get-ChildItem -Path "D:\jenny\sypher\docs" -Recurse -Filter *.mdx | Where-Object {
    (Get-Content $_.FullName -Raw -Encoding UTF8) -match 'â”'
}
```
→ Fix (reinterpret as CP1252, re-decode as UTF-8 — reverses the double-encoding losslessly):
```powershell
$cp1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8   = [System.Text.Encoding]::UTF8
foreach ($file in $affected) {
    $bytes   = [System.IO.File]::ReadAllBytes($file.FullName)
    $content = $utf8.GetString($bytes)
    if ($content -notmatch 'â”') { continue }
    $fixed = $utf8.GetString($cp1252.GetBytes($content))
    [System.IO.File]::WriteAllBytes($file.FullName, $utf8.GetBytes($fixed))
}
```
→ Prevention: any future bulk-edit script touching `.mdx` files must use `-Encoding UTF8` on both `Get-Content` and `Set-Content` (PowerShell 5.1 defaults to system ANSI codepage otherwise).

### 4. Guardrail — never touch valid JSX
Do not blind-regex-replace curly braces file-wide. Component prop expressions (`<FurtherReading items={[...]} />`, `{frontMatter.title}`, any real `.mdx` component usage) are correct MDX and must be left untouched. Only fix braces, import-lines, or tags that sit inside plain prose or `<AsciiDiagram>` content.

### 5. Verify per file
After fixing each file, confirm the dev server (`npm start`) shows no new error for that path, or run `npm run build` if batching many fixes before spot-checking individually.

### 6. Report
```
| File | Error Type | Fix Applied |
|---|---|---|
```

### 7. Escalate uncertain cases
If a file's cause can't be confidently determined from context, leave it unfixed and flag it as `MANUAL REVIEW NEEDED` with line/column — never guess destructively on content you can't verify.

### 8. Feed back into templates
If the same ruleId recurs across 3+ files in one run, add the corresponding MDX-safety rule (see Section 3 above) to `add-system-design-course.md` and `add-system-design-case-study.md` so new generations stop reproducing it.