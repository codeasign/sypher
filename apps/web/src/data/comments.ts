import { apiFetch } from '@/lib/api';

// Mirrors apps/api's CommentRepository wire types (CommentViewData /
// CommentListPage / CommentRepliesPage) — dates arrive ISO-stringified.

export type CommentSortMode = 'chrono' | 'upvotes' | 'useful';

export const COMMENT_SORT_MODES: { value: CommentSortMode; label: string }[] = [
  { value: 'chrono', label: 'Chronological' },
  { value: 'upvotes', label: 'Upvotes' },
  { value: 'useful', label: 'Most Useful' },
];

export interface CommentAuthorView {
  id: string;
  fullName: string | null;
  username: string;
  role: string;
}

export interface CommentMentionRef {
  userId: string;
  username: string;
}

export interface CommentView {
  id: string;
  parentId: string | null;
  body: string;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  helpfulCount: number;
  isBestAnswer: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  author: CommentAuthorView;
  /** Commenter authored the course/post — renders the Instructor/Author badge. */
  isContentAuthor: boolean;
  mentions: CommentMentionRef[];
  viewerVote: 'UP' | 'DOWN' | null;
  viewerHelpful: boolean;
  replyCount?: number;
}

export interface CommentListPageData {
  comments: CommentView[];
  nextCursor: string | null;
  viewerIsContentAuthor: boolean;
}

export interface CommentRepliesPageData {
  comments: CommentView[];
  viewerIsContentAuthor: boolean;
}

export interface CommentVoteStateData {
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  viewerVote: 'UP' | 'DOWN' | null;
}

export interface CommentHelpfulStateData {
  helpfulCount: number;
  viewerHelpful: boolean;
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return { method, body: JSON.stringify(payload) };
}

// ─── Reads ────────────────────────────────────────────────────────────────

export async function listModuleComments(
  moduleId: string,
  sort: CommentSortMode,
  cursor?: string,
): Promise<{ error: string | null; page: CommentListPageData | null }> {
  const params = new URLSearchParams({ sort });
  if (cursor) params.set('cursor', cursor);
  const res = await apiFetch(`/modules/${encodeURIComponent(moduleId)}/comments?${params.toString()}`);
  if (!res.ok) return { error: await asError(res), page: null };
  return { error: null, page: await res.json() };
}

export async function listBlogPostComments(
  postId: string,
  sort: CommentSortMode,
  cursor?: string,
): Promise<{ error: string | null; page: CommentListPageData | null }> {
  const params = new URLSearchParams({ sort });
  if (cursor) params.set('cursor', cursor);
  const res = await apiFetch(`/blog-posts/${encodeURIComponent(postId)}/comments?${params.toString()}`);
  if (!res.ok) return { error: await asError(res), page: null };
  return { error: null, page: await res.json() };
}

export async function listCourseComments(
  courseId: string,
  sort: CommentSortMode,
  cursor?: string,
): Promise<{ error: string | null; page: CommentListPageData | null }> {
  const params = new URLSearchParams({ sort });
  if (cursor) params.set('cursor', cursor);
  const res = await apiFetch(`/course-discussions/${encodeURIComponent(courseId)}/comments?${params.toString()}`);
  if (!res.ok) return { error: await asError(res), page: null };
  return { error: null, page: await res.json() };
}

export async function listCommentReplies(
  commentId: string,
  sort: CommentSortMode,
): Promise<{ error: string | null; page: CommentRepliesPageData | null }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(commentId)}/replies?sort=${sort}`);
  if (!res.ok) return { error: await asError(res), page: null };
  return { error: null, page: await res.json() };
}

// ─── Writes ───────────────────────────────────────────────────────────────

interface CommentComposeInput {
  body: string;
  parentId?: string;
  mentionedUserIds?: string[];
}

export async function createModuleComment(
  moduleId: string,
  input: CommentComposeInput,
): Promise<{ error: string | null; comment: CommentView | null }> {
  const res = await apiFetch(`/modules/${encodeURIComponent(moduleId)}/comments`, jsonInit('POST', input));
  if (!res.ok) return { error: await asError(res), comment: null };
  return { error: null, comment: await res.json() };
}

export async function createBlogPostComment(
  postId: string,
  input: CommentComposeInput,
): Promise<{ error: string | null; comment: CommentView | null }> {
  const res = await apiFetch(`/blog-posts/${encodeURIComponent(postId)}/comments`, jsonInit('POST', input));
  if (!res.ok) return { error: await asError(res), comment: null };
  return { error: null, comment: await res.json() };
}

export async function createCourseComment(
  courseId: string,
  input: CommentComposeInput,
): Promise<{ error: string | null; comment: CommentView | null }> {
  const res = await apiFetch(`/course-discussions/${encodeURIComponent(courseId)}/comments`, jsonInit('POST', input));
  if (!res.ok) return { error: await asError(res), comment: null };
  return { error: null, comment: await res.json() };
}

export async function editComment(
  commentId: string,
  input: { body: string; mentionedUserIds?: string[] },
): Promise<{ error: string | null; comment: CommentView | null }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(commentId)}`, jsonInit('PATCH', input));
  if (!res.ok) return { error: await asError(res), comment: null };
  return { error: null, comment: await res.json() };
}

export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function voteComment(
  commentId: string,
  type: 'UP' | 'DOWN',
): Promise<{ error: string | null; state: CommentVoteStateData | null }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(commentId)}/vote`, jsonInit('POST', { type }));
  if (!res.ok) return { error: await asError(res), state: null };
  return { error: null, state: await res.json() };
}

export async function toggleCommentHelpful(
  commentId: string,
): Promise<{ error: string | null; state: CommentHelpfulStateData | null }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(commentId)}/helpful`, { method: 'POST' });
  if (!res.ok) return { error: await asError(res), state: null };
  return { error: null, state: await res.json() };
}

export async function markBestAnswer(commentId: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(commentId)}/best-answer`, { method: 'POST' });
  return res.ok ? { error: null } : { error: await asError(res) };
}

// ─── Mention autocomplete ────────────────────────────────────────────────

export interface MentionCandidateData {
  id: string;
  username: string;
  fullName: string | null;
}

export async function searchMentions(query: string): Promise<MentionCandidateData[]> {
  const res = await apiFetch(`/users/mention-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}
