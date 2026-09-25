import fs from 'node:fs';
const [bundle, topic] = process.argv.slice(2);
const w = fs.readFileSync(`work/${topic}.txt`,'utf8').split('\n');
for (const l of fs.readFileSync(`bundles/${bundle}.txt`,'utf8').split('\n')) {
  const m = /@SRC (\S+) (\d+)-(\d+)/.exec(l); if (!m) continue;
  const a=+m[2], b=+m[3];
  const show = (n)=> (w[n-1]||'').replace(/\s+$/,'');
  console.log(`== ${m[1]} ${a}-${b}`);
  console.log('  prev:', show(a-1)); console.log('  first:', show(a)); console.log('  last:', show(b)); console.log('  next:', show(b+1));
}
