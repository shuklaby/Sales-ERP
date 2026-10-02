import React, { useState } from 'react';
import { X, Download, Printer, Mail, Share2, FileCheck, CheckCircle2, Building2, CreditCard } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { PaymentReceipt } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';
import { generateReceiptPdf } from '../../utils/receiptPdfGenerator';

interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceipt | null;
}

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const { sendReceiptEmail } = useCrmData();

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen || !receipt) return null;

  const handleDownloadPdf = () => {
    try {
      const doc = generateReceiptPdf(receipt);
      doc.save(`${receipt.receiptNumber}.pdf`);
    } catch (e) {
      console.error('Receipt PDF generation error:', e);
    }
  };

  const handlePrint = () => {
    try {
      const doc = generateReceiptPdf(receipt);
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  const handleOpenEmail = () => {
    const custEmail = receipt.customerSnapshot?.email || '';
    setEmailTo(custEmail);
    setEmailSubject(`Official Payment Receipt ${receipt.receiptNumber} — SparkGenTechnology`);
    setEmailBody(
      `Dear ${receipt.customerSnapshot?.contactPerson || receipt.customerSnapshot?.companyName || 'Valued Client'},\n\nWe acknowledge with thanks the receipt of your payment.\n\nReceipt Number: ${receipt.receiptNumber}\nPayment Date: ${receipt.paymentDate}\nAmount Received: ₹${receipt.amount.toLocaleString()}\nPayment Method: ${receipt.paymentMethod}\nReference / UTR: ${receipt.referenceNumber}\nAssociated Invoice: ${receipt.invoiceNumber}\n\nAmount in Words: ${receipt.amountInWords}\n\nThank you for partnering with SparkGenTechnology.\n\nAccounts & Finance Department\nSparkGenTechnology`
    );
    setStatusMsg(null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setSending(true);
    setStatusMsg(null);
    try {
      const res = await sendReceiptEmail(receipt.id, {
        to: emailTo.trim(),
        subject: emailSubject,
        message: emailBody,
      });
      if (res.success) {
        setStatusMsg('Receipt dispatched successfully!');
        setTimeout(() => setIsEmailModalOpen(false), 1400);
      } else {
        setStatusMsg(res.error || 'Failed to dispatch receipt email.');
      }
    } catch (e: any) {
      setStatusMsg(e.message || 'Error occurred.');
    } finally {
      setSending(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = (receipt.customerSnapshot?.mobile || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(
      `Hello ${receipt.customerSnapshot?.contactPerson || receipt.customerSnapshot?.companyName || 'Client'},\n\nThank you for your payment of ₹${receipt.amount.toLocaleString()}.\nOfficial Receipt: ${receipt.receiptNumber}\nPayment Date: ${receipt.paymentDate}\nRef / UTR: ${receipt.referenceNumber}\nInvoice: ${receipt.invoiceNumber}\n\nSparkGenTechnology Finance Team`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{receipt.receiptNumber}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Confirmed
                </span>
              </div>
              <p className="text-xs text-slate-400">Official Authenticated Payment Receipt</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              title="Download PDF"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              title="Print Receipt"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenEmail}
              title="Send via Email"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Mail className="w-4 h-4" />
            </button>
            <button
              onClick={handleWhatsApp}
              title="Share on WhatsApp"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Big Amount Highlight Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Amount Received in Full Confirmation
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {formatCurrency(receipt.amount)}
              </div>
              <p className="text-xs text-slate-400 italic mt-1">{receipt.amountInWords}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 divide-y divide-slate-800/80 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Received With Thanks From:</span>
              <span className="font-bold text-white text-right">
                {receipt.customerSnapshot?.companyName || 'Valued Customer'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Contact Person / Department:</span>
              <span className="text-slate-200">
                {receipt.customerSnapshot?.contactPerson || 'Commercial Department'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Associated Invoice:</span>
              <span className="font-mono text-blue-400 font-semibold">{receipt.invoiceNumber}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Payment Date:</span>
              <span className="text-slate-200 font-medium">{receipt.paymentDate}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Payment Channel:</span>
              <span className="text-slate-200">{receipt.paymentMethod}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Transaction Reference / UTR:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {receipt.referenceNumber}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Issuing Organization:</span>
              <span className="text-slate-200">
                {receipt.companySnapshot?.companyName || 'SparkGenTechnology'} (GSTIN:{' '}
                {receipt.companySnapshot?.gstNumber || 'N/A'})
              </span>
            </div>
            {receipt.notes && (
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Notes:</span>
                <span className="text-slate-300 italic">{receipt.notes}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
            This digital receipt confirms valid realization of funds in the bank account of
            SparkGenTechnology. Immutable audit entry recorded in SalesSphere Finance Ledger.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>

        {/* Email Send Modal */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-400" /> Send Receipt via Email
                </h3>
                <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {statusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    statusMsg.includes('success')
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  {statusMsg}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">To Email *</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Message Body</label>
                  <textarea
                    rows={5}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={sending || !emailTo.trim()}
                  onClick={handleSendEmail}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Receipt Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
