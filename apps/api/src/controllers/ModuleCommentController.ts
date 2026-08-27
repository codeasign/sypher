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
  resolveModuleTargetOr404,
} from '../lib/commentAccess';
import { consumeCommentAllowance } from '../lib/rateLimit';
import { HttpError } from '../lib/errors';

/**
 * Lesson-scoped discussion endpoints (spec §13). Response DTOs are the
 * repository's wire-ready `CommentViewData` / `CommentListPage` types —
 * domain-prefixed at their single source of truth rather than mirrored
 * here. The blog-post twin lives in BlogCommentController; everything
 * past the target gate in lib/commentAccess is content-type-agnostic.
 */

const commentRepository = new CommentRepository();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
export const COMMENT_RATE_LIMIT_MESSAGE =
  "You're posting too quickly. Please wait a moment before commenting again.";

function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) return DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) return null;
  return parsed;
}

@Route('modules')
@Tags('Comments')
export class ModuleCommentController extends Controller {
  // Top-level page for a lesson's discussion (§2/§6). sort omitted = the
  // chrono default (tops newest-first); explicit modes apply uniformly.
  @Get('{moduleId}/comments')
  @Security('session')
  public async listForModule(
    @Path() moduleId: string,
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

    await resolveModuleTargetOr404(user, moduleId);
    try {
      return await commentRepository.listTopLevel({ courseModuleId: moduleId }, user.id, mode, cursor, pageSize);
    } catch (error) {
      if (error instanceof HttpError) return badRequest(400, { message: error.message });
      throw error;
    }
  }

  // Creates a top-level comment or a flat reply (parentId optional, must
  // reference a top-level comment of THIS module — enforced in the
  // repository, which also derives the target FKs from the parent row).
  @Post('{moduleId}/comments')
  @Security('session')
  public async createForModule(
    @Path() moduleId: string,
    @Body() body: CommentCreateRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Res() tooManyRequests: TsoaResponse<429, CommentMessageResponse, { 'Retry-After': string }>,
  ): Promise<CommentViewData | void> {
    const user = request.user as User;

    // Rate limit first — rejected floods cost no DB reads (deliberate:
    // probing locked modules also burns budget, which is harmless).
    const retryAfterSeconds = consumeCommentAllowance(user.id);
    if (retryAfterSeconds > 0) {
      return tooManyRequests(429, { message: COMMENT_RATE_LIMIT_MESSAGE }, { 'Retry-After': String(retryAfterSeconds) });
    }

    const text = normalizeCommentBody(body.body);
    if (!text) return badRequest(400, { message: 'Comment must be between 1 and 5000 characters' });

    await resolveModuleTargetOr404(user, moduleId);
    try {
      const id = await commentRepository.create(
        { courseModuleId: moduleId },
        user.id,
        text,
        cleanMentionIds(body.mentionedUserIds).slice(0, MAX_MENTIONS_PER_COMMENT),
        body.parentId,
      );
      const view = await commentRepository.findView(id, user.id);
      return view ?? notFound(404);
    } catch (error) {
      // Parent missing/deleted/not-a-top-level-of-this-module.
      if (error instanceof HttpError && error.status === 404) return notFound(404);
      throw error;
    }
  }
}

// Shared request/error payloads — defined once here and imported by the
// other comment controllers so the swagger spec stays consistent.
export interface CommentCreateRequest {
  body: string;
  /** Present = flat reply; must reference a TOP-LEVEL comment (never another reply). */
  parentId?: string;
  /** Autocomplete-selected real user IDs only — never free-typed text (spec §11). */
  mentionedUserIds?: string[];
}

export interface CommentMessageResponse {
  message: string;
}
