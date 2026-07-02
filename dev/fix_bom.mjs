import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = 'D:/jenny/sypher/docs/system-design-fundamentals';

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectFiles(full));
    else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) results.push(full);
  }
  return results;
}

const files = collectFiles(ROOT);
let fixed = 0;

for (const f of files) {
  const buf = readFileSync(f);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    const clean = buf.slice(3);
    writeFileSync(f, clean);
    fixed++;
    console.log('Fixed: ' + relative(ROOT, f));
  }
}

console.log(`\nTotal BOM-fixed files: ${fixed}`);