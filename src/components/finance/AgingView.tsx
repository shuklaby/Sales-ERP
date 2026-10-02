import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  Search,
  Filter,
  DollarSign,
  Building2,
  Calendar,
  Eye,
  Bell,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceRecord } from '../../types/crm';
import { formatCurrency, calculateDaysOverdue, getAgingBucket, roundTo2 } from '../../utils/financeUtils';

interface AgingViewProps {
  onSelectInvoice: (invoice: InvoiceRecord) => void;
  onRecordPayment: (invoice: InvoiceRecord) => void;
  onSendReminder: (invoice: InvoiceRecord) => void;
}

export const AgingView: React.FC<AgingViewProps> = ({
  onSelectInvoice,
  onRecordPayment,
  onSendReminder,
}) => {
  const { invoices, customers } = useCrmData();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [bucketFilter, setBucketFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');

  // Receivables with outstanding balance > 0 and not cancelled
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status !== 'Cancelled' && inv.status !== 'Paid' && inv.outstandingAmount > 0
    );
  }, [invoices]);

  // Aging Buckets Summary
  const agingSummary = useMemo(() => {
    const buckets: Record<
      string,
      { count: number; total: number; color: string; badgeClass: string }
    > = {
      Current: {
        count: 0,
        total: 0,
        color: 'text-blue-400',
        badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      },
      '1-30 Days': {
        count: 0,
        total: 0,
        color: 'text-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      },
      '31-60 Days': {
        count: 0,
        total: 0,
        color: 'text-orange-400',
        badgeClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      },
      '61-90 Days': {
        count: 0,
        total: 0,
        color: 'text-rose-400',
        badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      },
      '90+ Days': {
        count: 0,
        total: 0,
        color: 'text-red-500',
        badgeClass: 'bg-red-500/10 text-red-500 border border-red-500/20',
      },
    };

    unpaidInvoices.forEach((inv) => {
      const bucket = getAgingBucket(inv.dueDate);
      if (buckets[bucket]) {
        buckets[bucket].count += 1;
        buckets[bucket].total = roundTo2(buckets[bucket].total + inv.outstandingAmount);
      }
    });

    const grandTotal = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

    return { buckets, grandTotal: roundTo2(grandTotal) };
  }, [unpaidInvoices]);

  // Filtered List
  const filteredList = useMemo(() => {
    return unpaidInvoices.filter((inv) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(term);
        const matchCust = (inv.customerSnapshot?.companyName || '').toLowerCase().includes(term);
        if (!matchNum && !matchCust) return false;
      }

      if (customerFilter !== 'all' && inv.customerId !== customerFilter) return false;

      if (bucketFilter !== 'all') {
        const bucket = getAgingBucket(inv.dueDate);
        if (bucket !== bucketFilter) return false;
      }

      return true;
    });
  }, [unpaidInvoices, searchTerm, customerFilter, bucketFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Accounts Receivable Aging Report</h2>
          <p className="text-xs text-slate-400">
            Maturity distribution of outstanding receivables across Current, 1–30, 31–60, 61–90, and 90+ days
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span className="text-slate-400">Total Outstanding Balance: </span>
          <span className="font-bold text-amber-400">{formatCurrency(agingSummary.grandTotal)}</span>
        </div>
      </div>

      {/* 5 Aging Bucket Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {Object.entries(agingSummary.buckets).map(([bucketName, b]) => {
          const isSelected = bucketFilter === bucketName;
          const percentage = agingSummary.grandTotal > 0 ? ((b.total / agingSummary.grandTotal) * 100).toFixed(1) : '0';

          return (
            <button
              key={bucketName}
              onClick={() => setBucketFilter(isSelected ? 'all' : bucketName)}
              className={`p-4 rounded-2xl border text-left transition shadow-sm ${
                isSelected
                  ? 'bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{bucketName}</span>
                <span className="text-[10px] font-semibold text-slate-500">{b.count} inv</span>
              </div>
              <div className={`mt-2 text-lg font-black ${b.color}`}>
                {formatCurrency(b.total)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-medium">
                {percentage}% of total receivables
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number or client company..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Buckets</option>
            <option value="Current">Current</option>
            <option value="1-30 Days">1-30 Days</option>
            <option value="31-60 Days">31-60 Days</option>
            <option value="61-90 Days">61-90 Days</option>
            <option value="90+ Days">90+ Days</option>
          </select>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aging Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Days Outstanding</th>
                <th className="py-3 px-4 text-center">Aging Bucket</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <span>No outstanding receivables matching criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredList.map((inv) => {
                  const daysOverdue = calculateDaysOverdue(inv.dueDate);
                  const bucket = getAgingBucket(inv.dueDate);
                  const isCurrent = bucket === 'Current';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-slate-800/30 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {inv.customerSnapshot?.companyName || 'Client'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {inv.dueDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={isCurrent ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                          {isCurrent ? 'Not Due' : `${daysOverdue} days`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCurrent
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : bucket === '1-30 Days'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : bucket === '31-60 Days'
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {bucket}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400">
                        {formatCurrency(inv.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        {formatCurrency(inv.outstandingAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            title="View Invoice Details"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSendReminder(inv)}
                            title="Send Payment Reminder"
                            className="p-1.5 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-lg transition"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRecordPayment(inv)}
                            title="Record Payment"
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
