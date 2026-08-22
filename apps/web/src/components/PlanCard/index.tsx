'use client';

import { useRouter } from 'next/navigation';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import { roleColor } from '@/lib/roleColors';
import styles from './styles.module.css';

interface PlanCardProps {
  isPaidAndActive: boolean;
  userEmail: string;
}

// Dashboard "Plan" card — ported from apps/app's dashboard stats-row plan
// card (same "Free"/"Paid" badge + "Go Pro" button shape), the only
// existing precedent for where this CTA belongs. router.refresh() on a
// successful upgrade re-runs the server-fetched /auth/me in
// dashboard/page.tsx so the badge flips without a full reload.
export default function PlanCard({ isPaidAndActive, userEmail }: PlanCardProps): React.JSX.Element {
  const router = useRouter();
  const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid(userEmail, () => router.refresh());

  return (
    <div className={styles.card}>
      <span className={styles.label}>Plan</span>
      <span className={styles.value} style={isPaidAndActive ? { color: roleColor('PAID_USER') } : undefined}>
        {isPaidAndActive ? 'Paid' : 'Free'}
      </span>
      {!isPaidAndActive && (
        <button type="button" className={styles.upgradeButton} disabled={isProcessing} onClick={() => void handleUpgrade()}>
          {isProcessing ? 'Processing…' : 'Go Pro'}
        </button>
      )}
      {errorMessage && <span className={styles.error}>{errorMessage}</span>}
    </div>
  );
}
