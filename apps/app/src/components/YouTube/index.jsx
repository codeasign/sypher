'use client';

import React from 'react';
import styles from './styles.module.css';

export default function YouTube({ id, title = 'YouTube video player' }) {
  if (!id) return null;
  // youtube-nocookie.com (privacy-enhanced domain) + rel=0/modestbranding=1
  // to minimize related-video/branding chrome -- same params as apps/docs'
  // YouTube component, minus the loop/start options that component's
  // documentation-embed use case needs but a blog post's featured video
  // doesn't.
  const params = new URLSearchParams({ rel: '0', iv_load_policy: '3', modestbranding: '1' });

  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.iframe}
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title={title}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
