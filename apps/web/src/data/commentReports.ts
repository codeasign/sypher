import { apiFetch } from '@/lib/api';

// Mirrors apps/api's CommentReportedRow / ReportedCommentListResponse
// (CommentRepository.listReported, CommentReportController).

export interface ReportedCommentRow {
  id: string;
  body: string;
  author: { id: string; fullName: string | null; username: string };
  reportCount: number;
  isReportResolved: boolean;
  isRemovedByModerator: boolean;
  createdAt: string;
  target: { kind: 'module' | 'blog' | 'course' | 'video' | 'unknown'; label: string; href: string };
  lastRemoval: { removedAt: string; removedBy: string } | null;
}

export interface ReportedCommentListData {
  items: ReportedCommentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export type ReportFilter = 'open' | 'resolved' | 'all';

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

export async function listReportedComments(
  filter: ReportFilter,
  page: number,
  pageSize: number,
): Promise<{ error: string | null; data: ReportedCommentListData | null }> {
  const params = new URLSearchParams({ resolved: filter, page: String(page), pageSize: String(pageSize) });
  const res = await apiFetch(`/comment-reports?${params.toString()}`);
  if (!res.ok) return { error: await asError(res), data: null };
  return { error: null, data: await res.json() };
}

export async function resolveReportedComment(commentId: string, resolved: boolean): Promise<{ error: string | null }> {
  const res = await apiFetch(`/comment-reports/${encodeURIComponent(commentId)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolved }),
  });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function removeReportedComment(commentId: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/comment-reports/${encodeURIComponent(commentId)}/remove`, { method: 'POST' });
  return res.ok ? { error: null } : { error: await asError(res) };
}
