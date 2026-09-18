// One-off cleanup for CodingProblem.solutionsMd.shared (2026-09-18): the
// mechanical migration left a trailing "## Back to Problem" section with a
// dead relative link (`../../exercises/easy/two-sum`) pointing at the old
// apps/docs Docusaurus exercise page — meaningless now that apps/web has
// its own real "Back to Coding Problems" link on the detail page.
// Idempotent — safe to re-run; only touches rows that still match.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Strips from the "## Back to Problem" heading to the end of the string
// (it's always the last section — verified against the migration script's
// output shape), tolerant of the CRLF line endings the migration kept.
const BACK_LINK_SECTION_RE = /\r?\n##\s*Back to Problem[\s\S]*$/;

function stripBackLinkSection(md: string): string {
  return md.replace(BACK_LINK_SECTION_RE, '').replace(/\s+$/, '');
}

async function main(): Promise<void> {
  const rows = await prisma.codingProblem.findMany({ select: { id: true, solutionsMd: true } });
  let changed = 0;
  for (const row of rows) {
    const solutionsMd = row.solutionsMd as Record<string, string>;
    if (typeof solutionsMd.shared !== 'string') continue;
    const before = solutionsMd.shared;
    const after = stripBackLinkSection(before);
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
