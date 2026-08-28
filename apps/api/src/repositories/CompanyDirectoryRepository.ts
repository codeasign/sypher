import { prisma } from '../lib/prisma';
import { isCompanyAccessActive } from '../lib/companyAccess';
import type { CompanyEmployee, CompanyGroup } from '@prisma/client';

/**
 * THE seam for all company self-service directory data (groups, employee
 * roster, group course/nav grants) used by the corporate portal.
 *
 * Everything here is company-scoped: every method takes `companyId` and
 * every query filters on it, so a COMPANY_HR calling with a forged groupId
 * still can't reach another company's rows. Controllers pass
 * `req.user.companyId` — never a client-supplied company id.
 *
 * ── Future remote-company-database swap point ──
 * These tables are FK-free (see schema.prisma) precisely so a company's
 * slice can move to a per-company database later. If/when that happens,
 * this class is the ONLY thing that changes: the Prisma calls below become
 * HTTP calls to that company's server, this server staying the auth/authz
 * + catalog source of truth. Keep every call site depending on this
 * interface, not on `prisma.companyGroup.*` directly.
 */
export class CompanyDirectoryRepository {
  // ── Access resolution (hot path — called from courseAccessInfo / nav gate) ──

  /** Group ids the user belongs to within this company. */
  async listGroupIdsForUser(companyId: string, userId: string): Promise<string[]> {
    const rows = await prisma.companyGroupMember.findMany({
      where: { companyId, userId },
      select: { groupId: true },
    });
    return rows.map((r) => r.groupId);
  }

  /**
   * Union of course ids granted to any group the user is in. Returns `[]`
   * once the company's accessUntil has lapsed — same chokepoint semantics
   * as AuthoredCompanyCourseAccessRepository.listCourseIdsForCompany, which
   * this replaces on the authored-course access path.
   */
  async listCourseIdsForUserGroups(companyId: string, userId: string): Promise<string[]> {
    if (!(await isCompanyAccessActive(companyId))) return [];
    const groupIds = await this.listGroupIdsForUser(companyId, userId);
    if (groupIds.length === 0) return [];
    const rows = await prisma.companyGroupCourseAccess.findMany({
      where: { companyId, groupId: { in: groupIds } },
      select: { courseId: true },
    });
    return [...new Set(rows.map((r) => r.courseId))];
  }

  /** Union of nav item keys granted to any group the user is in. `[]` when the company's access window has lapsed. */
  async listNavKeysForUserGroups(companyId: string, userId: string): Promise<string[]> {
    if (!(await isCompanyAccessActive(companyId))) return [];
    const groupIds = await this.listGroupIdsForUser(companyId, userId);
    if (groupIds.length === 0) return [];
    const rows = await prisma.companyGroupNavAccess.findMany({
      where: { companyId, groupId: { in: groupIds } },
      select: { itemKey: true },
    });
    return [...new Set(rows.map((r) => r.itemKey))];
  }

  // ── Groups ──

