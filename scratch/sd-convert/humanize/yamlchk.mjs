import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/jenny/sypher/apps/docs/package.json');
let yaml; try { yaml = require('js-yaml'); } catch { yaml = require('yaml'); }
const parse = yaml.load || yaml.parse;
const R='D:/jenny/sypher/apps/docs/docs/system-design-fundamentals/';
const T='vertical-scaling horizontal-scaling stateless-vs-stateful replication sharding consistent-hashing cap-theorem distributed-counters distributed-ids leader-election pacelc consensus raft distributed-locks vector-clocks gossip-protocol split-brain'.split(' ');
let n=0,bad=0;
for(const t of T) for(const f of fs.readdirSync(R+t)) if(/\.mdx?$/.test(f)){
  const s=fs.readFileSync(R+t+'/'+f,'utf8').replace(/^\uFEFF/,'');
  const m=s.match(/^---\r?\n([\s\S]*?)\r?\n---/); n++;
  try{ if(!m) throw new Error('no frontmatter'); parse(m[1]); }catch(e){bad++;console.log('BAD',t,f,e.message.split('\n')[0]);}
}
console.log({files:n,bad});
