import { apiFetch } from '@/lib/api';

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function asError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message ?? `Request failed (${res.status})`;
}

// Ported from apps/app/src/data/payments.js. Cookie-based instead of the
// old bearer-token-in-header call — apiFetch already carries the session
// cookie via credentials: 'include', so no access token is threaded
// through here. Subscription upgrade only; createCreditPackOrder wasn't
// ported (see Payment.kind in apps/api's schema.prisma).
export async function createRazorpayOrder(): Promise<RazorpayOrder> {
  const res = await apiFetch('/payments/create-order', { method: 'POST' });
  if (!res.ok) throw new Error(await asError(res));
  return res.json();
}

export async function verifyRazorpayPayment(payload: RazorpayVerifyPayload): Promise<{ success: true; paidUntil: string | null }> {
  const res = await apiFetch('/payments/verify', {
    method: 'POST',
    body: JSON.stringify({
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
      razorpaySignature: payload.razorpay_signature,
    }),
  });
  if (!res.ok) throw new Error(await asError(res));
  return res.json();
}

let checkoutScriptPromise: Promise<unknown> | null = null;

// Lazy-loads Razorpay's Checkout.js once, per their Standard Web
// Integration docs — not an npm package, a script tag Razorpay hosts
// itself. Unchanged from apps/app.
export function loadRazorpayCheckout(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadRazorpayCheckout can only run in the browser'));
  }
  const w = window as unknown as { Razorpay?: unknown };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve((window as unknown as { Razorpay: unknown }).Razorpay);
      script.onerror = () => reject(new Error('Failed to load Razorpay Checkout script'));
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
}
