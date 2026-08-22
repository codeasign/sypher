import { prisma } from '../lib/prisma';
import type { CourseAccess, Role } from '@prisma/client';

export class CourseAccessRepository {
  async listAll(): Promise<CourseAccess[]> {
    return prisma.courseAccess.findMany({ orderBy: { courseSlug: 'asc' } });
  }

  async getAllowedRoles(courseSlug: string): Promise<Role[]> {
    const row = await prisma.courseAccess.findUnique({ where: { courseSlug } });
    return row?.allowedRoles ?? [];
  }

  async setAllowedRoles(courseSlug: string, roles: Role[]): Promise<CourseAccess> {
    return prisma.courseAccess.upsert({
      where: { courseSlug },
      update: { allowedRoles: roles },
      create: { courseSlug, allowedRoles: roles },
    });
  }
}
