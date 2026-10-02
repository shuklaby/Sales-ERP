/**
 * Reusable Pricing & GST Calculation Engine for SparkGenTechnology CRM
 * Precision-safe currency calculations in INR (₹).
 */

export interface LineItemPricingInput {
  quantity: number;
  unitPrice: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28, or custom
}

export interface LineItemPricingOutput {
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface ProposalTotalsOutput {
  subtotal: number; // Total gross amount before discount
  totalDiscount: number;
  taxableAmount: number;
  totalGST: number;
  grandTotal: number;
}

/**
 * Safely rounds a currency amount to 2 decimal places to prevent floating-point errors.
 */
export function roundCurrency(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates pricing for a single proposal line item:
 * 1. Gross Amount = Quantity × Unit Price
 * 2. Discount Amount = Gross Amount × Discount % (or Fixed Discount)
 * 3. Taxable Amount = Gross Amount - Discount Amount
 * 4. GST Amount = Taxable Amount × GST %
 * 5. Line Total = Taxable Amount + GST Amount
 */
export function calculateLineItemPricing(input: LineItemPricingInput): LineItemPricingOutput {
  const qty = Math.max(0, Number(input.quantity) || 0);
  const rate = Math.max(0, Number(input.unitPrice) || 0);
  const gstRate = Math.max(0, Math.min(100, Number(input.gstRate) || 0));
  const discountType = input.discountType === 'fixed' ? 'fixed' : 'percent';
  const discountVal = Math.max(0, Number(input.discountValue) || 0);

  const grossAmount = roundCurrency(qty * rate);

  let discountAmount = 0;
  if (discountType === 'percent') {
    const cappedPercent = Math.min(100, discountVal);
    discountAmount = roundCurrency((grossAmount * cappedPercent) / 100);
  } else {
    // Fixed discount cannot exceed gross amount
    discountAmount = roundCurrency(Math.min(grossAmount, discountVal));
  }

  const taxableAmount = roundCurrency(Math.max(0, grossAmount - discountAmount));
  const gstAmount = roundCurrency((taxableAmount * gstRate) / 100);
  const lineTotal = roundCurrency(taxableAmount + gstAmount);

  return {
    quantity: qty,
    unitPrice: rate,
    grossAmount,
    discountType,
    discountValue: discountVal,
    discountAmount,
    taxableAmount,
    gstRate,
    gstAmount,
    lineTotal,
  };
}

/**
 * Calculates proposal grand totals:
 * - Subtotal = sum(grossAmount)
 * - Total Discount = sum(discountAmount)
 * - Taxable Amount = sum(taxableAmount)
 * - Total GST = sum(gstAmount)
 * - Grand Total = Taxable Amount + Total GST
 */
export function calculateProposalTotals(
  items: Array<{
    grossAmount?: number;
    discountAmount?: number;
    taxableAmount?: number;
    gstAmount?: number;
    lineTotal?: number;
    totalAmount?: number;
    quantity?: number;
    unitPrice?: number;
  }>
): ProposalTotalsOutput {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalGST = 0;

  for (const item of items) {
    const gross =
      item.grossAmount !== undefined
        ? item.grossAmount
        : (item.quantity || 0) * (item.unitPrice || 0);
    const disc = item.discountAmount || 0;
    const tax = item.taxableAmount !== undefined ? item.taxableAmount : Math.max(0, gross - disc);
    const gst = item.gstAmount || 0;

    subtotal += gross;
    totalDiscount += disc;
    taxableAmount += tax;
    totalGST += gst;
  }

  subtotal = roundCurrency(subtotal);
  totalDiscount = roundCurrency(totalDiscount);
  taxableAmount = roundCurrency(taxableAmount);
  totalGST = roundCurrency(totalGST);
  const grandTotal = roundCurrency(taxableAmount + totalGST);

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    totalGST,
    grandTotal,
  };
}

/**
 * Formats a numeric value into standard Indian Rupee notation (e.g. ₹1,25,000.00)
 */
export function formatINR(value: number, includeDecimals = true): string {
  if (isNaN(value) || value === null || value === undefined) return '₹0.00';
  const rounded = roundCurrency(value);
  return '₹' + rounded.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });
}
