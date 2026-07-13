import fs from 'fs';

// Fix 1: api-security/03-architecture.mdx - escaped backticks
let c = fs.readFileSync('docs/system-design-fundamentals/api-security/03-architecture.mdx', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('docs/system-design-fundamentals/api-security/03-architecture.mdx', c, 'utf8');
console.log('Fixed api-security/03-architecture: removed escaped backticks');

// Fix 2: api-security/07-challenge.mdx - check if build error remains
c = fs.readFileSync('docs/system-design-fundamentals/api-security/07-challenge.mdx', 'utf8');
// Look for stray { } outside code blocks
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  // Check for bare { outside template literals and code blocks
  if (lines[i].includes('{') && !lines[i].includes('content={`') && !lines[i].includes('`') && !lines[i].includes('import ')) {
    // Check if it's a valid brace pair
    if ((lines[i].match(/\{/g) || []).length !== (lines[i].match(/\}/g) || []).length) {
      console.log('api-security/07-challenge L' + (i+1) + ': unbalanced braces in: ' + lines[i].trim().substring(0, 120));
    }
  }
}

// Fix 3: secrets-management/07-challenge.mdx - stray quote
c = fs.readFileSync('docs/system-design-fundamentals/secrets-management/07-challenge.mdx', 'utf8');
// Look for lines where a quote might be misinterpreted as a JSX attribute
lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  // Check for <something followed by =" without a closing tag
  if (lines[i].includes('<') && lines[i].includes('="') && !lines[i].includes('<AsciiDiagram') && !lines[i].includes('<details') && !lines[i].includes('<summary')) {
    console.log('secrets-management/07-challenge L' + (i+1) + ': ' + lines[i].trim().substring(0, 120));
  }
}