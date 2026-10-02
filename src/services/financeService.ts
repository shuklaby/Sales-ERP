import {
  InvoiceRecord,
  PaymentRecord,
  ExpenseRecord,
  ExpenseCategoryRecord,
  CreditNote,
  DebitNote,
  CustomerAdvance,
  Customer,
  UserProfile,
  BankAccount,
} from '../types/crm';
import { roundTo2 } from '../utils/financeUtils';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Office Rent',
  'Salary',
  'Internet',
  'Software',
  'Hosting',
  'Marketing',
  'Travel',
  'Electricity',
  'Telephone',
  'Office Supplies',
  'Professional Services',
  'Other',
];

export const DEFAULT_TAX_RATES = [
  { label: 'Exempt (0%)', rate: 0 },
  { label: 'GST 5%', rate: 5 },
  { label: 'GST 12%', rate: 12 },
  { label: 'Standard GST 18%', rate: 18, isDefault: true },
  { label: 'Special GST 28%', rate: 28 },
];

/**
 * Mask Bank Account Number for non-admin/finance employees
 * Example: '50200034891234' -> 'XXXX XXXX 1234'
 */
export function maskBankAccountNumber(accountNumber?: string): string {
  if (!accountNumber) return '—';
  const clean = accountNumber.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX XXXX ${last4}`;
}

/**
 * Calculate Financial Year string
 * E.g. For date in 2026 -> '2026-27'
 */
export function getCurrentFinancialYear(date = new Date()): string {
  const month = date.getMonth(); // 0 is January, 2 is March, 3 is April
  const year = date.getFullYear();
  if (month >= 3) {
    const nextYearShort = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${nextYearShort}`;
  } else {
    const yearShort = String(year % 100).padStart(2, '0');
    return `${year - 1}-${yearShort}`;
  }
}

/**
 * Format sequential invoice number according to company configuration
 * Example: SGT/2026-27/0001
 */
export function formatInvoiceNumber(params: {
  prefix?: string;
  financialYear?: string;
  sequence: number;
  format?: 'SLASH' | 'HYPHEN' | 'SIMPLE';
}): string {
  const prefix = params.prefix || 'SGT';
  const fy = params.financialYear || getCurrentFinancialYear();
  const seqPadded = String(params.sequence).padStart(4, '0');

  if (params.format === 'HYPHEN') {
    return `${prefix}-${fy}-${seqPadded}`;
  }
  if (params.format === 'SIMPLE') {
    return `${prefix}-${seqPadded}`;
  }
  return `${prefix}/${fy}/${seqPadded}`;
}

/**
 * Format sequential receipt number
 * Example: REC-2026-0001
 */
