'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface UseUpgradeToPaidResult {
  handleUpgrade: () => Promise<void>;
  isProcessing: boolean;
  errorMessage: string | null;
}

export function useUpgradeToPaid(): UseUpgradeToPaidResult {
  const { session, user, refreshProfile } = useAuth();
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpgrade(): Promise<void> {
    if (!session?.access_token) return;
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const Razorpay = await loadRazorpayCheckout();
      const order = await createRazorpayOrder(session.access_token, apiBaseUrl);

      const checkout = new Razorpay({
        key: razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: 'Paid plan — 1 year',
        prefill: { email: user?.email ?? '' },
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            await verifyRazorpayPayment(session.access_token, response, apiBaseUrl);
            await refreshProfile();
          } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
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
