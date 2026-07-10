import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function InsideFooter() {
  const { siteConfig } = useDocusaurusContext();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <span className={styles.copyright}>
          &copy; {year} {siteConfig.title}. All rights reserved.
        </span>
      </div>
    </footer>
  );
}