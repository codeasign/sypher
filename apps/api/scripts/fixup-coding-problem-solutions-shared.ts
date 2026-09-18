// One-off cleanup for CodingProblem.solutionsMd.shared, run after
// seed-coding-problems.ts (2026-09-17 migration): the mechanical migration
// left two bits of Docusaurus/MDX-only markup in the shared prose that a
// plain react-markdown renderer can't handle —
//   1. leading `import Tabs from '@theme/Tabs';` / `import TabItem ...`
//      lines (harmless in MDX, meaningless — and visible — as plain text)
//   2. `<AsciiDiagram mermaidSrc="..." id="..." content={`...`} .../>` JSX,
//      used for "trace" diagrams in Deep Dive sections — converted to a
//      plain fenced code block so the ASCII art itself still renders,
//      instead of dropping the content or leaving raw JSX in the page.
// Idempotent — safe to re-run; only touches rows that still match.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function stripImportLines(md: string): string {
  return md
    .split('\n')
    .filter((line) => !/^import\s+\w+\s+from\s+['"]@theme\//.test(line.trim()))
    .join('\n')
    .replace(/^\s+/, '');
}

// Matches `<AsciiDiagram ...content={`INNER`}.../>`, non-greedy on INNER,
// tolerant of other props before/after content in any order.
const ASCII_DIAGRAM_RE = /<AsciiDiagram\b[\s\S]*?content=\{`([\s\S]*?)`\}[\s\S]*?\/>/g;

function replaceAsciiDiagrams(md: string): string {
  return md.replace(ASCII_DIAGRAM_RE, (_match, inner: string) => {
    const trimmed = inner.replace(/^\n/, '').replace(/\n\s*$/, '');
    return '```text\n' + trimmed + '\n```';
  });
}

async function main(): Promise<void> {
  const rows = await prisma.codingProblem.findMany({ select: { id: true, solutionsMd: true } });
  let changed = 0;
  for (const row of rows) {
    const solutionsMd = row.solutionsMd as Record<string, string>;
    if (typeof solutionsMd.shared !== 'string') continue;
    const before = solutionsMd.shared;
    const after = replaceAsciiDiagrams(stripImportLines(before));
    if (after === before) continue;
    await prisma.codingProblem.update({
      where: { id: row.id },
      data: { solutionsMd: { ...solutionsMd, shared: after } },
    });
    changed++;
  }
  console.log(`Cleaned ${changed}/${rows.length} rows`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
