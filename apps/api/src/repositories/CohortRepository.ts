import { prisma } from '../lib/prisma';
import type { Cohort } from '@prisma/client';
import { slugify, findAvailableSlug } from '../lib/slug';

export interface CreateCohortInput {
  title: string;
  description: string;
  content?: string;
  coverImageUrl?: string | null;
  startDate?: Date | null;
  durationWeeks?: number | null;
  seatsTotal?: number | null;
  priceLabel?: string | null;
  createdById?: string | null;
}

export class CohortRepository {
  async listAll(): Promise<Cohort[]> {
    return prisma.cohort.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async listPublicLive(): Promise<Cohort[]> {
    return prisma.cohort.findMany({ where: { status: 'live' }, orderBy: { startDate: 'asc' } });
  }

  async listForManager(userId: string): Promise<Cohort[]> {
    return prisma.cohort.findMany({
      where: { managers: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Cohort | null> {
    return prisma.cohort.findUnique({ where: { id } });
  }

  async findBySlugLive(slug: string): Promise<Cohort | null> {
    return prisma.cohort.findFirst({ where: { slug, status: 'live' } });
  }

  async create(input: CreateCohortInput): Promise<Cohort> {
    const slug = await findAvailableSlug(slugify(input.title), async (s) => {
      const existing = await prisma.cohort.findUnique({ where: { slug: s } });
      return existing !== null;
    });
    return prisma.cohort.create({
      data: {
        slug,
        title: input.title,
        description: input.description,
        content: input.content ?? '',
        coverImageUrl: input.coverImageUrl ?? null,
        startDate: input.startDate ?? null,
        durationWeeks: input.durationWeeks ?? null,
        seatsTotal: input.seatsTotal ?? null,
        priceLabel: input.priceLabel ?? null,
        status: 'draft',
        createdById: input.createdById ?? null,
      },
    });
  }

  async update(id: string, fields: Partial<CreateCohortInput>): Promise<void> {
    await prisma.cohort.update({ where: { id }, data: fields });
  }

  async setStatus(id: string, status: 'draft' | 'live' | 'closed'): Promise<void> {
    await prisma.cohort.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await prisma.cohort.delete({ where: { id } });
  }
}
