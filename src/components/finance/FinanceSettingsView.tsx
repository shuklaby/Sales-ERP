import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Building2,
  CreditCard,
  Percent,
  Hash,
  Clock,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

export const FinanceSettingsView: React.FC = () => {
  const { financeSettings, updateFinanceSettings, bankAccounts } = useCrmData();
  const { isAdmin } = useAuth();

  const [invoicePrefix, setInvoicePrefix] = useState(financeSettings.invoicePrefix || 'INV');
  const [invoiceYearFormat, setInvoiceYearFormat] = useState<'YYYY' | 'YY'>(
    financeSettings.invoiceYearFormat || 'YYYY'
  );
  const [invoiceNextSequence, setInvoiceNextSequence] = useState(
    financeSettings.invoiceNextSequence || 1
  );

  const [receiptPrefix, setReceiptPrefix] = useState(financeSettings.receiptPrefix || 'RCT');
  const [receiptYearFormat, setReceiptYearFormat] = useState<'YYYY' | 'YY'>(
    financeSettings.receiptYearFormat || 'YYYY'
  );

  const [creditNotePrefix, setCreditNotePrefix] = useState(financeSettings.creditNotePrefix || 'CN');

  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(
    financeSettings.defaultPaymentTerms || 'Net 30'
  );
  const [defaultDueDays, setDefaultDueDays] = useState(financeSettings.defaultDueDays || 30);
  const [defaultCurrency, setDefaultCurrency] = useState(financeSettings.defaultCurrency || 'INR');
  const [currencySymbol, setCurrencySymbol] = useState(financeSettings.currencySymbol || '₹');

  const [defaultTaxType, setDefaultTaxType] = useState<'intra_state' | 'inter_state' | 'exempt'>(
    financeSettings.defaultTaxType || 'intra_state'
  );
  const [defaultTaxRate, setDefaultTaxRate] = useState(financeSettings.defaultTaxRate || 18);

  const [paymentMethodsText, setPaymentMethodsText] = useState(
    (financeSettings.paymentMethods || [
      'Bank Transfer',
      'UPI',
      'Cash',
      'Card',
      'Cheque',
      'Payment Gateway',
      'Other',
    ]).join(', ')
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators may configure financial settings.');
      return;
    }

    setSaving(true);
    setSavedSuccess(false);

    try {
      const methods = paymentMethodsText
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

      await updateFinanceSettings({
        invoicePrefix: invoicePrefix.trim().toUpperCase(),
        invoiceYearFormat,
        invoiceNextSequence: Number(invoiceNextSequence) || 1,
        receiptPrefix: receiptPrefix.trim().toUpperCase(),
        receiptYearFormat,
        creditNotePrefix: creditNotePrefix.trim().toUpperCase(),
        defaultPaymentTerms,
        defaultDueDays: Number(defaultDueDays) || 30,
        defaultCurrency,
        currencySymbol,
        defaultTaxType,
        defaultTaxRate: Number(defaultTaxRate) || 18,
        paymentMethods: methods.length > 0 ? methods : ['Bank Transfer', 'UPI', 'Cash'],
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update finance settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Finance & Billing Configuration</h2>
          <p className="text-xs text-slate-400">
            Define statutory sequence numbering, default payment terms, GST defaults, and payment modes
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Document Numbering Cards */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Hash className="w-4 h-4 text-blue-400" />
            <span>Document Numbering & Sequential Counters</span>
          </div>
          <p className="text-xs text-slate-400">
            Enforces strict concurrency-safe Firestore counters to prevent duplicate invoice or receipt numbers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Invoice Prefix */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Invoice Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="INV"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Format: {invoicePrefix}-{new Date().getFullYear()}-0001
              </span>
            </div>

            {/* Invoice Year Format */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Year Segment</label>
              <select
                value={invoiceYearFormat}
                onChange={(e) => setInvoiceYearFormat(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="YYYY">YYYY (4 Digits, e.g. 2026)</option>
                <option value="YY">YY (2 Digits, e.g. 26)</option>
              </select>
            </div>

            {/* Receipt Prefix */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Receipt Prefix</label>
              <input
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="RCT"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Format: {receiptPrefix}-{new Date().getFullYear()}-0001
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Terms & Currencies */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Default Payment Terms & Maturity Days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default Payment Terms
              </label>
              <select
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Immediate / Due on Receipt">Immediate / Due on Receipt</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Default Due Days</label>
              <input
                type="number"
                min="0"
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Operating Currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => {
                  setDefaultCurrency(e.target.value);
                  setCurrencySymbol(e.target.value === 'INR' ? '₹' : '$');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="INR">Indian Rupee (INR - ₹)</option>
                <option value="USD">US Dollar (USD - $)</option>
                <option value="EUR">Euro (EUR - €)</option>
              </select>
            </div>
          </div>
        </div>

        {/* GST / Taxation defaults */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span>Taxation & Statutory GST Treatment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default GST Allocation
              </label>
              <select
                value={defaultTaxType}
                onChange={(e) => setDefaultTaxType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="intra_state">Intra-State Supply (CGST + SGST)</option>
                <option value="inter_state">Inter-State Supply (IGST)</option>
                <option value="exempt">Non-Taxable / Exempt Supply</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Applied automatically to newly generated items
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default GST Rate (%)
              </label>
              <select
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard Services & Goods)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accepted Payment Modes */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>Permitted Payment Methods</span>
          </div>
          <p className="text-xs text-slate-400">
            Comma-separated channels made available during payment recording.
          </p>

          <div>
            <input
              type="text"
              value={paymentMethodsText}
              onChange={(e) => setPaymentMethodsText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="Bank Transfer, UPI, Cash, Card, Cheque, Payment Gateway, Other"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Settings...' : 'Save Finance Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
