#!/usr/bin/env python3
"""Fix AsciiDiagram opening tags that still use > instead of content={ prop."""
import os, re

DIRS = ["notification-system", "search-system", "recommendation-engine",
        "distributed-scheduler", "url-shortener-pattern",
        "rate-limiter", "distributed-cache", "feed-generation",
        "leaderboard", "distributed-lock"]
BASE = "docs/system-design-fundamentals"
BT = chr(96)

fixed_count = 0

for d in DIRS:
    path = os.path.join(BASE, d)
    for f in sorted(os.listdir(path)):
        if not f.endswith(".mdx"):
            continue
        fpath = os.path.join(path, f)
        with open(fpath, "r", encoding="utf-8") as fh:
            content = fh.read()

        original = content

        # Fix: <AsciiDiagram ...attrs...>\n{` -> <AsciiDiagram ...attrs... content={\n`
        # Removes > and { and adds content={\n`
        content = re.sub(
            r"(<AsciiDiagram[^>]*?)>\s*\n\s*\{\s*\n\s*" + BT,
            r"\1  content={\n" + BT,
            content
        )

        # Fix: <AsciiDiagram ...attrs...>{` (single line, no newline between > and {`)
        content = re.sub(
            r"(<AsciiDiagram[^>]*?)>\s*\{\s*" + BT,
            r"\1  content={" + BT,
            content
        )

        # Fix: <AsciiDiagram ...attrs...>\n\n``` (code fence children pattern)
        content = re.sub(
            r"(<AsciiDiagram\s[^>]*?)>\s*\n\s*```\s*\n(.*?)```\s*" + chr(60) + "/AsciiDiagram>",
            r"\1  content={`\n" + r"\2" + BT + "} />",
            content,
            flags=re.DOTALL
        )

        if content != original:
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(content)
            fixed_count += 1
            print("Fixed: " + d + "/" + f)

print("\nFixed " + str(fixed_count) + " files")

# Count remaining issues
remaining_tags = 0
remaining_close = 0
for d in DIRS:
    path = os.path.join(BASE, d)
    for f in sorted(os.listdir(path)):
        if not f.endswith(".mdx"):
            continue
        fpath = os.path.join(path, f)
        with open(fpath, "r", encoding="utf-8") as fh:
            content = fh.read()

        # Check for non-self-closing AsciiDiagram tags
        # <AsciiDiagram ...> (with > but not /> and not followed by content=)
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if re.match(r'\s*<AsciiDiagram\b', line):
                # Check if this tag has > ending (not />)
                # Check next few lines for the >
                tag_text = "\n".join(lines[i:i+6])
                if re.search(r'<AsciiDiagram[^>]*?>\s*$', tag_text, re.MULTILINE):
                    remaining_tags += 1
                    print("OPEN TAG: " + d + "/" + f + " line " + str(i+1))

        cnt = content.count("</AsciiDiagram>")
        if cnt > 0:
            remaining_close += cnt

print("\nRemaining non-self-closing AsciiDiagram tags: " + str(remaining_tags))
print("Remaining </AsciiDiagram> tags: " + str(remaining_close))