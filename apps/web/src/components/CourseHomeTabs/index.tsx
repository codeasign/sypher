'use client';

import { useState, type ReactNode } from 'react';
import styles from './styles.module.css';

interface CourseHomeTabsProps {
  about: ReactNode;
  topics: ReactNode;
}

type Tab = 'about' | 'topics';

export default function CourseHomeTabs({ about, topics }: CourseHomeTabsProps): React.JSX.Element {
  const [active, setActive] = useState<Tab>('about');

  return (
    <div>
      <div className={styles.tabList} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={active === 'about'}
          className={active === 'about' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActive('about')}
        >
          About
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === 'topics'}
          className={active === 'topics' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActive('topics')}
        >
          Topics
        </button>
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {active === 'about' ? about : topics}
      </div>
    </div>
  );
}
