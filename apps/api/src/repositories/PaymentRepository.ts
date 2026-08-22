import { prisma } from '../lib/prisma';
import type { Payment } from '@prisma/client';

export interface CreatePaymentInput {
  userId: string;
  razorpayOrderId: string;
  amountPaise: number;
  baseAmountPaise: number;
  gstAmountPaise: number;
  gstRate: number;
  plan: string;
}

export class PaymentRepository {
  async create(input: CreatePaymentInput): Promise<Payment> {
    return prisma.payment.create({ data: { ...input, status: 'created' } });
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { razorpayOrderId } });
  }

  // The double-grant race fix: the caller MUST check `count` before running
  // any grant/extend logic. A concurrent second call (client verify +
  // webhook racing, or a webhook retry) will see count 0 here — it already
  // lost the race, and must not re-run the paid_until/credit grant.
  async markPaidIfStillCreated(razorpayOrderId: string, razorpayPaymentId: string): Promise<{ count: number }> {
    return prisma.payment.updateMany({
      where: { razorpayOrderId, status: 'created' },
      data: { status: 'paid', paidAt: new Date(), razorpayPaymentId },
    });
  }
}
