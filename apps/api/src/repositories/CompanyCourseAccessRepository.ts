import { prisma } from '../lib/prisma';

export class CompanyCourseAccessRepository {
  async listSlugsForCompany(companyId: string): Promise<string[]> {
    const rows = await prisma.companyCourseAccess.findMany({ where: { companyId }, select: { courseSlug: true } });
    return rows.map((r) => r.courseSlug);
  }

  async grant(companyId: string, courseSlug: string): Promise<void> {
    await prisma.companyCourseAccess.upsert({
      where: { companyId_courseSlug: { companyId, courseSlug } },
      update: {},
      create: { companyId, courseSlug },
    });
  }

  async revoke(companyId: string, courseSlug: string): Promise<void> {
    await prisma.companyCourseAccess.deleteMany({ where: { companyId, courseSlug } });
  }
}
