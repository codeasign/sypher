import { prisma } from '../lib/prisma';
import type { CodingProblem } from '@prisma/client';

export interface CodingProblemSummary {
  id: string;
  slug: string;
  category: string;
  categoryLabel: string;
  title: string;
  difficulty: string;
  orderIndex: number;
}

export interface CodingProblemDetail {
  id: string;
  slug: string;
  category: string;
  categoryLabel: string;
  title: string;
  difficulty: string;
  bodyMd: string;
  timeLimitSeconds: number;
  memoryLimitKb: number;
  defaultLanguage: string;
  starterCode: Record<string, string>;
  harness: Record<string, string>;
  sampleTestCases: { stdin: string; expectedOutput: string }[];
  testCaseCount: number;
  solutionsMd: Record<string, string>;
}

function toSummary(p: CodingProblem): CodingProblemSummary {
  return {
    id: p.id,
    slug: p.slug,
    category: p.category,
    categoryLabel: p.categoryLabel,
    title: p.title,
    difficulty: p.difficulty,
    orderIndex: p.orderIndex,
  };
}

export class CodingProblemRepository {
  async listSummaries(): Promise<CodingProblemSummary[]> {
    const rows = await prisma.codingProblem.findMany({
      orderBy: [{ category: 'asc' }, { orderIndex: 'asc' }, { title: 'asc' }],
    });
    return rows.map(toSummary);
  }

  async findBySlug(slug: string): Promise<CodingProblemDetail | null> {
    const p = await prisma.codingProblem.findUnique({ where: { slug } });
    if (!p) return null;
    const testCases = p.testCases as unknown as { stdin: string; expectedOutput: string; isSample: boolean }[];
    return {
      id: p.id,
      slug: p.slug,
      category: p.category,
      categoryLabel: p.categoryLabel,
      title: p.title,
      difficulty: p.difficulty,
      bodyMd: p.bodyMd,
      timeLimitSeconds: p.timeLimitSeconds,
      memoryLimitKb: p.memoryLimitKb,
      defaultLanguage: p.defaultLanguage,
      starterCode: p.starterCode as unknown as Record<string, string>,
      harness: p.harness as unknown as Record<string, string>,
      // Only sample test cases ship to the client — the full set (used for
      // Submit grading) stays server-side in findAllTestCasesById below.
      sampleTestCases: testCases.filter((tc) => tc.isSample).map((tc) => ({ stdin: tc.stdin, expectedOutput: tc.expectedOutput })),
      testCaseCount: testCases.length,
      solutionsMd: p.solutionsMd as unknown as Record<string, string>,
    };
  }

  // Judge0Controller's single source of truth for a run/submit/custom
  // request — test cases AND limits are always resolved from here by id,
  // never accepted from the client body (see Judge0Controller's header
  // comment for why that's a deliberate change from the original apps/app
  // design).
  async findExecutionContextById(
    id: string,
  ): Promise<{ timeLimitSeconds: number; memoryLimitKb: number; testCases: { stdin: string; expectedOutput: string; isSample: boolean }[] } | null> {
    const p = await prisma.codingProblem.findUnique({
      where: { id },
      select: { timeLimitSeconds: true, memoryLimitKb: true, testCases: true },
    });
    if (!p) return null;
    return {
      timeLimitSeconds: p.timeLimitSeconds,
      memoryLimitKb: p.memoryLimitKb,
      testCases: p.testCases as unknown as { stdin: string; expectedOutput: string; isSample: boolean }[],
    };
  }
}
