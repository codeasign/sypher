import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class ModuleProgressRepository {
  // Idempotent: the unique (userId, moduleId) constraint means revisiting
  // an already-completed module is a no-op, not a duplicate row or a
  // reset completedAt.
  //
  // Prisma's upsert isn't an atomic DB-level UPSERT — under Postgres it's
  // read-then-write, so two concurrent calls for the same (userId,
  // moduleId) can both miss the read and both attempt the create, and the
  // loser hits the unique constraint as a P2002 instead of falling through
  // to the update. ModuleCompletionTracker's mount effect fires exactly
  // this way under React Strict Mode's dev double-invoke (no in-flight
  // guard), so it's a real race, not a hypothetical one — caught live via
  // the 500 it produced. Since P2002 here means "the row we wanted already
  // exists," it's the same success outcome as the update branch: swallow.
  async markComplete(userId: string, moduleId: string, courseId: string): Promise<void> {
    try {
      await prisma.moduleProgress.upsert({
        where: { userId_moduleId: { userId, moduleId } },
        create: { userId, moduleId, courseId },
        update: {},
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }
  }

  async listCompletedModuleIds(userId: string, courseId: string): Promise<Set<string>> {
    const rows = await prisma.moduleProgress.findMany({
      where: { userId, courseId },
      select: { moduleId: true },
    });
    return new Set(rows.map((r) => r.moduleId));
  }

  /**
   * Completed-module count per course for one user, across every course the
   * user has any progress in — the numerator of the progress bar on the My
   * Courses / Browse Courses cards. Keyed by courseId; a course absent from
   * the map has 0. One grouped query, not one per course.
   */
  async countCompletedByCourse(userId: string): Promise<Map<string, number>> {
    const rows = await prisma.moduleProgress.groupBy({
      by: ['courseId'],
      where: { userId },
      _count: { moduleId: true },
    });
    return new Map(rows.map((r) => [r.courseId, r._count.moduleId]));
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
