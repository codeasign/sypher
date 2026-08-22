import { prisma } from '../lib/prisma';

export class ModuleProgressRepository {
  // Idempotent: the unique (userId, moduleId) constraint means revisiting
  // an already-completed module is a no-op, not a duplicate row or a
  // reset completedAt.
  async markComplete(userId: string, moduleId: string, courseId: string): Promise<void> {
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      create: { userId, moduleId, courseId },
      update: {},
    });
  }

  async listCompletedModuleIds(userId: string, courseId: string): Promise<Set<string>> {
    const rows = await prisma.moduleProgress.findMany({
      where: { userId, courseId },
      select: { moduleId: true },
    });
    return new Set(rows.map((r) => r.moduleId));
  }
}
