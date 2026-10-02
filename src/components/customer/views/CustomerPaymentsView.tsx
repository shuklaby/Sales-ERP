import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Receipt,
  Download,
  Calendar,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { formatCurrency } from '../../../utils/financeUtils';

export const CustomerPaymentsView: React.FC = () => {
  const { onlinePayments, receipts, invoices, setActiveTab } = useCustomerPortal();
  const [searchTerm, setSearchTerm] = useState('');

  // Collect all verified payments for this customer
  const filteredPayments = onlinePayments.filter((p) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        p.invoiceNumber.toLowerCase().includes(q) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" /> Payment History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Confirmed online transactions, gateway audit references, and settlement timestamps
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search payments by invoice or ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Payment Records</p>
            <p className="text-[11px] text-slate-500">
              When payments are confirmed via our secure gateway or bank transfer, they appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPayments.map((p) => {
                  const isSuccess = p.status === 'Confirmed' || p.status === 'Success';
                  const isRefunded = p.status === 'Refunded' || p.status === 'Partially Refunded';
                  const receipt = receipts.find((r) => r.id === p.receiptId || r.receiptNumber === p.receiptNumber || r.invoiceId === p.invoiceId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 text-slate-400">
                        {p.confirmedAt ? new Date(p.confirmedAt).toLocaleString() : new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 uppercase text-[11px] font-medium">
                        {p.paymentMethod || 'Online Gateway'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {p.transactionReference || p.gatewayPaymentId || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-400">
                        {p.gateway || 'Razorpay'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isRefunded
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {receipt ? (
                          <button
                            onClick={() => setActiveTab('receipts')}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-semibold transition inline-flex items-center gap-1"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>{receipt.receiptNumber}</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
