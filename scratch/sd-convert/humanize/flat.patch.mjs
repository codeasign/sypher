import fs from 'node:fs';
let s = fs.readFileSync('split.mjs', 'utf8');
const marker = "function steps(id, per, dir, rows) {";
const flat = `function stepsFlat(id, per, rows) {
  const nodes = rows.map(([t, b, a], i) => {
    const box = b.split(' >> ').map((x) => '[' + x.split(';;').map((y) => y.trim()).join(' ') + ']').join(' ──> ');
    const al = a ? a.split(';;').map((y) => y.trim()) : [];
    const parts = ['<b>' + escT(t) + '</b>', escT(box)];
    if (al.length) { parts.push('──&gt; ' + escT(al[0])); for (const x of al.slice(1)) parts.push('&nbsp;&nbsp;&nbsp;' + escT(x)); }
    return id + i + '["<div style=\'text-align:left\'>' + parts.join('<br/>') + '</div>"]';
  });
  let out = ''; const rowsN = Math.ceil(rows.length / per);
  for (let r = 0; r < rowsN; r++) {
    out += 'subgraph ' + id + 'R' + r + '[" "]' + NL + '  direction LR' + NL;
    for (let i = r * per; i < Math.min(rows.length, r * per + per); i++) out += '  ' + nodes[i] + NL;
    for (let i = r * per + 1; i < Math.min(rows.length, r * per + per); i++) out += '  ' + id + (i - 1) + ' --> ' + id + i + NL;
    out += 'end' + NL;
  }
  for (let r = 1; r < rowsN; r++) out += id + 'R' + (r - 1) + ' --> ' + id + 'R' + r + NL;
  return out.trimEnd();
}
`;
s = s.replace(marker, flat + marker);
s = s.replace("const m = /^@STEPS (\S+) per=(\d+)(?: dir=(TB|LR))?\s*$/.exec(lines[k]);", "const m = /^@STEPS (\S+) per=(\d+)(?: dir=(TB|LR))?( flat)?\s*$/.exec(lines[k]);");
s = s.replace("outL.push(steps(m[1], Number(m[2]), m[3] || 'TB', rows));", "outL.push(m[4] ? stepsFlat(m[1], Number(m[2]), rows) : steps(m[1], Number(m[2]), m[3] || 'TB', rows));");
fs.writeFileSync('split.mjs', s);
