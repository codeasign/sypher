'use client';

import React, {useRef} from 'react';
import styles from './styles.module.css';

export default function PdfEmbed({src, title = 'PDF document', height = 720, showCaption = true}) {
  const figureRef = useRef(null);
  if (!src) return null;
  const url       = src;
  const cssHeight = typeof height === 'number' ? `${height}px` : height;
  // toolbar=0/navpanes=0/scrollbar=0 hide the built-in PDF viewer's page
  // thumbnails/nav chrome so the frame shows the document itself, not a
  // page-by-page control strip — supported by Chromium's viewer, ignored
  // (harmless) elsewhere.
  const frameUrl  = `${url}#toolbar=0&navpanes=0&scrollbar=0`;

  function handleFullscreen() {
    figureRef.current?.requestFullscreen?.();
  }

  return (
    <figure className={styles.figure} ref={figureRef}>
      <iframe className={styles.frame} src={frameUrl} title={title} loading="lazy" style={{height: cssHeight}} />
      {showCaption ? (
        <figcaption className={styles.caption}>
          <button type="button" className={styles.fullscreenBtn} onClick={handleFullscreen}>
            Fullscreen ⛶
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer">Open "{title}" in new tab ↗</a>
        </figcaption>
      ) : null}
    </figure>
  );
}
