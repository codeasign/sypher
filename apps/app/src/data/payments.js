// customFields.apiBaseUrl comes from useDocusaurusContext().siteConfig.customFields
// — empty string means same-origin relative fetch (production and local
// `vercel dev` both serve /api/* from the same origin as the site).
export async function createRazorpayOrder(accessToken, apiBaseUrl = '') {
  const response = await fetch(`${apiBaseUrl}/api/razorpay/create-order`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create order');
  }
  return data;
}

export async function createCreditPackOrder(accessToken, packTier, apiBaseUrl = '') {
  const response = await fetch(`${apiBaseUrl}/api/razorpay/create-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ kind: 'credit_pack', packTier }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create order');
  }
  return data;
}

export async function verifyRazorpayPayment(accessToken, payload, apiBaseUrl = '') {
  const response = await fetch(`${apiBaseUrl}/api/razorpay/verify-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Payment verification failed');
  }
  return data;
}

let checkoutScriptPromise = null;

// Lazy-loads Razorpay's Checkout.js once, per Standard Web Integration docs
// (not an npm package — a script tag Razorpay hosts itself).
export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadRazorpayCheckout can only run in the browser'));
  }
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error('Failed to load Razorpay Checkout script'));
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
}
