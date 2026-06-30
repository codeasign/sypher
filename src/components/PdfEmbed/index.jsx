import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const isExternal = (src) => /^https?:\/\//i.test(src);

export default function PdfEmbed({src, title = 'PDF document', height = 720}) {
  const resolved = useBaseUrl(src ?? '');
  if (!src) return null;
  const url       = isExternal(src) ? src : resolved;
  const cssHeight = typeof height === 'number' ? `${height}px` : height;
  return (
    <figure className={styles.figure}>
      <iframe className={styles.frame} src={url} title={title} loading="lazy" style={{height: cssHeight}} />
      <figcaption className={styles.caption}>
        <a href={url} target="_blank" rel="noopener noreferrer">Open "{title}" in new tab ↗</a>
      </figcaption>
    </figure>
  );
}
