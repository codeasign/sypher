import React, {useEffect, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import features from '@site/features.json';
import styles from './styles.module.css';

export default function AsciiDiagram({id, content = '', alt = 'Diagram', caption}) {
  const imageUrl = useBaseUrl(`/img/diagrams/${id}.png`);
  const [imageExists, setImageExists] = useState(false);
  const [checked, setChecked]         = useState(false);
  const showImages = features.diagramImages === true;

  useEffect(() => {
    if (!showImages) { setChecked(true); return; }
    const img   = new Image();
    img.onload  = () => { setImageExists(true);  setChecked(true); };
    img.onerror = () => { setImageExists(false); setChecked(true); };
    img.src = imageUrl;
  }, [imageUrl, showImages]);

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
