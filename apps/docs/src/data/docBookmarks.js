export async function listDocBookmarks(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('doc_bookmarks')
    .select('doc_path, course_slug, title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load doc bookmarks:', error.message);
    return [];
  }
  return data;
}

export async function addDocBookmark(supabase, userId, { docPath, courseSlug, title }) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('doc_bookmarks')
    .insert({ user_id: userId, doc_path: docPath, course_slug: courseSlug, title });
  if (error && error.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('Failed to add doc bookmark:', error.message);
  }
}

export async function removeDocBookmark(supabase, userId, docPath) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('doc_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('doc_path', docPath);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove doc bookmark:', error.message);
  }
}