  async listGroups(companyId: string): Promise<CompanyGroup[]> {
    return prisma.companyGroup.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  async getGroup(companyId: string, groupId: string): Promise<CompanyGroup | null> {
    return prisma.companyGroup.findFirst({ where: { id: groupId, companyId } });
  }

  /** Idempotent create-by-name — used by the CSV importer's Department column. */
  async ensureGroup(companyId: string, name: string): Promise<CompanyGroup> {
    const existing = await prisma.companyGroup.findFirst({ where: { companyId, name } });
    if (existing) return existing;
    return prisma.companyGroup.create({ data: { companyId, name } });
  }

  async createGroup(companyId: string, name: string): Promise<CompanyGroup> {
    return prisma.companyGroup.create({ data: { companyId, name } });
  }

  async renameGroup(companyId: string, groupId: string, name: string): Promise<number> {
    const res = await prisma.companyGroup.updateMany({ where: { id: groupId, companyId }, data: { name } });
    return res.count;
  }

  /** Deletes the group and everything hanging off it (members + grants). */
  async deleteGroup(companyId: string, groupId: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const res = await tx.companyGroup.deleteMany({ where: { id: groupId, companyId } });
      if (res.count === 0) return 0;
      await tx.companyGroupMember.deleteMany({ where: { companyId, groupId } });
      await tx.companyGroupCourseAccess.deleteMany({ where: { companyId, groupId } });
      await tx.companyGroupNavAccess.deleteMany({ where: { companyId, groupId } });
      return res.count;
    });
  }

  async countGroups(companyId: string): Promise<number> {
    return prisma.companyGroup.count({ where: { companyId } });
  }

  // ── Employee roster ──

  async countEmployees(companyId: string, status: 'active' | 'removed' | 'any' = 'active'): Promise<number> {
    return prisma.companyEmployee.count({
      where: { companyId, ...(status === 'any' ? {} : { status }) },
    });
  }

  async getEmployee(companyId: string, userId: string): Promise<CompanyEmployee | null> {
    return prisma.companyEmployee.findFirst({ where: { companyId, userId } });
  }

  async listEmployees(companyId: string): Promise<CompanyEmployee[]> {
    return prisma.companyEmployee.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  /** Roster upsert — CSV import & manual edits. Never flips status here. */
  async upsertEmployee(
    companyId: string,
    userId: string,
    fields: { jobTitle?: string | null; managerName?: string | null },
  ): Promise<CompanyEmployee> {
    const existing = await prisma.companyEmployee.findFirst({ where: { companyId, userId } });
    if (existing) {
      return prisma.companyEmployee.update({
        where: { id: existing.id },
        data: { jobTitle: fields.jobTitle ?? existing.jobTitle, managerName: fields.managerName ?? existing.managerName, status: 'active' },
      });
    }
    return prisma.companyEmployee.create({
      data: { companyId, userId, jobTitle: fields.jobTitle ?? null, managerName: fields.managerName ?? null },
    });
  }

  async setEmployeeStatus(companyId: string, userId: string, status: 'active' | 'removed'): Promise<number> {
    const res = await prisma.companyEmployee.updateMany({ where: { companyId, userId }, data: { status } });
    return res.count;
  }

  // ── Group membership ──

  async listGroupMemberUserIds(companyId: string, groupId: string): Promise<string[]> {
    const rows = await prisma.companyGroupMember.findMany({ where: { companyId, groupId }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  /** All (groupId,userId) pairs for the company — for building the roster view in one query. */
  async listAllMemberships(companyId: string): Promise<{ groupId: string; userId: string }[]> {
    return prisma.companyGroupMember.findMany({ where: { companyId }, select: { groupId: true, userId: true } });
  }

  async addMember(companyId: string, groupId: string, userId: string, addedById: string | null): Promise<void> {
    await prisma.companyGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { companyId, groupId, userId, addedById },
    });
  }

  async removeMember(companyId: string, groupId: string, userId: string): Promise<void> {
    await prisma.companyGroupMember.deleteMany({ where: { companyId, groupId, userId } });
  }

  /** Replace the full set of groups a user belongs to (within this company). */
  async setUserGroups(companyId: string, userId: string, groupIds: string[], addedById: string | null): Promise<void> {
    // Guard: only accept groupIds that actually belong to this company.
    const valid = await prisma.companyGroup.findMany({
      where: { companyId, id: { in: groupIds } },
      select: { id: true },
    });
    const validIds = new Set(valid.map((g) => g.id));
    await prisma.$transaction(async (tx) => {
      await tx.companyGroupMember.deleteMany({ where: { companyId, userId } });
      if (validIds.size > 0) {
        await tx.companyGroupMember.createMany({
          data: [...validIds].map((groupId) => ({ companyId, groupId, userId, addedById })),
        });
      }
    });
  }

  // ── Group course / nav grants (write path enforces the company ceiling) ──

  async listGroupCourseIds(companyId: string, groupId: string): Promise<string[]> {
    const rows = await prisma.companyGroupCourseAccess.findMany({ where: { companyId, groupId }, select: { courseId: true } });
    return rows.map((r) => r.courseId);
  }

  async setGroupCourse(companyId: string, groupId: string, courseId: string, allowed: boolean): Promise<void> {
    if (allowed) {
      await prisma.companyGroupCourseAccess.upsert({
        where: { groupId_courseId: { groupId, courseId } },
        update: {},
        create: { companyId, groupId, courseId },
      });
    } else {
      await prisma.companyGroupCourseAccess.deleteMany({ where: { companyId, groupId, courseId } });
    }
  }

  async listGroupNavKeys(companyId: string, groupId: string): Promise<string[]> {
    const rows = await prisma.companyGroupNavAccess.findMany({ where: { companyId, groupId }, select: { itemKey: true } });
    return rows.map((r) => r.itemKey);
  }

  async setGroupNav(companyId: string, groupId: string, itemKey: string, allowed: boolean): Promise<void> {
    if (allowed) {
      await prisma.companyGroupNavAccess.upsert({
        where: { groupId_itemKey: { groupId, itemKey } },
        update: {},
        create: { companyId, groupId, itemKey },
      });
    } else {
      await prisma.companyGroupNavAccess.deleteMany({ where: { companyId, groupId, itemKey } });
    }
  }

  /** Drop any group grants that are no longer within the company ceiling. */
  async pruneGrantsOutsideCeiling(companyId: string, allowedCourseIds: string[], allowedNavKeys: string[]): Promise<void> {
    await prisma.companyGroupCourseAccess.deleteMany({
      where: { companyId, courseId: { notIn: allowedCourseIds.length ? allowedCourseIds : ['__none__'] } },
    });
    await prisma.companyGroupNavAccess.deleteMany({
      where: { companyId, itemKey: { notIn: allowedNavKeys.length ? allowedNavKeys : ['__none__'] } },
    });
  }
}
