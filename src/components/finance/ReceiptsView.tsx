import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Search,
  Download,
  Printer,
  Mail,
  Share2,
  Calendar,
  Building2,
  Eye,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { PaymentReceipt } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';
import { generateReceiptPdf } from '../../utils/receiptPdfGenerator';

interface ReceiptsViewProps {
  onSelectReceipt: (receipt: PaymentReceipt) => void;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({ onSelectReceipt }) => {
  const { receipts, customers } = useCrmData();

  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = (r.receiptNumber || '').toLowerCase().includes(term);
        const matchCust = (r.customerSnapshot?.companyName || '').toLowerCase().includes(term);
        const matchInv = (r.invoiceNumber || '').toLowerCase().includes(term);
        const matchRef = (r.referenceNumber || '').toLowerCase().includes(term);
        if (!matchNum && !matchCust && !matchInv && !matchRef) return false;
      }

      if (customerFilter !== 'all' && r.customerId !== customerFilter) return false;

      return true;
    });
  }, [receipts, searchTerm, customerFilter]);

  const handleDownloadPdf = (r: PaymentReceipt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const doc = generateReceiptPdf(r);
      doc.save(`${r.receiptNumber}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payment Receipts Register</h2>
          <p className="text-xs text-slate-400">
            Authenticated digital acknowledgments for confirmed customer settlements
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt number, customer, invoice #, UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Linked Invoice</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Transaction UTR</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                    No payment receipts found.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReceipt(r)}
                    className="hover:bg-slate-800/30 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{r.receiptNumber}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {r.customerSnapshot?.companyName || 'Client'}
                    </td>

                    <td className="py-3 px-4 font-mono text-blue-400">{r.invoiceNumber}</td>

                    <td className="py-3 px-4 text-slate-300">{r.paymentDate}</td>

                    <td className="py-3 px-4">{r.paymentMethod}</td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {r.referenceNumber}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(r.amount)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectReceipt(r)}
                          title="View Receipt"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDownloadPdf(r, e)}
                          title="Download PDF"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
