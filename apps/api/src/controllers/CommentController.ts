import { Body, Controller, Delete, Get, Patch, Path, Post, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { CommentVoteType, User } from '@prisma/client';
import {
  CommentRepository,
  isCommentSortMode,
  MAX_MENTIONS_PER_COMMENT,
  type CommentRepliesPage,
  type CommentSortMode,
  type CommentViewData,
} from '../repositories/CommentRepository';
import { assertCommentTargetVisible, cleanMentionIds, normalizeCommentBody } from '../lib/commentAccess';
import { resolveOptionalUser } from '../lib/tsoaAuth';
import { CommentMessageResponse } from './ModuleCommentController';

/**
 * Comment-id-scoped actions (spec §13): flat reply list, owner edit,
 * soft-delete, vote/helpful toggles, Best Answer. Content-type-agnostic —
 * but a commentId alone carries no proof the caller can see its target, so
 * every handler re-runs assertCommentTargetVisible (same gate
 * ModuleCommentController/BlogCommentController enforce on entry) before
 * doing anything else. Ownership/moderation rights on top of that come
 * from getActionContext (owner / content-author / ADMIN).
 */

const commentRepository = new CommentRepository();

export interface CommentVoteRequest {
  type: CommentVoteType;
}

export interface CommentUpdateRequest {
  body: string;
  mentionedUserIds?: string[];
}

export interface CommentVoteStateResponse {
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  viewerVote: CommentVoteType | null;
}

export interface CommentHelpfulStateResponse {
  helpfulCount: number;
  viewerHelpful: boolean;
}

@Route('comments')
@Tags('Comments')
export class CommentController extends Controller {
  // A thread's full flat reply list (no pagination — §2). chrono default =
  // oldest-first reading order; selected modes apply uniformly. No
  // @Security here — shared by both content types, and blog-attached
  // replies must be publicly readable (module-attached replies still
  // 404 for an anonymous caller, enforced inside assertCommentTargetVisible
  // -> resolveModuleTargetOr404, which rejects a null user outright).
  @Get('{commentId}/replies')
  public async listReplies(
    @Path() commentId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
    @Query() sort?: string,
  ): Promise<CommentRepliesPage | void> {
    const user = await resolveOptionalUser(request);
    if (sort !== undefined && !isCommentSortMode(sort)) {
      return badRequest(400, { message: 'sort must be one of: chrono, upvotes, useful' });
    }
    const mode: CommentSortMode = sort === undefined ? 'chrono' : sort;

    const ctx = await commentRepository.getActionContext(commentId);
    if (!ctx) return notFound(404);
    await assertCommentTargetVisible(user, ctx);

    const page = await commentRepository.listReplies(commentId, user?.id ?? null, mode);
    return page ?? notFound(404);
  }

  // Owner-only edit (§9) — no time restriction, sets isEdited/editedAt.
  @Patch('{commentId}')
  @Security('session')
  public async edit(
    @Path() commentId: string,
    @Body() body: CommentUpdateRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() forbidden: TsoaResponse<403, CommentMessageResponse>,
    @Res() badRequest: TsoaResponse<400, CommentMessageResponse>,
  ): Promise<CommentViewData | void> {
    const user = request.user as User;
    const text = normalizeCommentBody(body.body);
    if (!text) return badRequest(400, { message: 'Comment must be between 1 and 5000 characters' });

    const ctx = await commentRepository.getActionContext(commentId);
    if (!ctx) return notFound(404);
    await assertCommentTargetVisible(user, ctx);
    if (ctx.authorId !== user.id) return forbidden(403, { message: 'Only the author can edit a comment' });

    const view = await commentRepository.edit(commentId, user.id, text, cleanMentionIds(body.mentionedUserIds).slice(0, MAX_MENTIONS_PER_COMMENT), user.id);
    return view ?? notFound(404);
  }

  // Soft-delete with hard appearance (§10): owner or content-author/ADMIN
  // (moderation). Deleting a top-level comment cascade-hides its replies
  // in the same transaction; rows persist for audit/moderation but no
  // read path ever returns them, so nothing renders as "[deleted]".
  @Delete('{commentId}')
  @Security('session')
  public async remove(
    @Path() commentId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() forbidden: TsoaResponse<403, CommentMessageResponse>,
  ): Promise<CommentMessageResponse | void> {
    const user = request.user as User;
    const ctx = await commentRepository.getActionContext(commentId);
    if (!ctx) return notFound(404);
    await assertCommentTargetVisible(user, ctx);

    const isModerator = user.role === 'ADMIN' || (ctx.contentAuthorId !== null && ctx.contentAuthorId === user.id);
    if (ctx.authorId !== user.id && !isModerator) {
      return forbidden(403, { message: 'Only the author or a moderator can delete a comment' });
    }

    const deleted = await commentRepository.softDelete(commentId);
    if (!deleted) return notFound(404);
    return { message: 'Comment deleted' };
  }

  // Vote toggle/flip (§4). Cached counters are updated inside the same
  // transaction as the vote row and returned fresh here.
  @Post('{commentId}/vote')
  @Security('session')
  public async vote(
    @Path() commentId: string,
    @Body() body: CommentVoteRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<CommentVoteStateResponse | void> {
    const user = request.user as User;
    const ctx = await commentRepository.getActionContext(commentId);
    if (!ctx) return notFound(404);
    await assertCommentTargetVisible(user, ctx);

    const state = await commentRepository.setVote(commentId, user.id, body.type);
    return state ?? notFound(404);
  }

  // Helpful toggle (§5) — independent of votes and Best Answer.
  @Post('{commentId}/helpful')
  @Security('session')
  public async markHelpful(
    @Path() commentId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<CommentHelpfulStateResponse | void> {
    const user = request.user as User;
    const ctx = await commentRepository.getActionContext(commentId);
    if (!ctx) return notFound(404);
    await assertCommentTargetVisible(user, ctx);

    const state = await commentRepository.toggleHelpful(commentId, user.id);
    return state ?? notFound(404);
  }

  // Best Answer (§7): one per thread group at a time; settable by the
  // thread-root's author, the content author, or ADMIN. Returns no body —
  // the previous holder also changed, so the client refetches the thread
  // (refresh-on-action per spec §14) rather than patching two rows locally.
  @Post('{commentId}/best-answer')
  @Security('session')
  public async setBestAnswer(
    @Path() commentId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
    @Res() forbidden: TsoaResponse<403, CommentMessageResponse>,
  ): Promise<void> {
    const user = request.user as User;
    const ctx = await commentRepository.getActionContext(commentId);
    if (!ctx) return notFound(404);
    await assertCommentTargetVisible(user, ctx);

    const isModerator = user.role === 'ADMIN' || (ctx.contentAuthorId !== null && ctx.contentAuthorId === user.id);
    if (ctx.rootAuthorId !== user.id && !isModerator) {
      return forbidden(403, { message: 'Only the question author or a moderator can pick the best answer' });
    }

    const view = await commentRepository.setBestAnswer(commentId, user.id);
    if (!view) return notFound(404);
  }
}
