'use client';

import { useRouter } from 'next/navigation';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import { LockIcon } from '@/components/icons/SidebarIcons';
import styles from './styles.module.css';

interface LockedModuleNoticeProps {
  userEmail: string;
}

// Shown instead of the article when GET .../modules/{slug} returns
// locked: true — confirmed 2026-08-22 as the deliberate discoverability
// exception: this module is known to exist (title already rendered above
// this notice) but its content was never sent by the API (bodyMdx
// stripped server-side), so there's nothing to leak here even if this
// component were somehow bypassed.
export default function LockedModuleNotice({ userEmail }: LockedModuleNoticeProps): React.JSX.Element {
  const router = useRouter();
  const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid(userEmail, () => router.refresh());

  return (
    <div className={styles.lockedNotice}>
      <LockIcon className={styles.lockedNoticeIcon} />
      <p className={styles.lockedNoticeTitle}>This module is part of the paid content</p>
      <p className={styles.lockedNoticeBody}>Upgrade to unlock this module and the rest of the course.</p>
      <button type="button" className={styles.lockedNoticeButton} disabled={isProcessing} onClick={() => void handleUpgrade()}>
        {isProcessing ? 'Processing…' : 'Go Pro'}
      </button>
      {errorMessage && <span className={styles.lockedNoticeError}>{errorMessage}</span>}
    </div>
  );
}
