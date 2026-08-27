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
  resolveCourseTargetOr404,
} from '../lib/commentAccess';
import { consumeCommentAllowance } from '../lib/rateLimit';
import { HttpError } from '../lib/errors';
import { CommentCreateRequest, CommentMessageResponse, COMMENT_RATE_LIMIT_MESSAGE } from './ModuleCommentController';

/**
 * Course-level discussion (the /learn/[slug] home page's Discussion tab,
 * added 2026-08-27) — same list/create contract as ModuleCommentController,
 * course target gate instead of the module gate. Same "no anonymous
 * course access at all" rule as modules (unlike blog, which is public):
 * resolveCourseTargetOr404 rejects a null user outright.
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

@Route('course-discussions')
@Tags('Comments')
export class CourseCommentController extends Controller {
  // Top-level page for a course's discussion. sort omitted = the chrono
  // default (tops newest-first); explicit modes apply uniformly.
  @Get('{courseId}/comments')
  @Security('session')
  public async listForCourse(
    @Path() courseId: string,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Query() sort?: string,
    @Query() cursor?: string,
    @Query() limit?: string,
  ): Promise<CommentListPage | void> {
    const user = request.user as User;
    if (sort !== undefined && !isCommentSortMode(sort)) {
      return badRequest(400, { message: 'sort must be one of: chrono, upvotes, useful' });
    }
    const mode: CommentSortMode = sort === undefined ? 'chrono' : sort;
    const pageSize = parseLimit(limit);
    if (pageSize === null) {
      return badRequest(400, { message: 'limit must be an integer between 1 and 50' });
    }

    await resolveCourseTargetOr404(user, courseId);
    try {
      return await commentRepository.listTopLevel({ courseId }, user.id, mode, cursor, pageSize);
    } catch (error) {
      if (error instanceof HttpError) return badRequest(400, { message: error.message });
      throw error;
    }
  }

  // Creates a top-level comment or a flat reply (parentId optional, must
  // reference a top-level comment of THIS course — enforced in the
  // repository, which also derives the target FKs from the parent row).
  @Post('{courseId}/comments')
  @Security('session')
  public async createForCourse(
    @Path() courseId: string,
    @Body() body: CommentCreateRequest,
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

    await resolveCourseTargetOr404(user, courseId);
    try {
      const id = await commentRepository.create(
        { courseId },
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
