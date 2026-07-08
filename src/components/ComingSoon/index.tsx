import React from 'react';
import styles from './styles.module.css';

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{title}</h1>
      <p className={styles.text}>{description}</p>
      <span className={styles.badge}>Coming soon</span>
    </div>
  );
}
