import re, os, sys

issues = []
target = os.path.join('docs', 'agentic-ai-fundamentals')

# Characters that can't be printed in cp1252 — skip those context bytes
def safe_context(text, j, width=30):
    start = max(0, j - width)
    end = min(len(text), j + width)
    raw = text[start:end].replace('\n', ' ')
    # Replace non-ASCII with dots for display
    return ''.join(c if ord(c) < 128 else '.' for c in raw)

for root, dirs, fnames in os.walk(target):
    for f in sorted(fnames):
        if not f.endswith('.mdx'):
            continue
        path = os.path.join(root, f)
        with open(path, encoding='utf-8') as fh:
            content = fh.read()

        # Split on triple-backtick code fences
        parts = re.split(r'```', content)
        for i, part in enumerate(parts):
            if i % 2 == 0:  # prose section
                # Remove AsciiDiagram content blocks: content={`...`}
                # These use backtick template literals inside JSX props
                part = re.sub(r'content=\{`.*?`\}', 'CONTENT_BLOCK', part, flags=re.DOTALL)

                for j, char in enumerate(part):
                    if char in ('{', '}', '<'):
                        # Valid MDX components start with < + uppercase letter — skip those
                        if char == '<' and j + 1 < len(part) and part[j+1].isalpha() and part[j+1].isupper():
                            continue
                        # Skip known safe patterns
                        snippet = part[max(0, j-10):j+10]
                        if 'import ' in snippet or 'export ' in snippet:
                            continue
                        ctx = safe_context(part, j)
                        issues.append(f'{path}:{j}:{repr(char)} in prose: ...{ctx}...')

for issue in issues:
    try:
        print(issue)
    except UnicodeEncodeError:
        pass

if not issues:
    print('ALL CLEAN - zero bare { } < in prose across all files')
else:
    print(f'\nTotal: {len(issues)} issues')
    sys.exit(1)