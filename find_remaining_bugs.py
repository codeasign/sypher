import glob, re

# Find ALL files with the malformed backtick pattern
files = glob.glob('docs/coding-bootcamp/**/*.mdx', recursive=True)
count = 0
for f in files:
    with open(f, 'rb') as fp:
        content = fp.read()
    # Decode safely
    try:
        text = content.decode('utf-8')
    except:
        try:
            text = content.decode('utf-8-sig')
        except:
            continue

    # Pattern: backtick followed by text followed by space+backtick+<=+backtick
    # Which means the <= is NOT inside inline code but between backtick pairs
    has_issue = False
    for i, line in enumerate(text.split('\n'), 1):
        if '`<=' in line and '<=`' in line:
            # Check if the <= characters are actually inside backtick pairs
            # by examining the backtick pattern
            print(f'FOUND in {f} line {i}: {line.strip()[:120]}')
            has_issue = True
            count += 1

    if has_issue:
        print()

print(f'Total: {count} files with issues')