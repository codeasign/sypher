'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import styles from './styles.module.css';

interface CourseSidebarModule {
  id: string;
  slug: string;
  title: string;
}

interface CourseSidebarProps {
  courseSlug: string;
  courseName: string;
  modules: CourseSidebarModule[];
}

export default function CourseSidebar({ courseSlug, courseName, modules }: CourseSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const homeHref = `/courses/${courseSlug}`;

  return (
    <div className={`${styles.wrapper} ${collapsed ? styles.collapsed : ''}`}>
      <button
        type="button"
        className={styles.collapseToggle}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PlayArrowIcon
          className={styles.collapseIcon}
          style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }}
        />
      </button>
      {!collapsed && (
        <nav className={styles.sidebar} aria-label="Course modules">
          <Link
            href={homeHref}
            className={`${styles.courseTitleLink} ${pathname === homeHref ? styles.active : ''}`}
          >
            {courseName}
          </Link>
          <ul className={styles.moduleList}>
            {modules.map((m) => {
              const href = `${homeHref}/${m.slug}`;
              const isActive = pathname === href;
              return (
                <li key={m.id}>
                  <Link
                    href={href}
                    className={`${styles.moduleLink} ${isActive ? styles.active : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {m.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
