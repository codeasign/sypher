import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Read-only views of a user's discussion footprint for the profile page:
 * headline counts (cheap), and cursor-paginated lists of their own
 * comments filtered by kind (post / reply / any) and scope (blog / course).
 * The profile page loads one page of one tab at a time — nothing here fans
 * out across every thread. All reads filter soft-deleted comments.
 */

export type ActivityCommentKind = 'post' | 'reply' | 'any';
export type ActivityScope = 'blog' | 'course' | 'all';

export interface ActivityCounts {
  posts: number;
  replies: number;
  upvotes: number;
  downvotes: number;
  helpful: number;
  blogPosts: number;
  blogReplies: number;
  courseComments: number;
}

export interface ActivityTarget {
  type: 'blog' | 'course' | 'module';
  title: string;
  href: string;
  /** Blog post author, or course author for course/lesson targets. */
  authorName: string | null;
}

export interface ActivityParent {
  id: string;
  excerpt: string;
  authorName: string;
}

export interface ActivityReplier {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ActivityReplies {
  count: number;
  users: ActivityReplier[];
}

export interface ActivityComment {
  id: string;
  body: string;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  createdAt: string;
  target: ActivityTarget | null;
  /** The comment this was a reply to (null for posts, or if that parent was deleted). */
  parent: ActivityParent | null;
  /** Who replied to this comment — populated for top-level rows only, null for replies. */
  repliers: ActivityReplies | null;
}

export interface ActivityCommentPage {
  items: ActivityComment[];
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;
const BODY_EXCERPT = 220;
const PARENT_EXCERPT = 140;
const REPLIERS_SHOWN = 5;

const authorSelect = { select: { fullName: true, username: true } } as const;

const targetSelect = {
  blogPost: { select: { slug: true, title: true, author: authorSelect } },
  course: { select: { slug: true, name: true, author: authorSelect } },
  courseModule: {
    select: {
      slug: true,
      title: true,
      course: { select: { slug: true, name: true, author: authorSelect } },
    },
  },
} as const;

const parentSelect = {
  id: true,
  body: true,
  isDeleted: true,
  user: { select: { fullName: true, username: true } },
} as const;

type AuthorRow = { fullName: string | null; username: string } | null;

interface TargetRow {
  blogPost: { slug: string; title: string; author: AuthorRow } | null;
  course: { slug: string; name: string; author: AuthorRow } | null;
  courseModule: {
    slug: string;
    title: string;
    course: { slug: string; name: string; author: AuthorRow };
  } | null;
}

const BLOG_TARGET: Prisma.CommentWhereInput = { blogPostId: { not: null } };
const COURSE_TARGET: Prisma.CommentWhereInput = {
  OR: [{ courseId: { not: null } }, { courseModuleId: { not: null } }],
};

function toExcerpt(body: string, max: number): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function authorNameOf(author: AuthorRow): string | null {
  return author ? (author.fullName ?? author.username) : null;
}

function resolveTarget(row: TargetRow): ActivityTarget | null {
  if (row.blogPost) {
    return {
      type: 'blog',
      title: row.blogPost.title,
      href: `/blog/${row.blogPost.slug}`,
      authorName: authorNameOf(row.blogPost.author),
    };
  }
  if (row.course) {
    return {
      type: 'course',
      title: row.course.name,
      href: `/learn/${row.course.slug}`,
      authorName: authorNameOf(row.course.author),
    };
  }
  if (row.courseModule) {
    return {
      type: 'module',
      title: `${row.courseModule.course.name} · ${row.courseModule.title}`,
      href: `/learn/${row.courseModule.course.slug}/${row.courseModule.slug}`,
      authorName: authorNameOf(row.courseModule.course.author),
    };
  }
  return null;
}

interface Cursor {
  c: string; // createdAt ISO
  i: string; // id
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<Cursor>;
    return typeof parsed.c === 'string' && typeof parsed.i === 'string'
      ? { c: parsed.c, i: parsed.i }
      : null;
  } catch {
    return null;
  }
}

export class UserActivityRepository {
  async counts(userId: string): Promise<ActivityCounts> {
    const [posts, replies, upvotes, downvotes, helpful, blogPosts, blogReplies, courseComments] =
      await Promise.all([
        prisma.comment.count({ where: { userId, parentId: null, isDeleted: false } }),
        prisma.comment.count({ where: { userId, parentId: { not: null }, isDeleted: false } }),
        prisma.commentVote.count({ where: { userId, type: 'UP' } }),
        prisma.commentVote.count({ where: { userId, type: 'DOWN' } }),
        prisma.commentHelpful.count({ where: { userId } }),
        prisma.comment.count({ where: { userId, isDeleted: false, parentId: null, ...BLOG_TARGET } }),
        prisma.comment.count({
          where: { userId, isDeleted: false, parentId: { not: null }, ...BLOG_TARGET },
        }),
        prisma.comment.count({ where: { userId, isDeleted: false, ...COURSE_TARGET } }),
      ]);
    return { posts, replies, upvotes, downvotes, helpful, blogPosts, blogReplies, courseComments };
  }

