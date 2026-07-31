'use client';

import React, { useEffect, useState } from 'react';
import type { ExtractedHeading } from '@/lib/extractHeadings';
import styles from './styles.module.css';

interface CourseTableOfContentsProps {
  headings: ExtractedHeading[];
}

export default function CourseTableOfContents({ headings }: CourseTableOfContentsProps): React.JSX.Element | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return undefined;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className={styles.toc} aria-label="Table of contents">
      <div className={styles.tocTitle}>On this page</div>
      <ul className={styles.tocList}>
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? styles.tocItemNested : styles.tocItem}>
            <a href={`#${h.id}`} className={`${styles.tocLink} ${activeId === h.id ? styles.active : ''}`}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
