import fs from 'fs';
const content = fs.readFileSync('D:/jenny/sypher/docs/system-design-fundamentals/why-system-design-matters/03-architecture.mdx', 'utf8');

// Find the first opening `{` after architecture-production tag
const idx = content.indexOf('architecture-production');
const tagEndIdx = content.indexOf('>', idx);
console.log('Tag character at', tagEndIdx, ':', JSON.stringify(content[tagEndIdx]));

const afterTag = content.substring(tagEndIdx + 1, tagEndIdx + 10);
console.log('After tag raw:', JSON.stringify(afterTag));
for (let i = 0; i < afterTag.length; i++) {
  console.log('  char', i, ': code=' + afterTag.charCodeAt(i), 'hex=0x' + afterTag.charCodeAt(i).toString(16), JSON.stringify(afterTag[i]));
}

// Also find the brace `{` after the tag
const braceIdx = content.indexOf('{', tagEndIdx);
console.log('\nBrace at', braceIdx, ': char=', JSON.stringify(content[braceIdx]));
const afterBrace = content.substring(braceIdx, braceIdx + 5);
console.log('After brace:', JSON.stringify(afterBrace));
for (let i = 0; i < afterBrace.length; i++) {
  console.log('  char', i, ': code=' + afterBrace.charCodeAt(i), 'hex=0x' + afterBrace.charCodeAt(i).toString(16), JSON.stringify(afterBrace[i]));
}