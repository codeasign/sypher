import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostArticle from '@/components/BlogPostPage/BlogPostArticle';
import DiscussionSection from '@/components/DiscussionSection';
import { serverApiFetch } from '@/lib/serverApi';
import styles from '@/components/BlogPostPage/styles.module.css';

interface PublishedPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string | null;
  featuredMediaType: 'pdf' | 'youtube' | null;
  featuredMediaValue: string | null;
  publishedAt: string | null;
  authorFullName: string | null;
  authorBio: string | null;
}

// GET /blog/{slug} returns 204 (no body) when the post doesn't exist or
// isn't published — tsoa's default behavior for a null controller return.
async function loadPost(slug: string): Promise<PublishedPost | null> {
  const res = await serverApiFetch(`/blog/${slug}`);
  if (!res.ok || res.status === 204) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <BlogPostArticle
            slug={slug}
            title={post.title}
            content={post.content}
            coverImageUrl={post.coverImageUrl}
            featuredMediaType={post.featuredMediaType}
            featuredMediaValue={post.featuredMediaValue}
            date={post.publishedAt}
            authorName={post.authorFullName}
            authorBio={post.authorBio}
          />

          {/* Public discussion under every published post (no lock/preview
              model — visibility follows the post's published/draft status,
              see resolveBlogPostTargetOr404). Best-Answer UI intentionally
              omitted for blog comments; the backend stays uniform so it can
              be turned on later with a single prop. Lives in the same
              column as the article (not a .layout sibling) so width AND
              height both track the article — see .mainColumn. */}
          <DiscussionSection targetType="blogPost" targetId={post.id} badgeLabel="Author" />
        </div>
        <aside className={styles.adSlot} aria-hidden="true">
          <div className={styles.adUnit}>Ad space</div>
          <div className={styles.adUnit}>Ad space</div>
        </aside>
      </div>
    </div>
  );
}
