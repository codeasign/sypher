import type { ReactNode } from 'react';
import styles from './styles.module.css';

export type StoryBullet = {
  icon: ReactNode;
  text: string;
};

export type StoryCta = {
  label: string;
  href: string;
};

type StorySectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  graphic: ReactNode;
  bullets?: StoryBullet[];
  cta?: StoryCta;
  reverse?: boolean;
  tone?: 'blue' | 'purple' | 'teal';
};

// Reusable alternating two-column "story beat" -- illustration on one side,
// copy on the other, flipping sides per section via the `reverse` prop.
export default function StorySection({
  eyebrow,
  title,
  description,
  graphic,
  bullets,
  cta,
  reverse = false,
  tone = 'blue',
}: StorySectionProps) {
  return (
    <section className={`${styles.section} ${styles[tone]}`}>
      <div className={styles.blob} aria-hidden="true" />
      <div className={styles.container}>
        <div className={`${styles.grid} ${reverse ? styles.reverse : ''}`}>
          <div className={styles.visual}>
            <div className={styles.graphicWrap}>{graphic}</div>
          </div>
          <div className={styles.content}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>{description}</p>
            {bullets && bullets.length > 0 && (
              <ul className={styles.bullets}>
                {bullets.map((bullet) => (
                  <li key={bullet.text} className={styles.bullet}>
                    <span className={styles.bulletIcon}>{bullet.icon}</span>
                    <span>{bullet.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {cta && (
              <a href={cta.href} className={styles.cta}>
                {cta.label} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
