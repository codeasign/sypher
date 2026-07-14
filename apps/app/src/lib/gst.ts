// GST-inclusive pricing: the amount passed in (or, if omitted, the paid-
// upgrade env vars) is the total charged. GST is computed backward, purely
// for record-keeping — Razorpay always receives the same total.
export function computeGstSplit(overrideAmountPaise?: number, overrideGstRate?: number) {
  const amountPaise = overrideAmountPaise ?? Number(process.env.NEXT_PUBLIC_PAID_UPGRADE_PRICE_INR_PAISE);
  const gstRate = overrideGstRate ?? Number(process.env.PAID_UPGRADE_GST_RATE);

  const baseAmountPaise = Math.round(amountPaise / (1 + gstRate));
  const gstAmountPaise = amountPaise - baseAmountPaise;

  if (baseAmountPaise + gstAmountPaise !== amountPaise) {
    throw new Error(
      `GST reconciliation failed: ${baseAmountPaise} + ${gstAmountPaise} !== ${amountPaise}`
    );
  }

  return { amountPaise, baseAmountPaise, gstAmountPaise, gstRate };
}
