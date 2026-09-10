const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
let checked = 0;
const fixes = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(file); continue; }
    if (!/\.mdx?$/.test(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    checked++;
    try { matter(raw); } catch (error) {
      const fm = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
      if (!fm) throw error;
      let fixed = raw;
      for (const scalar of fm[1].matchAll(/^(title|sidebar_label): (.+)$/gm)) {
        if (/^["']/.test(scalar[2]) || !scalar[2].includes(': ')) continue;
        const before = scalar[0].trimEnd();
        const after = scalar[1] + ': ' + JSON.stringify(scalar[2].trimEnd());
        fixed = fixed.replace(before, after);
        fixes.push({ file: path.relative(process.cwd(), file).replace(/\\/g, '/'), before, after });
      }
      matter(fixed);
    }
  }
}
for (const slug of ['agentic-ai-fundamentals', 'git-github-actions']) walk(path.resolve('apps/docs/docs', slug));
console.log(JSON.stringify({ checked, fixes }));
