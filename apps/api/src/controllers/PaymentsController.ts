import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { Body, Controller, Post, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { computeGstSplit } from '../lib/gst';
import { finalizePayment } from '../lib/finalizePayment';
import { env } from '../lib/env';
import { createLogger } from '../lib/logger';

const paymentRepository = new PaymentRepository();
const logger = createLogger('payments');

interface PaymentMessageResponse {
  message: string;
}

interface PaymentCreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface PaymentVerifyRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface PaymentVerifyResponse {
  success: true;
  paidUntil: string | null;
}

@Route('payments')
@Tags('Payments')
@Security('session')
export class PaymentsController extends Controller {
  // Subscription upgrade only — credit packs deferred until resume-review/
  // mock-interview features exist to consume them (see Payment.kind in
  // schema.prisma). Ported from apps/app's api/razorpay/create-order,
  // minus the credit_pack branch.
  @Post('create-order')
  public async createOrder(
    @Request() request: ExpressRequest,
    @Res() upstreamError: TsoaResponse<502, PaymentMessageResponse>,
    @Res() serverError: TsoaResponse<500, PaymentMessageResponse>,
  ): Promise<PaymentCreateOrderResponse> {
    const user = request.user as User;

    let gst;
    try {
      gst = computeGstSplit();
    } catch (err) {
      return serverError(500, { message: err instanceof Error ? err.message : 'GST computation failed' });
    }

    const razorpay = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });

    let order;
    try {
      order = await razorpay.orders.create({
        amount: gst.amountPaise,
        currency: 'INR',
        // Observability only — finalizePayment() never trusts this back,
        // it always resolves userId from our own Payment row.
        notes: { userId: user.id, plan: 'paid_users_1y' },
      });
    } catch (err) {
      logger.error('Razorpay order creation failed', err);
      return upstreamError(502, { message: 'Failed to create Razorpay order' });
    }

    await paymentRepository.create({
      userId: user.id,
      razorpayOrderId: order.id,
      amountPaise: gst.amountPaise,
      baseAmountPaise: gst.baseAmountPaise,
      gstAmountPaise: gst.gstAmountPaise,
      gstRate: gst.gstRate,
      plan: 'paid_users_1y',
    });

    return { orderId: order.id, amount: gst.amountPaise, currency: 'INR', keyId: env.razorpay.keyId };
  }

  // Ported from apps/app's api/razorpay/verify-payment. Client-side half of
  // the two independent finalize paths (this + the webhook below) — both
  // call the same finalizePayment(), which is where the double-grant race
  // is actually fixed. This endpoint is defense-in-depth for a snappier UX
  // (finalize immediately on the client's own success callback) but the
  // webhook is the source of truth if this never fires (tab closed, etc).
  @Post('verify')
  public async verify(
    @Body() body: PaymentVerifyRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, PaymentMessageResponse>,
    @Res() serverError: TsoaResponse<500, PaymentMessageResponse>,
  ): Promise<PaymentVerifyResponse> {
    const user = request.user as User;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return badRequest(400, { message: 'Missing payment verification fields' });
    }

    const expectedSignature = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');

    const signaturesMatch =
      expectedSignature.length === razorpaySignature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature));

    if (!signaturesMatch) {
      return badRequest(400, { message: 'Invalid payment signature' });
    }

    try {
      const result = await finalizePayment({ razorpayOrderId, razorpayPaymentId, expectedUserId: user.id });
      return { success: true, paidUntil: result.paidUntil ? result.paidUntil.toISOString() : null };
    } catch (err) {
      logger.error('Failed to finalize payment', err);
      return serverError(500, { message: 'Failed to finalize payment' });
    }
  }
}
