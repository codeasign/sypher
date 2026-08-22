import { prisma } from '../lib/prisma';

export class CohortCourseAccessRepository {
  async listForCohort(cohortId: string): Promise<string[]> {
    const rows = await prisma.cohortCourseAccess.findMany({ where: { cohortId }, select: { courseSlug: true } });
    return rows.map((r) => r.courseSlug);
  }

  async isInPool(cohortId: string, courseSlug: string): Promise<boolean> {
    const row = await prisma.cohortCourseAccess.findUnique({ where: { cohortId_courseSlug: { cohortId, courseSlug } } });
    return row !== null;
  }

  async grant(cohortId: string, courseSlug: string): Promise<void> {
    await prisma.cohortCourseAccess.upsert({
      where: { cohortId_courseSlug: { cohortId, courseSlug } },
      update: {},
      create: { cohortId, courseSlug },
    });
  }

  async revoke(cohortId: string, courseSlug: string): Promise<void> {
    await prisma.cohortCourseAccess.deleteMany({ where: { cohortId, courseSlug } });
  }
}
