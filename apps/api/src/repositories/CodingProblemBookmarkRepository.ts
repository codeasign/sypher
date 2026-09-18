import { prisma } from '../lib/prisma';

export class CodingProblemBookmarkRepository {
  async listProblemIdsForUser(userId: string): Promise<string[]> {
    const rows = await prisma.codingProblemBookmark.findMany({ where: { userId }, select: { problemId: true } });
    return rows.map((r) => r.problemId);
  }

  async add(userId: string, problemId: string): Promise<void> {
    await prisma.codingProblemBookmark.upsert({
      where: { userId_problemId: { userId, problemId } },
      update: {},
      create: { userId, problemId },
    });
  }

  async remove(userId: string, problemId: string): Promise<void> {
    await prisma.codingProblemBookmark.deleteMany({ where: { userId, problemId } });
  }
}
