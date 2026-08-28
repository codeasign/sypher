import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/errors';
import { Prisma } from '@prisma/client';
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

  async findByBusinessId(companyId: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { companyId } });
  }

  /**
   * Portal-safe lookup by the human business code — only the fields the
   * unauthenticated corporate-portal code-entry screen may see (name +
   * logo for branding, cuid id for the follow-up membership check,
   * accessUntil to tell the user their window has lapsed). Never returns
   * seats / cost / contact emails / address.
   */
  async findPublicByCode(
    code: string,
  ): Promise<{ id: string; name: string; logoUrl: string | null; accessUntil: Date } | null> {
    return prisma.company.findUnique({
      where: { companyId: code },
      select: { id: true, name: true, logoUrl: true, accessUntil: true },
    });
  }

  /**
   * Admin lookup for the access page's Company Grants tab — paginated.
   * An empty term falls back to most-recently-created; a search matches
   * name or the human-readable business code and orders alphabetically.
   */
  async searchPage(term: string, skip: number, take: number): Promise<{ items: Company[]; total: number }> {
    if (!term) {
      const [items, total] = await prisma.$transaction([
        prisma.company.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.company.count(),
      ]);
      return { items, total };
    }
    const where = {
      OR: [
        { name: { contains: term, mode: 'insensitive' as const } },
        { companyId: { contains: term, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await prisma.$transaction([
      prisma.company.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      prisma.company.count({ where }),
    ]);
    return { items, total };
  }

  async create(data: Prisma.CompanyUncheckedCreateInput): Promise<Company> {
    try {
      return await prisma.company.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'A company with this name or Company ID already exists');
      }
      throw error;
    }
  }

  async update(id: string, data: Prisma.CompanyUncheckedUpdateInput): Promise<Company> {
    try {
      return await prisma.company.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'A company with this name or Company ID already exists');
      }
      throw error;
    }
  }
}
