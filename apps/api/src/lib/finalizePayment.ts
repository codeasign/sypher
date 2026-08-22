import { prisma } from './prisma';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { env } from './env';

const paymentRepository = new PaymentRepository();

interface FinalizePaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  expectedUserId?: string;
}

interface FinalizePaymentResult {
  alreadyProcessed: boolean;
  paidUntil?: Date;
}

// Ported from apps/app/src/lib/finalizePayment.ts, with the double-grant
// race fixed. The old version read the payment row, checked
// status !== 'paid', ran a guarded UPDATE ... WHERE status = 'created', and
// then unconditionally called the grant RPC — never checking whether that
// UPDATE actually affected a row. Two concurrent calls (client verify-
// payment + Razorpay webhook racing, or a webhook retry) could both pass
// the initial check, both run the guarded update (Postgres doesn't error on
// a zero-row UPDATE), and both fall through to the grant call, double-
// extending paid_until. Fixed here by checking markPaidIfStillCreated's
// `count` before running the extend — count 0 means this call lost the
// race and must treat the payment as already processed by the other one.
//
// Idempotent and safe to call twice for the same order, same as before.
// user_id always comes from our own payments row (set at order-creation
// time under an authenticated session) — never trusted from Razorpay's
// order notes.
export async function finalizePayment({ razorpayOrderId, razorpayPaymentId, expectedUserId }: FinalizePaymentParams): Promise<FinalizePaymentResult> {
  const payment = await paymentRepository.findByRazorpayOrderId(razorpayOrderId);
  if (!payment) {
    throw new Error('Payment record not found for this order');
  }
  if (expectedUserId && payment.userId !== expectedUserId) {
    throw new Error('Payment record user mismatch');
  }
  if (payment.status === 'paid') {
    return { alreadyProcessed: true };
  }

  const { count } = await paymentRepository.markPaidIfStillCreated(razorpayOrderId, razorpayPaymentId);
  if (count === 0) {
    // Lost the race to a concurrent call — the other one already granted.
    return { alreadyProcessed: true };
  }

  // Additive renewal via a single atomic UPDATE (no read-then-write in
  // application code): extends from the later of "now" or the user's
  // current paidUntil, never resets to a fresh year from "now". Race-safe
  // against the daily expiry cron (cronJobs.ts) for the same reason —
  // whichever commits second sees the other's already-written row and acts
  // on live state, never a stale cached value. Mirrors
  // SupabaseSchema.md's extend_paid_until exactly; ported as raw SQL
  // because GREATEST/interval date math has no Prisma query-builder form.
  const rows = await prisma.$queryRaw<Array<{ paidUntil: Date }>>`
    UPDATE "User"
    SET "paidUntil" = GREATEST(COALESCE("paidUntil", NOW()), NOW()) + (${env.razorpay.upgradeDurationDays} || ' days')::interval,
        "role" = 'PAID_USER'
    WHERE id = ${payment.userId}
    RETURNING "paidUntil"
  `;

  return { alreadyProcessed: false, paidUntil: rows[0]?.paidUntil };
}
