import sys
with open('docs/coding-bootcamp/binary-search/exercises/hard/median-two-sorted-arrays.mdx', 'rb') as f:
    data = f.read().decode('utf-8')

# Fix the strip() issue
old = "data = sys.stdin.read().strip().splitlines()"
new = "data = sys.stdin.read().splitlines()"
data = data.replace(old, new)

# Also fix the empty array handling
old2 = "nums1 = list(map(int, data[1].split())) if n > 0 else []"
new2 = "nums1 = list(map(int, data[1].split())) if len(data) > 1 and n > 0 and data[1].strip() else []"
data = data.replace(old2, new2)

old3 = "nums2 = list(map(int, data[2].split())) if m > 0 else []"
new3 = "nums2 = list(map(int, data[2].split())) if len(data) > 2 and m > 0 and data[2].strip() else []"
data = data.replace(old3, new3)

with open('docs/coding-bootcamp/binary-search/exercises/hard/median-two-sorted-arrays.mdx', 'w', encoding='utf-8') as f:
    f.write(data)
print("Fixed!")