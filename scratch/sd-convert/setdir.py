#!/usr/bin/env python3
"""setdir.py <name> <SGID> <DIR>   set direction of subgraph SGID (or 'TOP' for the flowchart line)"""
import sys,re
n,sg,d=sys.argv[1:4]
f=f'D:/jenny/sypher/.cache/ascii-to-mermaid/system-design-fundamentals-{n}.mmd'
L=open(f,encoding='utf8').read().split('\n')
if sg=='TOP':
    for i,l in enumerate(L):
        if l.startswith('flowchart '): L[i]='flowchart '+d; break
else:
    for i,l in enumerate(L):
        if re.match(rf'\s*subgraph {sg}\b',l):
            assert re.match(r'\s*direction',L[i+1]),(n,sg,L[i+1]); L[i+1]=re.sub(r'(TB|LR)',d,L[i+1]); break
    else: raise SystemExit('no sg '+sg)
open(f,'w',encoding='utf8').write('\n'.join(L))
