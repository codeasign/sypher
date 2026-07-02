import fs from 'fs';
const content = fs.readFileSync('docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx', 'utf8');
// Extract lines that are NOT diagram content - clean text lines
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  // Skip diagram content lines (they have obelisk chars, mojibake, or diagram structure)
  if (l.includes('content={`') || l.includes('`}/>') || l.includes('id=')) continue;
  if (l.match(/^[─░█\[\]#]/)) continue; // diagram content
  if (l.includes('????') || l.includes('~??')) continue;
  if (l.trim() && l.trim().length > 10) {
    // Check if it's clean readable text
    const clean = l.replace(/[^a-zA-Z0-9 .,;:!?'"()\-]/g, '').trim();
    if (clean.length > 15) console.log(i + ': ' + clean.substring(0, 130));
  }
}