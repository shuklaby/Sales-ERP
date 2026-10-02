import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Receipt,
  Scale,
  Inbox,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, roundTo2, getAgingBucket, calculateDaysOverdue } from '../../utils/financeUtils';
import { InvoiceRecord, PaymentRecord } from '../../types/crm';

interface FinanceDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenCreateInvoice: () => void;
  onOpenRecordPayment: () => void;
  onSelectInvoice: (invoice: InvoiceRecord) => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  onNavigateTab,
  onOpenCreateInvoice,
  onOpenRecordPayment,
  onSelectInvoice,
}) => {
  const { invoices, payments, expenses } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year'>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Check if there is NO data at all
  const hasNoData = useMemo(() => {
    return invoices.length === 0 && payments.length === 0 && expenses.length === 0;
  }, [invoices, payments, expenses]);

  // Calculations for the 10 KPI Metric Cards
  const metrics = useMemo(() => {
    let totalReceivables = 0;
    let totalPending = 0;
    let overdueAmount = 0;
    let unpaidInvoicesCount = 0;
    let overdueInvoicesCount = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'Cancelled') return;

      if (inv.status !== 'Paid') {
        const out = inv.outstandingAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
        totalReceivables += out;
        totalPending += out;
        unpaidInvoicesCount += 1;

        const isOverdue = inv.status === 'Overdue' || (inv.dueDate && inv.dueDate < todayStr);
        if (isOverdue) {
          overdueAmount += out;
          overdueInvoicesCount += 1;
        }
      }
    });

    let totalReceived = 0;
    let todayCollection = 0;
    let thisMonthCollection = 0;

    payments.forEach((p) => {
      if (p.status === 'Confirmed' && !p.isReversal) {
        const amt = p.amount || 0;
        totalReceived += amt;

        if (p.paymentDate === todayStr) {
          todayCollection += amt;
        }

        if (p.paymentDate) {
          const d = new Date(p.paymentDate);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            thisMonthCollection += amt;
          }
        }
      }
    });

    let thisMonthExpenses = 0;
    expenses.forEach((e) => {
      if (e.status === 'CANCELLED' || e.status === 'REJECTED') return;
      if (e.expenseDate) {
        const d = new Date(e.expenseDate);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          thisMonthExpenses += e.total || e.amount || 0;
        }
      }
    });

    const netCashFlow = thisMonthCollection - thisMonthExpenses;

    return {
      totalReceivables: roundTo2(totalReceivables),
      totalReceived: roundTo2(totalReceived),
      totalPending: roundTo2(totalPending),
      overdueAmount: roundTo2(overdueAmount),
      todayCollection: roundTo2(todayCollection),
      thisMonthCollection: roundTo2(thisMonthCollection),
      thisMonthExpenses: roundTo2(thisMonthExpenses),
      netCashFlow: roundTo2(netCashFlow),
      unpaidInvoicesCount,
      overdueInvoicesCount,
    };
  }, [invoices, payments, expenses, todayStr, currentYear, currentMonth]);

  // Aging Receivables Breakdown
  const agingData = useMemo(() => {
    const buckets: Record<string, { count: number; amount: number }> = {
      Current: { count: 0, amount: 0 },
      '1-30 Days': { count: 0, amount: 0 },
      '31-60 Days': { count: 0, amount: 0 },
      '61-90 Days': { count: 0, amount: 0 },
      '90+ Days': { count: 0, amount: 0 },
    };

    invoices.forEach((inv) => {
      if (inv.status === 'Cancelled' || inv.status === 'Paid') return;
      const out = inv.outstandingAmount ?? (inv.grandTotal - (inv.paidAmount || 0));
      if (out <= 0) return;

      const bucket = getAgingBucket(inv.dueDate);
      if (buckets[bucket]) {
        buckets[bucket].count += 1;
        buckets[bucket].amount = roundTo2(buckets[bucket].amount + out);
      }
    });

    return buckets;
  }, [invoices]);

  // Payment Methods Breakdown
  const paymentMethodsBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    payments.forEach((p) => {
      if (p.status === 'Confirmed' && !p.isReversal) {
        const method = p.paymentMethod || 'Other';
        counts[method] = (counts[method] || 0) + (p.amount || 0);
      }
    });
    return counts;
  }, [payments]);

  // Monthly 6-Month Chart Data for: Sales, Collections, Expenses
  const monthlyTrends = useMemo(() => {
    const months: Array<{ key: string; label: string; year: number; month: number; sales: number; collections: number; expenses: number }> = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: `${monthNames[m]} ${String(y).slice(-2)}`,
        year: y,
        month: m,
        sales: 0,
        collections: 0,
        expenses: 0,
      });
    }

    invoices.forEach((inv) => {
      if (inv.status === 'Cancelled' || !inv.invoiceDate) return;
      const d = new Date(inv.invoiceDate);
      const item = months.find((mo) => mo.year === d.getFullYear() && mo.month === d.getMonth());
      if (item) {
        item.sales += inv.grandTotal || 0;
      }
    });

    payments.forEach((p) => {
      if (p.status !== 'Confirmed' || p.isReversal || !p.paymentDate) return;
      const d = new Date(p.paymentDate);
      const item = months.find((mo) => mo.year === d.getFullYear() && mo.month === d.getMonth());
      if (item) {
        item.collections += p.amount || 0;
      }
    });

    expenses.forEach((e) => {
      if (e.status === 'CANCELLED' || e.status === 'REJECTED' || !e.expenseDate) return;
      const d = new Date(e.expenseDate);
      const item = months.find((mo) => mo.year === d.getFullYear() && mo.month === d.getMonth());
      if (item) {
        item.expenses += e.total || e.amount || 0;
      }
    });

    const maxSales = Math.max(...months.map((m) => m.sales), 1);
    const maxCollections = Math.max(...months.map((m) => m.collections), 1);
    const maxExpenses = Math.max(...months.map((m) => m.expenses), 1);

    return { months, maxSales, maxCollections, maxExpenses };
  }, [invoices, payments, expenses, currentYear, currentMonth]);

  // Recent Confirmed Payments
  const recentPayments = useMemo(() => {
    return [...payments]
      .filter((p) => p.status === 'Confirmed' && !p.isReversal)
      .slice(0, 5);
  }, [payments]);

  // Recent Invoices
  const recentInvoices = useMemo(() => {
    return [...invoices].slice(0, 5);
  }, [invoices]);

  if (hasNoData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Finance Management Overview</h2>
            <p className="text-xs text-slate-400">Real-time ledger accounting, verified collections, and statutory receivables</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRecordPayment}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <CreditCard className="w-4 h-4" /> Record Payment
            </button>
            <button
              onClick={onOpenCreateInvoice}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        </div>

        {/* Empty State Banner */}
        <div className="p-16 rounded-3xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Inbox className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No financial data available.</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Create an invoice or record a client payment to begin real-time accounting and ledger tracking.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onOpenCreateInvoice}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
            >
              Create First Invoice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Finance Management Overview</h2>
          <p className="text-xs text-slate-400">
            Real-time ledger accounting, verified collections, and statutory receivables
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenRecordPayment}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <CreditCard className="w-4 h-4" /> Record Payment
          </button>

          <button
            onClick={onOpenCreateInvoice}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
      </div>

      {/* 10 Required Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Receivables */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Receivables</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-white">
            {formatCurrency(metrics.totalReceivables)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Active billed receivables</div>
        </div>

        {/* 2. Total Received */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Received</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400">
            {formatCurrency(metrics.totalReceived)}
          </div>
          <div className="mt-1 text-[10px] text-emerald-500/70">Verified confirmed funds</div>
        </div>

        {/* 3. Total Pending */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Pending</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-amber-400">
            {formatCurrency(metrics.totalPending)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Unsettled receivable balance</div>
        </div>

        {/* 4. Overdue Amount */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Overdue Amount</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-400">
            {formatCurrency(metrics.overdueAmount)}
          </div>
          <div className="mt-1 text-[10px] text-rose-500/70">Past maturity due date</div>
        </div>

        {/* 5. Today's Collection */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Today's Collection</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400">
            {formatCurrency(metrics.todayCollection)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Cleared today ({todayStr})</div>
        </div>

        {/* 6. This Month Collection */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>This Month Collection</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400">
            {formatCurrency(metrics.thisMonthCollection)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Current calendar cycle inflow</div>
        </div>

        {/* 7. This Month Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>This Month Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-400">
            {formatCurrency(metrics.thisMonthExpenses)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Operational disbursements</div>
        </div>

        {/* 8. Net Cash Flow */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Net Cash Flow</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`mt-2 text-xl font-black ${metrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.netCashFlow >= 0 ? '+' : ''}{formatCurrency(metrics.netCashFlow)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Inflows minus expenses</div>
        </div>

        {/* 9. Number of Unpaid Invoices */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Unpaid Invoices</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-white">
            {metrics.unpaidInvoicesCount}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Pending settlement</div>
        </div>

        {/* 10. Number of Overdue Invoices */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Overdue Invoices</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-400">
            {metrics.overdueInvoicesCount}
          </div>
          <div className="mt-1 text-[10px] text-rose-500/70">Requires collection action</div>
        </div>
      </div>

      {/* 5 Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales (6-Month trend) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Monthly Sales (Billed)
            </h3>
            <span className="text-[10px] text-slate-400">Past 6 Months</span>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 pt-6">
            {monthlyTrends.months.map((m) => {
              const hPct = Math.round((m.sales / monthlyTrends.maxSales) * 100);
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-mono text-slate-400">{m.sales > 0 ? (m.sales / 1000).toFixed(0) + 'k' : '0'}</span>
                  <div className="w-full bg-slate-950 rounded-t-lg h-28 relative flex items-end">
                    <div
                      style={{ height: `${Math.max(4, hPct)}%` }}
                      className="w-full bg-blue-500 rounded-t-lg hover:bg-blue-400 transition"
                      title={`${m.label}: ${formatCurrency(m.sales)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Collections */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Monthly Collections (Realized)
            </h3>
            <span className="text-[10px] text-slate-400">Past 6 Months</span>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 pt-6">
            {monthlyTrends.months.map((m) => {
              const hPct = Math.round((m.collections / monthlyTrends.maxCollections) * 100);
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-mono text-emerald-400">{m.collections > 0 ? (m.collections / 1000).toFixed(0) + 'k' : '0'}</span>
                  <div className="w-full bg-slate-950 rounded-t-lg h-28 relative flex items-end">
                    <div
                      style={{ height: `${Math.max(4, hPct)}%` }}
                      className="w-full bg-emerald-500 rounded-t-lg hover:bg-emerald-400 transition"
                      title={`${m.label}: ${formatCurrency(m.collections)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              Monthly Expenses
            </h3>
            <span className="text-[10px] text-slate-400">Past 6 Months</span>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 pt-6">
            {monthlyTrends.months.map((m) => {
              const hPct = Math.round((m.expenses / monthlyTrends.maxExpenses) * 100);
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-mono text-rose-400">{m.expenses > 0 ? (m.expenses / 1000).toFixed(0) + 'k' : '0'}</span>
                  <div className="w-full bg-slate-950 rounded-t-lg h-28 relative flex items-end">
                    <div
                      style={{ height: `${Math.max(4, hPct)}%` }}
                      className="w-full bg-rose-500 rounded-t-lg hover:bg-rose-400 transition"
                      title={`${m.label}: ${formatCurrency(m.expenses)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Receivables Aging Chart & Payment Method Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receivables Aging (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Receivables Aging Distribution
              </h3>
              <p className="text-xs text-slate-400">Breakdown of active unpaid invoices across due date aging brackets</p>
            </div>
            <button
              onClick={() => onNavigateTab('aging')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              Aging Report →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(agingData).map(([bucket, data]) => {
              const isUrgent = bucket === '61-90 Days' || bucket === '90+ Days';
              return (
                <div
                  key={bucket}
                  className={`p-3 rounded-xl border text-center transition ${
                    isUrgent && data.amount > 0
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">{bucket}</span>
                  <div className={`text-sm font-bold ${isUrgent && data.amount > 0 ? 'text-rose-400' : 'text-white'}`}>
                    {formatCurrency(data.amount)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {data.count} {data.count === 1 ? 'invoice' : 'invoices'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Aging visual progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Maturity Timeline</span>
              <span>Total: {formatCurrency(metrics.totalReceivables)}</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              {metrics.totalReceivables > 0 ? (
                <>
                  <div
                    style={{ width: `${(agingData.Current.amount / metrics.totalReceivables) * 100}%` }}
                    className="bg-emerald-500"
                    title={`Current: ${formatCurrency(agingData.Current.amount)}`}
                  />
                  <div
                    style={{ width: `${(agingData['1-30 Days'].amount / metrics.totalReceivables) * 100}%` }}
                    className="bg-blue-500"
                    title={`1-30 Days: ${formatCurrency(agingData['1-30 Days'].amount)}`}
                  />
                  <div
                    style={{ width: `${(agingData['31-60 Days'].amount / metrics.totalReceivables) * 100}%` }}
                    className="bg-amber-500"
                    title={`31-60 Days: ${formatCurrency(agingData['31-60 Days'].amount)}`}
                  />
                  <div
                    style={{ width: `${(agingData['61-90 Days'].amount / metrics.totalReceivables) * 100}%` }}
                    className="bg-orange-500"
                    title={`61-90 Days: ${formatCurrency(agingData['61-90 Days'].amount)}`}
                  />
                  <div
                    style={{ width: `${(agingData['90+ Days'].amount / metrics.totalReceivables) * 100}%` }}
                    className="bg-rose-500"
                    title={`90+ Days: ${formatCurrency(agingData['90+ Days'].amount)}`}
                  />
                </>
              ) : (
                <div className="w-full bg-emerald-500/20 text-center text-[10px] text-emerald-400">
                  Zero Outstanding Receivables
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Distribution (1 Col) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Payment Method Distribution
            </h3>
            <p className="text-xs text-slate-400">Confirmed collections by mode</p>
          </div>

          <div className="space-y-3">
            {Object.keys(paymentMethodsBreakdown).length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No confirmed payment records.</p>
            ) : (
              Object.entries(paymentMethodsBreakdown).map(([method, amt]) => {
                const pct = metrics.totalReceived > 0 ? Math.round((amt / metrics.totalReceived) * 100) : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{method}</span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(amt)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Collections:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(metrics.totalReceived)}</span>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Recent Confirmed Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Latest Invoices
            </h3>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              View Invoices ({invoices.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No invoices created yet.</p>
            ) : (
              recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{inv.invoiceNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : inv.status === 'Overdue'
                            ? 'bg-rose-500/10 text-rose-400'
                            : inv.status === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {inv.customerSnapshot?.companyName || 'Client'} • Due: {inv.dueDate}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">{formatCurrency(inv.grandTotal)}</span>
                    <span className="text-[11px] text-slate-400">Due: {formatCurrency(inv.outstandingAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Confirmed Payments */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Latest Confirmed Payments
            </h3>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              View Payments ({payments.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No confirmed payments recorded yet.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-white block">{p.customerName}</span>
                      <span className="text-[11px] text-slate-400">
                        {p.paymentMethod} • Ref: {p.transactionReference} • {p.paymentDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 block">+{formatCurrency(p.amount)}</span>
                    {p.receiptNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">{p.receiptNumber}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
