import { prisma } from '../lib/prisma';

export class HealthRepository {
  async pingDatabase(): Promise<boolean> {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  }
}
