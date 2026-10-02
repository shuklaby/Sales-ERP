import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  Search,
  Filter,
  DollarSign,
  Bell,
  Mail,
  Share2,
  Calendar,
  Building2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceRecord } from '../../types/crm';
import { formatCurrency, calculateDaysOverdue, getAgingBucket, roundTo2 } from '../../utils/financeUtils';

interface OutstandingViewProps {
  onSelectInvoice: (invoice: InvoiceRecord) => void;
  onRecordPayment: (invoice: InvoiceRecord) => void;
  onSendReminder: (invoice: InvoiceRecord) => void;
}

export const OutstandingView: React.FC<OutstandingViewProps> = ({
  onSelectInvoice,
  onRecordPayment,
  onSendReminder,
}) => {
  const { invoices, customers, employees } = useCrmData();
  const { isAdmin, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [agingFilter, setAgingFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [minAmount, setMinAmount] = useState<number | ''>('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');

  // Receivables with outstanding balance > 0
  const outstandingInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status !== 'Cancelled' && inv.status !== 'Paid' && inv.outstandingAmount > 0
    );
  }, [invoices]);

  // Aging Summary Calculation
  const agingSummary = useMemo(() => {
    const buckets: Record<string, { count: number; total: number }> = {
      Current: { count: 0, total: 0 },
      '1-30 Days': { count: 0, total: 0 },
      '31-60 Days': { count: 0, total: 0 },
      '61-90 Days': { count: 0, total: 0 },
      '90+ Days': { count: 0, total: 0 },
    };

    outstandingInvoices.forEach((inv) => {
      const bucket = getAgingBucket(inv.dueDate);
      if (buckets[bucket]) {
        buckets[bucket].count += 1;
        buckets[bucket].total = roundTo2(buckets[bucket].total + inv.outstandingAmount);
      }
    });

    const grandTotal = Object.values(buckets).reduce((acc, b) => acc + b.total, 0);

    return { buckets, grandTotal: roundTo2(grandTotal) };
  }, [outstandingInvoices]);

  // Filtered List
  const filteredList = useMemo(() => {
    return outstandingInvoices.filter((inv) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(term);
        const matchCust = (inv.customerSnapshot?.companyName || '').toLowerCase().includes(term);
        if (!matchNum && !matchCust) return false;
      }

      if (customerFilter !== 'all' && inv.customerId !== customerFilter) return false;

      if (agingFilter !== 'all') {
        const bucket = getAgingBucket(inv.dueDate);
        if (bucket !== agingFilter) return false;
      }

      if (minAmount !== '' && inv.outstandingAmount < Number(minAmount)) return false;
      if (maxAmount !== '' && inv.outstandingAmount > Number(maxAmount)) return false;

      return true;
    });
  }, [outstandingInvoices, searchTerm, customerFilter, agingFilter, minAmount, maxAmount]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Outstanding Receivables</h2>
          <p className="text-xs text-slate-400">
            Monitor aging invoices, payment maturities, and collection actions
          </p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
          <span className="text-xs text-slate-400">Total Outstanding Balance:</span>
          <span className="text-base font-extrabold text-amber-400">
            {formatCurrency(agingSummary.grandTotal)}
          </span>
        </div>
      </div>

      {/* Aging KPI Summary Cards (Current, 1-30, 31-60, 61-90, 90+) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(agingSummary.buckets).map(([bucketName, data]) => {
          const isSelected = agingFilter === bucketName;
          const isCritical = bucketName === '61-90 Days' || bucketName === '90+ Days';

          return (
            <div
              key={bucketName}
              onClick={() => setAgingFilter(isSelected ? 'all' : bucketName)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 shadow-md'
                  : isCritical && data.total > 0
                  ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">{bucketName}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {data.count} {data.count === 1 ? 'doc' : 'docs'}
                </span>
              </div>
              <div
                className={`mt-1.5 text-base font-bold ${
                  isCritical && data.total > 0 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {formatCurrency(data.total)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {agingSummary.grandTotal > 0
                  ? `${Math.round((data.total / agingSummary.grandTotal) * 100)}% of total`
                  : '0%'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Aging Buckets</option>
              <option value="Current">Current (Not Overdue)</option>
              <option value="1-30 Days">1–30 Days Overdue</option>
              <option value="31-60 Days">31–60 Days Overdue</option>
              <option value="61-90 Days">61–90 Days Overdue</option>
              <option value="90+ Days">90+ Days Overdue (Critical)</option>
            </select>
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

          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min ₹"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : '')}
              className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Max ₹"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : '')}
              className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Days Overdue</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Aging Bucket</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    No outstanding invoices match your criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((inv) => {
                  const days = calculateDaysOverdue(inv.dueDate);
                  const bucket = getAgingBucket(inv.dueDate);
                  const isUrgent = bucket === '61-90 Days' || bucket === '90+ Days';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-slate-800/30 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>{inv.invoiceNumber}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-white">
                        {inv.customerSnapshot?.companyName || 'Client'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">{inv.dueDate}</td>

                      <td className="py-3.5 px-4 text-center">
                        {days > 0 ? (
                          <span
                            className={`font-bold ${
                              isUrgent ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            +{days} days
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">On Track</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-300">
                        {formatCurrency(inv.grandTotal, inv.currency)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-emerald-400">
                        {formatCurrency(inv.paidAmount, inv.currency)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        {formatCurrency(inv.outstandingAmount, inv.currency)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            bucket === 'Current'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isUrgent
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {bucket}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSendReminder(inv)}
                            title="Send Payment Reminder"
                            className="px-2.5 py-1 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition flex items-center gap-1"
                          >
                            <Bell className="w-3 h-3" />
                            <span>Remind</span>
                          </button>
                          <button
                            onClick={() => onRecordPayment(inv)}
                            title="Record Payment"
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition flex items-center gap-1"
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
