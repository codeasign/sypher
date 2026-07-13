import crypto from 'crypto';
import { applyCors } from '../_lib/cors.js';
import { getSupabaseAdmin, getUserFromAuthHeader } from '../_lib/supabaseAdmin.js';
import { finalizePayment } from '../_lib/finalizePayment.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment verification fields' });
    return;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const signaturesMatch =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

  if (!signaturesMatch) {
    res.status(400).json({ error: 'Invalid payment signature' });
    return;
  }

  const admin = getSupabaseAdmin();
  try {
    const result = await finalizePayment(admin, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      expectedUserId: user.id,
    });
    res.status(200).json({ success: true, paidUntil: result.paidUntil ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to finalize payment' });
  }
}
