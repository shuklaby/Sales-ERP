import React from 'react';
import {
  Clock,
  AlertTriangle,
  CreditCard,
  Calendar,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { formatCurrency, calculateDaysOverdue } from '../../../utils/financeUtils';

export const CustomerOutstandingView: React.FC = () => {
  const { invoices, setActiveTab } = useCustomerPortal();

  const pendingInvoices = invoices.filter(
    (inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.outstandingAmount > 0
  );

  const totalOutstanding = pendingInvoices.reduce((acc, i) => acc + (i.outstandingAmount || 0), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueInvoices = pendingInvoices.filter((i) => {
    if (!i.dueDate) return false;
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  const overdueAmount = overdueInvoices.reduce((acc, i) => acc + (i.outstandingAmount || 0), 0);

  const dueSoonInvoices = pendingInvoices.filter((i) => {
    if (!i.dueDate) return true;
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });
  const dueSoonAmount = dueSoonInvoices.reduce((acc, i) => acc + (i.outstandingAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" /> Outstanding Balances & Aging
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed invoice receivables schedule, aging metrics, and upcoming settlement deadlines
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Total Outstanding</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{formatCurrency(totalOutstanding)}</div>
          <p className="text-[11px] text-slate-500">Across {pendingInvoices.length} active invoice(s)</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Overdue Amount</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{formatCurrency(overdueAmount)}</div>
          <p className="text-[11px] text-slate-500">{overdueInvoices.length} invoice(s) past contractual due date</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Due Within 7 Days</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">{formatCurrency(dueSoonAmount)}</div>
          <p className="text-[11px] text-slate-500">{dueSoonInvoices.length} upcoming settlement(s)</p>
        </div>
      </div>

      {/* Outstanding Invoices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {pendingInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-white">No Outstanding Dues</p>
            <p className="text-[11px] text-slate-500">
              All invoices issued to your organization have been completely settled. Thank you!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Grand Total</th>
                  <th className="py-3.5 px-4">Paid to Date</th>
                  <th className="py-3.5 px-4">Balance Outstanding</th>
                  <th className="py-3.5 px-4">Days Overdue</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {pendingInvoices.map((inv) => {
                  const daysOverdue = inv.dueDate ? calculateDaysOverdue(inv.dueDate) : 0;
                  const isOverdue = daysOverdue > 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4 text-slate-400">{inv.dueDate || 'Upon receipt'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{formatCurrency(inv.outstandingAmount)}</td>
                      <td className="py-3.5 px-4">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {daysOverdue} days overdue
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">On schedule</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveTab('invoices')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay
                        </button>
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
