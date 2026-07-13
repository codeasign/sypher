import crypto from 'crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { finalizePayment } from '../_lib/finalizePayment.js';

// Signature verification needs the exact raw bytes Razorpay signed — the
// platform's default JSON body-parsing would re-serialize and break the
// HMAC comparison, so it's disabled here in favor of reading the raw
// stream ourselves.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // No CORS guard: Razorpay's servers call this directly, not the browser.
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-razorpay-signature'];

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const signaturesMatch =
    typeof signature === 'string' &&
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!signaturesMatch) {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  const payload = JSON.parse(rawBody);
  if (payload.event !== 'payment.captured') {
    res.status(200).json({ received: true });
    return;
  }

  const paymentEntity = payload.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;
  const razorpayPaymentId = paymentEntity?.id;
  if (!razorpayOrderId || !razorpayPaymentId) {
    res.status(400).json({ error: 'Missing order/payment id in webhook payload' });
    return;
  }

  const admin = getSupabaseAdmin();
  try {
    // user_id is resolved inside finalizePayment() from our own payments
    // row (keyed by razorpayOrderId) — not from this payload's notes.
    await finalizePayment(admin, { razorpayOrderId, razorpayPaymentId });
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to finalize payment' });
  }
}
