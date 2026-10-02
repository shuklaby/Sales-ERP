import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceRecord } from '../../types/crm';
import { formatCurrency, roundTo2 } from '../../utils/financeUtils';

interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetInvoice?: InvoiceRecord | null;
}

export const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
  isOpen,
  onClose,
  targetInvoice,
}) => {
  const { invoices, customers, createCreditNote } = useCrmData();
  const { userProfile } = useAuth();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter finalized eligible invoices (status !== 'Draft' and status !== 'Cancelled')
  const eligibleInvoices = useMemo(() => {
    return invoices.filter((i) => i.status !== 'Draft' && i.status !== 'Cancelled');
  }, [invoices]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDate(new Date().toISOString().split('T')[0]);
    if (targetInvoice) {
      setSelectedInvoiceId(targetInvoice.id);
      setAmount(targetInvoice.outstandingAmount > 0 ? targetInvoice.outstandingAmount : targetInvoice.grandTotal);
      setReason('');
    } else if (eligibleInvoices.length > 0) {
      setSelectedInvoiceId(eligibleInvoices[0].id);
      setAmount(eligibleInvoices[0].outstandingAmount > 0 ? eligibleInvoices[0].outstandingAmount : eligibleInvoices[0].grandTotal);
      setReason('');
    }
  }, [isOpen, targetInvoice, eligibleInvoices]);

  const activeInvoice = useMemo(() => {
    return eligibleInvoices.find((i) => i.id === selectedInvoiceId);
  }, [eligibleInvoices, selectedInvoiceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) {
      setError('Please select an invoice to issue credit note against.');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid credit amount greater than 0.');
      return;
    }

    if (numAmount > activeInvoice.grandTotal) {
      setError(`Credit note amount cannot exceed the total invoice value of ${formatCurrency(activeInvoice.grandTotal)}.`);
      return;
    }

    if (!reason.trim()) {
      setError('A valid business reason or tax adjustment cause is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createCreditNote({
        invoiceId: activeInvoice.id,
        customerId: activeInvoice.customerId,
        amount: roundTo2(numAmount),
        reason: reason.trim(),
        date,
      });
      onClose();
    } catch (err: any) {
      console.error('Error creating credit note:', err);
      setError(err?.message || 'Failed to issue credit note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Credit Note</h2>
              <p className="text-xs text-slate-400">Issue commercial adjustment reducing customer receivable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Invoice */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Invoice *
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                const inv = eligibleInvoices.find((i) => i.id === e.target.value);
                if (inv) {
                  setAmount(inv.outstandingAmount > 0 ? inv.outstandingAmount : inv.grandTotal);
                }
              }}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {eligibleInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customerSnapshot?.companyName || 'Client'} (Total: {formatCurrency(inv.grandTotal)}, Outstanding: {formatCurrency(inv.outstandingAmount)})
                </option>
              ))}
            </select>
          </div>

          {activeInvoice && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{activeInvoice.customerSnapshot?.companyName || 'Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Total:</span>
                <span className="font-semibold text-white">{formatCurrency(activeInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid Amount:</span>
                <span className="text-emerald-400 font-semibold">{formatCurrency(activeInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Outstanding:</span>
                <span className="text-amber-400 font-semibold">{formatCurrency(activeInvoice.outstandingAmount)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Credit Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={activeInvoice?.grandTotal || 9999999}
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Credit Note *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sales return, rate difference, volume discount, service shortfall..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition shadow disabled:opacity-50"
            >
              {saving ? 'Issuing...' : 'Issue Credit Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
