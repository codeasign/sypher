import { prisma } from '../lib/prisma';
import type { NavAccess, Role } from '@prisma/client';

export class NavAccessRepository {
  async listAll(): Promise<NavAccess[]> {
    return prisma.navAccess.findMany({ orderBy: { itemKey: 'asc' } });
  }

  async getAllowedRoles(itemKey: string): Promise<Role[]> {
    const row = await prisma.navAccess.findUnique({ where: { itemKey } });
    return row?.allowedRoles ?? [];
  }

  async setAllowedRoles(itemKey: string, roles: Role[]): Promise<NavAccess> {
    return prisma.navAccess.upsert({
      where: { itemKey },
      update: { allowedRoles: roles },
      create: { itemKey, allowedRoles: roles },
    });
  }
}
