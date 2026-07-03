# Fix bare `>=` / `<=` in MDX prose

MDX interprets bare `>` and `<` characters as JSX tag delimiters, even when they appear as part of `>=` or `<=` in prose text. This causes:
```
Unexpected character `=` (U+003D) before name, expected a character that can start a name
```
at the line containing the operator.

## Detect

```bash
node -e "
const fs = require('fs');
const path = require('path');
const root = 'docs/ai-engineering-hands-on';
let found = 0;
function walk(dir) {
  fs.readdirSync(dir, {withFileTypes: true}).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.mdx')) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      let inCode = false;
      lines.forEach((line, i) => {
        if (line.trimStart().startsWith('\`\`\`')) { inCode = !inCode; return; }
        if (inCode) return;
        // Check for bare >= or <= outside code blocks
        const m = line.match(/(?<!\w)(>=|<=)(?!\w)/);
        if (m && !line.includes('\`') && !line.match(/^\s*[│┌└├]/)) {
          console.log(p + ':' + (i+1) + ': ' + line.trim().substring(0, 80));
          found++;
        }
      });
    }
  });
}
walk(root);
if (found === 0) console.log('No bare operators found.');
"
```

## Fix

Wrap each bare `>=` or `<=` in prose with backtick code spans.

```bash
node -e "
const fs = require('fs');
const path = require('path');
const root = 'docs/ai-engineering-hands-on';
function walk(dir) {
  fs.readdirSync(dir, {withFileTypes: true}).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.mdx')) {
      let c = fs.readFileSync(p, 'utf8');
      const o = c;
      let inCode = false;
      const lines = c.split('\n');
      const newLines = lines.map(line => {
        if (line.trimStart().startsWith('\`\`\`')) { inCode = !inCode; return line; }
        if (inCode) return line;
        if (line.match(/^\s*[│┌└├]/)) return line; // diagram art
        // Replace bare >= and <= that aren't already in backticks
        let l = line;
        l = l.replace(/(?<!\`)(?<![\w])(>=)(?![\w])(?!\`)/g, '\`\$1\`');
        l = l.replace(/(?<!\`)(?<![\w])(<=)(?![\w])(?!\`)/g, '\`\$1\`');
        return l;
      });
      c = newLines.join('\n');
      if (c !== o) { fs.writeFileSync(p, c, 'utf8'); console.log('Fixed: ' + p); }
    }
  });
}
walk(root);
console.log('Done');
"
```