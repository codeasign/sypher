import { prisma } from '../lib/prisma';

export class AuthoredCompanyCourseAccessRepository {
  async listCompanyIdsForCourse(courseId: string): Promise<string[]> {
    const rows = await prisma.authoredCompanyCourseAccess.findMany({ where: { courseId }, select: { companyId: true } });
    return rows.map((r) => r.companyId);
  }

  async listCourseIdsForCompany(companyId: string): Promise<string[]> {
    const rows = await prisma.authoredCompanyCourseAccess.findMany({ where: { companyId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  async grant(companyId: string, courseId: string): Promise<void> {
    await prisma.authoredCompanyCourseAccess.upsert({
      where: { companyId_courseId: { companyId, courseId } },
      update: {},
      create: { companyId, courseId },
    });
  }

  async revoke(companyId: string, courseId: string): Promise<void> {
    await prisma.authoredCompanyCourseAccess.deleteMany({ where: { companyId, courseId } });
  }
}
