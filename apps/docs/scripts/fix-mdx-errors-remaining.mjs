#!/usr/bin/env node
import fs from 'fs';

let fixed = 0;

// Fix 1: corrupted closing tag `{" /> → `} />
const files1 = [
  'docs/system-design-fundamentals/ai-observability/01-concepts.mdx',
  'docs/system-design-fundamentals/ai-observability/02-deep-dive.mdx',
  'docs/system-design-fundamentals/ai-observability/03-architecture.mdx',
  'docs/system-design-fundamentals/ai-observability/04-tradeoffs.mdx',
  'docs/system-design-fundamentals/ai-observability/05-real-world.mdx',
  'docs/system-design-fundamentals/model-routing/01-concepts.mdx'
];

for (const fp of files1) {
  let content = fs.readFileSync(fp, 'utf8');
  let orig = content;
  content = content.replace(/`{" \/>/g, '`} />');
  if (content !== orig) {
    fs.writeFileSync(fp, content, 'utf8');
    const count = (orig.match(/`{" \/>/g) || []).length;
    console.log(`FIXED ${fp.split('/').pop()} (${count} closing tag(s))`);
    fixed++;
  }
}

// Fix 2: Add missing closing fence in ai-agent-architecture/02-deep-dive.mdx
const fp2 = 'docs/system-design-fundamentals/ai-agent-architecture/02-deep-dive.mdx';
let content2 = fs.readFileSync(fp2, 'utf8');
let orig2 = content2;
content2 = content2.replace(
  /^  }\n\n  The tool registry also includes/m,
  '  }\n\n```\n\nThe tool registry also includes'
);
if (content2 !== orig2) {
  fs.writeFileSync(fp2, content2, 'utf8');
  console.log('FIXED ai-agent-architecture/02-deep-dive.mdx (missing closing fence)');
  fixed++;
}

// Fix 3: vector-databases/07-challenge.mdx - bare braces in prose
const fp3 = 'docs/system-design-fundamentals/vector-databases/07-challenge.mdx';
let content3 = fs.readFileSync(fp3, 'utf8');
let orig3 = content3;
// Wrap the JS-like object literal in inline code backticks
content3 = content3.replace(
  /filters: \{ max_price: 200, category: "electronics" \} and sends/,
  'filters: `{ max_price: 200, category: "electronics" }` and sends'
);
if (content3 !== orig3) {
  fs.writeFileSync(fp3, content3, 'utf8');
  console.log('FIXED vector-databases/07-challenge.mdx (bare braces in prose)');
  fixed++;
}

console.log(`\nAll fixes applied. ${fixed} file(s) modified.`);