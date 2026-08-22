import { prisma } from '../lib/prisma';
import type { BlogPost } from '@prisma/client';
import { slugify, findAvailableSlug } from '../lib/slug';

export interface CreateBlogPostInput {
  title: string;
  description: string;
  content?: string;
  coverImageUrl?: string | null;
  featuredMediaType?: string | null;
  featuredMediaValue?: string | null;
  tags?: string[];
  authorId?: string | null;
}

export interface PublishedPostWithAuthor {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string | null;
  featuredMediaType: string | null;
  featuredMediaValue: string | null;
  publishedAt: Date | null;
  authorFullName: string | null;
  authorBio: string | null;
}

export class BlogPostRepository {
  /** authorId omitted -> every post (admin use); provided -> only that author's posts. */
  async list(authorId?: string): Promise<BlogPost[]> {
    return prisma.blogPost.findMany({
      where: authorId ? { authorId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listPublished(): Promise<BlogPost[]> {
    return prisma.blogPost.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' } });
  }

  /** Reimplements get_published_blog_post_with_author(). */
  async getPublishedBySlugWithAuthor(slug: string): Promise<PublishedPostWithAuthor | null> {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'published' },
      include: { author: true },
    });
    if (!post) return null;
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      featuredMediaType: post.featuredMediaType,
      featuredMediaValue: post.featuredMediaValue,
      publishedAt: post.publishedAt,
      authorFullName: post.author?.fullName ?? null,
      authorBio: post.author?.bio ?? null,
    };
  }

  async findById(id: string): Promise<BlogPost | null> {
    return prisma.blogPost.findUnique({ where: { id } });
  }

  async create(input: CreateBlogPostInput): Promise<BlogPost> {
    const slug = await findAvailableSlug(slugify(input.title), async (s) => {
      const existing = await prisma.blogPost.findUnique({ where: { slug: s } });
      return existing !== null;
    });
    return prisma.blogPost.create({
      data: {
        slug,
        title: input.title,
        description: input.description,
        content: input.content ?? '',
        coverImageUrl: input.coverImageUrl ?? null,
        featuredMediaType: input.featuredMediaType ?? null,
        featuredMediaValue: input.featuredMediaValue ?? null,
        tags: input.tags ?? [],
        status: 'draft',
        authorId: input.authorId ?? null,
      },
    });
  }

  async update(id: string, fields: Partial<CreateBlogPostInput>): Promise<void> {
    await prisma.blogPost.update({ where: { id }, data: fields });
  }

  async setStatus(id: string, status: 'draft' | 'published'): Promise<void> {
    await prisma.blogPost.update({
      where: { id },
      data: { status, publishedAt: status === 'published' ? new Date() : null },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.blogPost.delete({ where: { id } });
  }
}
