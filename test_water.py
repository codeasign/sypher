import re, textwrap, tempfile, subprocess, os, sys

def decode_escapes(text):
    def rep(m):
        return chr(int(m.group(1), 16))
    return re.sub(r'\\u([0-9a-fA-F]{4})', rep, text)

# Test container-with-most-water manually
with open('docs/coding-bootcamp/arrays/exercises/medium/container-with-most-water.mdx', 'r', encoding='utf-8') as f:
    ex_text = f.read()

# Extract harness
start = ex_text.find('harness={{')
section = ex_text[start:]
d = 0; end = 0
for i,ch in enumerate(section):
    if ch == '{': d += 1
    elif ch == '}':
        d -= 1
        if d == 0: end = i+1; break
section = section[:end]
m = re.search(r'python:\s*`([\s\S]*?)`\s*', section)
harness = decode_escapes(m.group(1))

# Read solution
with open('docs/coding-bootcamp/arrays/solutions/medium/container-with-most-water.mdx', 'r', encoding='utf-8') as f:
    sol_text = f.read()
m = re.search(r'TabItem value="python"[^>]*>[\s\S]*?```python\s*\n([\s\S]*?)```', sol_text)
sol = textwrap.dedent(m.group(1).rstrip())

# Create combined file
with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
    f.write(sol)
    f.write('\n\n')
    f.write(harness)
    f.write('\n')
    tmp = f.name

# Test with first case
proc = subprocess.run([sys.executable, tmp], input='1 8 6 2 5 4 8 3 7\n', capture_output=True, text=True, timeout=5)
print('First test:')
print(f'  stdout: {proc.stdout.strip()}')
print(f'  stderr: {proc.stderr[:200]}')
print(f'  exit: {proc.returncode}')

result = proc.stdout.strip()
print(f'  Expected: 49, Got: {result}')

os.unlink(tmp)