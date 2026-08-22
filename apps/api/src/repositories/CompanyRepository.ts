import { prisma } from '../lib/prisma';
import type { Company } from '@prisma/client';

export class CompanyRepository {
  async list(): Promise<Company[]> {
    return prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { name } });
  }

  async create(name: string): Promise<Company> {
    return prisma.company.create({ data: { name } });
  }
}
