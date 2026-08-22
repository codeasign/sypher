import { Body, Controller, Delete, Get, Path, Post, Put, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { BlogPost, User } from '@prisma/client';
import { BlogPostRepository, type PublishedPostWithAuthor } from '../repositories/BlogPostRepository';
import { requireCanManageBlog } from '../lib/contentAuthz';
import { ForbiddenError } from '../lib/authz';
import { getOrSet, purge } from '../lib/cache';

const blogPostRepository = new BlogPostRepository();

const PUBLIC_CACHE_TTL_MS = 60_000;

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
  @Get()
  public async listPublished(): Promise<BlogPost[]> {
    return getOrSet('blog:published-list', PUBLIC_CACHE_TTL_MS, () => blogPostRepository.listPublished());
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

  @Get('manage/list')
  @Security('session')
  public async listManage(@Request() request: ExpressRequest): Promise<BlogPost[]> {
    const user = request.user as User;
    await requireCanManageBlog(user);
    // Non-admins only see their own posts, same scoping as the original
    // "authorized roles manage own blog posts" policy.
    return blogPostRepository.list(user.role === 'ADMIN' ? undefined : user.id);
  }

  @Post()
  @Security('session')
  public async create(@Body() body: CreateBlogPostRequest, @Request() request: ExpressRequest): Promise<BlogPost> {
    const user = request.user as User;
    await requireCanManageBlog(user);
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
