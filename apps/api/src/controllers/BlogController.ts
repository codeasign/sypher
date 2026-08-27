import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { BlogPost, User } from '@prisma/client';
import { BlogPostRepository, type PublishedPostSummaryPage, type PublishedPostWithAuthor } from '../repositories/BlogPostRepository';
import { requireCanManageBlog } from '../lib/contentAuthz';
import { ForbiddenError } from '../lib/authz';
import { getOrSet, purge } from '../lib/cache';
import { assertNoReplacementChar } from '../lib/textSanitize';

const blogPostRepository = new BlogPostRepository();

const PUBLIC_CACHE_TTL_MS = 60_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
// Higher cap for the admin manage-list endpoint only — see the matching
// constant in CourseController.ts for the full rationale (client-side
// search/pagination over one fetched-once list, user's call 2026-08-27).
const MAX_MANAGE_PAGE_SIZE = 1000;

interface CreateBlogPostRequest {
  title: string;
  description: string;
  content?: string;
  coverImageUrl?: string | null;
  featuredMediaType?: 'pdf' | 'youtube' | null;
  featuredMediaValue?: string | null;
  tags?: string[];
}

interface SetBlogStatusRequest {
  status: 'draft' | 'published';
}

@Route('blog')
@Tags('Blog')
export class BlogController extends Controller {
  // Paginated (20/page by default) — the /blog catalog never renders every
  // post's body, so this deliberately returns summary fields only (see
  // BlogPostRepository.listPublishedPage). offset-based rather than
  // cursor-based: publishedAt ties are broken by insertion order well
  // enough for a "Show more" button, and offset lets the client compute
  // hasMore from total without an extra round trip.
  @Get()
  public async listPublished(@Query() limit?: string, @Query() offset?: string): Promise<PublishedPostSummaryPage> {
    const parsedLimit = limit === undefined ? DEFAULT_PAGE_SIZE : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    return getOrSet(`blog:published-list:${pageSize}:${pageOffset}`, PUBLIC_CACHE_TTL_MS, () =>
      blogPostRepository.listPublishedPage(pageSize, pageOffset),
    );
  }

  @Get('{slug}')
  public async getBySlug(@Path() slug: string): Promise<PublishedPostWithAuthor | null> {
    return getOrSet(`blog:published-detail:${slug}`, PUBLIC_CACHE_TTL_MS, () =>
      blogPostRepository.getPublishedBySlugWithAuthor(slug),
    );
  }

  @Post('revalidate')
  @Security('session')
  public async revalidate(@Request() request: ExpressRequest): Promise<void> {
    await requireCanManageBlog(request.user as User);
    purge('blog');
  }

  // Paginated (10/page default per the user's request), optional
  // ?search= over the title. Non-admins only see their own posts, same
  // scoping as the original "authorized roles manage own blog posts" policy.
  @Get('manage/list')
  @Security('session')
  public async listManage(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() search?: string,
  ): Promise<{ posts: BlogPost[]; total: number }> {
    const user = request.user as User;
    await requireCanManageBlog(user);
    const parsedLimit = limit === undefined ? 10 : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MANAGE_PAGE_SIZE) : 10;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    return blogPostRepository.listPage(pageSize, pageOffset, user.role === 'ADMIN' ? undefined : user.id, search);
  }

  @Post()
  @Security('session')
  public async create(@Body() body: CreateBlogPostRequest, @Request() request: ExpressRequest): Promise<BlogPost> {
    const user = request.user as User;
    await requireCanManageBlog(user);
    assertNoReplacementChar(body.title, 'Title');
    assertNoReplacementChar(body.description, 'Description');
    const post = await blogPostRepository.create({ ...body, authorId: user.id });
    purge('blog');
    return post;
  }

  private async assertOwnsPost(user: User, id: string): Promise<void> {
    await requireCanManageBlog(user);
    if (user.role === 'ADMIN') return;
    const post = await blogPostRepository.findById(id);
    if (!post || post.authorId !== user.id) {
      throw new ForbiddenError('You can only manage your own posts');
    }
  }

  @Put('{id}')
  @Security('session')
  public async update(@Path() id: string, @Body() body: Partial<CreateBlogPostRequest>, @Request() request: ExpressRequest): Promise<void> {
    await this.assertOwnsPost(request.user as User, id);
    assertNoReplacementChar(body.title, 'Title');
    assertNoReplacementChar(body.description, 'Description');
    await blogPostRepository.update(id, body);
    purge('blog');
  }

  @Put('{id}/status')
  @Security('session')
  public async updateStatus(@Path() id: string, @Body() body: SetBlogStatusRequest, @Request() request: ExpressRequest): Promise<void> {
    await this.assertOwnsPost(request.user as User, id);
    await blogPostRepository.setStatus(id, body.status);
    purge('blog');
  }

  @Delete('{id}')
  @Security('session')
  public async remove(@Path() id: string, @Request() request: ExpressRequest): Promise<void> {
    await this.assertOwnsPost(request.user as User, id);
    await blogPostRepository.delete(id);
    purge('blog');
  }
}
