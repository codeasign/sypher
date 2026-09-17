import { apiFetch } from '@/lib/api';

export interface VideoResource {
  label: string;
  url: string;
}

export interface Video {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  resources: VideoResource[] | null;
  status: 'draft' | 'published';
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PublishedVideoSummary {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

export interface VideoFields {
  title: string;
  description?: string | null;
  category?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  resources?: VideoResource[];
}

async function asJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

// ---- Management ----

export async function listVideos(): Promise<Video[]> {
  const res = await apiFetch('/videos/manage/list?limit=1000');
  return res.ok ? (await asJson<{ videos: Video[]; total: number }>(res)).videos : [];
}

export async function getVideo(id: string): Promise<Video | null> {
  const res = await apiFetch(`/videos/manage/${id}`);
  return res.ok ? asJson(res) : null;
}

export async function createVideo(fields: VideoFields): Promise<{ error: string | null; video: Video | null }> {
  const res = await apiFetch('/videos', { method: 'POST', body: JSON.stringify(fields) });
  if (!res.ok) return { error: await asError(res), video: null };
  return { error: null, video: await asJson<Video>(res) };
}

export async function updateVideo(id: string, fields: Partial<VideoFields>): Promise<{ error: string | null }> {
  const res = await apiFetch(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function setVideoStatus(id: string, status: Video['status']): Promise<{ error: string | null }> {
  const res = await apiFetch(`/videos/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  return res.ok ? { error: null } : { error: await asError(res) };
}

export async function deleteVideo(id: string): Promise<{ error: string | null }> {
  const res = await apiFetch(`/videos/${id}`, { method: 'DELETE' });
  return res.ok ? { error: null } : { error: await asError(res) };
}
