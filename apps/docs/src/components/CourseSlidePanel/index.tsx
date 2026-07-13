import React, { useEffect } from 'react';
import styles from './styles.module.css';

interface CourseSlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  icon?: string;
  title?: string;
  tag?: React.ReactNode;
}

export default function CourseSlidePanel({ open, onClose, children, icon, title, tag }: CourseSlidePanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {icon && <span className={styles.headerIcon}>{icon}</span>}
            {title && <span className={styles.headerTitle}>{title}</span>}
            {tag && <span className={styles.headerTag}>{tag}</span>}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </>
  );
}