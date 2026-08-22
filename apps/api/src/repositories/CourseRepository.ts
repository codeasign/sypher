import { prisma } from '../lib/prisma';
import type { Course } from '@prisma/client';
import { slugify, findAvailableSlug } from '../lib/slug';

export interface CreateCourseInput {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  authorId?: string | null;
}

export interface UpdateCourseInput {
  name?: string;
  description?: string | null;
  coverImageUrl?: string | null;
}

export class CourseRepository {
  async listAll(): Promise<Course[]> {
    return prisma.course.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async listPublished(): Promise<Course[]> {
    return prisma.course.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' } });
  }

  async findById(id: string): Promise<Course | null> {
    return prisma.course.findUnique({ where: { id } });
  }

  async findPublishedBySlug(slug: string): Promise<Course | null> {
    return prisma.course.findFirst({ where: { slug, status: 'published' } });
  }

  // For /bookmarks — deliberately not filtered by status: a bookmark on a
  // course that's since been unpublished should still show up, same as the
  // old system's getCoursesByIds.
  async findByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];
    return prisma.course.findMany({ where: { id: { in: ids } } });
  }

  async create(input: CreateCourseInput): Promise<Course> {
    const slug = await findAvailableSlug(slugify(input.name), async (s) => {
      const existing = await prisma.course.findUnique({ where: { slug: s } });
      return existing !== null;
    });
    return prisma.course.create({
      data: {
        slug,
        name: input.name,
        description: input.description ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        status: 'draft',
        authorId: input.authorId ?? null,
      },
    });
  }

  // Docusaurus importer only — uses the source slug verbatim (already
  // globally unique there) instead of create()'s name-derived slugify, and
  // is idempotent so re-running the importer after a source fix updates in
  // place rather than duplicating. Always lands in draft, same as create(),
  // so imported courses need an explicit publish before they're visible.
  async upsertBySlug(slug: string, fields: { name: string; description?: string | null }): Promise<Course> {
    return prisma.course.upsert({
      where: { slug },
      create: { slug, name: fields.name, description: fields.description ?? null, status: 'draft' },
      update: { name: fields.name, description: fields.description ?? null },
    });
  }

  async update(id: string, fields: UpdateCourseInput): Promise<void> {
    await prisma.course.update({ where: { id }, data: fields });
  }

  async setStatus(id: string, status: 'draft' | 'published'): Promise<void> {
    await prisma.course.update({
      where: { id },
      data: { status, publishedAt: status === 'published' ? new Date() : null },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.course.delete({ where: { id } });
  }
}
