import fs from 'fs';

// 1. Fix api-security/03-architecture.mdx - check for escaped backticks
let c = fs.readFileSync('docs/system-design-fundamentals/api-security/03-architecture.mdx', 'utf8');
let idx = -1;
let found = 0;
// Check for the actual escaped backtick pattern (backslash followed by backtick)
// In the file, this would be: \`  (backslash + backtick)
while ((idx = c.indexOf('\\`', idx+1)) !== -1) {
  found++;
  console.log('  api-security/03-architecture: escaped backtick at', idx);
}
console.log('api-security/03-architecture: escaped backticks =', found);

// 2. Fix api-security/07-challenge.mdx - unmatched brace
c = fs.readFileSync('docs/system-design-fundamentals/api-security/07-challenge.mdx', 'utf8');
let open = 0;
let inCode = false;
let lastOpenLine = 0;
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '`') { inCode = !inCode; continue; }
    if (inCode) continue;
    if (line[j] === '{') { open++; lastOpenLine = i+1; }
    if (line[j] === '}') { open--; }
  }
}
console.log('api-security/07-challenge: unmatched braces =', open, 'last open at line', lastOpenLine);
if (lastOpenLine > 0) {
  console.log('  Around last open line:', lines[lastOpenLine-1].trim().substring(0, 100));
}

// 3. Fix secrets-management/07-challenge.mdx - stray quote
c = fs.readFileSync('docs/system-design-fundamentals/secrets-management/07-challenge.mdx', 'utf8');
// Find lines with =\" that might be outside code blocks
let pos = 0;
while ((pos = c.indexOf('="', pos)) !== -1) {
  console.log('secrets-management/07-challenge: =" at', pos, ':', c.substring(Math.max(0,pos-30), pos+40));
  pos++;
}

// 4. Check api-security/03-architecture for the acorn issue
// Look for the pattern: content={` that might have a corrupted backtick
c = fs.readFileSync('docs/system-design-fundamentals/api-security/03-architecture.mdx', 'utf8');
// Check for malformed template literal openings
const openingMatches = c.match(/content=\{\`/g);
console.log('api-security/03-architecture: content={\` count =', openingMatches ? openingMatches.length : 0);
const closingMatches = c.match(/\`\}/g);
console.log('api-security/03-architecture: \`} count =', closingMatches ? closingMatches.length : 0);
const selfClosingMatches = c.match(/\`\}\s*\/>/g);
console.log('api-security/03-architecture: \`} /> count =', selfClosingMatches ? selfClosingMatches.length : 0);