import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { InvoiceRecord, PaymentMethod } from '../../types/crm';
import { formatCurrency, roundTo2 } from '../../utils/financeUtils';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetInvoice?: InvoiceRecord | null;
  targetCustomerId?: string;
  onSuccess?: (paymentId: string) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  targetInvoice,
  targetCustomerId,
  onSuccess,
}) => {
  const { invoices, customers, financeSettings, recordPayment } = useCrmData();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | string>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [asCustomerAdvance, setAsCustomerAdvance] = useState<boolean>(false);

  // Confirmation state
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setIsConfirming(false);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setTransactionReference('');
    setNotes('');
    setAsCustomerAdvance(false);

    if (targetInvoice) {
      setSelectedInvoiceId(targetInvoice.id);
      setSelectedCustomerId(targetInvoice.customerId);
      const outstanding = roundTo2(targetInvoice.grandTotal - (targetInvoice.paidAmount || 0));
      setAmount(Math.max(0, outstanding));
    } else if (targetCustomerId) {
      setSelectedCustomerId(targetCustomerId);
      const custInvoices = invoices.filter(
        (i) => i.customerId === targetCustomerId && i.status !== 'Cancelled' && i.status !== 'Paid'
      );
      if (custInvoices.length > 0) {
        setSelectedInvoiceId(custInvoices[0].id);
        const out = roundTo2(custInvoices[0].grandTotal - (custInvoices[0].paidAmount || 0));
        setAmount(Math.max(0, out));
      } else {
        setSelectedInvoiceId('');
        setAmount(0);
      }
    } else {
      const openInvoices = invoices.filter((i) => i.status !== 'Cancelled' && i.status !== 'Paid');
      if (openInvoices.length > 0) {
        setSelectedInvoiceId(openInvoices[0].id);
        setSelectedCustomerId(openInvoices[0].customerId);
        const out = roundTo2(openInvoices[0].grandTotal - (openInvoices[0].paidAmount || 0));
        setAmount(Math.max(0, out));
      } else {
        setSelectedInvoiceId('');
        setSelectedCustomerId(customers[0]?.id || '');
        setAmount(0);
      }
    }
  }, [isOpen, targetInvoice, targetCustomerId, invoices, customers]);

  const activeInvoice = useMemo(() => {
    return invoices.find((i) => i.id === selectedInvoiceId);
  }, [invoices, selectedInvoiceId]);

  const activeCustomer = useMemo(() => {
    if (activeInvoice) return activeInvoice.customerSnapshot || customers.find((c) => c.id === activeInvoice.customerId);
    return customers.find((c) => c.id === selectedCustomerId);
  }, [activeInvoice, customers, selectedCustomerId]);

  const invoiceTotal = activeInvoice?.grandTotal || 0;
  const previouslyPaid = activeInvoice?.paidAmount || 0;
  const currentOutstanding = Math.max(0, roundTo2(invoiceTotal - previouslyPaid));
  const remainingBalance = Math.max(0, roundTo2(currentOutstanding - amount));
  const isOverpayment = activeInvoice ? amount > currentOutstanding + 0.01 : false;
  const excessAmount = isOverpayment ? roundTo2(amount - currentOutstanding) : 0;

  const handleInvoiceChange = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setSelectedCustomerId(inv.customerId);
      const out = Math.max(0, roundTo2(inv.grandTotal - (inv.paidAmount || 0)));
      setAmount(out);
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Please enter a payment amount greater than zero.');
      return;
    }
    if (!transactionReference.trim()) {
      setError('Please provide a transaction reference number or UTR for audit compliance.');
      return;
    }
    if (isOverpayment && !asCustomerAdvance) {
      setError(
        `Payment amount exceeds outstanding balance by ₹${excessAmount.toLocaleString()}. Please tick "Record Excess as Customer Advance" or adjust the payment amount.`
      );
      return;
    }
    setError(null);
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await recordPayment({
        invoiceId: selectedInvoiceId || undefined,
        customerId: selectedCustomerId,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim(),
        notes,
        status: 'Confirmed',
        asCustomerAdvance: isOverpayment ? true : false,
      });

      if (onSuccess && result.payment) {
        onSuccess(result.payment.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setError(err.message || 'Payment execution failed.');
      setIsConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Record Confirmed Payment</h2>
              <p className="text-xs text-slate-400">
                Official monetary settlement & automated receipt generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {!isConfirming ? (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Invoice selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Associated Invoice
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Direct Client Payment (No Invoice Linked)</option>
                  {invoices
                    .filter((i) => i.status !== 'Cancelled')
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customerSnapshot?.companyName || 'Client'} (Total: ₹
                        {inv.grandTotal.toLocaleString()} | Due: ₹{inv.outstandingAmount.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              {/* Financial Metrics Strip if Invoice is selected */}
              {activeInvoice && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Invoice Total</span>
                    <span className="text-xs font-bold text-white">{formatCurrency(invoiceTotal)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Previously Paid</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {formatCurrency(previouslyPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Current Due</span>
                    <span className="text-xs font-bold text-amber-400">
                      {formatCurrency(currentOutstanding)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Remaining After</span>
                    <span className="text-xs font-bold text-blue-400">
                      {formatCurrency(remainingBalance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 50000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Overpayment Warning banner */}
              {isOverpayment && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Overpayment Detected (+{formatCurrency(excessAmount)})</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    The payment exceeds the outstanding balance. The invoice will be marked Paid (₹
                    {currentOutstanding.toLocaleString()}).
                  </p>
                  <label className="flex items-center gap-2 text-xs text-white font-medium cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={asCustomerAdvance}
                      onChange={(e) => setAsCustomerAdvance(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Record excess {formatCurrency(excessAmount)} as Customer Advance</span>
                  </label>
                </div>
              )}

              {/* Payment Method & UTR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Payment Channel *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {(
                      financeSettings.paymentMethods || [
                        'Bank Transfer',
                        'UPI',
                        'Cash',
                        'Card',
                        'Cheque',
                        'Payment Gateway',
                        'Other',
                      ]
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Transaction / Reference / UTR Number *
                  </label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="e.g. UTR1234987654 or CHEQUE-0091"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Internal Finance Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remittance details, branch verification, or customer remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition flex items-center gap-1.5"
                >
                  Review & Confirm Payment
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verify Settlement Information</span>
                </div>

                <div className="divide-y divide-slate-800/80 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="text-white font-medium">
                      {activeCustomer?.companyName || 'Direct Client'}
                    </span>
                  </div>
                  {activeInvoice && (
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Invoice:</span>
                      <span className="text-white font-medium">{activeInvoice.invoiceNumber}</span>
                    </div>
                  )}
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Payment Amount:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Payment Channel:</span>
                    <span className="text-slate-200">{paymentMethod}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Transaction Reference:</span>
                    <span className="text-slate-200 font-mono">{transactionReference}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Settlement Date:</span>
                    <span className="text-slate-200">{paymentDate}</span>
                  </div>
                  {activeInvoice && (
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">New Outstanding:</span>
                      <span className="text-blue-400 font-bold">
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                By confirming, a verified payment receipt (RCT-XXXX) will be generated automatically,
                the invoice status will update in real-time, and immutable audit entries will be recorded.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsConfirming(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? 'Processing Payment...' : 'Confirm & Save Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
