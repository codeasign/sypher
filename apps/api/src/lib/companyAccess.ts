import { prisma } from './prisma';

/**
 * A company's grants (course access and nav-item access) only count while
 * its access window is open. `Company.accessUntil` is mandatory and is
 * set/edited by admins in /admin/access -> Company Grants; once it passes,
 * every grant belonging to that company goes inert platform-wide.
 *
 * Enforced here, at the two grant read paths
 * (AuthoredCompanyCourseAccessRepository.listCourseIdsForCompany and
 * CompanyNavAccessRepository.listKeysForCompany), so every consumer
 * (CourseController, commentAccess, MockExamController, the nav gate)
 * inherits it without its own check. There is deliberately no cron for
 * this: a COMPANY_EMPLOYEE's role is never downgraded, their access is
 * purely grant-driven, so gating the grant lookups is the whole fix.
 *
 * `companyId` is the Company cuid PK (what User.companyId and the grant
 * rows store), not the human-readable business code.
 */
export async function isCompanyAccessActive(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { accessUntil: true },
  });
  return company != null && company.accessUntil.getTime() > Date.now();
}
