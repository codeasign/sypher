import { apiFetch } from '@/lib/api';

// Mirrors apps/api UserActivityRepository wire types.

export interface ProfileMe {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
}

export interface ProfileCounts {
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
  parent: ActivityParent | null;
  /** Who replied to this comment — set for top-level rows, null for replies. */
  repliers: ActivityReplies | null;
}

export interface ActivityCommentPage {
  items: ActivityComment[];
  nextCursor: string | null;
}

export type ActivityTab = 'reply' | 'post' | 'course';

// Blog replies / blog posts / all course + lesson comments.
const TAB_QUERY: Record<ActivityTab, { kind: string; scope: string }> = {
  reply: { kind: 'reply', scope: 'blog' },
  post: { kind: 'post', scope: 'blog' },
  course: { kind: 'any', scope: 'course' },
};

/** One lazily-loaded page of the viewer's own comments for a profile tab. */
export async function fetchMyComments(
  tab: ActivityTab,
  cursor?: string | null,
): Promise<ActivityCommentPage> {
  const { kind, scope } = TAB_QUERY[tab];
  const params = new URLSearchParams({ kind, scope });
  if (cursor) params.set('cursor', cursor);
  const res = await apiFetch(`/users/me/comments?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load activity (${res.status})`);
  return res.json() as Promise<ActivityCommentPage>;
}

/** PATCH /users/me — send only the field(s) being changed. */
export async function updateProfile(patch: {
  username?: string;
  avatarUrl?: string;
  bio?: string;
}): Promise<{ me: ProfileMe | null; error: string | null }> {
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { me: null, error: body.message ?? `Save failed (${res.status})` };
  }
  return { me: (await res.json()) as ProfileMe, error: null };
}
