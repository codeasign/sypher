import { prisma } from '../lib/prisma';

export interface MemberCourseAccessEntry {
  userId: string;
  courseSlug: string;
}

export class CohortMemberCourseAccessRepository {
  async listForCohort(cohortId: string): Promise<MemberCourseAccessEntry[]> {
    const rows = await prisma.cohortMemberCourseAccess.findMany({
      where: { cohortId },
      select: { userId: true, courseSlug: true },
    });
    return rows;
  }

  async grant(cohortId: string, userId: string, courseSlug: string): Promise<void> {
    await prisma.cohortMemberCourseAccess.upsert({
      where: { cohortId_userId_courseSlug: { cohortId, userId, courseSlug } },
      update: {},
      create: { cohortId, userId, courseSlug },
    });
  }

  async revoke(cohortId: string, userId: string, courseSlug: string): Promise<void> {
    await prisma.cohortMemberCourseAccess.deleteMany({ where: { cohortId, userId, courseSlug } });
  }
}
