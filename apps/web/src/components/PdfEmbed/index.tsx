'use client';

import React, { useRef } from 'react';
import styles from './styles.module.css';

interface PdfEmbedProps {
  src: string;
  title?: string;
  height?: number | string;
  showCaption?: boolean;
}

export default function PdfEmbed({ src, title = 'PDF document', height = 720, showCaption = true }: PdfEmbedProps): React.JSX.Element | null {
  const figureRef = useRef<HTMLElement>(null);
  if (!src) return null;
  const cssHeight = typeof height === 'number' ? `${height}px` : height;
  const frameUrl = `${src}#toolbar=0&navpanes=0&scrollbar=0`;

  function handleFullscreen(): void {
    figureRef.current?.requestFullscreen?.();
  }

  return (
    <figure className={styles.figure} ref={figureRef}>
      <iframe className={styles.frame} src={frameUrl} title={title} loading="lazy" style={{ height: cssHeight }} />
      {showCaption ? (
        <figcaption className={styles.caption}>
          <button type="button" className={styles.fullscreenBtn} onClick={handleFullscreen}>
            Fullscreen ⛶
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer">
            Open &quot;{title}&quot; in new tab ↗
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}
