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
      <BlogPostArticle
        title={post.title}
        content={post.content}
        coverImageUrl={post.cover_image_url}
        date={post.published_at}
      />
    </div>
  );
}
