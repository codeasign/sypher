import re, sys

path = 'docs/agentic-ai-fundamentals/structured-output-prompting/build-it.mdx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Split on triple-backtick code fences
parts = re.split(chr(96)*3, content)
found = False
for i, part in enumerate(parts):
    if i % 2 == 0:  # prose section
        for j, c in enumerate(part):
            if c in ('{', '}'):
                # Check if inside inline backticks
                before = part[max(0,j-100):j]
                bt_count = before.count(chr(96))
                if bt_count % 2 == 0:
                    found = True
                    print(f'SECTION {i}, pos {j}: {repr(c)} in bare prose')
                    start = max(0, j-40)
                    end = min(len(part), j+40)
                    ctx = part[start:end].replace(chr(10), ' ')
                    print(f'  context: ...{ctx}...')

if not found:
    print('ALL CLEAN - no bare braces in prose')