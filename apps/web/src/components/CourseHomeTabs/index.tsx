'use client';

import { useState, type ReactNode } from 'react';
import styles from './styles.module.css';

interface CourseHomeTabsProps {
  about: ReactNode;
  topics: ReactNode;
  discussion: ReactNode;
}

type Tab = 'about' | 'topics' | 'discussion';

export default function CourseHomeTabs({ about, topics, discussion }: CourseHomeTabsProps): React.JSX.Element {
  const [active, setActive] = useState<Tab>('about');
  const panels: Record<Tab, ReactNode> = { about, topics, discussion };

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
        <button
          type="button"
          role="tab"
          aria-selected={active === 'discussion'}
          className={active === 'discussion' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActive('discussion')}
        >
          Discussion
        </button>
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {panels[active]}
      </div>
    </div>
  );
}
