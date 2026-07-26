import React, {useEffect, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import features from '@site/features.json';
import styles from './styles.module.css';

export default function AsciiDiagram({id, content = '', alt = 'Diagram', caption, mermaidSrc}) {
  const imageUrl = useBaseUrl(`/img/diagrams/${id}.png`);
  const mermaidImageUrl = useBaseUrl(mermaidSrc || '/img/diagrams/__unused__.svg');
  const [imageExists, setImageExists] = useState(false);
  const [checked, setChecked]         = useState(false);
  const [mermaidExists, setMermaidExists] = useState(false);
  const [mermaidChecked, setMermaidChecked] = useState(false);
  const showImages = features.diagramImages === true;

  useEffect(() => {
    if (mermaidSrc || !showImages) { setChecked(true); return; }
    const img   = new Image();
    img.onload  = () => { setImageExists(true);  setChecked(true); };
    img.onerror = () => { setImageExists(false); setChecked(true); };
    img.src = imageUrl;
  }, [imageUrl, showImages, mermaidSrc]);

  // A hand-authored Mermaid render takes priority over the generated-PNG
  // pipeline below, but only once we've confirmed the SVG actually exists —
  // rendered output can go missing (cache cleared, never committed) while
  // the mermaidSrc prop stays in the page, and an unchecked <img> there
  // would just show a broken image with no fallback. Until confirmed, and
  // if the SVG 404s, we render the real ASCII content instead of nothing.
  useEffect(() => {
    if (!mermaidSrc) { setMermaidChecked(true); return; }
    const img   = new Image();
    img.onload  = () => { setMermaidExists(true);  setMermaidChecked(true); };
    img.onerror = () => { setMermaidExists(false); setMermaidChecked(true); };
    img.src = mermaidImageUrl;
  }, [mermaidImageUrl, mermaidSrc]);

  if (mermaidSrc && mermaidChecked && mermaidExists) {
    return (
      <figure className={styles.figure}>
        <div className={styles.imageWrap}>
          <img
            className={styles.image}
            src={mermaidImageUrl}
            alt={alt}
            loading="lazy"
            data-ascii-source={content.trim()}
          />
        </div>
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
    );
  }

  if (mermaidSrc && mermaidChecked && !mermaidExists) {
    return (
      <figure className={styles.figure}>
        <div className={styles.asciiWrap} role="img" aria-label={alt}>
          <pre className={styles.ascii}>{content.trim()}</pre>
        </div>
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
        <p className={styles.pending}>
          ⚠️ Mermaid image missing — run <code>node scripts/render-mermaid-manifest.mjs</code>
        </p>
      </figure>
    );
  }

  if (mermaidSrc && !mermaidChecked) {
    // SSR and the initial client render: show the real ASCII content so
    // there's never a blank/broken state before the existence check lands.
    return (
      <figure className={styles.figure}>
        <div className={styles.asciiWrap} role="img" aria-label={alt}>
          <pre className={styles.ascii}>{content.trim()}</pre>
        </div>
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
    );
  }

  if (!checked || !showImages || !imageExists) {
    return (
      <figure className={styles.figure}>
        <div className={styles.asciiWrap} role="img" aria-label={alt}>
          <pre className={styles.ascii}>{content.trim()}</pre>
        </div>
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
        {showImages && !imageExists && checked && (
          <p className={styles.pending}>
            ⏳ Image pending — run <code>node scripts/generate-diagrams.js</code>
          </p>
        )}
      </figure>
    );
  }

  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={imageUrl} alt={alt} loading="lazy" />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
