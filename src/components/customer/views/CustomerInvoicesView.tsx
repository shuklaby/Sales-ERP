import React, { useState } from 'react';
import {
  FileText,
  Search,
  CreditCard,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Receipt,
  X,
  RefreshCw,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { InvoiceRecord } from '../../../types/crm';
import { formatCurrency } from '../../../utils/financeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const CustomerInvoicesView: React.FC = () => {
  const { invoices, receipts, customerUser } = useCustomerPortal();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!inv.invoiceNumber.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && inv.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Pay Now Handler: initiates Phase 13 payment gateway link
  const handlePayNow = async (invoice: InvoiceRecord) => {
    setPayingInvoiceId(invoice.id);
    setPayError(null);
    try {
      // Call Phase 13 create-link endpoint
      const res = await fetch('/api/payment/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerSnapshot?.companyName || customerUser?.customerName || 'Customer',
          customerEmail: customerUser?.email,
          customerPhone: customerUser?.phone,
          amount: invoice.outstandingAmount, // Outstanding calculated server-side
          notes: `Customer portal payment for ${invoice.invoiceNumber}`,
          expiryDays: 7,
          isPartialPayment: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPayError(data.error || 'Unable to initiate payment session. Please try again.');
      } else {
        // Redirect to Phase 13 secure customer payment route
        window.location.href = `/pay/${data.token}`;
      }
    } catch (e: any) {
      setPayError(e.message || 'Payment server connection failed.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleDownloadInvoicePdf = (inv: InvoiceRecord) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SparkGenTechnology', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('TAX INVOICE', 14, 26);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.text(`Invoice Number: ${inv.invoiceNumber}`, 14, 45);
      doc.text(`Invoice Date: ${inv.invoiceDate}`, 14, 52);
      doc.text(`Due Date: ${inv.dueDate || 'Upon Receipt'}`, 14, 59);
      doc.text(`Client: ${inv.customerSnapshot?.companyName || 'Client'}`, 14, 66);
      if (inv.customerSnapshot?.gstNumber) {
        doc.text(`Client GSTIN: ${inv.customerSnapshot.gstNumber}`, 14, 73);
      }

      const rows = (inv.items || []).map((it, idx) => [
        idx + 1,
        it.description || it.name,
        it.hsnSac || '998313',
        it.quantity,
        formatCurrency(it.unitPrice),
        formatCurrency(it.total),
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['#', 'Item / Description', 'HSN/SAC', 'Qty', 'Unit Price', 'Total']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 140;
      doc.setFont('helvetica', 'bold');
      doc.text(`Grand Total: ${formatCurrency(inv.grandTotal)}`, 140, finalY + 12);
      doc.text(`Amount Paid: ${formatCurrency(inv.paidAmount)}`, 140, finalY + 19);
      doc.setTextColor(220, 38, 38);
      doc.text(`Balance Outstanding: ${formatCurrency(inv.outstandingAmount)}`, 140, finalY + 26);

      doc.save(`${inv.invoiceNumber}.pdf`);
    } catch (e) {
      console.error('Invoice PDF error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" /> Tax Invoices & Settle
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official GST tax invoices, balance settlements, and payment history
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Invoices</option>
            <option value="Issued">Issued (Pending)</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid (Settled)</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {payError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{payError}</span>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Invoices Found</p>
            <p className="text-[11px] text-slate-500">
              Invoices generated for your purchases and service contracts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Paid</th>
                  <th className="py-3.5 px-4">Outstanding</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'Paid';
                  const isOverdue = inv.status === 'Overdue';
                  const isPaying = payingInvoiceId === inv.id;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {inv.invoiceDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {inv.dueDate || 'Upon receipt'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">
                        {formatCurrency(inv.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {formatCurrency(inv.outstandingAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isOverdue
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : inv.status === 'Partially Paid'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>

                          <button
                            onClick={() => handleDownloadInvoicePdf(inv)}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {!isPaid && inv.status !== 'Cancelled' && (
                            <button
                              disabled={isPaying}
                              onClick={() => handlePayNow(inv)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow disabled:opacity-50"
                            >
                              {isPaying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">{selectedInvoice.invoiceNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedInvoice.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : selectedInvoice.status === 'Overdue'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">Invoice Details</h3>
                <p className="text-[11px] text-slate-400">
                  Issued {selectedInvoice.invoiceDate} • Due {selectedInvoice.dueDate || 'Upon receipt'}
                </p>
              </div>

              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Line Items */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {(selectedInvoice.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-white block">{it.name || it.description}</span>
                        {it.hsnSac && <span className="text-[10px] text-slate-500 font-mono">HSN/SAC: {it.hsnSac}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Before Tax):</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.subTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total GST / Taxes:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-white font-bold border-t border-slate-800/80 pt-2 text-sm">
                <span>Invoice Grand Total:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Paid to Date:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800/80 pt-2">
                <span>Current Outstanding:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.outstandingAmount)}</span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => handleDownloadInvoicePdf(selectedInvoice)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Tax Invoice PDF
              </button>

              {selectedInvoice.status !== 'Paid' && selectedInvoice.status !== 'Cancelled' && (
                <button
                  onClick={() => handlePayNow(selectedInvoice)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <CreditCard className="w-4 h-4" /> Pay Balance ({formatCurrency(selectedInvoice.outstandingAmount)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
