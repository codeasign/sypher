import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dirs = [
  'what-is-mcp',
  'using-existing-mcp-servers',
  'building-your-first-mcp-server',
  'exposing-tools-and-resources-via-mcp',
  'connecting-your-mcp-server-to-claude',
];
const base = 'docs/ai-engineering-hands-on';

let totalMojibake = 0;
let totalA5 = 0;
let totalEmptyAD = 0;
let totalEmptyCB = 0;
let totalChildrenE = 0;
let totalBareBraces = 0;

dirs.forEach((dir) => {
  const files = readdirSync(join(base, dir)).filter((f) => f.endsWith('.mdx'));
  files.forEach((f) => {
    const fp = join(base, dir, f);
    const c = readFileSync(fp, 'utf8');
    const lines = c.split('\n');

    // Defect A — mojibake
    const mojibake = (c.match(/â[”•–†]|Ã¢|Ãƒ|Ã‚/g) || []).length;

    // Defect A5 — alt/caption after template literal close
    const a5 = (c.match(/\`}\"\s*alt=/g) || []).length;

    // Defect B — empty AsciiDiagram content
    const emptyAD = (c.match(/content=\{``\s*``\}/g) || []).length;

    // Defect C — empty code blocks (two fences with only whitespace between)
    const emptyCB = (c.match(/```\s*\n\s*```/g) || []).length;

    // Defect E — children pattern (</AsciiDiagram> closing tag)
    const childrenE = (c.match(/<\/AsciiDiagram>/g) || []).length;

    // Defect A3 — bare braces outside code blocks (rough check)
    let inCode = false;
    let bareBraces = 0;
    lines.forEach((l) => {
      if (/^```/.test(l.trim())) {
        inCode = !inCode;
        return;
      }
      if (!inCode) {
        // Skip lines that are JSX (<AsciiDiagram ...> or similar)
        if (/^<\/?[A-Z]/.test(l.trim())) return;
        // Skip frontmatter
        if (l.trim() === '---') return;
        // Skip import lines
        if (/^import /.test(l.trim())) return;
        // Count standalone braces
        const inlineCodeStripped = l.replace(/`[^`]*`/g, '');
        const braces = (inlineCodeStripped.match(/[{}]/g) || []).length;
        if (braces > 0) {
          // Check if this is really a bare brace or part of a valid pattern
          // Valid patterns: {{ }} template, ${} interpolation, \{\} escapes
          const cleaned = inlineCodeStripped
            .replace(/\{\{/g, '')
            .replace(/\}\}/g, '')
            .replace(/\$\{/g, '')
            .replace(/\\\{/g, '')
            .replace(/\\\}/g, '');
          const remaining = (cleaned.match(/[{}]/g) || []).length;
          bareBraces += remaining;
        }
      }
    });

    totalMojibake += mojibake;
    totalA5 += a5;
    totalEmptyAD += emptyAD;
    totalEmptyCB += emptyCB;
    totalChildrenE += childrenE;
    totalBareBraces += bareBraces;

    if (mojibake || a5 || emptyAD || emptyCB || childrenE || bareBraces) {
      console.log(
        `${fp}: moji=${mojibake} a5=${a5} emptyAD=${emptyAD} emptyCB=${emptyCB} childrenE=${childrenE} braces=${bareBraces}`
      );
    }
  });
});

console.log('\n=== SUMMARY ===');
console.log(`A — mojibake: ${totalMojibake}`);
console.log(`A5 — alt/caption after template-close: ${totalA5}`);
console.log(`B — empty AsciiDiagrams: ${totalEmptyAD}`);
console.log(`C — empty code blocks: ${totalEmptyCB}`);
console.log(`E — AsciiDiagram children→content: ${totalChildrenE}`);
console.log(`A3 — bare braces in prose: ${totalBareBraces}`);