import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { finalizePayment } from './finalizePayment';
import { env } from './env';
import { createLogger } from './logger';

const logger = createLogger('payments-webhook');

// Ported from apps/app's api/razorpay/webhook. Registered as a plain
// Express route in server.ts BEFORE the global express.json() middleware,
// with express.raw() scoped to just this path — signature verification
// needs Razorpay's exact raw request bytes, which are gone once any JSON
// body-parser has touched them. tsoa controllers always sit behind the
// global express.json(), so this can't be a tsoa-decorated method.
//
// No session/CORS guard: Razorpay's servers call this directly, not a
// signed-in browser. Server-side finalize path — the source of truth if
// the client's own verify-payment call never fires (tab closed, network
// drop after payment_success). Same finalizePayment() as PaymentsController
// .verify(), same double-grant-race fix applies here too.
export async function paymentsWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-razorpay-signature'];

  const expectedSignature = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');

  const signaturesMatch =
    typeof signature === 'string' && expectedSignature.length === signature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!signaturesMatch) {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  const payload = JSON.parse(rawBody.toString('utf-8'));
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

  try {
    // userId is resolved inside finalizePayment() from our own Payment row
    // (keyed by razorpayOrderId) — never from this payload.
    await finalizePayment({ razorpayOrderId, razorpayPaymentId });
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Failed to finalize payment from webhook', err);
    res.status(500).json({ error: 'Failed to finalize payment' });
  }
}
