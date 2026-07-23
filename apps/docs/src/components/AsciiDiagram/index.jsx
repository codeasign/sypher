import React, {useEffect, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import features from '@site/features.json';
import styles from './styles.module.css';

export default function AsciiDiagram({id, content = '', alt = 'Diagram', caption, mermaidSrc}) {
  const imageUrl = useBaseUrl(`/img/diagrams/${id}.png`);
  const mermaidImageUrl = useBaseUrl(mermaidSrc || '/img/diagrams/__unused__.svg');
  const [imageExists, setImageExists] = useState(false);
  const [checked, setChecked]         = useState(false);
  const showImages = features.diagramImages === true;

  useEffect(() => {
    if (mermaidSrc || !showImages) { setChecked(true); return; }
    const img   = new Image();
    img.onload  = () => { setImageExists(true);  setChecked(true); };
    img.onerror = () => { setImageExists(false); setChecked(true); };
    img.src = imageUrl;
  }, [imageUrl, showImages, mermaidSrc]);

  // A hand-authored Mermaid render takes priority over the generated-PNG
  // pipeline below. The original ASCII is kept in a data attribute on the
  // rendered image so it survives in the page's HTML even though it's no
  // longer the visible content.
  if (mermaidSrc) {
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
