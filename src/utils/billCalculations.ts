import { Bill } from '../types';

export const getBillCalculatedTotals = (b: Bill) => {
  let totalBillingAmount = 0;
  let itemDiscountSum = 0;

  (b.items || []).forEach((item) => {
    const lot = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const plain = Number(item.plain) || 0;
    const shortage = Number(item.shortage) || 0;
    const gross = Math.max(0, lot - (shortage + plain)) * rate;
    const disc = Number(item.discountAmount) || 0;

    totalBillingAmount += gross;
    itemDiscountSum += disc;
  });

  totalBillingAmount = Number(totalBillingAmount.toFixed(2));
  const charge = Number(b.chargeAmount ?? b.extraCharges ?? 0);
  const valueAfterKapad = Math.max(0, totalBillingAmount - charge);

  let totalDiscount = 0;
  if (b.totalDiscount !== undefined && b.totalDiscount !== null && Number(b.totalDiscount) > 0) {
    totalDiscount = Number(b.totalDiscount);
  } else if (b.discountAmount !== undefined && b.discountAmount !== null && Number(b.discountAmount) > 0) {
    totalDiscount = Number(b.discountAmount);
  } else if (b.discountPercent !== undefined && b.discountPercent !== null && Number(b.discountPercent) > 0) {
    totalDiscount = Number(((valueAfterKapad * Number(b.discountPercent)) / 100).toFixed(2));
  } else if (itemDiscountSum > 0) {
    totalDiscount = Number(itemDiscountSum.toFixed(2));
  } else if (b.subtotal !== undefined && b.subtotal !== null && b.subtotal > 0 && valueAfterKapad > b.subtotal) {
    totalDiscount = Number((valueAfterKapad - b.subtotal).toFixed(2));
  }

  const calculatedSubtotal = Math.max(0, valueAfterKapad - totalDiscount);

  const subtotal = b.subtotal !== undefined && b.subtotal !== null && b.subtotal > 0 && Math.abs(b.subtotal - calculatedSubtotal) <= 0.05
    ? Number(b.subtotal)
    : Number(calculatedSubtotal.toFixed(2));

  const totalTax = b.totalTax !== undefined && b.totalTax !== null
    ? Number(b.totalTax)
    : Number(((b.cgst || 0) + (b.sgst || 0)).toFixed(2));

  const roundOff = b.roundOff !== undefined && b.roundOff !== null ? Number(b.roundOff) : 0;

  const totalAmount = b.totalAmount !== undefined && b.totalAmount > 0 && Math.abs(b.totalAmount - (subtotal + totalTax + roundOff)) <= 0.05
    ? Number(b.totalAmount)
    : Number((subtotal + totalTax + roundOff).toFixed(2));

  return {
    totalBillingAmount: totalBillingAmount > 0 ? totalBillingAmount : subtotal,
    totalDiscount,
    subtotal,
    totalTax,
    roundOff,
    charge,
    totalAmount,
  };
};

export const getBillPendingAmount = (b: Bill): number => {
  const calc = getBillCalculatedTotals(b);
  const paid = Number(b.paidAmount) || 0;
  const statusLower = (b.status || '').toLowerCase();

  // If explicitly marked paid and no paidAmount specified, assume fully paid
  if ((statusLower === 'paid' || statusLower === 'received') && paid === 0 && (b.paidAmount === undefined || b.paidAmount === null || (b.paidAmount as any) === '')) {
    return 0;
  }

  const pending = Number((calc.totalAmount - paid).toFixed(2));
  return pending > 0 ? pending : 0;
};
