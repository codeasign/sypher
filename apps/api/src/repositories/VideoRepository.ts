import { prisma } from '../lib/prisma';
import type { Video, Prisma } from '@prisma/client';
import { slugify, findAvailableSlug } from '../lib/slug';

export interface VideoResourceInput {
  label: string;
  url: string;
}

export interface CreateVideoInput {
  title: string;
  description?: string | null;
  category?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  resources?: VideoResourceInput[];
  authorId?: string | null;
}

export type UpdateVideoInput = Partial<CreateVideoInput>;

export interface PublishedVideoSummary {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
}

export class VideoRepository {
  async findById(id: string): Promise<Video | null> {
    return prisma.video.findUnique({ where: { id } });
  }

  async findBySlugPublished(slug: string): Promise<Video | null> {
    return prisma.video.findFirst({ where: { slug, status: 'published', videoUrl: { not: null } } });
  }

  // Paginated twin for /manage-videos' table (mirrors listPage on
  // BlogPostRepository/CourseRepository — client-side search+pagination
  // over one fetched-once page, same convention, 2026-08-27's call).
  async listManagePage(limit: number, offset: number, search?: string): Promise<{ videos: Video[]; total: number }> {
    const where = search ? { title: { contains: search, mode: 'insensitive' as const } } : {};
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.video.count({ where }),
    ]);
    return { videos, total };
  }

  // Every video actually "shown" on Browse Videos — published AND
  // uploaded (user request 2026-09-16: a video with no file yet never
  // appears publicly, even if marked published).
  async listPublished(): Promise<PublishedVideoSummary[]> {
    return prisma.video.findMany({
      where: { status: 'published', videoUrl: { not: null } },
      orderBy: [{ category: 'asc' }, { publishedAt: 'desc' }],
      select: { slug: true, title: true, description: true, category: true, thumbnailUrl: true, publishedAt: true },
    });
  }

  async create(input: CreateVideoInput): Promise<Video> {
    const slug = await findAvailableSlug(slugify(input.title), async (s) => {
      const existing = await prisma.video.findUnique({ where: { slug: s } });
      return existing !== null;
    });
    return prisma.video.create({
      data: {
        slug,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        videoUrl: input.videoUrl ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        transcript: input.transcript ?? null,
        resources: (input.resources as unknown as Prisma.InputJsonValue) ?? undefined,
        authorId: input.authorId ?? null,
        status: 'draft',
      },
    });
  }

  async update(id: string, fields: UpdateVideoInput): Promise<void> {
    await prisma.video.update({
      where: { id },
      data: {
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
        ...(fields.category !== undefined ? { category: fields.category } : {}),
        ...(fields.videoUrl !== undefined ? { videoUrl: fields.videoUrl } : {}),
        ...(fields.thumbnailUrl !== undefined ? { thumbnailUrl: fields.thumbnailUrl } : {}),
        ...(fields.transcript !== undefined ? { transcript: fields.transcript } : {}),
        ...(fields.resources !== undefined ? { resources: fields.resources as unknown as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async setStatus(id: string, status: 'draft' | 'published'): Promise<void> {
    await prisma.video.update({
      where: { id },
      data: { status, publishedAt: status === 'published' ? new Date() : null },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.video.delete({ where: { id } });
  }
}