  async listComments(
    userId: string,
    kind: ActivityCommentKind,
    scope: ActivityScope,
    cursorRaw: string | undefined,
    limitRaw: number,
  ): Promise<ActivityCommentPage> {
    const limit = Math.min(Math.max(1, Math.trunc(limitRaw) || DEFAULT_LIMIT), MAX_LIMIT);
    const cursor = decodeCursor(cursorRaw);

    const and: Prisma.CommentWhereInput[] = [];
    if (cursor) {
      const at = new Date(cursor.c);
      and.push({ OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: cursor.i } }] });
    }
    if (scope === 'blog') and.push(BLOG_TARGET);
    if (scope === 'course') and.push(COURSE_TARGET);

    const where: Prisma.CommentWhereInput = {
      userId,
      isDeleted: false,
      ...(and.length ? { AND: and } : {}),
    };
    if (kind === 'post') where.parentId = null;
    else if (kind === 'reply') where.parentId = { not: null };

    const rows = await prisma.comment.findMany({
      where,
      select: {
        id: true,
        parentId: true,
        body: true,
        upvoteCount: true,
        downvoteCount: true,
        score: true,
        createdAt: true,
        parent: { select: parentSelect },
        ...targetSelect,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const repliersByPost = await this.repliersFor(page.filter((r) => r.parentId === null).map((r) => r.id));

    const items: ActivityComment[] = page.map((r) => ({
      id: r.id,
      body: toExcerpt(r.body, BODY_EXCERPT),
      upvoteCount: r.upvoteCount,
      downvoteCount: r.downvoteCount,
      score: r.score,
      createdAt: r.createdAt.toISOString(),
      target: resolveTarget(r),
      parent:
        r.parent && !r.parent.isDeleted
          ? {
              id: r.parent.id,
              excerpt: toExcerpt(r.parent.body, PARENT_EXCERPT),
              authorName: r.parent.user.fullName ?? r.parent.user.username,
            }
          : null,
      repliers: r.parentId === null ? (repliersByPost.get(r.id) ?? { count: 0, users: [] }) : null,
    }));

    const last = page[page.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? encodeCursor({ c: last.createdAt.toISOString(), i: last.id }) : null,
    };
  }

  /** Distinct people who replied to each of `postIds` — first few by name, plus a total. */
  private async repliersFor(postIds: string[]): Promise<Map<string, ActivityReplies>> {
    const out = new Map<string, ActivityReplies>();
    if (postIds.length === 0) return out;

    const rows = await prisma.comment.findMany({
      where: { parentId: { in: postIds }, isDeleted: false },
      select: {
        parentId: true,
        user: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const seen = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!row.parentId) continue;
      let group = out.get(row.parentId);
      let ids = seen.get(row.parentId);
      if (!group) {
        group = { count: 0, users: [] };
        out.set(row.parentId, group);
        ids = new Set();
        seen.set(row.parentId, ids);
      }
      if (ids!.has(row.user.id)) continue;
      ids!.add(row.user.id);
      group.count += 1;
      if (group.users.length < REPLIERS_SHOWN) {
        group.users.push({
          id: row.user.id,
          name: row.user.fullName ?? row.user.username,
          avatarUrl: row.user.avatarUrl,
        });
      }
    }
    return out;
  }
}
