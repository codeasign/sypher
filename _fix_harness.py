import sys

with open('docs/coding-bootcamp/binary-search/exercises/medium/find-first-and-last.mdx', 'rb') as f:
    data = f.read()

# Find the python harness section
text = data.decode('utf-8')
target = "data = sys.stdin.read().strip().split('"
new_text = text.replace(
    "data = sys.stdin.read().strip().split('",
    "data = sys.stdin.read().split('"
)

# Remove the `if data[0]` condition that doesn't handle empty
old_cond = "if data[0] else []"
new_cond = "if data[0].strip() else []"
new_text2 = new_text.replace(old_cond, new_cond)

if new_text2 != text:
    with open('docs/coding-bootcamp/binary-search/exercises/medium/find-first-and-last.mdx', 'wb') as f:
        f.write(new_text2.encode('utf-8'))
    print("Fixed!")
else:
    print("No changes needed")
    # Debug: show the actual content around the relevant area
    idx = text.find('data = sys.stdin')
    if idx >= 0:
        print(text[idx:idx+100])