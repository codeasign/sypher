import fs from 'node:fs';
import crypto from 'node:crypto';
const names = fs.readFileSync('lists/fix2.txt', 'utf8').split('\n').filter(Boolean);
const m = JSON.parse(fs.readFileSync('D:/jenny/sypher/apps/docs/diagram-manifests/system-design-fundamentals.json', 'utf8'));
const arr = m.diagrams || m;
const out = [];
for (const n of names) {
  const f = 'system-design-fundamentals-' + n + '.mmd';
  const d = arr.find((x) => String(x.mmdFile).split('/').pop() === f);
  if (!d) { console.log('NO ID', n); continue; }
  const h = crypto.createHash('sha256').update(fs.readFileSync('D:/jenny/sypher/.cache/ascii-to-mermaid/' + f, 'utf8')).digest('hex').slice(0, 12);
  const svg = fs.existsSync('D:/jenny/sypher/apps/docs/static/img/diagrams/' + h + '.svg');
  console.log(d.id, d.mermaidSrc, '->', h, svg);
  out.push({ id: d.id, hash: h });
}
fs.writeFileSync('lists/fix2-map.json', JSON.stringify(out));
