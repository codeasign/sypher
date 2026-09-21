import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('D:/jenny/sypher/apps/docs/package.json');
const { compile } = require('@mdx-js/mdx');
const ROOT = 'D:/jenny/sypher/apps/docs/docs/system-design-fundamentals/';
const T = process.argv.slice(2);
let ok = 0, bad = 0;
for (const t of T) {
  const dir = ROOT + t;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.mdx?$/.test(f)) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    try { await compile(src, { format: f.endsWith('.md') ? 'md' : 'mdx' }); ok++; }
    catch (e) { bad++; console.log('FAIL', t + '/' + f, String(e.message).split('\n')[0].slice(0, 200)); }
  }
}
console.log({ ok, bad });
// svg entity check: referenced SVGs of these topics must not contain literal &quot;/&lt; artefacts in text
