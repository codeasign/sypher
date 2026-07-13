import React from 'react';
import styles from './styles.module.css';

export default function YouTube({id, title = 'YouTube video player', start}) {
  if (!id) return null;
  const params = new URLSearchParams({
    rel: '0',
    iv_load_policy: '3',
    modestbranding: '1',
    controls: '0',
    loop: '1',
    playlist: id,
  });
  if (start) params.set('start', String(start));
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
