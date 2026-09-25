import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync('D:/jenny/sypher/apps/docs/diagram-manifests/system-design-fundamentals.json', 'utf8'));
const arr = m.diagrams || m;
const T = process.argv.slice(2);
let n = 0, c = 0, w = 0, hv = 0, mm = 0;
for (const d of arr) {
  const t = d.file.replace(/\\/g, '/').split('/').find((p, i, a) => a[i - 1] === 'system-design-fundamentals');
  if (!T.includes(t)) continue;
  n++; if (d.converted) c++; if (d.mermaidSrcWiredIn) w++; if (d.hashVerified === true) hv++; if (d.hashVerified === false) mm++;
}
console.log({ n, converted: c, wired: w, hashVerified: hv, hashMismatch: mm });
