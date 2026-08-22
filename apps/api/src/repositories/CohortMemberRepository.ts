import { prisma } from '../lib/prisma';

export interface RosterEntry {
  userId: string;
  email: string;
  fullName: string | null;
  status: string;
  enrolledAt: Date;
  deletedAt: Date | null;
}

export class CohortMemberRepository {
  /** Reimplements the list_cohort_roster() RPC — the authz check (can_manage_cohort_roster)
   * happens in the controller before this is called, not here. */
  async listRoster(cohortId: string): Promise<RosterEntry[]> {
    const rows = await prisma.cohortMember.findMany({
      where: { cohortId },
      include: { user: true },
      orderBy: { enrolledAt: 'desc' },
    });
    return rows.map((row) => ({
      userId: row.userId,
      email: row.user.email,
      fullName: row.user.fullName,
      status: row.status,
      enrolledAt: row.enrolledAt,
      deletedAt: row.user.deletedAt,
    }));
  }

  async isActiveMember(cohortId: string, userId: string): Promise<boolean> {
    const row = await prisma.cohortMember.findUnique({ where: { cohortId_userId: { cohortId, userId } } });
    return row?.status === 'active';
  }

  /**
   * Reimplements set_cohort_member_status(): upsert the roster row (status
   * only changes on conflict — enrolledById is set once, on first insert,
   * and never overwritten by a later status toggle, matching the original
   * SQL's `on conflict ... do update set status = excluded.status`). If
   * deactivating, also revoke this member's course-access grants for this
   * cohort — reactivating later does NOT restore them (same "reactivation
   * requires a fresh decision" rule as the original).
   */
  async setStatus(cohortId: string, userId: string, active: boolean, actingUserId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.cohortMember.upsert({
        where: { cohortId_userId: { cohortId, userId } },
        create: { cohortId, userId, status: active ? 'active' : 'removed', enrolledById: actingUserId },
        update: { status: active ? 'active' : 'removed' },
      });
      if (!active) {
        await tx.cohortMemberCourseAccess.deleteMany({ where: { cohortId, userId } });
      }
    });
  }
}
