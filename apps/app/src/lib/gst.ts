// GST-inclusive pricing: PAID_UPGRADE_PRICE_INR_PAISE is the total amount
// charged. GST is computed backward, purely for record-keeping — Razorpay
// always receives the same total.
export function computeGstSplit() {
  const amountPaise = Number(process.env.NEXT_PUBLIC_PAID_UPGRADE_PRICE_INR_PAISE);
  const gstRate = Number(process.env.PAID_UPGRADE_GST_RATE);

  const baseAmountPaise = Math.round(amountPaise / (1 + gstRate));
  const gstAmountPaise = amountPaise - baseAmountPaise;

  if (baseAmountPaise + gstAmountPaise !== amountPaise) {
    throw new Error(
      `GST reconciliation failed: ${baseAmountPaise} + ${gstAmountPaise} !== ${amountPaise}`
    );
  }

  return { amountPaise, baseAmountPaise, gstAmountPaise, gstRate };
}
