import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync('D:/jenny/sypher/apps/docs/diagram-manifests/system-design-fundamentals.json', 'utf8'));
const arr = m.diagrams || m;
const T = 'vertical-scaling horizontal-scaling stateless-vs-stateful replication sharding consistent-hashing cap-theorem distributed-counters distributed-ids leader-election pacelc consensus raft distributed-locks vector-clocks gossip-protocol split-brain'.split(' ');
const files = []; const svgs = []; const norm = (s) => String(s || '').split(String.fromCharCode(92)).join('/');
let sample = null;
for (const d of arr) {
  const t = norm(d.file).split('/').find((p, i, a) => a[i - 1] === 'system-design-fundamentals');
  if (!T.includes(t)) continue;
  if (!sample) sample = d;
  files.push(norm(d.mmdFile));
}
console.log(files.length, JSON.stringify(sample).slice(0, 400));
fs.writeFileSync('lists/all503.list', files.join('\n'));
