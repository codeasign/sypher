import Razorpay from 'razorpay';
import { applyCors } from '../_lib/cors.js';
import { getSupabaseAdmin, getUserFromAuthHeader } from '../_lib/supabaseAdmin.js';
import { computeGstSplit } from '../_lib/gst.js';

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

  const admin = getSupabaseAdmin();

  let gst;
  try {
    gst = computeGstSplit();
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: gst.amountPaise,
      currency: 'INR',
      // Kept for dashboard observability only — never read back as a
      // trust source by finalizePayment(), which always resolves user_id
      // from our own payments row instead.
      notes: { user_id: user.id, plan: 'paid_users_1y' },
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to create Razorpay order' });
    return;
  }

  const { error: insertError } = await admin.from('payments').insert({
    user_id: user.id,
    razorpay_order_id: order.id,
    amount_paise: gst.amountPaise,
    base_amount_paise: gst.baseAmountPaise,
    gst_amount_paise: gst.gstAmountPaise,
    gst_rate: gst.gstRate,
    plan: 'paid_users_1y',
    status: 'created',
  });
  if (insertError) {
    res.status(500).json({ error: 'Failed to record payment attempt' });
    return;
  }

  res.status(200).json({
    orderId: order.id,
    amount: gst.amountPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
