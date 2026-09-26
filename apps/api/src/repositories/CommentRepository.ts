import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/errors';
import type { Prisma } from '@prisma/client';
import type { CommentVoteType } from '../lib/apiEnums';

/**
 * All discussion reads/writes (spec §2–§11). Controllers never touch Prisma.
 *
 * Attachment model: every Comment carries exactly one target FK
 * (courseModuleId XOR blogPostId — enforced by the hand-written
 * Comment_exactly_one_target CHECK in the migration). The generic internals
 * below are keyed off a `{ courseModuleId?, blogPostId? }` target object;
 * the per-target public methods differ ONLY in which key they fill in —
 * sorting, threading, voting, helpful, best-answer and delete logic have
 * zero content-type branching.
 */

export type CommentSortMode = 'chrono' | 'upvotes' | 'useful';

const SORT_MODES: CommentSortMode[] = ['chrono', 'upvotes', 'useful'];

export function isCommentSortMode(value: unknown): value is CommentSortMode {
  return typeof value === 'string' && (SORT_MODES as string[]).includes(value);
}

/** Hard cap on tracked mentions per comment (spec §11 keeps mentions tied to real users). */
export const MAX_MENTIONS_PER_COMMENT = 10;

const COMMENT_BODY_MAX_LENGTH = 5000;

interface CommentTarget {
  courseModuleId?: string;
  blogPostId?: string;
  // Course-level discussion (the /learn/[slug] home page's Discussion tab,
  // added 2026-08-27) — distinct from courseModuleId, one lesson's thread.
  courseId?: string;
  // Standalone video discussion (Manage/Browse Videos, 2026-09-16).
  videoId?: string;
}

// Author identity plus live-derived content-author flag ("Instructor" /
// "Author" badge input — spec §8): role at read time, never stored.
export interface CommentAuthorData {
  id: string;
  fullName: string | null;
  username: string;
  role: string;
  avatarUrl: string | null;
}

export interface CommentViewData {
  id: string;
  parentId: string | null;
  body: string;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  helpfulCount: number;
  isBestAnswer: boolean;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  author: CommentAuthorData;
  isContentAuthor: boolean;
  mentions: { userId: string; username: string }[];
  viewerVote: CommentVoteType | null;
  viewerHelpful: boolean;
  viewerReported: boolean;
  /**
   * True when an admin removed this from the Reported Comments page — body
   * above is already substituted with a fixed placeholder (never the real
   * text; see assembleViews), distinct from isDeleted's full invisibility.
   */
  isRemovedByModerator: boolean;
  /** Top-level rows only: visible reply count for the "N replies" affordance. */
  replyCount?: number;
}

const MODERATOR_REMOVED_BODY_PLACEHOLDER = 'This comment was deleted by an admin.';

/** One row on the admin Reported Comments page (CommentRepository.listReported). */
export interface CommentReportedRow {
  id: string;
  body: string;
  author: { id: string; fullName: string | null; username: string };
  reportCount: number;
  isReportResolved: boolean;
  isRemovedByModerator: boolean;
  createdAt: Date;
  target: { kind: 'module' | 'blog' | 'course' | 'video' | 'unknown'; label: string; href: string };
  lastRemoval: { removedAt: Date; removedBy: string } | null;
}

export interface CommentListPage {
  comments: CommentViewData[];
  nextCursor: string | null;
  /**
   * Viewer holds content-author (or ADMIN) rights on the attached target —
   * drives Best-Answer marking and moderation-delete affordances client-side
   * for instructors viewing OTHER people's threads (their own threads are
   * already derivable from comment authors). Server-computed; never trust a
   * client copy for authorization — endpoints re-check every action.
   */
  viewerIsContentAuthor: boolean;
}

export interface CommentRepliesPage {
  comments: CommentViewData[];
  viewerIsContentAuthor: boolean;
}

/** Everything a controller needs to decide edit/delete/best-answer rights. */
export interface CommentActionContext {
  id: string;
  parentId: string | null;
  authorId: string;
  /** Thread-root author (== authorId for a top-level comment). */
  rootAuthorId: string;
  /** Course.authorId or BlogPost.authorId of the attached target; null when unauthored. */
  contentAuthorId: string | null;
  /** Attached target FKs (exactly one set — DB CHECK constraint) — callers use these to re-run the target visibility gate before acting on the comment. */
  courseModuleId: string | null;
  blogPostId: string | null;
  courseId: string | null;
  videoId: string | null;
}

