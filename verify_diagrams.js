const fs = require('fs');
const dirs = ['docker','kubernetes','autoscaling','infrastructure-as-code','serverless','deployment-strategies','disaster-recovery','multi-region'];
const bt = String.fromCharCode(96);

for (const d of dirs) {
  let totalOpen = 0, totalContent = 0, totalClose = 0;
  const files = fs.readdirSync('docs/system-design-fundamentals/'+d).filter(f => f.endsWith('.mdx'));
  for (const f of files) {
    const c = fs.readFileSync('docs/system-design-fundamentals/'+d+'/'+f,'utf-8');
    const openRe = /<AsciiDiagram/g;
    const contentRe = /content=\{/g;
    const closeRe = new RegExp('<\\/AsciiDiagram>','g');
    totalOpen += (c.match(openRe)||[]).length;
    totalContent += (c.match(contentRe)||[]).length;
    totalClose += (c.match(closeRe)||[]).length;
  }
  const status = (totalOpen === totalContent && totalClose === 0) ? 'CORRECT' : 'NEEDS FIX';
  console.log(d + ': Open=' + totalOpen + ' Content={' + totalContent + ' </Ascii>=' + totalClose + ' [' + status + ']');
}