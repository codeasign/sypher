import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function bakeBlogPosts(supabase, outputDir) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, title, description, content, cover_image_url, tags, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const publishedSlugs = new Set(posts.map((p) => p.slug));
  for (const existing of fs.readdirSync(outputDir)) {
    const slug = existing.replace(/\.md$/, '');
    if (!publishedSlugs.has(slug)) {
      fs.unlinkSync(path.join(outputDir, existing));
    }
  }

  for (const post of posts) {
    const frontmatter = {
      title: post.title,
      description: post.description,
      slug: post.slug,
      date: post.published_at,
      tags: post.tags ?? [],
      coverImageUrl: post.cover_image_url ?? null,
    };
    const file = matter.stringify(post.content ?? '', frontmatter);
    fs.writeFileSync(path.join(outputDir, `${post.slug}.md`), file, 'utf-8');
  }

  return posts.length;
}
