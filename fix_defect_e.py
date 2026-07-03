#!/usr/bin/env python3
"""Fix Defect E: Convert AsciiDiagram children pattern to content prop pattern."""
import os
import glob
import re

TOPICS = ['serverless', 'deployment-strategies', 'disaster-recovery']
BASE = 'docs/system-design-fundamentals'

for topic in TOPICS:
    path = os.path.join(BASE, topic)
    for f in sorted(glob.glob(os.path.join(path, '*.mdx'))):
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()

        # Pattern 1: Opening: <AsciiDiagram\n  ...props...\n>\n{\n`
        # Replace the >\n{\n` with content={\n`
        # But keep props before it
        content = re.sub(
            r'(<AsciiDiagram[^>]*?)>\s*\n\s*\{\s*\n\s*`',
            r'\1  content={\n`',
            content
        )

        # Pattern 2: Closing: `}\n</AsciiDiagram>
        content = re.sub(
            r'`\s*\}\s*\n\s*</AsciiDiagram>',
            r'`} />',
            content
        )

        # Also handle single-line pattern: prop>{
`
        content = re.sub(
            r'(<AsciiDiagram\s+[^>]*?)>\{\n`',
            r'\1 content={\n`',
            content
        )

        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)

        print(f'Fixed: {f}')

print('Done!')
