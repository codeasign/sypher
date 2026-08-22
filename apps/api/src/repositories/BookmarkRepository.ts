import { prisma } from '../lib/prisma';

export class BookmarkRepository {
  async listSlugsForUser(userId: string): Promise<string[]> {
    const rows = await prisma.bookmark.findMany({ where: { userId }, select: { courseSlug: true } });
    return rows.map((r) => r.courseSlug);
  }

  async add(userId: string, courseSlug: string): Promise<void> {
    await prisma.bookmark.upsert({
      where: { userId_courseSlug: { userId, courseSlug } },
      update: {},
      create: { userId, courseSlug },
    });
  }

  async remove(userId: string, courseSlug: string): Promise<void> {
    await prisma.bookmark.deleteMany({ where: { userId, courseSlug } });
  }
}
