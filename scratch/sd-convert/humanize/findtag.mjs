import fs from 'node:fs';
import path from 'node:path';
const T = 'vertical-scaling horizontal-scaling stateless-vs-stateful replication sharding consistent-hashing cap-theorem distributed-counters distributed-ids leader-election pacelc consensus raft distributed-locks vector-clocks gossip-protocol split-brain'.split(' ');
const root = 'D:/jenny/sypher/apps/docs/docs/system-design-fundamentals/';
for (const t of T) {
  for (const f of fs.readdirSync(root + t)) {
    if (!/\.mdx?$/.test(f)) continue;
    const source = fs.readFileSync(root + t + '/' + f, 'utf8');
    let i = 0;
    while (true) {
      const start = source.indexOf('<AsciiDiagram', i);
      if (start === -1) break;
      let j = start, inB = false, end = -1;
      while (j < source.length) {
        const ch = source[j];
        if (ch === '`') { inB = !inB; j++; continue; }
        if (!inB && ch === '/' && source[j + 1] === '>') { end = j + 2; break; }
        if (!inB && source.startsWith('</AsciiDiagram>', j)) { end = j + 15; break; }
        j++;
      }
      if (end === -1) { console.log('UNTERMINATED', t + '/' + f, 'offset', start, source.slice(start, start + 120).split('\n').join(' ')); break; }
      // odd backtick count check within the tag
      const txt = source.slice(start, end);
      const bt = (txt.match(/`/g) || []).length;
      if (bt % 2) console.log('ODD-BACKTICKS', t + '/' + f, start);
      i = end;
    }
  }
}
