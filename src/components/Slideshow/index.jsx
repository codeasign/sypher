import React, {useCallback, useEffect, useState} from 'react';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const isExternal = (src) => /^https?:\/\//i.test(src);

export default function Slideshow({slides = [], aspectRatio = '16 / 9', autoPlay = false, interval = 5000}) {
  const {withBaseUrl} = useBaseUrlUtils();
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const go = useCallback((n) => setIndex((c) => (((n ?? c) % count) + count) % count), [count]);

  useEffect(() => {
    if (!autoPlay || count <= 1) return;
    const t = setInterval(() => setIndex((c) => (c + 1) % count), interval);
    return () => clearInterval(t);
  }, [autoPlay, interval, count]);

  if (count === 0) return null;
  const resolve = (src) => (isExternal(src) ? src : withBaseUrl(src));

  return (
    <section className={styles.slideshow} aria-roledescription="carousel" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); }}>
      <div className={styles.viewport} style={{aspectRatio}}>
        {slides.map((s, i) => (
          <figure key={i} className={styles.slide} hidden={i !== index} aria-roledescription="slide">
            <img className={styles.image} src={resolve(s.src)} alt={s.alt ?? ''} loading={i === 0 ? 'eager' : 'lazy'} />
            {s.caption && <figcaption className={styles.caption}>{s.caption}</figcaption>}
          </figure>
        ))}
      </div>
      {count > 1 && (
        <>
          <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(index - 1)} aria-label="Previous">‹</button>
          <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(index + 1)} aria-label="Next">›</button>
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <button key={i} type="button" aria-selected={i === index}
                className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                onClick={() => setIndex(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
