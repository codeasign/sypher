import { prisma } from '../lib/prisma';

export interface AuthoredModuleBookmarkEntry {
  moduleId: string;
  courseId: string;
}

export class AuthoredModuleBookmarkRepository {
  async listForUser(userId: string): Promise<AuthoredModuleBookmarkEntry[]> {
    return prisma.authoredModuleBookmark.findMany({
      where: { userId },
      select: { moduleId: true, courseId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, moduleId: string, courseId: string): Promise<void> {
    await prisma.authoredModuleBookmark.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: {},
      create: { userId, moduleId, courseId },
    });
  }

  async remove(userId: string, moduleId: string): Promise<void> {
    await prisma.authoredModuleBookmark.deleteMany({ where: { userId, moduleId } });
  }
}
