'use client';

import { useRouter } from 'next/navigation';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import { SparkleIcon } from '@/components/icons/ActionIcons';
import styles from './styles.module.css';

interface GoProCardProps {
  userEmail: string;
  message: string;
}

// Small, soft, friendly free->Pro nudge -- tinted with the primary color at
// low opacity rather than a hard-sell gradient band, so it reads as a
// genuine tip, not an ad. Originally built for the Profile page's About
// panel; reused wherever else a free user needs the same nudge.
export default function GoProCard({ userEmail, message }: GoProCardProps): React.JSX.Element {
  const router = useRouter();
  const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid(userEmail, () => router.refresh());

  return (
    <div className={styles.proCard}>
      <SparkleIcon className={styles.proCardIcon} />
      <div className={styles.proCardBody}>
        <p className={styles.proCardText}>{message}</p>
        <button type="button" className={styles.proCardBtn} disabled={isProcessing} onClick={() => void handleUpgrade()}>
          {isProcessing ? 'Processing…' : 'Go Pro'}
        </button>
        {errorMessage && <p className={styles.err}>{errorMessage}</p>}
      </div>
    </div>
  );
}
