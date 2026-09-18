// One-off cleanup for CodingProblem.solutionsMd.shared (2026-09-18): the
// mechanical migration left a stray empty "## Code" heading where the
// per-language Tabs code block used to sit before it was split out into
// the per-language keys — the heading itself was never stripped, only its
// content. Code now lives entirely on the separate Code tab (see
// CodingProblemDetail), so this heading is dead weight in the middle of
// the writeup. Idempotent — safe to re-run; only touches rows that still
// match.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Matches a "## Code" (any heading level) line followed by nothing but
// blank lines before the next heading/EOF — i.e. only the empty stray
// heading, never a real "## Code" section that has actual content under it.
const EMPTY_CODE_HEADING_RE = /\r?\n##+\s*Code\s*\r?\n(?:\s*\r?\n)*(?=##+\s|\r?\n*$)/i;

function stripEmptyCodeHeading(md: string): string {
  let result = md;
  let prev: string;
  do {
    prev = result;
    result = result.replace(EMPTY_CODE_HEADING_RE, '\n');
  } while (result !== prev);
  return result;
}

async function main(): Promise<void> {
  const rows = await prisma.codingProblem.findMany({ select: { id: true, solutionsMd: true } });
  let changed = 0;
  for (const row of rows) {
    const solutionsMd = row.solutionsMd as Record<string, string>;
    if (typeof solutionsMd.shared !== 'string') continue;
    const before = solutionsMd.shared;
    const after = stripEmptyCodeHeading(before);
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