const commentRowInclude = {
  user: { select: { id: true, fullName: true, username: true, role: true, avatarUrl: true } },
  // All four optional includes are cheap; exactly one resolves non-null (CHECK).
  courseModule: { select: { course: { select: { authorId: true } } } },
  blogPost: { select: { authorId: true } },
  course: { select: { authorId: true } },
  video: { select: { authorId: true } },
} satisfies Prisma.CommentInclude;

type CommentRowWithRelations = Prisma.CommentGetPayload<{ include: typeof commentRowInclude }>;

function contentAuthorIdOf(row: CommentRowWithRelations): string | null {
  return row.courseModule?.course.authorId ?? row.blogPost?.authorId ?? row.course?.authorId ?? row.video?.authorId ?? null;
}

// ─── Cursor encoding (opaque to clients) ──────────────────────────────────
//
// Keyset tuples per sort mode, all sharing (createdAt, id) as stable
// tiebreakers in the primary's direction (spec §6). Note the id tiebreak
// gives a deterministic total order under ties, not chronological order —
// cuids aren't strictly monotonic and don't need to be for stability.

interface CursorPayload {
  k?: number; // primary sort value (score / helpfulCount); absent for chrono
  c: string; // createdAt ISO
  i: string; // id
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(raw: string): CursorPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    if (typeof payload.c !== 'string' || typeof payload.i !== 'string') return null;
    if (payload.k !== undefined && typeof payload.k !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
}

function cursorWherePredicate(mode: CommentSortMode, cursor: CursorPayload): Prisma.CommentWhereInput[] {
  const createdAt = new Date(cursor.c);
  if (mode === 'chrono') {
    return [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.i } }];
  }
  const primaryField = mode === 'upvotes' ? 'score' : 'helpfulCount';
  const k = cursor.k ?? 0;
  return [
    { [primaryField]: { lt: k } },
    { [primaryField]: k, createdAt: { lt: createdAt } },
    { [primaryField]: k, createdAt, id: { lt: cursor.i } },
  ];
}

