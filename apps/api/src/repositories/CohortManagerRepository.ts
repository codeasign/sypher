import { prisma } from '../lib/prisma';

export interface ManagerEntry {
  userId: string;
  email: string;
  fullName: string | null;
  assignedAt: Date;
}

export class CohortManagerRepository {
  async listForCohort(cohortId: string): Promise<ManagerEntry[]> {
    const rows = await prisma.cohortManager.findMany({ where: { cohortId }, include: { user: true } });
    return rows.map((row) => ({
      userId: row.userId,
      email: row.user.email,
      fullName: row.user.fullName,
      assignedAt: row.assignedAt,
    }));
  }

  async isManager(cohortId: string, userId: string): Promise<boolean> {
    const row = await prisma.cohortManager.findUnique({ where: { cohortId_userId: { cohortId, userId } } });
    return row !== null;
  }

  async add(cohortId: string, userId: string): Promise<void> {
    await prisma.cohortManager.upsert({
      where: { cohortId_userId: { cohortId, userId } },
      create: { cohortId, userId },
      update: {},
    });
  }

  async remove(cohortId: string, userId: string): Promise<void> {
    await prisma.cohortManager.deleteMany({ where: { cohortId, userId } });
  }
}
