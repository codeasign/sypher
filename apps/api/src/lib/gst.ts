import { env } from './env';

// Ported near-verbatim from apps/app/src/lib/gst.ts. GST-inclusive pricing:
// the amount charged to Razorpay is always the full total; GST is computed
// backward purely for record-keeping.
export interface GstSplit {
  amountPaise: number;
  baseAmountPaise: number;
  gstAmountPaise: number;
  gstRate: number;
}

export function computeGstSplit(overrideAmountPaise?: number, overrideGstRate?: number): GstSplit {
  const amountPaise = overrideAmountPaise ?? env.razorpay.upgradePriceInrPaise;
  const gstRate = overrideGstRate ?? env.razorpay.upgradeGstRate;

  const baseAmountPaise = Math.round(amountPaise / (1 + gstRate));
  const gstAmountPaise = amountPaise - baseAmountPaise;

  if (baseAmountPaise + gstAmountPaise !== amountPaise) {
    throw new Error(`GST reconciliation failed: ${baseAmountPaise} + ${gstAmountPaise} !== ${amountPaise}`);
  }

  return { amountPaise, baseAmountPaise, gstAmountPaise, gstRate };
}
