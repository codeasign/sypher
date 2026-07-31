export async function listAuthoredCourseBookmarks(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('authored_course_bookmarks')
    .select('course_id')
    .eq('user_id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load authored course bookmarks:', error.message);
    return [];
  }
  return data.map((row) => row.course_id);
}

export async function addAuthoredCourseBookmark(supabase, userId, courseId) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('authored_course_bookmarks')
    .insert({ user_id: userId, course_id: courseId });
  if (error && error.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('Failed to add authored course bookmark:', error.message);
  }
}

export async function removeAuthoredCourseBookmark(supabase, userId, courseId) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('authored_course_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove authored course bookmark:', error.message);
  }
}

export async function listAuthoredModuleBookmarks(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('authored_module_bookmarks')
    .select('module_id, course_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load authored module bookmarks:', error.message);
    return [];
  }
  return data;
}

export async function addAuthoredModuleBookmark(supabase, userId, moduleId, courseId) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('authored_module_bookmarks')
    .insert({ user_id: userId, module_id: moduleId, course_id: courseId });
  if (error && error.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('Failed to add authored module bookmark:', error.message);
  }
}

export async function removeAuthoredModuleBookmark(supabase, userId, moduleId) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('authored_module_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('module_id', moduleId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove authored module bookmark:', error.message);
  }
}
