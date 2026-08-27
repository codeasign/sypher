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

  /**
   * Every courseId the user has at least one ModuleProgress row for —
   * drives the Enroll-vs-Resume button on Browse Courses / My Courses.
   * ModuleProgress rows are never deleted (markComplete upserts, never
   * removes), so a fully completed course still shows here — revisiting
   * it stays "Resume", never resets or re-tracks anything.
   */
  async listStartedCourseIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.moduleProgress.findMany({
      where: { userId },
      select: { courseId: true },
      distinct: ['courseId'],
    });
    return new Set(rows.map((r) => r.courseId));
  }
}
