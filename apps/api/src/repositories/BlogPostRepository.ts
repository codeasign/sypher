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

export interface PublishedPostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  coverImageUrl: string | null;
}

export interface PublishedPostSummaryPage {
  posts: PublishedPostSummary[];
  total: number;
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

  // Paginated twin for /manage-blog's table (10/page default). Unlike the
  // public listPublishedPage, this keeps `content` — the manage table
  // doesn't render it, but the editor reuses these rows without a second
  // fetch, same as the unpaginated list() above always did. Optional
  // search matches the title, case-insensitive.
  async listPage(limit: number, offset: number, authorId?: string, search?: string): Promise<{ posts: BlogPost[]; total: number }> {
    const where = {
      ...(authorId ? { authorId } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.blogPost.count({ where }),
    ]);
    return { posts, total };
  }

  async listPublished(): Promise<BlogPost[]> {
    return prisma.blogPost.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' } });
  }

  /**
   * Paginated listing summary — deliberately omits `content` (the full
   * markdown body). The listing page never renders post bodies, so with
   * hundreds of posts, selecting the full row on every page load is pure
   * waste; this is the query the /blog catalog actually needs.
   */
  async listPublishedPage(limit: number, offset: number): Promise<PublishedPostSummaryPage> {
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: 'published' },
        // id as a tiebreaker: publishedAt alone isn't unique enough to
        // paginate on — many rows can share the exact same timestamp (a
        // single batched INSERT's `now()` is identical for every row in
        // it), and ORDER BY with ties unresolved is not guaranteed stable
        // across separate queries, so offset pagination would return
        // duplicates/gaps between pages without this.
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: { slug: true, title: true, description: true, publishedAt: true, coverImageUrl: true },
        take: limit,
        skip: offset,
      }),
      prisma.blogPost.count({ where: { status: 'published' } }),
    ]);
    return { posts, total };
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
