import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

interface PostSummary {
  slug: string;
  title: string;
  description: string;
  date: string | null;
  coverImageUrl: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogIndexPage({ posts }: { posts: PostSummary[] }): JSX.Element {
  return (
    <Layout title="Blog" description="Latest articles from Sypher.">
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <Heading as="h1" className={styles.pageTitle}>
              Blog
            </Heading>
            <p className={styles.pageSubtitle}>Latest articles and updates from the Sypher team.</p>
          </div>
          {posts.length === 0 ? (
            <p className={styles.statusText}>No posts published yet. Check back soon.</p>
          ) : (
            <div className={styles.grid}>
              {posts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className={styles.card}>
                  {post.coverImageUrl && (
                    <img src={post.coverImageUrl} alt={post.title} className={styles.cardImage} />
                  )}
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{post.title}</h3>
                    <p className={styles.cardDescription}>{post.description}</p>
                    {post.date && <span className={styles.cardDate}>{formatDate(post.date)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
