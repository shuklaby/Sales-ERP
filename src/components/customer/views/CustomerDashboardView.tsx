import React from 'react';
import {
  FileText,
  FileCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  LifeBuoy,
  Bell,
  Building2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Receipt,
  Download,
  FolderOpen,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { formatCurrency } from '../../../utils/financeUtils';

export const CustomerDashboardView: React.FC = () => {
  const {
    customerUser,
    customerCompany,
    proposals,
    invoices,
    receipts,
    onlinePayments,
    tickets,
    unreadNotificationCount,
    setActiveTab,
  } = useCustomerPortal();

  // Compute live actual metrics (Section 5)
  const openProposals = proposals.filter((p) => p.status === 'Sent' || p.status === 'Viewed' || p.status === 'Under Discussion');
  const acceptedProposals = proposals.filter((p) => p.status === 'Accepted');
  const pendingInvoices = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled');
  const paidAmount = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const outstandingAmount = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((acc, i) => acc + (i.outstandingAmount || 0), 0);
  const openTickets = tickets.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-slate-900 border border-blue-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building2 className="w-3.5 h-3.5" />
            <span>{customerCompany?.companyName || 'Welcome'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hello, {customerUser?.name || 'Valued Partner'}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome to your SparkGenTechnology Customer Collaboration Portal. Review and accept commercial proposals, manage tax invoices, make instant online settlements, and access 24/7 dedicated support.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            {openProposals.length > 0 && (
              <button
                onClick={() => setActiveTab('proposals')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <FileText className="w-3.5 h-3.5" /> Review Proposals ({openProposals.length})
              </button>
            )}
            {outstandingAmount > 0 && (
              <button
                onClick={() => setActiveTab('invoices')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <CreditCard className="w-3.5 h-3.5" /> Pay Invoices ({formatCurrency(outstandingAmount)})
              </button>
            )}
            <button
              onClick={() => setActiveTab('support')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" /> Get Support
            </button>
          </div>
        </div>
      </div>

      {/* Actual KPI Metric Cards (Section 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Proposals */}
        <div
          onClick={() => setActiveTab('proposals')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-blue-500/30 rounded-2xl cursor-pointer transition space-y-2 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Proposals</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{openProposals.length}</div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{acceptedProposals.length}</span> accepted to date
          </p>
        </div>

        {/* Outstanding Amount */}
        <div
          onClick={() => setActiveTab('outstanding')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-amber-500/30 rounded-2xl cursor-pointer transition space-y-2 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{formatCurrency(outstandingAmount)}</div>
          <p className="text-[11px] text-slate-500">
            Across {pendingInvoices.length} pending invoice{pendingInvoices.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Paid Amount */}
        <div
          onClick={() => setActiveTab('payments')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-2xl cursor-pointer transition space-y-2 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Settled to Date</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatCurrency(paidAmount)}</div>
          <p className="text-[11px] text-slate-500">
            {receipts.length} verified payment receipt{receipts.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Open Support Tickets */}
        <div
          onClick={() => setActiveTab('support')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-purple-500/30 rounded-2xl cursor-pointer transition space-y-2 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Support Tickets</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{openTickets.length}</div>
          <p className="text-[11px] text-slate-500">
            {unreadNotificationCount > 0 ? (
              <span className="text-blue-400 font-semibold">{unreadNotificationCount} unread alert{unreadNotificationCount === 1 ? '' : 's'}</span>
            ) : (
              'All requests updated'
            )}
          </p>
        </div>
      </div>

      {/* Main 2-column breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Invoices Requiring Settlement */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" /> Pending Invoices
            </h3>
            <button
              onClick={() => setActiveTab('invoices')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingInvoices.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">All Invoices Settled!</p>
              <p className="text-[11px] text-slate-500">You have zero outstanding dues with SparkGenTechnology.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingInvoices.slice(0, 4).map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{inv.invoiceNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'Overdue'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon receipt'}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-mono font-bold text-amber-400">{formatCurrency(inv.outstandingAmount)}</div>
                    <button
                      onClick={() => setActiveTab('invoices')}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proposals Awaiting Action */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" /> Commercial Proposals
            </h3>
            <button
              onClick={() => setActiveTab('proposals')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {proposals.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No Proposals Yet</p>
              <p className="text-[11px] text-slate-500">Your account executive will send tailored proposals here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {proposals.slice(0, 4).map((prop) => (
                <div
                  key={prop.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{prop.proposalNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prop.status === 'Accepted'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : prop.status === 'Rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {prop.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Date: {new Date(prop.proposalDate || prop.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-mono font-bold text-white">{formatCurrency(prop.totalAmount)}</div>
                    <button
                      onClick={() => setActiveTab('proposals')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments & Receipts */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" /> Recent Payment Confirmations
          </h3>
          <button
            onClick={() => setActiveTab('receipts')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            <span>View All Receipts</span> <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {receipts.length === 0 && onlinePayments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl">
            No payment records found. Confirmed transactions will appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {receipts.slice(0, 3).map((r) => (
              <div key={r.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 text-xs">{r.receiptNumber}</span>
                  <span className="text-[10px] text-slate-500">{new Date(r.paymentDate).toLocaleDateString()}</span>
                </div>
                <div className="text-lg font-black text-white">{formatCurrency(r.amount)}</div>
                <div className="text-[11px] text-slate-400">
                  Invoice Ref: {r.invoiceNumber} • Paid via {r.paymentMethod}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
