import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import type { Course } from '@prisma/client';
import { slugify, findAvailableSlug } from '../lib/slug';

export interface CreateCourseInput {
  name: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  category?: string | null; // "tech" | "life-skills" (free-form)
  relatedCourses?: string | null; // CSV of related course slugs
  audienceRole?: string | null; // target audience role, e.g. "developer" (free-form)
  authorId?: string | null;
}

export interface UpdateCourseInput {
  name?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  relatedCourses?: string | null;
  audienceRole?: string | null;
}

export class CourseRepository {
  async listAll(): Promise<Course[]> {
    return prisma.course.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  // Paginated twin for /manage-courses' table — id as tiebreaker since
  // updatedAt alone isn't unique enough to page on reliably (same lesson
  // as BlogPostRepository.listPublishedPage). Optional search matches the
  // course name, case-insensitive — server-side since the table is
  // paginated (a client-side filter would only ever see the current page).
  async listAllPage(limit: number, offset: number, search?: string): Promise<{ courses: Course[]; total: number }> {
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : undefined;
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.course.count({ where }),
    ]);
    return { courses, total };
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
    const slug = await findAvailableSlug(slugify(input.slug || input.name), async (s) => {
      const existing = await prisma.course.findUnique({ where: { slug: s } });
      return existing !== null;
    });
    return prisma.course.create({
      data: {
        slug,
        name: input.name,
        description: input.description ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        // Same ""-means-clear convention as update(): clients avoid explicit
        // JSON nulls because tsoa's validators reject them.
        category: input.category || null,
        relatedCourses: input.relatedCourses || null,
        audienceRole: input.audienceRole || null,
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
    // Whitelist the updatable columns explicitly — the controller's body
    // type is Partial<CourseCreateRequest>, which also carries `slug`; a
    // blanket `...fields` spread would let a PUT silently rename the course
    // (breaking every /learn/[slug] URL). `undefined` values are skipped by
    // Prisma; "" means "clear" for the nullable text columns (tsoa's
    // validators reject explicit JSON nulls, so clients send "" instead).
    const data: Prisma.CourseUpdateInput = {
      name: fields.name,
      description: fields.description === '' ? null : fields.description,
      coverImageUrl: fields.coverImageUrl === '' ? null : fields.coverImageUrl,
      category: fields.category === '' ? null : fields.category,
      relatedCourses: fields.relatedCourses === '' ? null : fields.relatedCourses,
      audienceRole: fields.audienceRole === '' ? null : fields.audienceRole,
    };
    await prisma.course.update({ where: { id }, data });
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
