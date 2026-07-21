'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createCreditPackOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';
import { trackEvent } from '@/lib/analytics';

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface UseBuyCreditPackResult {
  handleBuyPack: (tier: string, price: number) => Promise<void>;
  isProcessing: boolean;
  errorMessage: string | null;
}

// Shared between Resume Review and Mock Interview's credit-pack purchase
// UI -- `feature` distinguishes which page's packs these are so
// credit_pack_purchase_success can be broken down by tier *and* feature in
// GA4 to answer "which packages are popular."
export function useBuyCreditPack(feature: 'resume_review' | 'mock_interview', onVerified?: () => void | Promise<void>): UseBuyCreditPackResult {
  const { session, user } = useAuth();
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleBuyPack(tier: string, price: number): Promise<void> {
    if (!session?.access_token) return;
    trackEvent('credit_pack_purchase_click', { tier, price, feature });
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const Razorpay = await loadRazorpayCheckout();
      const order = await createCreditPackOrder(session.access_token, tier, apiBaseUrl);

      let settled = false;

      const checkout = new Razorpay({
        key: razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: `Credit pack — ${tier}`,
        prefill: { email: user?.email ?? '' },
        handler: async (response: RazorpayPaymentResponse) => {
          settled = true;
          try {
            await verifyRazorpayPayment(session.access_token, response, apiBaseUrl);
            trackEvent('credit_pack_purchase_success', { tier, feature, price });
            await onVerified?.();
          } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            if (!settled) trackEvent('credit_pack_purchase_cancelled', { tier, feature });
            setIsProcessing(false);
          },
        },
      });

      checkout.on('payment.failed', () => {
        settled = true;
        trackEvent('credit_pack_purchase_failed', { tier, feature, reason: 'razorpay_payment_failed' });
        setErrorMessage('Payment failed — please try again.');
        setIsProcessing(false);
      });

      trackEvent('credit_pack_checkout_open', { tier, feature });
      checkout.open();
    } catch (err) {
      trackEvent('credit_pack_purchase_failed', { tier, feature, reason: 'checkout_init_error' });
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  }

  return { handleBuyPack, isProcessing, errorMessage };
}
