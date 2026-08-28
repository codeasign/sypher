import { prisma } from '../lib/prisma';
import { isCompanyAccessActive } from '../lib/companyAccess';

export class AuthoredCompanyCourseAccessRepository {
  async listCompanyIdsForCourse(courseId: string): Promise<string[]> {
    const rows = await prisma.authoredCompanyCourseAccess.findMany({ where: { courseId }, select: { companyId: true } });
    return rows.map((r) => r.companyId);
  }

  async listCourseIdsForCompany(companyId: string): Promise<string[]> {
    // Grants are inert once the company's accessUntil has passed — see
    // lib/companyAccess.ts. This is the chokepoint every course-access
    // consumer flows through, so no caller needs its own expiry check.
    if (!(await isCompanyAccessActive(companyId))) return [];
    const rows = await prisma.authoredCompanyCourseAccess.findMany({ where: { companyId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  /**
   * The raw company-wide grant set, NOT gated by accessUntil — for admin
   * config surfaces (the corporate portal's per-group course picker) that
   * must show the ceiling even while a company's window is lapsed.
   */
  async listCourseIdsForCompanyUnfiltered(companyId: string): Promise<string[]> {
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
