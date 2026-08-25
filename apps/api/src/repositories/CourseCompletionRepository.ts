import { prisma } from '../lib/prisma';

export class CourseCompletionRepository {
  // Idempotent, same as ModuleProgressRepository.markComplete: the unique
  // (userId, courseId) constraint means an already-completed course is a
  // no-op, not a duplicate row or a reset completedAt.
  async markComplete(userId: string, courseId: string): Promise<void> {
    await prisma.courseCompletion.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });
  }

  // Called after every module completion (see
  // CourseController.completeModule) -- counts this user's completed
  // modules against the course's total and writes CourseCompletion once
  // they're equal. A no-op below 100%, and a no-op if already completed
  // (markComplete's own idempotency).
  async markCompleteIfAllModulesDone(userId: string, courseId: string): Promise<void> {
    const [totalModules, completedModules] = await Promise.all([
      prisma.courseModule.count({ where: { courseId } }),
      prisma.moduleProgress.count({ where: { userId, courseId } }),
    ]);
    if (totalModules > 0 && completedModules >= totalModules) {
      await this.markComplete(userId, courseId);
    }
  }

  async hasCompletedCourse(userId: string, courseId: string): Promise<boolean> {
    const row = await prisma.courseCompletion.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    return row !== null;
  }

  async listCompletedCourseIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.courseCompletion.findMany({
      where: { userId },
      select: { courseId: true },
    });
    return new Set(rows.map((r) => r.courseId));
  }

  // Newest-first — the mock tests page lists most-recently-earned first.
  async listForUser(userId: string): Promise<{ courseId: string; completedAt: Date }[]> {
    return prisma.courseCompletion.findMany({
      where: { userId },
      select: { courseId: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });
  }

  async listCompletionsForCourse(courseId: string): Promise<{ userId: string; completedAt: Date }[]> {
    return prisma.courseCompletion.findMany({
      where: { courseId },
      select: { userId: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
    });
  }
}
