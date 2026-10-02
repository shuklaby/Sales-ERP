import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Mail,
  Share2,
  DollarSign,
  Ban,
  CheckCircle2,
  Calendar,
  Building2,
  CreditCard,
  FileCheck,
  Link2,
  Copy,
  Check,
  ExternalLink,
  CalendarClock,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceRecord, PaymentLinkRecord } from '../../types/crm';
import { formatCurrency, numberToWords } from '../../utils/financeUtils';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';
import { CreatePaymentLinkModal } from './CreatePaymentLinkModal';
import { CreateReminderModal } from '../communication/CreateReminderModal';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
  onRecordPayment?: (invoice: InvoiceRecord) => void;
  onEditDraft?: (invoice: InvoiceRecord) => void;
  onViewReceipt?: (receiptId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onRecordPayment,
  onEditDraft,
  onViewReceipt,
}) => {
  const { finalizeInvoice, cancelInvoice, sendInvoiceEmail, payments, receipts, paymentLinks } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const invoicePayments = payments.filter(
    (p) => p.invoiceId === invoice.id && p.status === 'Confirmed'
  );

  const handleDownloadPdf = () => {
    try {
      const doc = generateInvoicePdf(invoice);
      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  const handlePrint = () => {
    try {
      const doc = generateInvoicePdf(invoice);
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  const handleOpenEmail = () => {
    const custEmail = invoice.customerSnapshot?.email || '';
    setEmailTo(custEmail);
    setEmailSubject(`Invoice ${invoice.invoiceNumber} from SparkGenTechnology`);
    setEmailBody(
      `Dear ${invoice.customerSnapshot?.contactPerson || invoice.customerSnapshot?.companyName || 'Valued Client'},\n\nPlease find attached tax invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal.toLocaleString()}.\n\nInvoice Date: ${invoice.invoiceDate}\nDue Date: ${invoice.dueDate}\nOutstanding Amount: ₹${invoice.outstandingAmount.toLocaleString()}\n\nRemittance can be made to:\nBank: ${invoice.bankSnapshot?.bankName}\nAccount: ${invoice.bankSnapshot?.accountNumber}\nIFSC: ${invoice.bankSnapshot?.ifscCode}\n\nWarm regards,\nSparkGenTechnology Finance Team`
    );
    setEmailStatus(null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await sendInvoiceEmail(invoice.id, {
        to: emailTo.trim(),
        subject: emailSubject,
        message: emailBody,
      });
      if (res.success) {
        setEmailStatus('Invoice email successfully dispatched and logged in Email Center!');
        setTimeout(() => {
          setIsEmailModalOpen(false);
        }, 1500);
      } else {
        setEmailStatus(res.error || 'Failed to send invoice email.');
      }
    } catch (e: any) {
      setEmailStatus(e.message || 'Error sending email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const phone = (invoice.customerSnapshot?.mobile || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(
      `Hello ${invoice.customerSnapshot?.contactPerson || invoice.customerSnapshot?.companyName || 'Client'},\n\nThis is regarding Tax Invoice ${invoice.invoiceNumber} from SparkGenTechnology.\nInvoice Amount: ₹${invoice.grandTotal.toLocaleString()}\nDue Date: ${invoice.dueDate}\nOutstanding Balance: ₹${invoice.outstandingAmount.toLocaleString()}\n\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleFinalize = async () => {
    try {
      await finalizeInvoice(invoice.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await cancelInvoice(invoice.id, cancelReason);
      setIsCancelModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : invoice.status === 'Overdue'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : invoice.status === 'Partially Paid'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : invoice.status === 'Cancelled'
                  ? 'bg-slate-700/50 text-slate-400 border border-slate-700'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {invoice.status}
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">{invoice.invoiceNumber}</h2>
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
              title="Print Invoice"
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
              onClick={handleOpenWhatsApp}
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

        {/* Invoice Viewport Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Banner / Parties Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To (Buyer)
              </span>
              <h3 className="text-base font-bold text-white">
                {invoice.customerSnapshot?.companyName || 'Client'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Attn: {invoice.customerSnapshot?.contactPerson || 'Commercial Department'}
              </p>
              <p className="text-xs text-slate-400">
                {[
                  invoice.customerSnapshot?.address,
                  invoice.customerSnapshot?.city,
                  invoice.customerSnapshot?.state,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <div className="mt-2 text-[11px] text-slate-400">
                <span>GSTIN: {invoice.customerSnapshot?.gstNumber || 'Unregistered'}</span>
                <span className="mx-2">•</span>
                <span>Phone: {invoice.customerSnapshot?.mobile || 'N/A'}</span>
              </div>
            </div>

            <div className="md:text-right flex flex-col md:items-end justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tax Invoice Details
                </span>
                <div className="text-xs text-slate-300 space-y-0.5">
                  <p>
                    <span className="text-slate-400">Invoice Date: </span>
                    <span className="font-semibold text-white">{invoice.invoiceDate}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">Payment Due: </span>
                    <span className="font-semibold text-amber-400">{invoice.dueDate}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">Payment Terms: </span>
                    <span>{invoice.paymentTerms || 'Net 30'}</span>
                  </p>
                  {invoice.proposalSnapshot && (
                    <p>
                      <span className="text-slate-400">Ref Proposal: </span>
                      <span className="text-blue-400">{invoice.proposalSnapshot.proposalNumber}</span>
                    </p>
                  )}
                </div>
              </div>

              {invoice.cancelledAt && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-left text-xs text-red-400">
                  <span className="font-bold block">Cancelled:</span>
                  <span>Reason: {invoice.cancellationReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Item & Description</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-center">Disc %</th>
                  <th className="py-2.5 px-4 text-center">Tax %</th>
                  <th className="py-2.5 px-4 text-right">Tax Amt</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(invoice.items || []).map((it, idx) => (
                  <tr key={it.itemId || idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{it.name}</div>
                      {it.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{it.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{it.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-3 px-4 text-center">{it.discount ? `${it.discount}%` : '-'}</td>
                    <td className="py-3 px-4 text-center">{it.taxRate}%</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(it.taxAmount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Bank Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Bank details card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Credited Bank Remittance Coordinates</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1 pt-1">
                <p>
                  <span className="text-slate-400">Account Name: </span>
                  <span className="font-medium text-white">
                    {invoice.bankSnapshot?.accountHolderName || invoice.companySnapshot?.companyName}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Bank: </span>
                  <span>{invoice.bankSnapshot?.bankName || 'N/A'}</span>
                </p>
                <p>
                  <span className="text-slate-400">Account Number: </span>
                  <span className="font-mono text-white font-medium">
                    {invoice.bankSnapshot?.accountNumber || 'N/A'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">IFSC Code: </span>
                  <span className="font-mono text-white">{invoice.bankSnapshot?.ifscCode || 'N/A'}</span>
                  <span className="text-slate-500 mx-2">|</span>
                  <span className="text-slate-400">Branch: </span>
                  <span>{invoice.bankSnapshot?.branch || 'N/A'}</span>
                </p>
                {invoice.bankSnapshot?.upiId && (
                  <p>
                    <span className="text-slate-400">UPI ID: </span>
                    <span className="text-emerald-400 font-mono">{invoice.bankSnapshot.upiId}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Commercial Totals */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Gross):</span>
                <span className="text-slate-200">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Taxable Amount:</span>
                <span className="text-slate-200">{formatCurrency(invoice.taxableAmount)}</span>
              </div>
              {invoice.cgst > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>CGST:</span>
                  <span className="text-slate-200">{formatCurrency(invoice.cgst)}</span>
                </div>
              )}
              {invoice.sgst > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>SGST:</span>
                  <span className="text-slate-200">{formatCurrency(invoice.sgst)}</span>
                </div>
              )}
              {invoice.igst > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>IGST:</span>
                  <span className="text-slate-200">{formatCurrency(invoice.igst)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Grand Total:</span>
                <span className="text-blue-400">{formatCurrency(invoice.grandTotal)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Outstanding Due:</span>
                  <span>{formatCurrency(invoice.outstandingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 text-xs flex items-center gap-2">
            <span className="font-bold text-slate-400">Amount in Words:</span>
            <span className="text-white italic">{numberToWords(invoice.grandTotal)}</span>
          </div>

          {/* Confirmed Payments & Receipts Strip */}
          {invoicePayments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Confirmed Payments & Receipts ({invoicePayments.length})
              </h4>
              <div className="space-y-2">
                {invoicePayments.map((p) => {
                  const receipt = receipts.find((r) => r.paymentId === p.id);
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white">{formatCurrency(p.amount)}</span>
                          <span className="text-slate-400 text-[11px] block">
                            Paid via {p.paymentMethod} on {p.paymentDate} • Ref: {p.transactionReference}
                          </span>
                        </div>
                      </div>

                      {receipt && (
                        <button
                          onClick={() => onViewReceipt && onViewReceipt(receipt.id)}
                          className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Receipt {receipt.receiptNumber}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Online Payment Links Strip (Phase 13) */}
          {paymentLinks.filter((l) => l.invoiceId === invoice.id).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Online Payment Links ({paymentLinks.filter((l) => l.invoiceId === invoice.id).length})</span>
                {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
                  <button
                    onClick={() => setIsPaymentLinkModalOpen(true)}
                    className="text-blue-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" /> Generate Another
                  </button>
                )}
              </h4>
              <div className="space-y-2">
                {paymentLinks
                  .filter((l) => l.invoiceId === invoice.id)
                  .map((link) => {
                    const isExpired = new Date(link.expiresAt).getTime() < Date.now();
                    const isCopied = copiedToken === link.token;
                    return (
                      <div
                        key={link.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              link.status === 'Success'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : isExpired
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            <Link2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{formatCurrency(link.amount)}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  link.status === 'Success'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : isExpired
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}
                              >
                                {link.status === 'Success' ? 'Paid' : isExpired ? 'Expired' : 'Active'}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[11px] block mt-0.5">
                              Created {new Date(link.createdAt).toLocaleDateString()} • Expires {new Date(link.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/pay/${link.token}`);
                              setCopiedToken(link.token);
                              setTimeout(() => setCopiedToken(null), 3000);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <a
                            href={`/pay/${link.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {invoice.status === 'Draft' && (
              <>
                <button
                  onClick={() => onEditDraft && onEditDraft(invoice)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
                >
                  Edit Draft
                </button>
                <button
                  onClick={handleFinalize}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Finalize & Issue
                </button>
              </>
            )}

            {invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Cancel Invoice
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
              <>
                <button
                  onClick={() => setIsReminderModalOpen(true)}
                  className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <CalendarClock className="w-4 h-4" /> Send Reminder
                </button>
                <button
                  onClick={() => setIsPaymentLinkModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Link2 className="w-4 h-4" /> Create Payment Link
                </button>
                <button
                  onClick={() => onRecordPayment && onRecordPayment(invoice)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <DollarSign className="w-4 h-4" /> Record Payment
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Cancellation Reason Modal */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" /> Cancel Invoice {invoice.invoiceNumber}
              </h3>
              <p className="text-xs text-slate-400">
                Cancelled invoices remain in historical logs for statutory and audit compliance. Please
                specify the exact commercial justification:
              </p>
              <textarea
                rows={3}
                placeholder="Reason for cancellation (e.g. Client requested re-billing, project scope revision)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={cancelling || !cancelReason.trim()}
                  onClick={handleConfirmCancel}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Email Modal */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" /> Dispatch Invoice via Email
                </h3>
                <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {emailStatus && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    emailStatus.includes('successfully')
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  {emailStatus}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    placeholder="client@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject *</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Body</label>
                  <textarea
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
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
                  disabled={sendingEmail || !emailTo.trim()}
                  onClick={handleSendEmail}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {sendingEmail ? 'Dispatching...' : 'Send Invoice Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 13: Create Payment Link Modal */}
        <CreatePaymentLinkModal
          isOpen={isPaymentLinkModalOpen}
          onClose={() => setIsPaymentLinkModalOpen(false)}
          invoice={invoice}
          onEmailLink={(pl) => {
            setEmailTo(invoice.customerSnapshot?.email || '');
            setEmailSubject(`Payment Link for Invoice ${invoice.invoiceNumber} - SparkGenTechnology`);
            setEmailBody(
              `Dear ${invoice.customerSnapshot?.contactPerson || invoice.customerSnapshot?.companyName || 'Valued Client'},\n\nPlease find your secure online payment link for tax invoice ${invoice.invoiceNumber}:\n\nAmount: ₹${pl.amount.toLocaleString()}\nPayment Link: ${window.location.origin}/pay/${pl.token}\nValidity: Until ${new Date(pl.expiresAt).toLocaleString()}\n\nYou can pay online securely using UPI, Debit/Credit Cards, Net Banking or Wallets.\n\nWarm regards,\nSparkGenTechnology Finance Team`
            );
            setIsEmailModalOpen(true);
          }}
        />

        {/* Phase 15: Create Reminder Modal */}
        <CreateReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          initialCustomerId={invoice.customerId}
          initialInvoiceId={invoice.id}
          initialTitle={`Payment Reminder for Invoice ${invoice.invoiceNumber}`}
          initialMessage={`Payment reminder regarding outstanding balance of ₹${(invoice.outstandingAmount ?? invoice.grandTotal ?? 0).toLocaleString()} for Invoice ${invoice.invoiceNumber}`}
        />
      </div>
    </div>
  );
};
