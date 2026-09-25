#!/usr/bin/env python3
"""movein.py <name> <BLOCKID> <INTO_ID>  : move subgraph/node block BLOCKID (its lines) to just before the closing 'end' of subgraph INTO_ID"""
import sys,re
n,bid,into=sys.argv[1:4]
f=f'D:/jenny/sypher/.cache/ascii-to-mermaid/system-design-fundamentals-{n}.mmd'
L=open(f,encoding='utf8').read().split('\n')
def sg_end(i):
    d=0
    for j in range(i,len(L)):
        if re.match(r'\s*subgraph\b',L[j]): d+=1
        elif re.match(r'\s*end\s*$',L[j]):
            d-=1
            if d==0: return j
i=next(k for k,l in enumerate(L) if re.match(rf'\s*subgraph {bid}\b',l))
e=sg_end(i); blk=L[i:e+1]; del L[i:e+1]
t=next(k for k,l in enumerate(L) if re.match(rf'\s*subgraph {into}\b',l))
te=sg_end(t); L[te:te]=blk
open(f,'w',encoding='utf8').write('\n'.join(L))
print('moved',bid,'into',into)
