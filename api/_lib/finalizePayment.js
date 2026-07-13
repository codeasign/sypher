// Idempotent: safe to call twice for the same order (client retry + webhook
// both firing, or a webhook retry). user_id always comes from our own
// payments row (set at creation in create-order.js under an authenticated
// JWT) — never from Razorpay's order.notes, which keeps Razorpay-supplied
// data out of the trust chain for who gets upgraded.
//
// expectedUserId is optional, defense-in-depth: verify-payment.js passes
// the JWT-derived caller id and this asserts it matches the payments row's
// user_id; webhook.js has no JWT to compare, so it omits it and trusts the
// payments row alone.
export async function finalizePayment(admin, { razorpayOrderId, razorpayPaymentId, expectedUserId }) {
  const { data: payment } = await admin
    .from('payments')
    .select('status, user_id')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (!payment) {
    throw new Error('Payment record not found for this order');
  }
  if (expectedUserId && payment.user_id !== expectedUserId) {
    throw new Error('Payment record user mismatch');
  }
  if (payment.status === 'paid') {
    return { alreadyProcessed: true };
  }

  const { error: paymentError } = await admin
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString(), razorpay_payment_id: razorpayPaymentId })
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('status', 'created'); // guard: only transitions created -> paid, never re-runs on a racing second call
  if (paymentError) throw paymentError;

  // Additive renewal via a single atomic Postgres function — see
  // SupabaseSchema.md's extend_paid_until: extends from the later of "now"
  // or the user's current paid_until, never resets to a fresh year from
  // "now". Also race-safe against the daily cron expiry job (both are
  // single conditional statements re-checking live state at lock time).
  const { data: paidUntil, error: profileError } = await admin.rpc('extend_paid_until', {
    p_user_id: payment.user_id,
    p_days: Number(process.env.PAID_UPGRADE_DURATION_DAYS),
  });
  if (profileError) throw profileError;

  return { alreadyProcessed: false, paidUntil };
}
