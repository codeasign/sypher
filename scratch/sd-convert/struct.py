import sys,re
for n in sys.argv[1:]:
    t=open(f'D:/jenny/sypher/.cache/ascii-to-mermaid/system-design-fundamentals-{n}.mmd',encoding='utf8').read().split('\n')
    print('==',n)
    d=0
    for l in t:
        if re.match(r'\s*subgraph',l):
            m=re.match(r'\s*subgraph (\w+)\["?([^"\]]*)',l); print('  '*d+'SG',m.group(1),(m.group(2) or '')[:30]); d+=1
        elif re.match(r'\s*end\s*$',l): d-=1
        elif re.match(r'\s*direction',l): print('  '*d+'  dir',l.strip().split()[1])
        elif d<=3 and re.search(r'(-->|~~~|---)',l) and not l.strip().startswith(('a','b')) : print('  '*d+'  E',l.strip()[:60])
