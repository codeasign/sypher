import React from 'react';
import styles from './styles.module.css';

interface EmptySectionProps {
  icon: (props: { className?: string }) => React.JSX.Element;
  title: string;
  message: string;
}

export default function EmptySection({ icon: Icon, title, message }: EmptySectionProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.iconBadge}>
        <Icon />
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
