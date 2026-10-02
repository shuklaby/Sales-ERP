/**
 * Finance & Accounting Calculation Utilities
 * SparkGenTechnology — SalesSphere CRM
 */

export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number | undefined | null, currency = 'INR'): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(val);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val);
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertThreeDigit(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ONES[num] + ' ';
  }
  return str.trim();
}

/**
 * Converts Indian Rupee number to words
 */
export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let result = '';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore > 0) {
    result += convertThreeDigit(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertThreeDigit(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertThreeDigit(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    result += convertThreeDigit(hundred) + ' ';
  }

  result = (isNegative ? 'Negative ' : '') + result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertThreeDigit(paise) + ' Paise';
  }

  return result.trim() + ' Only';
}

/**
 * Computes live invoice status based on due date and payments
 */
export function deriveInvoiceStatus(
  currentStatus: string,
  grandTotal: number,
  paidAmount: number,
  dueDate: string
): 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' {
  if (currentStatus === 'Cancelled') return 'Cancelled';
  if (currentStatus === 'Draft') return 'Draft';

  const outstanding = roundTo2(grandTotal - paidAmount);
  if (outstanding <= 0.01) {
    return 'Paid';
  }
  if (paidAmount > 0) {
    return 'Partially Paid';
  }

  // Check if overdue
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      return 'Overdue';
    }
  }

  return 'Issued';
}

/**
 * Calculates days overdue (0 if not overdue)
 */
export function calculateDaysOverdue(dueDate: string): number {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export type AgingBucket = 'Current' | '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';

export function getAgingBucket(dueDate: string): AgingBucket {
  const days = calculateDaysOverdue(dueDate);
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30 Days';
  if (days <= 60) return '31-60 Days';
  if (days <= 90) return '61-90 Days';
  return '90+ Days';
}
