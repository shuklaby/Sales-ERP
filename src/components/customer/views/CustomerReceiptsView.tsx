import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Download,
  Eye,
  Calendar,
  CreditCard,
  Building2,
  X,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { PaymentReceipt } from '../../../types/crm';
import { formatCurrency } from '../../../utils/financeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const CustomerReceiptsView: React.FC = () => {
  const { receipts } = useCustomerPortal();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  const filteredReceipts = receipts.filter((r) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        r.receiptNumber.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        (r.transactionReference && r.transactionReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleDownloadReceiptPdf = (receipt: PaymentReceipt) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SparkGenTechnology', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL PAYMENT RECEIPT', 14, 26);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.text(`Receipt Number: ${receipt.receiptNumber}`, 14, 45);
      doc.text(`Date of Payment: ${receipt.paymentDate}`, 14, 52);
      doc.text(`Settled Invoice: ${receipt.invoiceNumber}`, 14, 59);
      doc.text(`Client Organization: ${receipt.customerName}`, 14, 66);
      doc.text(`Payment Channel: ${receipt.paymentMethod}`, 14, 73);
      if (receipt.transactionReference) {
        doc.text(`Transaction Reference: ${receipt.transactionReference}`, 14, 80);
      }

      autoTable(doc, {
        startY: 88,
        head: [['Description', 'Reference ID', 'Amount Settled']],
        body: [
          [
            `Settlement for Tax Invoice ${receipt.invoiceNumber}`,
            receipt.transactionReference || 'Online Gateway Confirmed',
            formatCurrency(receipt.amount),
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Total Paid: ${formatCurrency(receipt.amount)}`, 140, finalY + 14);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'This is a computer-generated receipt issued by SparkGenTechnology. No signature required.',
        14,
        finalY + 30
      );

      doc.save(`${receipt.receiptNumber}.pdf`);
    } catch (e) {
      console.error('Receipt PDF error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" /> Official Receipts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audited payment confirmation vouchers and downloadable PDF receipts
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search receipt or invoice #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredReceipts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Receipts Found</p>
            <p className="text-[11px] text-slate-500">
              Official receipts are automatically generated whenever invoice settlements are confirmed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {r.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{r.paymentDate}</td>
                    <td className="py-3.5 px-4 font-mono text-white">{r.invoiceNumber}</td>
                    <td className="py-3.5 px-4 text-slate-300 uppercase text-[11px]">
                      {r.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => handleDownloadReceiptPdf(r)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                          title="Download Receipt PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Official Receipt</span>
                <h3 className="text-lg font-black text-white font-mono">{selectedReceipt.receiptNumber}</h3>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Date:</span>
                <span className="text-white font-medium">{selectedReceipt.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settled Invoice:</span>
                <span className="font-mono text-white font-bold">{selectedReceipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-slate-200 uppercase">{selectedReceipt.paymentMethod}</span>
              </div>
              {selectedReceipt.transactionReference && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference:</span>
                  <span className="font-mono text-[11px] text-slate-300">{selectedReceipt.transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800/80 pt-2 text-sm font-bold">
                <span className="text-white">Total Amount Paid:</span>
                <span className="font-mono text-emerald-400">{formatCurrency(selectedReceipt.amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadReceiptPdf(selectedReceipt)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
