import React, { useState } from 'react';
import {
  X,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Mail,
  QrCode,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { InvoiceRecord, PaymentLinkRecord } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';

interface CreatePaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
  onEmailLink?: (paymentLink: PaymentLinkRecord) => void;
}

export const CreatePaymentLinkModal: React.FC<CreatePaymentLinkModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onEmailLink,
}) => {
  const { createPaymentLink, paymentConfig } = useCrmData();

  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [expiryHours, setExpiryHours] = useState<number>(72);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<PaymentLinkRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen || !invoice) return null;

  const outstanding = Math.max(0, invoice.outstandingAmount);

  const handleGenerate = async () => {
    setError(null);
    let requestedAmount = outstanding;

    if (paymentType === 'partial') {
      const parsed = parseFloat(partialAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Please enter a valid partial payment amount greater than zero.');
        return;
      }
      if (parsed > outstanding) {
        setError(`Partial payment amount (₹${parsed.toLocaleString()}) cannot exceed the outstanding balance of ₹${outstanding.toLocaleString()}.`);
        return;
      }
      requestedAmount = parsed;
    }

    setLoading(true);
    try {
      const link = await createPaymentLink({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.contactPerson || 'Customer',
        customerEmail: invoice.customerSnapshot?.email,
        customerPhone: invoice.customerSnapshot?.mobile,
        requestedAmount,
        invoiceTotal: invoice.grandTotal,
        invoicePaid: invoice.paidAmount,
        invoiceOutstanding: outstanding,
        expiresInHours: expiryHours,
        notes: notes.trim() || undefined,
      });

      setGeneratedLink(link);
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment link. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const getFullPaymentUrl = (token: string) => {
    return `${window.location.origin}/pay/${token}`;
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    const url = getFullPaymentUrl(generatedLink.token);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setPaymentType('full');
    setPartialAmount('');
    setNotes('');
    setError(null);
    setCopied(false);
    setShowQr(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Generate Online Payment Link
              </h2>
              <p className="text-xs text-slate-400">
                Invoice {invoice.invoiceNumber} • {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.contactPerson}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!generatedLink ? (
            <div className="space-y-4">
              {/* Financial Snapshot Card */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Invoice Grand Total</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{formatCurrency(invoice.grandTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Already Paid</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">{formatCurrency(invoice.paidAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-400 font-medium">Total Outstanding</div>
                  <div className="text-xs font-bold text-blue-400 mt-0.5">{formatCurrency(outstanding)}</div>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  Select Payment Link Amount
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('full');
                      setError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentType === 'full'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">Full Outstanding</span>
                    <span className="text-sm font-black text-blue-400 mt-1">{formatCurrency(outstanding)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('partial');
                      if (!partialAmount) setPartialAmount(Math.round(outstanding / 2).toString());
                      setError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentType === 'partial'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">Partial Installment</span>
                    <span className="text-xs text-slate-400 mt-1">Custom specified amount</span>
                  </button>
                </div>

                {paymentType === 'partial' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="text-xs text-slate-300 font-medium mb-1 block">
                      Custom Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        max={outstanding}
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder={`Enter amount up to ${outstanding}`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Max partial amount allowed: {formatCurrency(outstanding)}
                    </p>
                  </div>
                )}
              </div>

              {/* Expiration Settings */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1.5 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Payment Link Validity
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '24 Hours', hours: 24 },
                    { label: '48 Hours', hours: 48 },
                    { label: '72 Hours', hours: 72 },
                    { label: '7 Days', hours: 168 },
                  ].map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setExpiryHours(opt.hours)}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition ${
                        expiryHours === opt.hours
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-1 block">
                  Remarks / Purpose (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 50% milestone advance payment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Security info notice */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The generated link uses a secure 256-bit cryptographic token. Customers will only see safe invoice remittance details via the gateway ({paymentConfig.gateway.toUpperCase()}) without exposing internal CRM notes.
                </p>
              </div>
            </div>
          ) : (
            /* Link Generated State */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                  <Check className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Payment Link Ready</h3>
                <p className="text-xs text-slate-400">
                  Amount: <strong className="text-emerald-400">{formatCurrency(generatedLink.amount)}</strong> • Expires in {expiryHours} hours
                </p>
              </div>

              {/* Copy URL Box */}
              <div>
                <label className="text-xs text-slate-300 font-medium mb-1.5 block">Customer Payment URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullPaymentUrl(generatedLink.token)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* QR Code toggle */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950 flex flex-col items-center">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-400" /> Mobile Scan QR Code
                  </span>
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    {showQr ? 'Hide QR' : 'Show QR'}
                  </button>
                </div>
                {showQr && (
                  <div className="mt-3 p-3 bg-white rounded-xl shadow-inner text-center animate-in zoom-in-95 duration-150">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        getFullPaymentUrl(generatedLink.token)
                      )}`}
                      alt="Payment Link QR"
                      className="w-36 h-36 mx-auto rounded-lg"
                    />
                    <p className="text-[10px] text-slate-600 font-mono mt-1 font-semibold">
                      Scan with any UPI / Camera App
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href={getFullPaymentUrl(generatedLink.token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold text-center transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Preview Page
                </a>
                {onEmailLink && (
                  <button
                    onClick={() => {
                      onEmailLink(generatedLink);
                      onClose();
                    }}
                    className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email to Client
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Gateway: <strong className="text-slate-200 capitalize">{paymentConfig.gateway}</strong> ({paymentConfig.environment})
          </div>
          <div className="flex items-center gap-2">
            {!generatedLink ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerate}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Generate Link'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
