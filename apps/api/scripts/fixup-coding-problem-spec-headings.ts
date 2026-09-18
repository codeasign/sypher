// One-off cleanup for CodingProblem.bodyMd (2026-09-18): same treatment as
// fixup-coding-problem-example-headings.ts, extended to the other labeled
// sub-sections that don't need real-heading weight — "Input Specification",
// "Output Specification", "Constraints", "Hints". Demotes each from a "##"
// heading to a bold inline label. Idempotent — safe to re-run.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LABELS = ['Input Specification', 'Output Specification', 'Constraints', 'Hints'];
const HEADING_RE = new RegExp(`^#{2,4}\\s*(${LABELS.join('|')})\\s*$`, 'im');

function demoteHeadings(md: string): string {
  let result = md;
  let prev: string;
  do {
    prev = result;
    result = result.replace(HEADING_RE, (_match, label: string) => `**${label}**`);
  } while (result !== prev);
  return result;
}

async function main(): Promise<void> {
  const rows = await prisma.codingProblem.findMany({ select: { id: true, bodyMd: true } });
  let changed = 0;
  for (const row of rows) {
    const before = row.bodyMd;
    const after = demoteHeadings(before);
    if (after === before) continue;
    await prisma.codingProblem.update({ where: { id: row.id }, data: { bodyMd: after } });
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
