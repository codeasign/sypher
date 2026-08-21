-- Blog post featured media (PDF upload or YouTube embed, rendered above the
-- article body). Run once in the Supabase SQL editor. Backs the picker in
-- apps/app/src/components/BlogPostEditor/BlogPostEditorInner.tsx and its
-- render in apps/app/src/components/BlogPostPage/BlogPostArticle.tsx.
-- Source: SupabaseSchema.md, "Blog post featured media (PDF / YouTube)"

-- One slot per post -- featured_media_type is null when the author hasn't
-- picked anything (PPT was considered and dropped from scope). PDFs go
-- through featured_media_value as the Bunny CDN URL (uploadToBunny, same
-- pattern as cover_image_url); YouTube stores just the extracted 11-char
-- video ID (see src/lib/youtube.ts), not the raw pasted URL, so the render
-- side never needs to re-parse it.
alter table public.blog_posts
  add column if not exists featured_media_type text check (featured_media_type in ('pdf', 'youtube'));

alter table public.blog_posts
  add column if not exists featured_media_value text;

-- Postgres can't ALTER a function's column list in place -- must drop and
-- recreate whenever RETURNS TABLE's columns change, even via CREATE OR
-- REPLACE.
drop function if exists public.get_published_blog_post_with_author(text);

create or replace function public.get_published_blog_post_with_author(p_slug text)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  content text,
  cover_image_url text,
  featured_media_type text,
  featured_media_value text,
  published_at timestamptz,
  author_full_name text,
  author_bio text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    bp.id, bp.slug, bp.title, bp.description, bp.content, bp.cover_image_url,
    bp.featured_media_type, bp.featured_media_value, bp.published_at,
    p.full_name as author_full_name,
    p.bio as author_bio
  from public.blog_posts bp
  left join public.profiles p on p.id = bp.author_id
  where bp.slug = p_slug and bp.status = 'published';
$$;

grant execute on function public.get_published_blog_post_with_author(text) to anon, authenticated;

notify pgrst, 'reload schema';
