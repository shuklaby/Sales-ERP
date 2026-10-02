import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, roundTo2 } from '../../utils/financeUtils';

interface DebitNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebitNoteModal: React.FC<DebitNoteModalProps> = ({ isOpen, onClose }) => {
  const { customers, invoices, createDebitNote, financeSettings } = useCrmData();
  const { userProfile } = useAuth();

  const [customerId, setCustomerId] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFinalizeImmediately, setIsFinalizeImmediately] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTaxRate(financeSettings.defaultTaxRate || 18);
    if (customers.length > 0) {
      setCustomerId(customers[0].id);
    }
    setInvoiceId('');
    setAmount('');
    setReason('');
  }, [isOpen, customers, financeSettings]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  const customerInvoices = useMemo(() => {
    if (!customerId) return [];
    return invoices.filter((inv) => inv.customerId === customerId && inv.status !== 'Cancelled');
  }, [invoices, customerId]);

  const calculations = useMemo(() => {
    const base = Math.max(0, Number(amount) || 0);
    const tax = roundTo2((base * (taxRate || 0)) / 100);
    const total = roundTo2(base + tax);
    return { base: roundTo2(base), tax, total };
  }, [amount, taxRate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid debit amount.');
      return;
    }

    if (!reason.trim()) {
      setError('A reason for the debit note is required.');
      return;
    }

    const linkedInvoice = invoices.find((i) => i.id === invoiceId);

    try {
      setSaving(true);
      setError(null);
      await createDebitNote({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.companyName || selectedCustomer.contactPerson || 'Client',
        invoiceId: linkedInvoice?.id,
        invoiceNumber: linkedInvoice?.invoiceNumber,
        amount: calculations.base,
        tax: calculations.tax,
        total: calculations.total,
        reason: reason.trim(),
        date,
        status: isFinalizeImmediately ? 'Finalized' : 'Draft',
        createdByName: userProfile?.name || 'Administrator',
        createdBy: userProfile?.uid || 'admin',
        finalizedAt: isFinalizeImmediately ? new Date().toISOString() : undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Error creating debit note:', err);
      setError(err?.message || 'Failed to create debit note.');
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Debit Note</h2>
              <p className="text-xs text-slate-400">Issue commercial supplementary debit against customer or invoice</p>
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

          {/* Select Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInvoiceId('');
              }}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} {c.contactPerson ? `(${c.contactPerson})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Linked Invoice */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Link with Invoice (Optional)
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No linked invoice (General account debit)</option>
              {customerInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — Dated {inv.invoiceDate} (Total: {formatCurrency(inv.grandTotal)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                GST Tax %
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Standard)</option>
                <option value={28}>28%</option>
              </select>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
            <span className="text-slate-400">Taxable: <strong className="text-white">{formatCurrency(calculations.base)}</strong></span>
            <span className="text-slate-400">Tax ({taxRate}%): <strong className="text-white">{formatCurrency(calculations.tax)}</strong></span>
            <span className="text-slate-400">Total: <strong className="text-blue-400">{formatCurrency(calculations.total)}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason / Justification *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rate revision, additional scope delivery, logistics surcharge, penalty..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <input
              type="checkbox"
              id="finalizeDebit"
              checked={isFinalizeImmediately}
              onChange={(e) => setIsFinalizeImmediately(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
            />
            <label htmlFor="finalizeDebit" className="text-xs text-slate-300 select-none">
              Finalize immediately (generates official debit note number and posts to ledger)
            </label>
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow disabled:opacity-50"
            >
              {saving ? 'Creating...' : isFinalizeImmediately ? 'Create & Finalize' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
