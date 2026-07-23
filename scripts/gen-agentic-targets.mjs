import fs from 'node:fs';
import path from 'node:path';

const dir = 'apps/docs/docs/agentic-ai-fundamentals';
const files = fs.readdirSync(dir, { recursive: true })
  .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
  .map(f => path.join(dir, f).split(path.sep).join('/'))
  .filter(f => {
    const c = fs.readFileSync(f, 'utf8');
    return c.includes('<AsciiDiagram') && !c.includes('mermaidSrc=');
  });

const targets = files.map(f => {
  const rel = f.replace(dir + '/', '').replace(/\.mdx$|\.md$/, '');
  const slug = 'agentic-ai-fundamentals-' + rel.replace(/\/overview$/, '').split('/').join('-') + '-1';
  return { file: f, slug };
});

fs.writeFileSync('scripts/agentic-course-targets.json', JSON.stringify(targets, null, 2));
console.log('wrote', targets.length, 'targets');
console.log(targets.slice(0, 3));
