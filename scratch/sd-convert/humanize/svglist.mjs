import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync('D:/jenny/sypher/apps/docs/diagram-manifests/system-design-fundamentals.json', 'utf8'));
const arr = m.diagrams || m;
const T = new Set('vertical-scaling horizontal-scaling stateless-vs-stateful replication sharding consistent-hashing cap-theorem distributed-counters distributed-ids leader-election pacelc consensus raft distributed-locks vector-clocks gossip-protocol split-brain'.split(' '));
const norm = (s) => String(s).split(String.fromCharCode(92)).join('/');
const svgs = new Set();
for (const d of arr) {
  const t = norm(d.file).split('/').find((p, i, a) => a[i - 1] === 'system-design-fundamentals');
  if (!T.has(t)) continue;
  svgs.add('apps/docs/static/img/diagrams/' + d.mermaidSrc.split('/').pop());
}
fs.writeFileSync('lists/svgs.txt', [...svgs].join('\n'));
console.log(svgs.size);
