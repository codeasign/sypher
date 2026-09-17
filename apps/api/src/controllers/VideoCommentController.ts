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
import { cleanMentionIds, normalizeCommentBody, resolveVideoTargetOr404 } from '../lib/commentAccess';
import { consumeCommentAllowance } from '../lib/rateLimit';
import { HttpError } from '../lib/errors';
import { setPrivateNoCacheCache } from '../lib/httpCache';
import { CommentCreateRequest, CommentMessageResponse, COMMENT_RATE_LIMIT_MESSAGE } from './ModuleCommentController';

/**
 * Video discussion (Browse Videos player page, 2026-09-16) — same list/
 * create contract as CourseCommentController, video target gate instead
 * of the course gate (resolveVideoTargetOr404: published + uploaded, or
 * author/ADMIN).
 */

const commentRepository = new CommentRepository();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) return DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) return null;
  return parsed;
}

@Route('video-discussions')
@Tags('Comments')
export class VideoCommentController extends Controller {
  @Get('{videoId}/comments')
  @Security('session')
  public async listForVideo(
    @Path() videoId: string,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Query() sort?: string,
    @Query() cursor?: string,
    @Query() limit?: string,
  ): Promise<CommentListPage | void> {
    setPrivateNoCacheCache(this);
    const user = request.user as User;
    if (sort !== undefined && !isCommentSortMode(sort)) {
      return badRequest(400, { message: 'sort must be one of: chrono, upvotes, useful' });
    }
    const mode: CommentSortMode = sort === undefined ? 'chrono' : sort;
    const pageSize = parseLimit(limit);
    if (pageSize === null) {
      return badRequest(400, { message: 'limit must be an integer between 1 and 50' });
    }

    await resolveVideoTargetOr404(user, videoId);
    try {
      return await commentRepository.listTopLevel({ videoId }, user.id, mode, cursor, pageSize);
    } catch (error) {
      if (error instanceof HttpError) return badRequest(400, { message: error.message });
      throw error;
    }
  }

  @Post('{videoId}/comments')
  @Security('session')
  public async createForVideo(
    @Path() videoId: string,
    @Body() body: CommentCreateRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Res() tooManyRequests: TsoaResponse<429, CommentMessageResponse, { 'Retry-After': string }>,
  ): Promise<CommentViewData | void> {
    const user = request.user as User;

    const retryAfterSeconds = await consumeCommentAllowance(user.id);
    if (retryAfterSeconds > 0) {
      return tooManyRequests(429, { message: COMMENT_RATE_LIMIT_MESSAGE }, { 'Retry-After': String(retryAfterSeconds) });
    }

    const text = normalizeCommentBody(body.body);
    if (!text) return badRequest(400, { message: 'Comment must be between 1 and 5000 characters' });

    await resolveVideoTargetOr404(user, videoId);
    try {
      const id = await commentRepository.create(
        { videoId },
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
