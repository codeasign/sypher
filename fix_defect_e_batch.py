#!/usr/bin/env python3
"""Fix Defect E: Convert AsciiDiagram children pattern to content prop pattern."""
import os, re

DIRS = ["notification-system", "search-system", "recommendation-engine",
        "distributed-scheduler", "url-shortener-pattern"]

BASE = "docs/system-design-fundamentals"
BT = chr(96)  # backtick

total_fixed = 0

for d in DIRS:
    path = os.path.join(BASE, d)
    for f in sorted(os.listdir(path)):
        if not f.endswith(".mdx"):
            continue
        fpath = os.path.join(path, f)
        with open(fpath, "r", encoding="utf-8") as fh:
            content = fh.read()

        original = content
        orig_count = content.count("</AsciiDiagram>")
        if orig_count == 0:
            continue

        # Pattern 1: Fix opening tag - replace >\n{` with content={\n`
        content = re.sub(
            r"(<AsciiDiagram[^>]*?)>\s*\n\s*\{\s*\n\s*" + BT,
            r"\1  content={\n" + BT,
            content
        )

        # Pattern 2: Fix closing tag - replace `}\n</AsciiDiagram> with `} />
        content = re.sub(
            BT + r"\s*\}\s*\n\s*</AsciiDiagram>",
            BT + r"} />",
            content
        )

        # Pattern 3: single-line variant
        content = re.sub(
            r"(<AsciiDiagram[^>]*?)>\s*\{\s*" + BT + r"(.*?)" + BT + r"\s*\}\s*</AsciiDiagram>",
            r"\1 content={" + BT + r"\2" + BT + r"} />",
            content
        )

        # Pattern 4: fenced code block inside AsciiDiagram children
        # <AsciiDiagram ...>\n\n```\n...content...\n```\n</AsciiDiagram>
        content = re.sub(
            r"(<AsciiDiagram\s[^>]*?)>\s*\n\s*```\s*\n(.*?)```\s*</AsciiDiagram>",
            r"\1 content={`\n\2`} />",
            content,
            flags=re.DOTALL
        )

        if content != original:
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(content)
            total_fixed += orig_count
            print("Fixed: " + d + "/" + f + " (" + str(orig_count) + " occurrences)")

print("\nTotal Defect E occurrences fixed: " + str(total_fixed))

# Verify
remaining = 0
for d in DIRS:
    path = os.path.join(BASE, d)
    for f in sorted(os.listdir(path)):
        if not f.endswith(".mdx"):
            continue
        fpath = os.path.join(path, f)
        with open(fpath, "r", encoding="utf-8") as fh:
            content = fh.read()
        cnt = content.count("</AsciiDiagram>")
        if cnt > 0:
            print("REMAINING: " + d + "/" + f + " = " + str(cnt))
            remaining += cnt

if remaining == 0:
    print("VERIFICATION: Zero remaining </AsciiDiagram> in all directories!")
else:
    print("VERIFICATION: " + str(remaining) + " still remaining")