import { prisma } from '../lib/prisma';

export class AuthoredCourseBookmarkRepository {
  async listCourseIdsForUser(userId: string): Promise<string[]> {
    const rows = await prisma.authoredCourseBookmark.findMany({ where: { userId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  async add(userId: string, courseId: string): Promise<void> {
    await prisma.authoredCourseBookmark.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId },
    });
  }

  async remove(userId: string, courseId: string): Promise<void> {
    await prisma.authoredCourseBookmark.deleteMany({ where: { userId, courseId } });
  }
}
