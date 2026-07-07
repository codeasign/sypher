import sys
with open('docs/coding-bootcamp/binary-search/exercises/medium/find-first-and-last.mdx', 'rb') as f:
    data = f.read().decode('utf-8')
idx = data.find('harness={{')
# Find the next 'python:' after harness
py_idx = data.find('python:', idx)
print(f"harness starts at {idx}")
print(f"python: at {py_idx}")
# Check what's between harness and python:
print("Between harness and python:")
print(repr(data[idx:idx+100]))
print()
print("Python harness section:")
# Find the closing }}
brace_count = 0
end = py_idx
while end < len(data):
    if data[end] == '{':
        brace_count += 1
    elif data[end] == '}':
        brace_count -= 1
        if brace_count == 0:
            end += 1
            break
    end += 1
print(repr(data[py_idx:end]))