export function formatReceiptNumber(prefix = 'REC', sequence: number, date = new Date()): string {
  const year = date.getFullYear();
  const seqPadded = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${seqPadded}`;
}

/**
 * GST & Tax Calculation Engine
 * Supports intra-state (CGST + SGST) vs inter-state (IGST) / UTGST, tax inclusive vs tax exclusive
 */
export function calculateItemGst(params: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number;
  isInterState?: boolean;
  isUnionTerritory?: boolean;
  isTaxInclusive?: boolean;
}): {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  utgst: number;
  totalTax: number;
  lineTotal: number;
} {
  const qty = Math.max(0, params.quantity || 1);
  const price = Math.max(0, params.unitPrice || 0);
  const gross = roundTo2(qty * price);

  let discount = 0;
  if (params.discountAmount && params.discountAmount > 0) {
    discount = Math.min(gross, roundTo2(params.discountAmount));
  } else if (params.discountPercent && params.discountPercent > 0) {
    discount = roundTo2((gross * params.discountPercent) / 100);
  }

  const netBeforeTax = Math.max(0, gross - discount);
  const rate = Math.max(0, params.gstRate || 0);

  let taxableAmount = netBeforeTax;
  let totalTax = 0;

  if (params.isTaxInclusive && rate > 0) {
    taxableAmount = roundTo2((netBeforeTax * 100) / (100 + rate));
    totalTax = roundTo2(netBeforeTax - taxableAmount);
  } else {
    totalTax = roundTo2((taxableAmount * rate) / 100);
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let utgst = 0;

  if (params.isInterState) {
    igst = totalTax;
  } else if (params.isUnionTerritory) {
    cgst = roundTo2(totalTax / 2);
    utgst = roundTo2(totalTax - cgst);
  } else {
    cgst = roundTo2(totalTax / 2);
    sgst = roundTo2(totalTax - cgst);
  }

  const lineTotal = roundTo2(taxableAmount + totalTax);

  return {
    subtotal: gross,
    discount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    utgst,
    totalTax,
    lineTotal,
  };
}

/**
 * Receivables Aging Bucketing
 * Buckets: Current, 1–30 Days, 31–60 Days, 61–90 Days, 90+ Days
 * NOTE: Never calculate an invoice as overdue before its due date.
 */
export interface AgingBucketItem {
  invoice: InvoiceRecord;
  customerName: string;
  dueDate: string;
  outstandingAmount: number;
  daysOutstanding: number;
  bucket: 'Current' | '1–30 Days' | '31–60 Days' | '61–90 Days' | '90+ Days';
}

export function calculateReceivablesAging(invoices: InvoiceRecord[]): {
  items: AgingBucketItem[];
  summary: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    totalOutstanding: number;
  };
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items: AgingBucketItem[] = [];
  const summary = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOutstanding: 0,
  };

  invoices.forEach((inv) => {
    // Cancelled invoices are NEVER active receivables
    if (inv.status === 'Cancelled' || inv.status === 'Paid') return;

    const outstanding = roundTo2(inv.outstandingAmount ?? (inv.grandTotal - (inv.paidAmount || 0)));
    if (outstanding <= 0) return;

    let daysPastDue = 0;
    let bucket: AgingBucketItem['bucket'] = 'Current';

    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - due.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        daysPastDue = diffDays;
        if (daysPastDue <= 30) {
          bucket = '1–30 Days';
        } else if (daysPastDue <= 60) {
          bucket = '31–60 Days';
        } else if (daysPastDue <= 90) {
          bucket = '61–90 Days';
        } else {
          bucket = '90+ Days';
        }
      } else {
        bucket = 'Current';
      }
    }

    items.push({
      invoice: inv,
      customerName: inv.customerName || inv.customerSnapshot?.companyName || 'Unknown Customer',
      dueDate: inv.dueDate || 'N/A',
      outstandingAmount: outstanding,
      daysOutstanding: daysPastDue,
      bucket,
    });

    summary.totalOutstanding = roundTo2(summary.totalOutstanding + outstanding);
    if (bucket === 'Current') summary.current = roundTo2(summary.current + outstanding);
    else if (bucket === '1–30 Days') summary.days1_30 = roundTo2(summary.days1_30 + outstanding);
    else if (bucket === '31–60 Days') summary.days31_60 = roundTo2(summary.days31_60 + outstanding);
    else if (bucket === '61–90 Days') summary.days61_90 = roundTo2(summary.days61_90 + outstanding);
    else if (bucket === '90+ Days') summary.days90Plus = roundTo2(summary.days90Plus + outstanding);
  });

  return { items, summary };
}

/**
 * Customer Ledger Calculator
 * Strictly computes live timeline from actual Firestore records (Invoices, Payments, Credit Notes, Debit Notes, Advances)
 */
export interface LedgerCalculationResult {
  entries: Array<{
    id: string;
    date: string;
    type: 'Opening Balance' | 'Invoice' | 'Payment' | 'Credit Note' | 'Debit Note' | 'Advance' | 'Refund';
    reference: string;
    description: string;
    debit: number; // increases receivables
    credit: number; // decreases receivables
    balance: number; // running balance
  }>;
  totalDebit: number;
  totalCredit: number;
  netClosingBalance: number;
}

export function computeCustomerLedger(params: {
  customerId: string;
  openingBalance?: number;
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  creditNotes?: CreditNote[];
  debitNotes?: DebitNote[];
  customerAdvances?: CustomerAdvance[];
  startDate?: string;
  endDate?: string;
}): LedgerCalculationResult {
  const { customerId, openingBalance = 0 } = params;

  type RawTx = {
    id: string;
    date: string;
    type: 'Opening Balance' | 'Invoice' | 'Payment' | 'Credit Note' | 'Debit Note' | 'Advance' | 'Refund';
    reference: string;
    description: string;
    debit: number;
    credit: number;
  };

  const rawTxList: RawTx[] = [];

  // Opening balance if present
  if (openingBalance !== 0) {
    rawTxList.push({
      id: 'opening_balance',
      date: '2026-01-01',
      type: 'Opening Balance',
      reference: 'OB-001',
      description: 'Account Opening Balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
    });
  }

  // Invoices (Debit)
  params.invoices
    .filter((inv) => inv.customerId === customerId && inv.status !== 'Cancelled')
    .forEach((inv) => {
      rawTxList.push({
        id: inv.id,
        date: inv.invoiceDate || inv.createdAt.split('T')[0],
        type: 'Invoice',
        reference: inv.invoiceNumber,
        description: `Tax Invoice (${inv.items?.length || 1} item/s)`,
        debit: roundTo2(inv.grandTotal),
        credit: 0,
      });
    });

  // Payments (Credit)
  params.payments
    .filter((p) => p.customerId === customerId && p.status === 'Confirmed' && !p.isReversal)
    .forEach((p) => {
      rawTxList.push({
        id: p.id,
        date: p.paymentDate || p.createdAt.split('T')[0],
        type: 'Payment',
        reference: p.transactionReference || p.paymentNumber || p.paymentId,
        description: `Payment received via ${p.paymentMethod} (Against: ${p.invoiceNumber || 'Account'})`,
        debit: 0,
        credit: roundTo2(p.amount),
      });
    });

  // Credit Notes (Credit - reduces receivables)
  (params.creditNotes || [])
    .filter((cn) => cn.customerId === customerId && cn.status !== 'Cancelled')
    .forEach((cn) => {
      rawTxList.push({
        id: cn.id,
        date: cn.date || cn.createdAt.split('T')[0],
        type: 'Credit Note',
        reference: cn.creditNoteNumber,
        description: `Credit Note issued: ${cn.reason || 'Billing adjustment'} (Ref: ${cn.invoiceNumber || 'General'})`,
        debit: 0,
        credit: roundTo2(cn.amount),
      });
    });

  // Debit Notes (Debit - increases receivables)
  (params.debitNotes || [])
    .filter((dn) => dn.customerId === customerId && dn.status !== 'Cancelled')
    .forEach((dn) => {
      rawTxList.push({
        id: dn.id,
        date: dn.date || dn.createdAt.split('T')[0],
        type: 'Debit Note',
        reference: dn.debitNoteNumber,
        description: `Debit Note: ${dn.reason || 'Additional charge'} (Ref: ${dn.invoiceNumber || 'General'})`,
        debit: roundTo2(dn.total || dn.amount),
        credit: 0,
      });
    });

  // Sort chronological
  rawTxList.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  // Filter date range if specified
  const filtered = rawTxList.filter((item) => {
    if (params.startDate && item.date < params.startDate) return false;
    if (params.endDate && item.date > params.endDate) return false;
    return true;
  });

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries = filtered.map((tx) => {
    runningBalance = roundTo2(runningBalance + tx.debit - tx.credit);
    totalDebit = roundTo2(totalDebit + tx.debit);
    totalCredit = roundTo2(totalCredit + tx.credit);

    return {
      ...tx,
      balance: runningBalance,
    };
  });

  return {
    entries,
    totalDebit,
    totalCredit,
    netClosingBalance: runningBalance,
  };
}

/**
 * Profit & Loss Calculation
 * Revenue (Invoiced vs Collections) vs Expenses
 */
export function calculateProfitAndLoss(params: {
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  startDate?: string;
  endDate?: string;
}) {
  const { invoices, payments, expenses, startDate, endDate } = params;

  const filteredInvoices = invoices.filter((inv) => {
    if (inv.status === 'Cancelled') return false;
    const d = inv.invoiceDate || inv.createdAt.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    if (p.status !== 'Confirmed' || p.isReversal) return false;
    const d = p.paymentDate || p.createdAt.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (e.status === 'REJECTED' || e.status === 'CANCELLED') return false;
    const d = e.expenseDate || e.createdAt.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  // Total Invoiced Revenue
  const invoicedRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  // Actual Collections
  const collectedRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  // Total Expenses
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.total || e.amount || 0), 0);

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    const cat = e.categoryName || 'Other';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (e.total || e.amount || 0);
  });

  const netAccrualProfit = roundTo2(invoicedRevenue - totalExpenses);
  const netCashFlow = roundTo2(collectedRevenue - totalExpenses);

  return {
    invoicedRevenue: roundTo2(invoicedRevenue),
    collectedRevenue: roundTo2(collectedRevenue),
    totalExpenses: roundTo2(totalExpenses),
    expensesByCategory,
    netAccrualProfit,
    netCashFlow,
  };
}

/**
 * Sales vs Collection Report Metrics
 */
export function calculateSalesVsCollection(params: {
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  customers: Customer[];
  employees: UserProfile[];
}) {
  const { invoices, payments } = params;

  let totalSales = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  invoices.forEach((inv) => {
    if (inv.status === 'Cancelled') return;
    const grand = inv.grandTotal || 0;
    const paid = inv.paidAmount || 0;
    const pending = inv.outstandingAmount ?? (grand - paid);

    totalSales += grand;
    totalCollected += paid;
    totalPending += pending;

    if (inv.dueDate && pending > 0) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        totalOverdue += pending;
      }
    }
  });

  const collectionPercent = totalSales > 0 ? roundTo2((totalCollected / totalSales) * 100) : 0;

  return {
    totalSales: roundTo2(totalSales),
    totalCollected: roundTo2(totalCollected),
    totalPending: roundTo2(totalPending),
    totalOverdue: roundTo2(totalOverdue),
    collectionPercent,
  };
}
