// One-off cleanup for CodingProblem.bodyMd (2026-09-18): migrated exercise
// content used "## Example N" (or "### Example N") as a real heading —
// visually too heavy/structural for what's just a labeled sub-block within
// the problem statement. Demotes it to a bold inline label ("**Example
// N**") instead, matching how "**Input:**"/"**Output:**" already render
// inside the same block. Idempotent — safe to re-run.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXAMPLE_HEADING_RE = /^#{2,4}\s*(Example\s*\d+)\s*$/im;

function demoteExampleHeadings(md: string): string {
  let result = md;
  let prev: string;
  do {
    prev = result;
    result = result.replace(EXAMPLE_HEADING_RE, (_match, label: string) => `**${label}**`);
  } while (result !== prev);
  return result;
}

async function main(): Promise<void> {
  const rows = await prisma.codingProblem.findMany({ select: { id: true, bodyMd: true } });
  let changed = 0;
  for (const row of rows) {
    const before = row.bodyMd;
    const after = demoteExampleHeadings(before);
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
