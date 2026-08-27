import { Body, Controller, Get, Path, Post, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import {
  CommentRepository,
  isCommentSortMode,
  MAX_MENTIONS_PER_COMMENT,
  type CommentListPage,
  type CommentSortMode,
  type CommentViewData,
} from '../repositories/CommentRepository';
import {
  cleanMentionIds,
  normalizeCommentBody,
  resolveBlogPostTargetOr404,
} from '../lib/commentAccess';
import { consumeCommentAllowance } from '../lib/rateLimit';
import { resolveOptionalUser } from '../lib/tsoaAuth';
import { CommentMessageResponse, COMMENT_RATE_LIMIT_MESSAGE } from './ModuleCommentController';
import { HttpError } from '../lib/errors';

/**
 * Blog-post twin of ModuleCommentController (spec scope extension) — same
 * list/create contract, blog target gate instead of the module gate. The
 * ONLY content-type differences on the whole comment API live behind
 * resolveBlogPostTargetOr404: no lock/preview model, published-or-(author‖
 * ADMIN) visibility; drafts' discussions are visible to their author and
 * ADMIN only, exactly like draft bodies.
 */

const commentRepository = new CommentRepository();

@Route('blog-posts')
@Tags('Comments')
export class BlogCommentController extends Controller {
  // No @Security here on purpose — blog posts are public content, so
  // their discussions are readable by anyone, logged in or not (spec
  // extension 2026-08-26: "logged out user should be able to see the blog
  // post and its comments, just can't interact"). resolveOptionalUser
  // resolves who's asking WITHOUT rejecting when nobody is; a signed-in
  // viewer still gets their own viewerVote/viewerHelpful/isContentAuthor
  // personalization exactly as before. Every mutating endpoint below
  // keeps @Security('session') — reading is public, interacting is not.
  @Get('{postId}/comments')
  public async listForBlogPost(
    @Path() postId: string,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Query() sort?: string,
    @Query() cursor?: string,
    @Query() limit?: string,
  ): Promise<CommentListPage | void> {
    const user = await resolveOptionalUser(request);
    if (sort !== undefined && !isCommentSortMode(sort)) {
      return badRequest(400, { message: 'sort must be one of: chrono, upvotes, useful' });
    }
    const mode: CommentSortMode = sort === undefined ? 'chrono' : sort;
    let pageSize: number;
    if (limit === undefined) {
      pageSize = 20;
    } else {
      const parsed = Number.parseInt(limit, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
        return badRequest(400, { message: 'limit must be an integer between 1 and 50' });
      }
      pageSize = parsed;
    }

    await resolveBlogPostTargetOr404(user, postId);
    try {
      return await commentRepository.listTopLevel({ blogPostId: postId }, user?.id ?? null, mode, cursor, pageSize);
    } catch (error) {
      if (error instanceof HttpError) return badRequest(400, { message: error.message });
      throw error;
    }
  }

  @Post('{postId}/comments')
  @Security('session')
  public async createForBlogPost(
    @Path() postId: string,
    @Body() body: { body: string; parentId?: string; mentionedUserIds?: string[] },
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Res() tooManyRequests: TsoaResponse<429, CommentMessageResponse, { 'Retry-After': string }>,
  ): Promise<CommentViewData | void> {
    const user = request.user as User;

    const retryAfterSeconds = consumeCommentAllowance(user.id);
    if (retryAfterSeconds > 0) {
      return tooManyRequests(429, { message: COMMENT_RATE_LIMIT_MESSAGE }, { 'Retry-After': String(retryAfterSeconds) });
    }

    const text = normalizeCommentBody(body.body);
    if (!text) return badRequest(400, { message: 'Comment must be between 1 and 5000 characters' });

    await resolveBlogPostTargetOr404(user, postId);
    try {
      const id = await commentRepository.create(
        { blogPostId: postId },
        user.id,
        text,
        cleanMentionIds(body.mentionedUserIds).slice(0, MAX_MENTIONS_PER_COMMENT),
        body.parentId,
      );
      const view = await commentRepository.findView(id, user.id);
      return view ?? notFound(404);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return notFound(404);
      throw error;
    }
  }
}
