export async function listBookmarkedSlugs(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('bookmarks')
    .select('course_slug')
    .eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load bookmarks:', error.message);
    return [];
  }
  return data.map((row) => row.course_slug);
}

export async function addBookmark(supabase, userId, courseSlug) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, course_slug: courseSlug });
  if (error && error.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('Failed to add bookmark:', error.message);
  }
}

export async function removeBookmark(supabase, userId, courseSlug) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('course_slug', courseSlug);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove bookmark:', error.message);
  }
}
