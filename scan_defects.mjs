import fs from 'fs';
import path from 'path';

function scanDir(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) scanDir(full, results);
    else if (e.isFile() && e.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
}

const files = [];
scanDir('docs/system-design-fundamentals', files);

console.log('Total .mdx files:', files.length);
console.log('');

const findings = [];

for (const f of files) {
  const buf = fs.readFileSync(f);
  const content = buf.toString('utf8');
  const lines = content.split('\n');
  const fileDefects = [];

  // Defect A: Mojibake in diagrams
  // Look for content= backtick blocks with mojibake
  const diagRegex = /content=\{\`[\s\S]*?\`\}/g;
  let diagMatch;
  let diagramMojibakeCount = 0;
  while ((diagMatch = diagRegex.exec(content)) !== null) {
    const inner = diagMatch[0];
    // Check for corrupted box-drawing / mojibake
    if (/[\\x80-\\x9fâ¢¬š]/.test(inner)) {
      diagramMojibakeCount++;
    }
    // Check for the telltale ?" or ?~ or ??? sequences from corruption
    if (/\?[\"~]{2,}/.test(inner) || /\?[\s,?]{3,}/.test(inner)) {
      diagramMojibakeCount++;
    }
  }

  if (diagramMojibakeCount > 0) {
    const line = content.indexOf('AsciiDiagram') !== -1 ?
      content.substring(0, content.indexOf('AsciiDiagram')).split('\n').length : 0;
    fileDefects.push({
      type: 'A',
      detail: `mojibake in ${diagramMojibakeCount} diagram(s)`,
      line,
      severity: 'Needs Regeneration'
    });
  }

  // Defect B: Empty diagrams
  const diagBlocks = content.match(/<AsciiDiagram[\s\S]*?content=\{\`[\s\S]*?\`\}\/>/g) || [];
  let emptyCount = 0;
  for (const block of diagBlocks) {
    const innerMatch = block.match(/content=\{\`([\s\S]*?)\`\}/);
    if (innerMatch) {
      const stripped = innerMatch[1].trim();
      if (stripped.length < 20) emptyCount++;
    }
  }
  if (emptyCount > 0) {
    fileDefects.push({ type: 'B', detail: `${emptyCount} empty diagram(s)`, line: 0, severity: 'Needs Regeneration' });
  }

  // Defect C: Code block issues
  const fenceCount = (content.match(/\`\`\`/g) || []).length;
  if (fenceCount % 2 !== 0) {
    fileDefects.push({ type: 'C', detail: 'unclosed code fence', line: 0, severity: 'Recoverable' });
  }
  const emptyFenceMatch = content.match(/\`\`\`[a-z]*\n\s*\`\`\`/g);
  if (emptyFenceMatch && emptyFenceMatch.length > 0) {
    fileDefects.push({ type: 'C', detail: `${emptyFenceMatch.length} empty code block(s)`, line: 0, severity: 'Deletable' });
  }

  if (fileDefects.length > 0) {
    const short = f.replace('docs/system-design-fundamentals/', '');
    console.log(short);
    for (const d of fileDefects) {
      console.log(`  ${d.type} — ${d.detail} | ${d.severity}`);
    }
    findings.push({ file: short, defects: fileDefects });
  }
}

console.log('');
console.log('=== SUMMARY ===');
console.log('Files scanned:', files.length);
const aCount = findings.reduce((s, f) => s + f.defects.filter(d => d.type === 'A').length, 0);
const bCount = findings.reduce((s, f) => s + f.defects.filter(d => d.type === 'B').length, 0);
const cCount = findings.reduce((s, f) => s + f.defects.filter(d => d.type === 'C').length, 0);
console.log('A — mojibake in diagrams:', aCount);
console.log('B — empty diagrams:', bCount);
console.log('C — code block issues:', cCount);
console.log('Files with defects:', findings.length);

// Save for reference
fs.writeFileSync('scan-defects.json', JSON.stringify(findings, null, 2));