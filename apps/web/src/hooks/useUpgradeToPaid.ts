'use client';

import { useState } from 'react';
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';
import { trackEvent } from '@/lib/analytics';

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { email: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: () => void) => void;
}

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;

interface UseUpgradeToPaidResult {
  handleUpgrade: () => Promise<void>;
  isProcessing: boolean;
  errorMessage: string | null;
}

// Ported from apps/app/src/hooks/useUpgradeToPaid.ts. One thing dropped
// deliberately, not silently, at the time: the old hook read
// session.access_token from apps/app's Supabase AuthContext (no equivalent
// exists in apps/web — it's cookie-based, apiFetch already carries the
// session). The GA4 upgrade_click -> begin_checkout -> purchase/cancelled/
// failed funnel that used to live here was dropped for the same
// no-analytics-lib-yet reason and is now reinstated against
// apps/web/src/lib/analytics.ts. purchase/begin_checkout use GA4's
// recommended e-commerce event names+params (not the old custom
// razorpay_checkout_open/payment_success) so revenue shows up in GA4's
// Monetization reports and BigQuery's e-commerce schema without custom
// exploration setup.
//
// `source` identifies which UI surface opened checkout (dashboard sidebar,
// GoProCard, PlanCard, locked-module notice, ...) so growth can compare
// conversion by entry point — pass a short stable literal per call site.
//
// userEmail is passed in (from whatever server-rendered the calling page)
// rather than fetched here — apps/web has no client-side auth context to
// pull it from.
export function useUpgradeToPaid(
  userEmail: string | null,
  onVerified?: () => void | Promise<void>,
  source: string = 'unknown'
): UseUpgradeToPaidResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpgrade(): Promise<void> {
    trackEvent('upgrade_click', { source });
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const Razorpay = (await loadRazorpayCheckout()) as RazorpayConstructor;
      const order = await createRazorpayOrder();

      // Razorpay fires modal.ondismiss after ANY close, including one that
      // followed a payment.failed or a successful handler — without this
      // guard, a failed/successful payment would also log a spurious
      // payment_cancelled right behind the real event.
      let settled = false;

      const checkout = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: 'Paid plan — 1 year',
        prefill: { email: userEmail ?? '' },
        handler: (response) => {
          settled = true;
          void (async () => {
            try {
              await verifyRazorpayPayment(response);
              trackEvent('purchase', {
                transaction_id: response.razorpay_payment_id,
                value: order.amount / 100,
                currency: order.currency,
                items: [{ item_id: 'paid_plan_1yr', item_name: 'Paid plan — 1 year' }],
                source,
              });
              await onVerified?.();
            } catch (err) {
              setErrorMessage(err instanceof Error ? err.message : 'Payment verification failed');
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        modal: {
          ondismiss: () => {
            if (!settled) trackEvent('payment_cancelled', { source });
            setIsProcessing(false);
          },
        },
      });

      checkout.on('payment.failed', () => {
        settled = true;
        trackEvent('payment_failed', { source, reason: 'razorpay_payment_failed' });
        setErrorMessage('Payment failed — please try again.');
        setIsProcessing(false);
      });

      trackEvent('begin_checkout', {
        value: order.amount / 100,
        currency: order.currency,
        items: [{ item_id: 'paid_plan_1yr', item_name: 'Paid plan — 1 year' }],
        source,
      });
      checkout.open();
    } catch (err) {
      trackEvent('payment_failed', { source, reason: 'checkout_init_error' });
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  }

  return { handleUpgrade, isProcessing, errorMessage };
}
