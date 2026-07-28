export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Courses/modules are gated (unlike blog_posts), so coursesCached.ts reads
// through the service-role client and enforces access per-request via the
// can_access_authored_course RPC -- this revalidation only clears the
// unstable_cache tag so an edit here shows up promptly instead of sitting
// stale for the cache's TTL. Best-effort: a failed revalidate shouldn't
// block the save.
export async function revalidateCoursesCache(supabase) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    await fetch('/api/courses/revalidate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to revalidate courses cache:', err.message);
  }
}

async function findAvailableCourseSlug(supabase, baseSlug) {
  let slug = baseSlug || 'course';
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase.from('courses').select('id').eq('slug', slug).maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check course slug availability:', error.message);
      return slug;
    }
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

// Module slugs are scoped per-course (unique(course_id, slug)), not global.
async function findAvailableModuleSlug(supabase, courseId, baseSlug) {
  let slug = baseSlug || 'module';
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId)
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check module slug availability:', error.message);
      return slug;
    }
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

// Sparse step-1000 convention: lands new rows after whatever already exists
// in the given scope without a renumbering pass. `scopeColumn`/`scopeValue`
// narrow the MAX(...) to one course (order_index) or leave it global
// (getting_started_order, scopeColumn null).
async function nextSparseIndex(supabase, table, column, scopeColumn, scopeValue) {
  let query = supabase.from(table).select(column).order(column, { ascending: false }).limit(1);
  if (scopeColumn) query = query.eq(scopeColumn, scopeValue);
  const { data, error } = await query.maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to compute next ${column}:`, error.message);
  }
  return (data?.[column] ?? 0) + 1000;
}

export async function listCourses(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, name, description, cover_image_url, status, updated_at, published_at, created_at')
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load courses:', error.message);
    return [];
  }
  return data;
}

export async function getCourseById(supabase, id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load course:', error.message);
    return null;
  }
  return data;
}

// Public-read helpers -- client-agnostic (take `supabase` as an arg) so
// coursesCached.ts can wrap these with the service-role client the same way
// blogPostsCached.ts reuses listPublishedBlogPosts/getBlogPostBySlug.
export async function listPublishedCourseSlugs(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('courses').select('slug').eq('status', 'published');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load published course slugs:', error.message);
    return [];
  }
  return data;
}

export async function getCourseBySlug(supabase, slug) {
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load course:', error.message);
    return null;
  }
  return data;
}

export async function createCourse(supabase, { name, description, coverImageUrl, authorId }) {
  if (!supabase) return { error: 'Not authenticated', course: null };
  const slug = await findAvailableCourseSlug(supabase, slugify(name));
  const { data, error } = await supabase
    .from('courses')
    .insert({
      slug,
      name,
      description: description ?? null,
      cover_image_url: coverImageUrl ?? null,
      status: 'draft',
      author_id: authorId ?? null,
    })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create course:', error.message);
    return { error: error.message, course: null };
  }
  return { error: null, course: data };
}

export async function updateCourse(supabase, id, fields) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('courses')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update course:', error.message);
    return { error: error.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}

export async function setCourseStatus(supabase, id, status) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const update = {
    status,
    updated_at: new Date().toISOString(),
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from('courses').update(update).eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update course status:', error.message);
    return { error: error.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}

// course_modules/authored_course_access/authored_company_course_access all
// cascade off courses.id, so this is the only delete call needed.
export async function deleteCourse(supabase, id) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete course:', error.message);
    return { error: error.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}

export async function listCourseModules(supabase, courseId) {
  if (!supabase || !courseId) return [];
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load course modules:', error.message);
    return [];
  }
  return data;
}

export async function getCourseModuleById(supabase, id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from('course_modules').select('*').eq('id', id).maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load course module:', error.message);
    return null;
  }
  return data;
}

// No published-filter here -- the course-level status check (getCourseBySlug)
// already gates whether this module should be reachable at all.
export async function getCourseModuleBySlug(supabase, courseId, moduleSlug) {
  if (!supabase || !courseId || !moduleSlug) return null;
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .eq('slug', moduleSlug)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load course module:', error.message);
    return null;
  }
  return data;
}

// Every module created through the UI is implicitly module_type='content',
// authoring_mode='manual' -- no type selector yet (see SupabaseSchema.md).
export async function createCourseModule(supabase, courseId, { title, bodyMdx }) {
  if (!supabase || !courseId) return { error: 'Not authenticated', module: null };
  const slug = await findAvailableModuleSlug(supabase, courseId, slugify(title));
  const orderIndex = await nextSparseIndex(supabase, 'course_modules', 'order_index', 'course_id', courseId);
  const { data, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: courseId,
      slug,
      title,
      body_mdx: bodyMdx ?? '',
      order_index: orderIndex,
      module_type: 'content',
      authoring_mode: 'manual',
    })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create course module:', error.message);
    return { error: error.message, module: null };
  }
  await revalidateCoursesCache(supabase);
  return { error: null, module: data };
}

export async function updateCourseModule(supabase, id, fields) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('course_modules')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update course module:', error.message);
    return { error: error.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}

export async function deleteCourseModule(supabase, id) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase.from('course_modules').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete course module:', error.message);
    return { error: error.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}

// Simple up/down reorder (no drag-drop dep in the repo): swaps order_index
// with the adjacent module in the same course. No-op at either end of the list.
export async function reorderCourseModules(supabase, courseId, moduleId, direction) {
  if (!supabase || !courseId || !moduleId) return { error: 'Not authenticated' };
  const modules = await listCourseModules(supabase, courseId);
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index === -1) return { error: 'Module not found' };
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= modules.length) return { error: null };

  const current = modules[index];
  const neighbor = modules[neighborIndex];
  const { error } = await supabase
    .from('course_modules')
    .update({ order_index: neighbor.order_index, updated_at: new Date().toISOString() })
    .eq('id', current.id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to reorder course module:', error.message);
    return { error: error.message };
  }
  const { error: neighborError } = await supabase
    .from('course_modules')
    .update({ order_index: current.order_index, updated_at: new Date().toISOString() })
    .eq('id', neighbor.id);
  if (neighborError) {
    // eslint-disable-next-line no-console
    console.error('Failed to reorder course module:', neighborError.message);
    return { error: neighborError.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}

// Admin-UI-only -- never touched by compose-authored-course.js. Featuring a
// module (show=true) assigns a fresh cross-course sparse getting_started_order
// unless one is passed explicitly; un-featuring clears both columns.
export async function setModuleGettingStarted(supabase, id, { show, order }) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  let gettingStartedOrder = null;
  if (show) {
    gettingStartedOrder = order ?? (await nextSparseIndex(supabase, 'course_modules', 'getting_started_order', null, null));
  }
  const { error } = await supabase
    .from('course_modules')
    .update({
      show_in_getting_started: !!show,
      getting_started_order: gettingStartedOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update getting-started flag:', error.message);
    return { error: error.message };
  }
  await revalidateCoursesCache(supabase);
  return { error: null };
}