function orderByFor(mode: CommentSortMode, chronoDirection: 'asc' | 'desc'): Prisma.CommentOrderByWithRelationInput[] {
  // chrono's direction differs per level (tops newest-first, replies
  // oldest-first — §6's default reading order); selected modes sort
  // uniformly descending with (createdAt, id) tiebreakers.
  if (mode === 'chrono') return [{ createdAt: chronoDirection }, { id: chronoDirection }];
  if (mode === 'upvotes') return [{ score: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
  return [{ helpfulCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
}

// ─── Repository ───────────────────────────────────────────────────────────

export class CommentRepository {
  // ---- Reads ----

  /**
   * One page of a target's top-level comments (`parentId IS NULL`), sorted
   * per §6: chrono = newest-first by default; upvotes/useful apply uniformly.
   */
  async listTopLevel(target: CommentTarget, viewerId: string | null, mode: CommentSortMode, cursorRaw: string | undefined, limit: number): Promise<CommentListPage> {
    const [page, viewerIsContentAuthor] = await Promise.all([
      this.listTopLevelRows(target, viewerId, mode, cursorRaw, limit),
      this.isTargetContentAuthor(target, viewerId),
    ]);
    return { ...page, viewerIsContentAuthor };
  }

  private async listTopLevelRows(
    target: CommentTarget,
    viewerId: string | null,
    mode: CommentSortMode,
    cursorRaw: string | undefined,
    limit: number,
  ): Promise<Omit<CommentListPage, 'viewerIsContentAuthor'>> {
    const where: Prisma.CommentWhereInput = {
      ...target,
      parentId: null,
      isDeleted: false,
    };
    let cursor: CursorPayload | undefined;
    if (cursorRaw) {
      cursor = decodeCursor(cursorRaw) ?? undefined;
      if (!cursor) throw new HttpError(400, 'Invalid pagination cursor');
      where.OR = cursorWherePredicate(mode, cursor);
    }

    const rows = await prisma.comment.findMany({
      where,
      include: commentRowInclude,
      orderBy: orderByFor(mode, 'desc'),
      take: limit,
    });

    const hasMore = rows.length === limit;
    const views = await this.assembleViews(rows, viewerId, { withReplyCounts: true });
    const last = rows.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor(
            mode === 'chrono'
              ? { c: last.createdAt.toISOString(), i: last.id }
              : { k: mode === 'upvotes' ? last.score : last.helpfulCount, c: last.createdAt.toISOString(), i: last.id },
          )
        : null;
    return { comments: views, nextCursor };
  }

  /**
   * A thread's full flat reply list (no pagination — bounded by thread
   * size). chrono = oldest-first reading order by default (§6). The
   * attached target is derived from the parent comment itself so callers
   * don't need to know it.
   */
  async listReplies(parentId: string, viewerId: string | null, mode: CommentSortMode): Promise<CommentRepliesPage | null> {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, isDeleted: false },
      select: { id: true, courseModuleId: true, blogPostId: true, courseId: true, videoId: true },
    });
    if (!parent) return null;

    const [rows, viewerIsContentAuthor] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId, isDeleted: false },
        include: commentRowInclude,
        orderBy: orderByFor(mode, mode === 'chrono' ? 'asc' : 'desc'),
      }),
      this.isTargetContentAuthor(
        {
          courseModuleId: parent.courseModuleId ?? undefined,
          blogPostId: parent.blogPostId ?? undefined,
          courseId: parent.courseId ?? undefined,
          videoId: parent.videoId ?? undefined,
        },
        viewerId,
      ),
    ]);
    return { comments: await this.assembleViews(rows, viewerId), viewerIsContentAuthor };
  }

  async findView(commentId: string, viewerId: string): Promise<CommentViewData | null> {
    const row = await prisma.comment.findFirst({
      where: { id: commentId, isDeleted: false },
      include: commentRowInclude,
    });
    if (!row) return null;
    const [view] = await this.assembleViews([row], viewerId);
    return view ?? null;
  }

  /** Permission inputs for edit/delete/best-answer decisions (controller-side rules). */
  async getActionContext(commentId: string): Promise<CommentActionContext | null> {
    const row = await prisma.comment.findFirst({
      where: { id: commentId, isDeleted: false },
      select: {
        id: true,
        userId: true,
        parentId: true,
        courseModuleId: true,
        blogPostId: true,
        courseId: true,
        videoId: true,
        parent: { select: { userId: true } },
        courseModule: { select: { course: { select: { authorId: true } } } },
        blogPost: { select: { authorId: true } },
        course: { select: { authorId: true } },
        video: { select: { authorId: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      parentId: row.parentId,
      authorId: row.userId,
      rootAuthorId: row.parent ? row.parent.userId : row.userId,
      contentAuthorId: row.courseModule?.course.authorId ?? row.blogPost?.authorId ?? row.course?.authorId ?? row.video?.authorId ?? null,
      courseModuleId: row.courseModuleId,
      blogPostId: row.blogPostId,
      courseId: row.courseId,
      videoId: row.videoId,
    };
  }

  // ---- Mutations ----

  /**
   * Creates a top-level comment or a flat reply (§2). When parentId is
   * given it must reference an EXISTING, NON-DELETED TOP-LEVEL comment of
   * the same target — a reply-to-reply is rejected here, not re-rooted,
   * keeping the two-level contract honest. The new row inherits its target
   * FKs from the resolved parent so a mismatched pair can't be smuggled in.
   */
  async create(target: CommentTarget, userId: string, body: string, mentionedUserIds: string[], parentId?: string): Promise<string> {
    return prisma.$transaction(async (tx) => {
      let resolvedTarget = target;
      if (parentId) {
        const parent = await tx.comment.findFirst({
          where: { id: parentId, parentId: null, isDeleted: false, ...target },
          select: { courseModuleId: true, blogPostId: true, courseId: true, videoId: true },
        });
        if (!parent) throw new HttpError(404, 'Comment not found');
        resolvedTarget = {
          courseModuleId: parent.courseModuleId ?? undefined,
          blogPostId: parent.blogPostId ?? undefined,
          courseId: parent.courseId ?? undefined,
          videoId: parent.videoId ?? undefined,
        };
      }

      const comment = await tx.comment.create({
        data: {
          courseModuleId: resolvedTarget.courseModuleId,
          blogPostId: resolvedTarget.blogPostId,
          courseId: resolvedTarget.courseId,
          videoId: resolvedTarget.videoId,
          userId,
          parentId: parentId ?? null,
          body,
        },
        select: { id: true },
      });

      await this.writeMentions(tx, comment.id, mentionedUserIds);
      return comment.id;
    });
  }

  /** Owner-only edit (§9) — sets isEdited/editedAt, replaces mention rows atomically. */
  async edit(commentId: string, editorId: string, body: string, mentionedUserIds: string[], viewerId: string): Promise<CommentViewData | null> {
    const edited = await prisma.$transaction(async (tx) => {
      // Ownership guard lives in the updateMany's WHERE — count 0 means
      // "not owner or gone", same idiom as MockExamAttemptRepository.submit.
      const result = await tx.comment.updateMany({
        where: { id: commentId, userId: editorId, isDeleted: false },
        data: { body, isEdited: true, editedAt: new Date() },
      });
      if (result.count === 0) return false;
      await tx.commentMention.deleteMany({ where: { commentId } });
      await this.writeMentions(tx, commentId, mentionedUserIds);
      return true;
    });
    return edited ? this.findView(commentId, viewerId) : null;
  }

  /**
   * Soft-delete with hard appearance (§10): flags the row (and, for a
   * top-level comment, ALL its replies — an explicit cascade-hide inside
   * the transaction; the DB's onDelete Cascade only covers hard deletes,
   * which we never issue). Deleted rows stay in the database but vanish
   * from every read path — there is no "[deleted]" placeholder anywhere.
   */
  async softDelete(commentId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const row = await tx.comment.findFirst({
        where: { id: commentId, isDeleted: false },
        select: { id: true, parentId: true },
      });
      if (!row) return false;

      const deletedAt = new Date();
      await tx.comment.update({ where: { id: row.id }, data: { isDeleted: true, deletedAt } });
      if (row.parentId === null) {
        await tx.comment.updateMany({
          where: { parentId: row.id, isDeleted: false },
          data: { isDeleted: true, deletedAt },
        });
      }
      return true;
    });
  }

  /**
   * Vote toggle/flip (§4) — cached counters move inside the SAME
   * transaction as the vote-row change, so they can never drift from the
   * rows behind them. Returns fresh counters plus the viewer's resulting
   * vote, or null when the comment doesn't exist / is deleted.
   */
  async setVote(
    commentId: string,
    userId: string,
    type: CommentVoteType,
  ): Promise<{ upvoteCount: number; downvoteCount: number; score: number; viewerVote: CommentVoteType | null } | null> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findFirst({
        where: { id: commentId, isDeleted: false },
        select: { upvoteCount: true, downvoteCount: true, score: true },
      });
      if (!comment) return null;

      const existing = await tx.commentVote.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      let { upvoteCount, downvoteCount, score } = comment;
      if (!existing) {
        await tx.commentVote.create({ data: { commentId, userId, type } });
        if (type === 'UP') upvoteCount += 1;
        else downvoteCount += 1;
        score += type === 'UP' ? 1 : -1;
      } else if (existing.type === type) {
        // Same click again removes the vote (§4).
        await tx.commentVote.delete({ where: { id: existing.id } });
        if (type === 'UP') upvoteCount -= 1;
        else downvoteCount -= 1;
        score += type === 'UP' ? -1 : 1;
      } else {
        // Opposite click flips it.
        await tx.commentVote.update({ where: { id: existing.id }, data: { type } });
        if (type === 'UP') {
          upvoteCount += 1;
          downvoteCount -= 1;
          score += 2;
        } else {
          upvoteCount -= 1;
          downvoteCount += 1;
          score -= 2;
        }
      }

      await tx.comment.update({ where: { id: commentId }, data: { upvoteCount, downvoteCount, score } });
      return { upvoteCount, downvoteCount, score, viewerVote: existing?.type === type ? null : type };
    });
  }

  /** Helpful toggle (§5) — independent of votes and Best Answer. */
  async toggleHelpful(
    commentId: string,
    userId: string,
  ): Promise<{ helpfulCount: number; viewerHelpful: boolean } | null> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findFirst({
        where: { id: commentId, isDeleted: false },
        select: { helpfulCount: true },
      });
      if (!comment) return null;

      const existing = await tx.commentHelpful.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      let helpfulCount = comment.helpfulCount;
      if (existing) {
        await tx.commentHelpful.delete({ where: { id: existing.id } });
        helpfulCount -= 1;
      } else {
        await tx.commentHelpful.create({ data: { commentId, userId } });
        helpfulCount += 1;
      }
      await tx.comment.update({ where: { id: commentId }, data: { helpfulCount } });
      return { helpfulCount, viewerHelpful: !existing };
    });
  }

  /** Report toggle — same one-per-(comment,user) shape as toggleHelpful. Purely a signal; never hides or alters the comment itself. */
  async toggleReport(commentId: string, userId: string): Promise<{ reportCount: number; viewerReported: boolean } | null> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findFirst({
        where: { id: commentId, isDeleted: false },
        select: { reportCount: true },
      });
      if (!comment) return null;

      const existing = await tx.commentReport.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      let reportCount = comment.reportCount;
      if (existing) {
        await tx.commentReport.delete({ where: { id: existing.id } });
        reportCount -= 1;
      } else {
        await tx.commentReport.create({ data: { commentId, userId } });
        reportCount += 1;
        // A fresh report on a previously-resolved comment reopens it —
        // otherwise a new report would silently sit hidden behind the old
        // resolution on the admin page's default "open" filter.
        await tx.comment.update({ where: { id: commentId }, data: { reportCount, isReportResolved: false } });
        return { reportCount, viewerReported: true };
      }
      await tx.comment.update({ where: { id: commentId }, data: { reportCount } });
      return { reportCount, viewerReported: false };
    });
  }

  /**
   * Admin Reported Comments page — paginated, newest-report-first within
   * the open/resolved/all filter. Each row carries enough target context
   * (course/module/blog/video title + a deep link) for an admin to jump
   * straight to the thread without a second lookup.
   */
  async listReported(opts: {
    resolved: 'open' | 'resolved' | 'all';
    page: number;
    pageSize: number;
  }): Promise<{ items: CommentReportedRow[]; total: number }> {
    const where: Prisma.CommentWhereInput = {
      isDeleted: false,
      reportCount: { gt: 0 },
      ...(opts.resolved === 'open' ? { isReportResolved: false } : opts.resolved === 'resolved' ? { isReportResolved: true } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          courseModule: { select: { id: true, slug: true, title: true, course: { select: { slug: true } } } },
          blogPost: { select: { id: true, title: true, slug: true } },
          course: { select: { id: true, name: true, slug: true } },
          video: { select: { id: true, title: true, slug: true } },
          moderationLogs: {
            orderBy: { removedAt: 'desc' },
            take: 1,
            include: { removedBy: { select: { fullName: true, username: true } } },
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return {
      total,
      items: rows.map((row) => {
        const target = row.courseModule
          ? { kind: 'module' as const, label: row.courseModule.title, href: `/learn/${row.courseModule.course.slug}/${row.courseModule.slug}#comment-${row.id}` }
          : row.blogPost
            ? { kind: 'blog' as const, label: row.blogPost.title, href: `/blog/${row.blogPost.slug}#comment-${row.id}` }
            : row.course
              ? { kind: 'course' as const, label: row.course.name, href: `/learn/${row.course.slug}#comment-${row.id}` }
              : row.video
                ? { kind: 'video' as const, label: row.video.title, href: `/videos/${row.video.slug}#comment-${row.id}` }
                : { kind: 'unknown' as const, label: 'Unknown', href: '#' };
        const lastRemoval = row.moderationLogs[0];
        return {
          id: row.id,
          body: row.isRemovedByModerator ? MODERATOR_REMOVED_BODY_PLACEHOLDER : row.body,
          author: { id: row.user.id, fullName: row.user.fullName, username: row.user.username },
          reportCount: row.reportCount,
          isReportResolved: row.isReportResolved,
          isRemovedByModerator: row.isRemovedByModerator,
          createdAt: row.createdAt,
          target,
          lastRemoval: lastRemoval
            ? { removedAt: lastRemoval.removedAt, removedBy: lastRemoval.removedBy ? lastRemoval.removedBy.fullName || lastRemoval.removedBy.username : 'Unknown' }
            : null,
        };
      }),
    };
  }

  /** Dismiss or reopen report(s) on a comment without removing it. */
  async setReportResolved(commentId: string, resolved: boolean): Promise<boolean> {
    const result = await prisma.comment.updateMany({
      where: { id: commentId, isDeleted: false },
      data: { isReportResolved: resolved },
    });
    return result.count > 0;
  }

  /**
   * Admin removal FROM the Reported Comments page. Deliberately the
   * opposite of softDelete's invisibility: the row stays visible (never
   * touches isDeleted), rendered everywhere as a fixed placeholder (see
   * assembleViews), while the real body/author are preserved permanently
   * in a CommentModerationLog row for audit — independent of this Comment
   * row's own fate later (edit, further moderation, etc).
   */
  async removeByModerator(commentId: string, removedById: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findFirst({
        where: { id: commentId, isDeleted: false, isRemovedByModerator: false },
        select: { id: true, userId: true, body: true },
      });
      if (!comment) return false;

      await tx.comment.update({
        where: { id: commentId },
        data: { isRemovedByModerator: true, isReportResolved: true },
      });
      await tx.commentModerationLog.create({
        data: {
          commentId,
          commentAuthorId: comment.userId,
          commentBody: comment.body,
          removedById,
        },
      });
      return true;
    });
  }

  /**
   * Best Answer swap (§7): exactly one per thread group (the top-level
   * comment + all its replies — any member can carry the marker, which is
   * what makes "unset the previous one" meaningful). Resolves the group
   * root from the target, clears previous holder(s), sets the new one —
   * all in ONE transaction so a reader never sees zero-or-two states.
   * Permission (thread-root author ‖ content-author ‖ ADMIN) is checked by
   * the controller via getActionContext before calling this.
   */
  async setBestAnswer(commentId: string, viewerId: string): Promise<CommentViewData | null> {
    const set = await prisma.$transaction(async (tx) => {
      // Re-read the target INSIDE the transaction — a soft-delete between a
      // pre-check and here must resolve to a clean null (→ 404), not a
      // P2025 from `update`.
      const target = await tx.comment.findFirst({
        where: { id: commentId, isDeleted: false },
        select: { id: true, parentId: true },
      });
      if (!target) return false;
      const rootId = target.parentId ?? target.id;

      await tx.comment.updateMany({
        where: { OR: [{ id: rootId }, { parentId: rootId }], isDeleted: false, isBestAnswer: true },
        data: { isBestAnswer: false },
      });
      await tx.comment.updateMany({
        where: { id: target.id, isDeleted: false },
        data: { isBestAnswer: true },
      });
      return true;
    });
    return set ? this.findView(commentId, viewerId) : null;
  }

  /** Content-author check for the VIEWER against the attached target (badge/moderation input). */
  private async isTargetContentAuthor(target: CommentTarget, viewerId: string | null): Promise<boolean> {
    if (viewerId === null) return false;
    if (target.courseModuleId) {
      const row = await prisma.courseModule.findUnique({
        where: { id: target.courseModuleId },
        select: { course: { select: { authorId: true } } },
      });
      return row?.course.authorId === viewerId;
    }
    if (target.blogPostId) {
      const row = await prisma.blogPost.findUnique({
        where: { id: target.blogPostId },
        select: { authorId: true },
      });
      return row?.authorId === viewerId;
    }
    if (target.courseId) {
      const row = await prisma.course.findUnique({
        where: { id: target.courseId },
        select: { authorId: true },
      });
      return row?.authorId === viewerId;
    }
    if (target.videoId) {
      const row = await prisma.video.findUnique({
        where: { id: target.videoId },
        select: { authorId: true },
      });
      return row?.authorId === viewerId;
    }
    return false;
  }

  // ---- Internals ----

  /**
   * Validates mention candidates against REAL users (deleted excluded),
   * dedupes, caps at MAX_MENTIONS_PER_COMMENT, writes the rows. Mention
   * storage is keyed by userId only — never parsed from body text (§11).
   */
  private async writeMentions(tx: Prisma.TransactionClient, commentId: string, mentionedUserIds: string[]): Promise<void> {
    const unique = [...new Set(mentionedUserIds)].slice(0, MAX_MENTIONS_PER_COMMENT);
    if (unique.length === 0) return;
    const users = await tx.user.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (users.length === 0) return;
    await tx.commentMention.createMany({
      data: users.map((u) => ({ commentId, mentionedUserId: u.id })),
    });
  }

  /**
   * Shared view assembly — batched companion queries per page (viewer's
   * votes/helpfuls, mention usernames, reply counts), merged in memory.
   * No N+1 anywhere on the hot read path.
   */
  private async assembleViews(
    rows: CommentRowWithRelations[],
    viewerId: string | null,
    opts?: { withReplyCounts?: boolean },
  ): Promise<CommentViewData[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    // An anonymous viewer has no votes/helpfuls of their own to look up —
    // skip both queries rather than filtering on userId: null (which would
    // never match a real row and is a wasted round-trip either way).
    const [viewerVotes, viewerHelpfuls, viewerReports, mentionRows, replyCounts] = await Promise.all([
      viewerId === null
        ? Promise.resolve([] as { commentId: string; type: CommentVoteType }[])
        : prisma.commentVote.findMany({
            where: { commentId: { in: ids }, userId: viewerId },
            select: { commentId: true, type: true },
          }),
      viewerId === null
        ? Promise.resolve([] as { commentId: string }[])
        : prisma.commentHelpful.findMany({
            where: { commentId: { in: ids }, userId: viewerId },
            select: { commentId: true },
          }),
      viewerId === null
        ? Promise.resolve([] as { commentId: string }[])
        : prisma.commentReport.findMany({
            where: { commentId: { in: ids }, userId: viewerId },
            select: { commentId: true },
          }),
      prisma.commentMention.findMany({
        where: { commentId: { in: ids } },
        select: { commentId: true, mentionedUserId: true, mentionedUser: { select: { username: true } } },
      }),
      opts?.withReplyCounts
        ? prisma.comment.groupBy({
            by: ['parentId'],
            where: { parentId: { in: ids }, isDeleted: false },
            _count: { _all: true },
          })
        : Promise.resolve([] as { parentId: string | null; _count: { _all: number } }[]),
    ]);

    const voteById = new Map(viewerVotes.map((v) => [v.commentId, v.type]));
    const helpfulIds = new Set(viewerHelpfuls.map((h) => h.commentId));
    const reportedIds = new Set(viewerReports.map((r) => r.commentId));
    const mentionsByComment = new Map<string, { userId: string; username: string }[]>();
    for (const m of mentionRows) {
      const list = mentionsByComment.get(m.commentId) ?? [];
      list.push({ userId: m.mentionedUserId, username: m.mentionedUser.username });
      mentionsByComment.set(m.commentId, list);
    }
    const replyCountByParent = new Map(
      replyCounts.filter((r) => r.parentId !== null).map((r) => [r.parentId as string, r._count._all]),
    );

    return rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      // Admin-moderated removal: never serve the real text again once
      // removed (never trust the frontend alone to hide it) — the original
      // is preserved for audit purposes only in CommentModerationLog, not
      // here. Distinct from isDeleted, which these queries already filter
      // out entirely (assembleViews never even sees those rows).
      body: row.isRemovedByModerator ? MODERATOR_REMOVED_BODY_PLACEHOLDER : row.body,
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      score: row.score,
      helpfulCount: row.helpfulCount,
      isBestAnswer: row.isBestAnswer,
      isEdited: row.isEdited,
      editedAt: row.editedAt,
      createdAt: row.createdAt,
      author: {
        id: row.user.id,
        fullName: row.user.fullName,
        username: row.user.username,
        role: row.user.role,
        avatarUrl: row.user.avatarUrl,
      },
      isContentAuthor: contentAuthorIdOf(row) === row.user.id,
      mentions: row.isRemovedByModerator ? [] : mentionsByComment.get(row.id) ?? [],
      viewerVote: voteById.get(row.id) ?? null,
      viewerHelpful: helpfulIds.has(row.id),
      viewerReported: reportedIds.has(row.id),
      isRemovedByModerator: row.isRemovedByModerator,
      ...(opts?.withReplyCounts ? { replyCount: replyCountByParent.get(row.id) ?? 0 } : {}),
    }));
  }
}
