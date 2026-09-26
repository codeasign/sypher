import { Body, Controller, Get, Path, Post, Query, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { CommentRepository, type CommentReportedRow } from '../repositories/CommentRepository';
import { requireAdmin } from '../lib/authz';
import { setPrivateNoStoreCache } from '../lib/httpCache';

/**
 * Admin-only "Reported Comments" moderation page — a distinct concern from
 * CommentController's comment-id-scoped actions (report toggle lives
 * there, next to vote/helpful). Everything here operates across ALL
 * comments, gated by requireAdmin per method (same convention as
 * AccessController), not by ownership of any one comment.
 */

const commentRepository = new CommentRepository();

export interface ReportedCommentListResponse {
  items: CommentReportedRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommentReportResolveRequest {
  resolved: boolean;
}

@Route('comment-reports')
@Tags('Comments')
@Security('session')
export class CommentReportController extends Controller {
  @Get()
  public async list(
    @Request() request: ExpressRequest,
    @Query() resolved?: 'open' | 'resolved' | 'all',
    @Query() page?: number,
    @Query() pageSize?: number,
  ): Promise<ReportedCommentListResponse> {
    setPrivateNoStoreCache(this);
    requireAdmin(request.user as User);
    const safePage = Math.max(1, Math.floor(page ?? 1));
    const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize ?? 20)));
    const { items, total } = await commentRepository.listReported({
      resolved: resolved ?? 'open',
      page: safePage,
      pageSize: safePageSize,
    });
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  // Dismiss (resolved: true) or reopen (resolved: false) without removing
  // the comment — e.g. an admin decides the report was unfounded.
  @Post('{commentId}/resolve')
  public async resolve(
    @Path() commentId: string,
    @Body() body: CommentReportResolveRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    requireAdmin(request.user as User);
    await commentRepository.setReportResolved(commentId, body.resolved);
  }

  // Removes the comment from view for everyone EXCEPT as a visible "This
  // comment was deleted by an admin" placeholder (deliberately not the
  // owner/instructor delete's full invisibility — see isRemovedByModerator
  // on the Comment model) and logs a durable audit record (who posted it,
  // what it said, who removed it, when — CommentModerationLog).
  @Post('{commentId}/remove')
  public async remove(@Path() commentId: string, @Request() request: ExpressRequest): Promise<void> {
    const user = request.user as User;
    requireAdmin(user);
    await commentRepository.removeByModerator(commentId, user.id);
  }
}
