'use client';

import { useState } from 'react';
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';

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

// Ported from apps/app/src/hooks/useUpgradeToPaid.ts. Two things dropped
// deliberately, not silently: the old hook read session.access_token from
// apps/app's Supabase AuthContext (no equivalent exists in apps/web — it's
// cookie-based, apiFetch already carries the session), and every step
// called trackEvent() for a GA4 upgrade_click -> checkout_open ->
// success/cancelled/failed funnel — apps/web has no analytics utility to
// call yet, so those calls are just gone rather than stubbed against
// something that doesn't exist. Re-add them here once apps/web has an
// analytics lib.
//
// userEmail is passed in (from whatever server-rendered the calling page)
// rather than fetched here — apps/web has no client-side auth context to
// pull it from.
export function useUpgradeToPaid(userEmail: string | null, onVerified?: () => void | Promise<void>): UseUpgradeToPaidResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpgrade(): Promise<void> {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const Razorpay = (await loadRazorpayCheckout()) as RazorpayConstructor;
      const order = await createRazorpayOrder();

      const checkout = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: 'Paid plan — 1 year',
        prefill: { email: userEmail ?? '' },
        handler: (response) => {
          void (async () => {
            try {
              await verifyRazorpayPayment(response);
              await onVerified?.();
            } catch (err) {
              setErrorMessage(err instanceof Error ? err.message : 'Payment verification failed');
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });

      checkout.on('payment.failed', () => {
        setErrorMessage('Payment failed — please try again.');
        setIsProcessing(false);
      });

      checkout.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  }

  return { handleUpgrade, isProcessing, errorMessage };
}
