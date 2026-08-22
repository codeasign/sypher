import { apiFetch } from '@/lib/api';

export interface DocBookmarkEntry {
  docPath: string;
  courseSlug: string;
  title: string | null;
}

export interface AuthoredModuleBookmarkEntry {
  moduleId: string;
  courseId: string;
}

async function asJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

// ---- Whole-course bookmarks (docs course catalog, slug-keyed) ----
// No UI wires into these yet — see AuthoredCourseBookmarkButton's sibling
// note. Kept here so /bookmarks and any future docs-catalog page can read
// them without a second data-layer pass.

export async function listCourseBookmarks(): Promise<string[]> {
  const res = await apiFetch('/bookmarks/courses');
  return res.ok ? asJson(res) : [];
}

export async function addCourseBookmark(slug: string): Promise<void> {
  await apiFetch(`/bookmarks/courses/${encodeURIComponent(slug)}`, { method: 'POST' });
}

export async function removeCourseBookmark(slug: string): Promise<void> {
  await apiFetch(`/bookmarks/courses/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

// ---- Individual docs-page bookmarks ----

export async function listDocBookmarks(): Promise<DocBookmarkEntry[]> {
  const res = await apiFetch('/bookmarks/docs');
  return res.ok ? asJson(res) : [];
}

export async function addDocBookmark(docPath: string, courseSlug: string, title?: string | null): Promise<void> {
  await apiFetch('/bookmarks/docs', { method: 'POST', body: JSON.stringify({ docPath, courseSlug, title }) });
}

export async function removeDocBookmark(docPath: string): Promise<void> {
  await apiFetch(`/bookmarks/docs?docPath=${encodeURIComponent(docPath)}`, { method: 'DELETE' });
}

// ---- Authored course bookmarks (DB-backed course system, id-keyed) ----

export async function listAuthoredCourseBookmarks(): Promise<string[]> {
  const res = await apiFetch('/bookmarks/authored-courses');
  return res.ok ? asJson(res) : [];
}

export async function addAuthoredCourseBookmark(courseId: string): Promise<void> {
  await apiFetch(`/bookmarks/authored-courses/${courseId}`, { method: 'POST' });
}

export async function removeAuthoredCourseBookmark(courseId: string): Promise<void> {
  await apiFetch(`/bookmarks/authored-courses/${courseId}`, { method: 'DELETE' });
}

// ---- Authored module bookmarks ----

export async function listAuthoredModuleBookmarks(): Promise<AuthoredModuleBookmarkEntry[]> {
  const res = await apiFetch('/bookmarks/authored-modules');
  return res.ok ? asJson(res) : [];
}

export async function addAuthoredModuleBookmark(moduleId: string, courseId: string): Promise<void> {
  await apiFetch(`/bookmarks/authored-modules/${moduleId}`, { method: 'POST', body: JSON.stringify({ courseId }) });
}

export async function removeAuthoredModuleBookmark(moduleId: string): Promise<void> {
  await apiFetch(`/bookmarks/authored-modules/${moduleId}`, { method: 'DELETE' });
}
