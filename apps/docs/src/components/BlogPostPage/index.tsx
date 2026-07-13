import React from 'react';
import Layout from '@theme/Layout';
import BlogPostArticle from './BlogPostArticle';
import styles from './styles.module.css';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string | null;
  tags: string[];
  coverImageUrl: string | null;
}

export default function BlogPostPage({ post }: { post: BlogPost }): JSX.Element {
  return (
    <Layout title={post.title} description={post.description}>
      <div className={styles.page}>
        <BlogPostArticle
          title={post.title}
          content={post.content}
          coverImageUrl={post.coverImageUrl}
          date={post.date}
        />
      </div>
    </Layout>
  );
}
