export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// manage-blog writes go straight to Supabase from the browser (anon key +
// user session), which never touches Next's cache. Only the Supabase DB
// webhook invalidates /blog's cache otherwise, and that webhook can't reach
// localhost/.sypher.local in dev -- so without this, edits made here would
// sit stale on /blog for up to the 1h revalidate TTL. Best-effort: a failed
// revalidate shouldn't block the save, since the TTL is still a backstop.
async function revalidateBlogCache(supabase) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    await fetch('/api/blog/revalidate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to revalidate blog cache:', err.message);
  }
}

async function findAvailableSlug(supabase, baseSlug) {
  let slug = baseSlug || 'post';
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to check slug availability:', error.message);
      return slug;
    }
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function listBlogPosts(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, cover_image_url, status, updated_at, published_at, created_at')
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load blog posts:', error.message);
    return [];
  }
  return data;
}

export async function listPublishedBlogPosts(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, description, cover_image_url, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load published blog posts:', error.message);
    return [];
  }
  return data;
}

export async function getBlogPostBySlug(supabase, slug) {
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, content, cover_image_url, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load blog post:', error.message);
    return null;
  }
  return data;
}

export async function getBlogPostById(supabase, id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load blog post:', error.message);
    return null;
  }
  return data;
}

export async function createBlogPost(supabase, { title, description, content, coverImageUrl, authorId }) {
  if (!supabase) return { error: 'Not authenticated', post: null };
  const slug = await findAvailableSlug(supabase, slugify(title));
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug,
      title,
      description,
      content: content ?? '',
      cover_image_url: coverImageUrl ?? null,
      status: 'draft',
      author_id: authorId ?? null,
    })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create blog post:', error.message);
    return { error: error.message, post: null };
  }
  return { error: null, post: data };
}

export async function updateBlogPost(supabase, id, fields) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('blog_posts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update blog post:', error.message);
    return { error: error.message };
  }
  await revalidateBlogCache(supabase);
  return { error: null };
}

export async function setBlogPostStatus(supabase, id, status) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const update = {
    status,
    updated_at: new Date().toISOString(),
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from('blog_posts').update(update).eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update blog post status:', error.message);
    return { error: error.message };
  }
  await revalidateBlogCache(supabase);
  return { error: null };
}

export async function deleteBlogPost(supabase, id) {
  if (!supabase || !id) return { error: 'Not authenticated' };
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete blog post:', error.message);
    return { error: error.message };
  }
  await revalidateBlogCache(supabase);
  return { error: null };
}
