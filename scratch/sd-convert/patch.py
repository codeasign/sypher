import re,sys
# usage: python3 patch.py bundle.txt name  < newbody   (replaces body of diagram `name`, prepends default init header unless body starts with %%)
p=sys.argv[1]; name=sys.argv[2]
body=sys.stdin.buffer.read().decode('utf-8').strip('\n')
H="%%{init: {'flowchart': {'subGraphTitleMargin': {'top': 4, 'bottom': 18}, 'nodeSpacing': 30, 'rankSpacing': 40, 'padding': 8, 'wrappingWidth': 260}}}%%"
if not body.startswith('%%'): body=H+'\n'+body
s=open(p,encoding='utf8').read()
pat=re.compile(r'(#### '+re.escape(name)+r'\n).*?(?=\n#### |\Z)', re.S)
if not pat.search(s): sys.exit('no such diagram '+name)
s=pat.sub(lambda m: m.group(1)+body+'\n', s)
open(p,'w',encoding='utf8').write(s)
