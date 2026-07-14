import crypto from 'crypto';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getSupabaseAdmin, getUserFromAuthHeader } from '@/lib/supabaseAdmin';
import { finalizePayment } from '@/lib/finalizePayment';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders() ?? undefined;

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ error: 'Missing payment verification fields' }, { status: 400, headers: corsHeaders });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const signaturesMatch =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

  if (!signaturesMatch) {
    return Response.json({ error: 'Invalid payment signature' }, { status: 400, headers: corsHeaders });
  }

  const admin = getSupabaseAdmin();
  try {
    const result = await finalizePayment(admin, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      expectedUserId: user.id,
    });
    return Response.json({ success: true, paidUntil: result.paidUntil ?? null }, { status: 200, headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Failed to finalize payment' }, { status: 500, headers: corsHeaders });
  }
}
