import { prisma } from '../lib/prisma';
import type { MockExam, MockExamQuestion } from '@prisma/client';

// Per-difficulty draw counts for one attempt. Derived from the exam's bank
// sizes and liveQuestionCount — see computeDrawSplit.
export interface DrawSplit {
  easy: number;
  medium: number;
  hard: number;
}

export interface MockExamPage {
  exams: MockExam[];
  total: number;
}

export class MockExamRepository {
  async listPublished(): Promise<MockExam[]> {
    return prisma.mockExam.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' } });
  }

  // Same pagination shape as BlogPostRepository.listPublishedPage, for the
  // /mock-tests card/list toggle + "Show more" — id as tiebreaker so paging
  // stays stable even if several exams share a createdAt.
  async listPublishedPage(limit: number, offset: number): Promise<MockExamPage> {
    const [exams, total] = await Promise.all([
      prisma.mockExam.findMany({
        where: { isPublished: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.mockExam.count({ where: { isPublished: true } }),
    ]);
    return { exams, total };
  }

  async findById(id: string): Promise<MockExam | null> {
    return prisma.mockExam.findUnique({ where: { id } });
  }

  async findPublishedById(id: string): Promise<MockExam | null> {
    return prisma.mockExam.findFirst({ where: { id, isPublished: true } });
  }

  async findPublishedBySlug(slug: string): Promise<MockExam | null> {
    return prisma.mockExam.findFirst({ where: { slug, isPublished: true } });
  }

  // Attempts on an already-started exam must keep working even if the exam
  // is since unpublished — same earned-record reasoning as bookmarks'
  // by-ids lookup. Only *starting* new attempts requires published state.
  async findAnyStateById(id: string): Promise<MockExam | null> {
    return this.findById(id);
  }

  async listQuestionsByIds(ids: string[]): Promise<MockExamQuestion[]> {
    if (ids.length === 0) return [];
    return prisma.mockExamQuestion.findMany({ where: { id: { in: ids } } });
  }

  /**
   * Splits `live` across the three difficulty banks proportionally to their
   * sizes (largest-remainder method), capped at each bank's size via the
   * min(live, total) target. Equal 300/300/300 banks with liveQuestionCount
   * 65 yield 22/22/21; a missing tier bank simply gets 0.
   */
  static computeDrawSplit(live: number, banks: DrawSplit): DrawSplit {
    const total = banks.easy + banks.medium + banks.hard;
    const target = Math.min(Math.max(live, 0), total);
    if (target === 0) return { easy: 0, medium: 0, hard: 0 };
    const sizes = [banks.easy, banks.medium, banks.hard];
    const raw = sizes.map((n) => (n / total) * target);
    const split = raw.map((r) => Math.floor(r));
    let remaining = target - split.reduce((a, b) => a + b, 0);
    // Hand the remainder units to the largest fractional parts; ties break
    // easy -> medium -> hard so the outcome is deterministic.
    const byFraction = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (const { i } of byFraction) {
      if (remaining <= 0) break;
      split[i] += 1;
      remaining -= 1;
    }
    return { easy: split[0], medium: split[1], hard: split[2] };
  }

  /**
   * Draws question ids per difficulty bucket: Fisher-Yates shuffle in JS
   * (Postgres random() isn't exposed through Prisma), slice to the split's
   * count. Concatenated easy -> medium -> hard; that order freezes into the
   * attempt's questionIds. Any shortfall -> null (caller maps to 409).
   */
  async drawQuestionIds(examId: string, split: DrawSplit): Promise<string[] | null> {
    const drawn: string[] = [];
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const want = split[difficulty];
      if (want <= 0) continue;
      const pool = await prisma.mockExamQuestion.findMany({
        where: { examId, difficulty },
        select: { id: true },
      });
      if (pool.length < want) return null;
      // Fisher-Yates over a copy of the id list.
      const ids = pool.map((q) => q.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      drawn.push(...ids.slice(0, want));
    }
    return drawn;
  }
}
