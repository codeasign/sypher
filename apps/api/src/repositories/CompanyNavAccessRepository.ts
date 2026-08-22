import { prisma } from '../lib/prisma';

export class CompanyNavAccessRepository {
  async listKeysForCompany(companyId: string): Promise<string[]> {
    const rows = await prisma.companyNavAccess.findMany({ where: { companyId }, select: { itemKey: true } });
    return rows.map((r) => r.itemKey);
  }

  async grant(companyId: string, itemKey: string): Promise<void> {
    await prisma.companyNavAccess.upsert({
      where: { companyId_itemKey: { companyId, itemKey } },
      update: {},
      create: { companyId, itemKey },
    });
  }

  async revoke(companyId: string, itemKey: string): Promise<void> {
    await prisma.companyNavAccess.deleteMany({ where: { companyId, itemKey } });
  }
}
