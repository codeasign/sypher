import { prisma } from '../lib/prisma';
import type { Role } from '@prisma/client';

export class AuthoredCourseAccessRepository {
  async getAllowedRoles(courseId: string): Promise<Role[]> {
    const row = await prisma.authoredCourseAccess.findUnique({ where: { courseId }, select: { allowedRoles: true } });
    return row?.allowedRoles ?? [];
  }

  async setAllowedRoles(courseId: string, allowedRoles: Role[]): Promise<void> {
    await prisma.authoredCourseAccess.upsert({
      where: { courseId },
      update: { allowedRoles },
      create: { courseId, allowedRoles },
    });
  }
}
