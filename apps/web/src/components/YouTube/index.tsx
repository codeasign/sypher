'use client';

import React from 'react';
import styles from './styles.module.css';

interface YouTubeProps {
  id: string | null;
  title?: string;
}

export default function YouTube({ id, title = 'YouTube video player' }: YouTubeProps): React.JSX.Element | null {
  if (!id) return null;
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
