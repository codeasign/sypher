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

// Write helpers below MUST surface a non-2xx response — the bookmark
// buttons apply their state optimistically and only roll back inside a
// `catch`, so a silently-swallowed 401/403/500 was leaving the UI showing
// "Bookmarked" while nothing persisted (reverting on the next reload).
async function assertOk(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`${action} failed: ${res.status} ${res.statusText}`);
  }
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
  await assertOk(await apiFetch(`/bookmarks/courses/${encodeURIComponent(slug)}`, { method: 'POST' }), 'Add course bookmark');
}

export async function removeCourseBookmark(slug: string): Promise<void> {
  await assertOk(await apiFetch(`/bookmarks/courses/${encodeURIComponent(slug)}`, { method: 'DELETE' }), 'Remove course bookmark');
}

// ---- Individual docs-page bookmarks ----

export async function listDocBookmarks(): Promise<DocBookmarkEntry[]> {
  const res = await apiFetch('/bookmarks/docs');
  return res.ok ? asJson(res) : [];
}

export async function addDocBookmark(docPath: string, courseSlug: string, title?: string | null): Promise<void> {
  await assertOk(
    await apiFetch('/bookmarks/docs', { method: 'POST', body: JSON.stringify({ docPath, courseSlug, title }) }),
    'Add doc bookmark',
  );
}

export async function removeDocBookmark(docPath: string): Promise<void> {
  await assertOk(await apiFetch(`/bookmarks/docs?docPath=${encodeURIComponent(docPath)}`, { method: 'DELETE' }), 'Remove doc bookmark');
}

// ---- Authored course bookmarks (DB-backed course system, id-keyed) ----

export async function listAuthoredCourseBookmarks(): Promise<string[]> {
  const res = await apiFetch('/bookmarks/authored-courses');
  return res.ok ? asJson(res) : [];
}

export async function addAuthoredCourseBookmark(courseId: string): Promise<void> {
  await assertOk(await apiFetch(`/bookmarks/authored-courses/${courseId}`, { method: 'POST' }), 'Add course bookmark');
}

export async function removeAuthoredCourseBookmark(courseId: string): Promise<void> {
  await assertOk(await apiFetch(`/bookmarks/authored-courses/${courseId}`, { method: 'DELETE' }), 'Remove course bookmark');
}

// ---- Authored module bookmarks ----

export async function listAuthoredModuleBookmarks(): Promise<AuthoredModuleBookmarkEntry[]> {
  const res = await apiFetch('/bookmarks/authored-modules');
  return res.ok ? asJson(res) : [];
}

export async function addAuthoredModuleBookmark(moduleId: string, courseId: string): Promise<void> {
  await assertOk(
    await apiFetch(`/bookmarks/authored-modules/${moduleId}`, { method: 'POST', body: JSON.stringify({ courseId }) }),
    'Add module bookmark',
  );
}

export async function removeAuthoredModuleBookmark(moduleId: string): Promise<void> {
  await assertOk(await apiFetch(`/bookmarks/authored-modules/${moduleId}`, { method: 'DELETE' }), 'Remove module bookmark');
}
