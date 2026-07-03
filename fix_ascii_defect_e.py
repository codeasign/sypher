#!/usr/bin/env python3
"""Fix Defect E: Convert AsciiDiagram children pattern to content prop.

Pattern: <AsciiDiagram ...>\n{`\n...`}\n</AsciiDiagram>
To:      <AsciiDiagram ... content={`\n...`} />
"""

import re
import glob
import os

BASE = 'docs/system-design-fundamentals'

# Files that need fixing (children pattern)
files_to_fix = []
for folder in ['llm-serving', 'embeddings', 'vector-databases']:
    for f in sorted(glob.glob(f'{BASE}/{folder}/**/*.mdx', recursive=True)):
        files_to_fix.append(f)

# model-routing files with children pattern
for f in ['model-routing/02-deep-dive.mdx', 'model-routing/03-architecture.mdx']:
    files_to_fix.append(f'{BASE}/{f}')

def fix_children_to_prop(content):
    """Replace <AsciiDiagram ...>\n{`\n...`}\n</AsciiDiagram>
       with  <AsciiDiagram ... content={`\n...`} />"""

    # Match AsciiDiagram opening tag, newline, backtick template literal, newline, closing tag
    # The template literal opener is: BACKTICK-CHAR preceded by { on its own line
    # The template literal closer is: BACKTICK-CHAR followed by } on its own line

    # Pattern explanation:
    # (<AsciiDiagram[^>]*>) - capture the opening tag (including the trailing >)
    # \s*\n\s*\{`\n - newline, optional whitespace, then {BACKTICK, then newline
    # (.*?) - capture the diagram content (non-greedy)
    # \n\s*`\}\s*\n\s* - newline, optional whitespace, BACKTICK}, whitespace, newline
    # </AsciiDiagram> - closing tag

    # Actually let me be more careful about the backtick. In Python, backtick is not special.
    # The actual pattern in the file is:
    # <AsciiDiagram ...>
    # {`BACKTICK
    # ...content...
    # BACKTICK`}
    # </AsciiDiagram>

    # Wait - the template literal uses backticks. The file has:
    # {` followed by a literal backtick character
    # ...content...
    # literal backtick followed by `}

    # In the Python string, the backtick `` ` `` is just a regular character.
    # So the pattern in the file text is: {` ... `}
    # where ` represents a backtick character.

    # Pattern: <AsciiDiagram ...> then \n then {` then \n then content then \n then `} then \n then </AsciiDiagram>

    pattern = r'(<AsciiDiagram[^>]*)>\s*\n\s*\{\n\s*`\n(.*?)\n\s*`\n\s*\}\s*\n\s*</AsciiDiagram>'

    # Hmm, I need to be smarter. The template literal is not a Python string — it's the file content.
    # In the file, the characters are:
    # {`        ← open brace + backtick
    # ...content...
    # `}        ← backtick + close brace

    # In Python regex, backtick has no special meaning. So I can match it literally.
    # But wait - the `{` and `}` are literal braces. In regex, `{` has special meaning as a quantifier opener.
    # I need to escape them: `\{` and `\}`.

    # Let me try again:
    pattern = r'(<AsciiDiagram[^>]*)>\s*\n\s*\{\n\s*\n(.*?)\n\s*\n\s*\}\s*\n\s*</AsciiDiagram>'

    # Hmm, this doesn't account for the backtick characters. Let me look at the actual file content again.
    # From my read of llm-serving/01-concepts.mdx:
    # Line 60: <AsciiDiagram id="llm-serving/big-picture" ...>
    # Line 61: {`          ← this is the template literal start
    # Line 62:   Clients
    # ...
    # Line 117: `}          ← this is the template literal end
    # Line 118: </AsciiDiagram>

    # So the backtick is on the same line as {, and on the same line as }.
    # In the file: "{`\n" opens the template literal, and "\n`}\n" closes it.

    # In Python regex, backtick is just a literal character. I need to match it.
    pattern = r'(<AsciiDiagram[^>]*)>\s*\n\s*\{\`\n(.*?)\n\s*\`\}\s*\n\s*</AsciiDiagram>'
    # But ` is not a special character in Python regex, so I don't need to escape it.
    # Actually, ` IS a valid Python character. Let me just use it directly.

    # Let me try yet another approach - use a marker for the backtick
    BACKTICK = chr(96)  # backtick character

    pattern = r'(<AsciiDiagram[^>]*)>\s*\n\s*\{' + BACKTICK + r'\n(.*?)\n\s*' + BACKTICK + r'\}\s*\n\s*</AsciiDiagram>'
    replacement = r'\1 content={' + BACKTICK + r'\n\2\n' + BACKTICK + r'} />'

    result = re.sub(pattern, replacement, content, flags=re.DOTALL)
    return result

total_fixed = 0
for fp in files_to_fix:
    if not os.path.exists(fp):
        print(f'  SKIP (not found): {fp}')
        continue

    with open(fp, 'r', encoding='utf-8') as fh:
        content = fh.read()

    before = content
    content = fix_children_to_prop(content)

    if content != before:
        # Count how many diagrams were converted
        old_closing_count = before.count('</AsciiDiagram>')
        new_closing_count = content.count('</AsciiDiagram>')
        converted = old_closing_count - new_closing_count
        total_fixed += converted

        with open(fp, 'w', encoding='utf-8') as fh:
            fh.write(content)

        print(f'  FIXED: {fp} ({converted} diagrams converted)')
    else:
        # Check if already correct (no closing tag = self-closing)
        if '</AsciiDiagram>' not in content and 'content={' in content:
            print(f'  CLEAN: {fp} (already correct)')
        else:
            # Maybe the pattern didn't match - let's check a few chars
            if '<AsciiDiagram' in content:
                # Count AsciiDiagram occurrences
                opening_count = content.count('<AsciiDiagram')
                closing_count = content.count('</AsciiDiagram>')
                content_prop_count = content.count('content={')
                print(f'  UNCHANGED: {fp} ({opening_count} openings, {closing_count} closings, {content_prop_count} content props)')
            else:
                print(f'  NO DIAGRAMS: {fp}')

print(f'\nTotal diagrams converted: {total_fixed}')