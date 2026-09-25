#!/usr/bin/env python3
"""wrap.py <topic-file-substr> <GID> <DIR> <member,member,...> [--under PARENT]
Wraps the given direct children (subgraph ids or node ids) of the OUT subgraph (indent 2) in a new subgraph GID
with the given direction; edges between members move inside; edges from members (subgraph ids) to outside are re-pointed at GID.
Layout-only edit of the .mmd in .cache/ascii-to-mermaid."""
import sys, re, glob
name, gid, direction, members = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',')
files = glob.glob('D:/jenny/sypher/.cache/ascii-to-mermaid/system-design-fundamentals-' + name + '.mmd')
assert len(files) == 1, files
f = files[0]
lines = open(f, encoding='utf8').read().split('\n')
# locate OUT block: first 'subgraph OUT' ... its matching end
start = next(i for i, l in enumerate(lines) if re.match(r'\s*subgraph OUT\b', l))
depth = 0; end = None
for i in range(start, len(lines)):
    if re.match(r'\s*subgraph\b', lines[i]): depth += 1
    elif re.match(r'\s*end\s*$', lines[i]):
        depth -= 1
        if depth == 0: end = i; break
body = lines[start + 1:end]
# split body into direct-child blocks
blocks = []  # (id, kind, [lines])
i = 0
while i < len(body):
    l = body[i]
    m = re.match(r'\s*subgraph\s+(\w+)', l)
    if m:
        d = 0; j = i
        while True:
            if re.match(r'\s*subgraph\b', body[j]): d += 1
            elif re.match(r'\s*end\s*$', body[j]):
                d -= 1
                if d == 0: break
            j += 1
        blocks.append((m.group(1), 'sg', body[i:j + 1])); i = j + 1; continue
    m = re.match(r'\s*direction\b', l)
    if m: blocks.append(('', 'dir', [l])); i += 1; continue
    m = re.match(r'\s*(\w+)\s*(\[|\(|\{|>)', l)  # node definition
    if m and not re.search(r'-->|~~~|---|-\.->', l.split('[')[0]):
        blocks.append((m.group(1), 'node', [l])); i += 1; continue
    blocks.append(('', 'edge', [l])); i += 1
mem = set(members)
sg_ids = {b[0] for b in blocks if b[1] == 'sg' and b[0] in mem}
inside, edges_in, out = [], [], []
placed = False
for b in blocks:
    if b[0] in mem and b[1] in ('sg', 'node'):
        inside += b[2]
        if not placed: out.append(('__WRAP__', 'marker', [])); placed = True
    elif b[1] == 'edge':
        toks = re.findall(r'\b\w+\b', re.sub(r'\|[^|]*\|', ' ', b[2][0]))
        ends = [t for t in toks if t in mem or True]
        # edge whose both endpoints are members -> move inside
        m = re.match(r'\s*(\w+)\s*(-->|~~~|---|-\.->|==>)(\|[^|]*\|)?\s*(\w+)\s*$', b[2][0])
        if m and m.group(1) in mem and m.group(4) in mem: edges_in.append(b[2][0])
        else:
            l = b[2][0]
            for s in sg_ids: l = re.sub(r'\b' + s + r'\b', gid, l)
            out.append((b[0], b[1], [l]))
    else: out.append(b)
new = []
for b in out:
    if b[1] == 'marker':
        new.append(f'  subgraph {gid}[" "]'); new.append(f'    direction {direction}')
        new += inside; new += edges_in; new.append('  end')
    else: new += b[2]
lines[start + 1:end] = new
open(f, 'w', encoding='utf8').write('\n'.join(lines))
print('wrapped', gid, 'in', f.split('fundamentals-')[1])
