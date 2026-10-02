import React, { useState, useEffect, useMemo } from 'react';
import { X, Receipt, AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRecord, ExpenseStatus } from '../../types/crm';
import { formatCurrency, roundTo2 } from '../../utils/financeUtils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: ExpenseRecord | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
}) => {
  const {
    expenseCategories,
    vendors,
    bankAccounts,
    addExpense,
    updateDraftExpense,
  } = useCrmData();

  const { userProfile, isAdmin } = useAuth();

  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [tax, setTax] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [status, setStatus] = useState<ExpenseStatus>('PENDING_APPROVAL');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    const defaultBank = bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankAccounts[0];
    const defaultCat = expenseCategories.find((c) => c.isActive) || expenseCategories[0];

    if (expenseToEdit) {
      setExpenseDate(expenseToEdit.expenseDate || new Date().toISOString().split('T')[0]);
      setCategoryId(expenseToEdit.categoryId || '');
      setVendorId(expenseToEdit.vendorId || '');
      setAmount(expenseToEdit.amount || 0);
      setTax(expenseToEdit.tax || 0);
      setPaymentMethod(expenseToEdit.paymentMethod || 'Bank Transfer');
      setBankAccountId(expenseToEdit.bankAccountId || defaultBank?.id || '');
      setDescription(expenseToEdit.description || '');
      setAttachmentUrl(expenseToEdit.attachmentUrl || '');
      setAttachmentName(expenseToEdit.attachmentName || '');
      setStatus(expenseToEdit.status || 'DRAFT');
    } else {
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategoryId(defaultCat?.id || '');
      setVendorId('');
      setAmount('');
      setTax(0);
      setPaymentMethod('Bank Transfer');
      setBankAccountId(defaultBank?.id || '');
      setDescription('');
      setAttachmentUrl('');
      setAttachmentName('');
      setStatus(isAdmin ? 'APPROVED' : 'PENDING_APPROVAL');
    }
  }, [isOpen, expenseToEdit, expenseCategories, bankAccounts, isAdmin]);

  const totalCalculated = useMemo(() => {
    const a = Math.max(0, Number(amount) || 0);
    const t = Math.max(0, Number(tax) || 0);
    return roundTo2(a + t);
  }, [amount, tax]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read as Data URL for instant persistent local storage simulation or direct cloud
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentUrl(reader.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setError('Please select an expense category.');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    const categoryObj = expenseCategories.find((c) => c.id === categoryId);
    const vendorObj = vendors.find((v) => v.id === vendorId);
    const bankObj = bankAccounts.find((b) => b.id === bankAccountId);

    try {
      setSaving(true);
      setError(null);

      if (expenseToEdit) {
        await updateDraftExpense(expenseToEdit.id, {
          expenseDate,
          categoryId,
          categoryName: categoryObj?.name || 'General Expense',
          vendorId: vendorObj?.id,
          vendorName: vendorObj?.vendorName || vendorObj?.company,
          vendor: vendorObj?.company || vendorObj?.vendorName,
          amount: roundTo2(numAmount),
          tax: roundTo2(Number(tax) || 0),
          total: totalCalculated,
          paymentMethod,
          bankAccountId: bankObj?.id,
          bankAccountName: bankObj?.bankName,
          description: description.trim(),
          attachmentUrl,
          attachmentName,
          status,
        });
      } else {
        await addExpense({
          expenseDate,
          categoryId,
          categoryName: categoryObj?.name || 'General Expense',
          vendorId: vendorObj?.id,
          vendorName: vendorObj?.vendorName || vendorObj?.company,
          vendor: vendorObj?.company || vendorObj?.vendorName,
          amount: roundTo2(numAmount),
          tax: roundTo2(Number(tax) || 0),
          total: totalCalculated,
          paymentMethod,
          bankAccountId: bankObj?.id,
          bankAccountName: bankObj?.bankName,
          description: description.trim(),
          attachmentUrl,
          attachmentName,
          status,
          approvedBy: status === 'APPROVED' ? userProfile?.uid : undefined,
          approvedByName: status === 'APPROVED' ? userProfile?.name : undefined,
          approvedAt: status === 'APPROVED' ? new Date().toISOString() : undefined,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setError(err?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {expenseToEdit ? 'Edit Expense Record' : 'Record Operating Expense'}
              </h2>
              <p className="text-xs text-slate-400">Manage organizational expenditure with bills and audit</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Expense Date *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Select category...</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.isActive}>
                    {c.name} {!c.isActive ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vendor / Payee (Optional)
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">No registered vendor / Direct expense</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.company || v.vendorName} ({v.vendorName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI</option>
                <option value="Card">Corporate Credit / Debit Card</option>
                <option value="Cash">Petty Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tax Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Total Expenditure
              </label>
              <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-400">
                {formatCurrency(totalCalculated)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Disbursement Bank Account
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Select bank account...</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} — {b.accountHolderName} ({b.accountNumber.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="DRAFT">Draft (Unsubmitted)</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                {isAdmin && <option value="APPROVED">Approved</option>}
                {isAdmin && <option value="PAID">Paid (Settled)</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description / Business Purpose *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly cloud server hosting bill for AWS/GCP, office broadband..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Attachment Bill */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Attach Bill / Invoice Document
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer border border-slate-700 transition">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload Bill File</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {attachmentName && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {attachmentName}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow disabled:opacity-50"
            >
              {saving ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
