import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostArticle from '@/components/BlogPostPage/BlogPostArticle';
import { getCachedPublishedBlogPosts, getCachedBlogPostBySlug } from '@/data/blogPostsCached';
import styles from '@/components/BlogPostPage/styles.module.css';

export async function generateStaticParams() {
  const posts = await getCachedPublishedBlogPosts();
  return posts.map((post: { slug: string }) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedBlogPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getCachedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <BlogPostArticle
          slug={slug}
          title={post.title}
          content={post.content}
          coverImageUrl={post.cover_image_url}
          featuredMediaType={post.featured_media_type}
          featuredMediaValue={post.featured_media_value}
          date={post.published_at}
          authorName={post.author_full_name}
          authorBio={post.author_bio}
        />
        {/* Reserved for future Google ad units (300x250 / 300x600) -- no
            ad network wired in yet. Hidden below 1100px (see .adSlot). Both
            units scroll/stick together as one group (see .adSlot's own
            comment on why they aren't each independently sticky). */}
        <aside className={styles.adSlot} aria-hidden="true">
          <div className={styles.adUnit}>Ad space</div>
          <div className={styles.adUnit}>Ad space</div>
        </aside>
      </div>
    </div>
  );
}
