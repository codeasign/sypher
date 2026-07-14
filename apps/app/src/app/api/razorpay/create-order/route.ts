import Razorpay from 'razorpay';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getSupabaseAdmin, getUserFromAuthHeader } from '@/lib/supabaseAdmin';
import { computeGstSplit } from '@/lib/gst';

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

  const admin = getSupabaseAdmin();

  let body: { kind?: string; packTier?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body (or non-JSON) means the default subscription-upgrade flow.
  }
  const kind = body.kind === 'credit_pack' ? 'credit_pack' : 'subscription';

  let gst;
  let plan = 'paid_users_1y';
  let packTier: string | null = null;
  let credits: number | null = null;

  if (kind === 'credit_pack') {
    if (!body.packTier) {
      return Response.json({ error: 'Missing packTier' }, { status: 400, headers: corsHeaders });
    }
    const { data: pack, error: packError } = await admin
      .from('credit_packs')
      .select('tier, credits, price_paise, is_active')
      .eq('tier', body.packTier)
      .single();
    if (packError || !pack || !pack.is_active) {
      return Response.json({ error: 'Unknown or inactive credit pack' }, { status: 400, headers: corsHeaders });
    }
    packTier = pack.tier;
    credits = pack.credits;
    try {
      gst = computeGstSplit(pack.price_paise, Number(process.env.PAID_UPGRADE_GST_RATE));
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 500, headers: corsHeaders });
    }
    plan = `credit_pack_${pack.tier}`;
  } else {
    try {
      gst = computeGstSplit();
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 500, headers: corsHeaders });
    }
  }

  const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
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
      notes: { user_id: user.id, plan },
    });
  } catch {
    return Response.json({ error: 'Failed to create Razorpay order' }, { status: 502, headers: corsHeaders });
  }

  const { error: insertError } = await admin.from('payments').insert({
    user_id: user.id,
    razorpay_order_id: order.id,
    amount_paise: gst.amountPaise,
    base_amount_paise: gst.baseAmountPaise,
    gst_amount_paise: gst.gstAmountPaise,
    gst_rate: gst.gstRate,
    plan,
    kind,
    pack_tier: packTier,
    credits,
    status: 'created',
  });
  if (insertError) {
    return Response.json({ error: 'Failed to record payment attempt' }, { status: 500, headers: corsHeaders });
  }

  return Response.json(
    {
      orderId: order.id,
      amount: gst.amountPaise,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    },
    { status: 200, headers: corsHeaders }
  );
}
