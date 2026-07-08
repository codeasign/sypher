import React, { useEffect } from 'react';
import styles from './styles.module.css';

const PRO_FEATURES = [
  'Full access to every section in every course',
  'All hands-on projects and exercises',
  'New courses and updates as they ship',
];

export default function ProUpgradeModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upgrade-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <span className={styles.badge}>Pro</span>
        <h2 id="pro-upgrade-title" className={styles.title}>
          Upgrade to Sypher Pro
        </h2>
        <p className={styles.subtitle}>
          This course is part of Sypher Pro. Upgrade to unlock full access.
        </p>

        <ul className={styles.features}>
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className={styles.feature}>
              <span className={styles.checkmark}>✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <button type="button" className={styles.upgradeBtn} disabled>
          Coming soon
        </button>
        <button type="button" className={styles.laterBtn} onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
