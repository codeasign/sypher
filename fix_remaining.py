import re, os, glob

def fix_file(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '</AsciiDiagram>' not in content:
        return False

    original = content

    # Pattern: <AsciiDiagram ...>\n```\n...\n```\n</AsciiDiagram>
    # or <AsciiDiagram ...>\n\n```\n...\n```\n</AsciiDiagram>
    content = re.sub(
        r'(<AsciiDiagram\s[^>]*?)>\s*```\s*\n(.*?)```\s*</AsciiDiagram>',
        r'\1 content={`\n\2`} />',
        content,
        flags=re.DOTALL
    )

    # Pattern: <AsciiDiagram ...>\n{`...`}\n</AsciiDiagram> (JS template literal)
    content = re.sub(
        r'(<AsciiDiagram\s[^>]*?)>\s*\{`(.*?)`\}\s*</AsciiDiagram>',
        r'\1 content={`\2`} />',
        content,
        flags=re.DOTALL
    )

    # Pattern: <AsciiDiagram ...>\n{`...`}\n/>\n</AsciiDiagram> (hybrid)
    content = re.sub(
        r'(<AsciiDiagram\s[^>]*?)>\s*\{`(.*?)`\}\s*/>\s*</AsciiDiagram>',
        r'\1 content={`\2`} />',
        content,
        flags=re.DOTALL
    )

    if content == original:
        return False

    remaining = len(re.findall(r'</AsciiDiagram>', content))
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

base = 'docs/system-design-fundamentals'
fixed = 0

for dirpath, dirnames, filenames in os.walk(base):
    for fn in filenames:
        if not fn.endswith('.mdx'):
            continue
        fpath = os.path.join(dirpath, fn)
        if fix_file(fpath):
            fixed += 1
            print(f'Fixed: {os.path.relpath(fpath, base)}')

remaining = 0
for dirpath, dirnames, filenames in os.walk(base):
    for fn in filenames:
        if not fn.endswith('.mdx'):
            continue
        fpath = os.path.join(dirpath, fn)
        with open(fpath, 'r', encoding='utf-8') as f:
            c = f.read()
        if '</AsciiDiagram>' in c:
            remaining += 1
            print(f'REMAINING: {os.path.relpath(fpath, base)}')

print(f'\nFixed: {fixed} files, Remaining with Defect E: {remaining}')