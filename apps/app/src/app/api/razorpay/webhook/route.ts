import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { finalizePayment } from '@/lib/finalizePayment';

export const dynamic = 'force-dynamic';

// Signature verification needs the exact raw bytes Razorpay signed —
// Route Handlers never auto-parse the body (unlike the old Vercel Pages
// API's default JSON body-parsing, which had to be disabled via
// `config.api.bodyParser = false`), so `req.text()` already gives us the
// raw stream and no equivalent opt-out is needed here.
export async function POST(req: Request) {
  // No CORS guard: Razorpay's servers call this directly, not the browser.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  const signaturesMatch =
    typeof signature === 'string' &&
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!signaturesMatch) {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  if (payload.event !== 'payment.captured') {
    return Response.json({ received: true }, { status: 200 });
  }

  const paymentEntity = payload.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;
  const razorpayPaymentId = paymentEntity?.id;
  if (!razorpayOrderId || !razorpayPaymentId) {
    return Response.json({ error: 'Missing order/payment id in webhook payload' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  try {
    // user_id is resolved inside finalizePayment() from our own payments
    // row (keyed by razorpayOrderId) — not from this payload's notes.
    await finalizePayment(admin, { razorpayOrderId, razorpayPaymentId });
    return Response.json({ received: true }, { status: 200 });
  } catch {
    return Response.json({ error: 'Failed to finalize payment' }, { status: 500 });
  }
}
