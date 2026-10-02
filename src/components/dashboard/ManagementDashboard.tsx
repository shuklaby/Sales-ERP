import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  DollarSign,
  PhoneCall,
  CalendarClock,
  Briefcase,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Filter,
  Package,
  Receipt,
  AlertCircle,
  Building,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Sliders,
  X,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveView } from '../common/Sidebar';
import {
  DateRangePreset,
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
} from '../../utils/dateRangeUtils';
import { UniversalReportFilter } from '../../types/crm';

interface ManagementDashboardProps {
  onNavigate: (view: ActiveView, subTab?: string) => void;
  onOpenCustomerModal?: () => void;
  onOpenLeadModal?: () => void;
  onOpenProposalModal?: () => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({
  onNavigate,
  onOpenCustomerModal,
  onOpenLeadModal,
  onOpenProposalModal,
}) => {
  const {
    leads,
    customers,
    proposals,
    invoices,
    payments,
    expenses,
    calls,
    followups,
    meetings,
    products,
    employees,
    attendanceRecords,
    leaveRecords,
    taskRecords,
    dashboardConfig,
    updateDashboardConfig,
  } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  // Date Filter State
  const [datePreset, setDatePreset] = useState<DateRangePreset>('This Month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeKpiTab, setActiveKpiTab] = useState<'all' | 'sales' | 'collection' | 'activity' | 'employee' | 'inventory' | 'finance'>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(datePreset, customStart, customEnd);
  }, [datePreset, customStart, customEnd]);

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ==========================================
  // 1. SALES KPIS
  // ==========================================
  const salesKpis = useMemo(() => {
    const totalLeads = leads.length;
    const periodLeads = leads.filter((l) => isWithinDateRange(l.createdAt, activeDateRange));
    const newLeads = periodLeads.filter((l) => l.status === 'New').length;
    const convertedLeads = leads.filter((l) => l.isConverted || l.status === 'Converted' || l.status === 'Customer Created').length;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    const totalCustomers = customers.length;
    const newCustomers = customers.filter((c) => isWithinDateRange(c.createdAt, activeDateRange)).length;

    // Sales value from accepted proposals
    const acceptedProposals = proposals.filter((p) => p.status === 'Accepted');
    const salesValue = acceptedProposals.reduce((sum, p) => sum + (p.grandTotal || p.totalAmount || 0), 0);

    // Total invoiced value
    const nonCancelledInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
    const invoiceValue = nonCancelledInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);

    return {
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate,
      totalCustomers,
      newCustomers,
      salesValue,
      invoiceValue,
    };
  }, [leads, customers, proposals, invoices, activeDateRange]);

  // ==========================================
  // 2. COLLECTION KPIS
  // ==========================================
  const collectionKpis = useMemo(() => {
    const nonCancelledInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
    const totalInvoiced = nonCancelledInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);

    // Total collected from completed payments
    const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
    const totalCollected = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Pending receivables from unpaid or partially paid invoices
    const pendingInvoices = nonCancelledInvoices.filter((i) => i.status === 'SENT' || i.status === 'PARTIALLY_PAID');
    const pendingReceivables = pendingInvoices.reduce((sum, i) => sum + (i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0))), 0);

    // Overdue receivables
    const overdueInvoices = nonCancelledInvoices.filter((i) => {
      if (i.status === 'PAID' || i.status === 'CANCELLED') return false;
      if (!i.dueDate) return false;
      return i.dueDate < todayStr && (i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0))) > 0;
    });
    const overdueReceivables = overdueInvoices.reduce((sum, i) => sum + (i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0))), 0);

    return {
      totalInvoiced,
      totalCollected,
      pendingReceivables: Math.max(0, pendingReceivables),
      overdueReceivables: Math.max(0, overdueReceivables),
      overdueCount: overdueInvoices.length,
    };
  }, [invoices, payments, todayStr]);

  // ==========================================
  // 3. ACTIVITY KPIS
  // ==========================================
  const activityKpis = useMemo(() => {
    const callsToday = calls.filter((c) => (c.createdAt || c.callDate || '').startsWith(todayStr)).length;
    const callsThisMonth = calls.filter((c) => (c.createdAt || c.callDate || '').startsWith(currentMonthPrefix)).length;

    const followupsToday = followups.filter((f) => (f.date || f.followupDate || '').startsWith(todayStr)).length;
    const pendingFollowups = followups.filter((f) => f.status === 'Pending' || f.status === 'Scheduled').length;

    const totalMeetings = meetings.length;
    const proposalsSent = proposals.filter((p) => p.status === 'Sent' || p.status === 'Accepted' || p.status === 'Viewed').length;
    const proposalsAccepted = proposals.filter((p) => p.status === 'Accepted').length;

    return {
      callsToday,
      callsThisMonth,
      followupsToday,
      pendingFollowups,
      totalMeetings,
      proposalsSent,
      proposalsAccepted,
    };
  }, [calls, followups, meetings, proposals, todayStr, currentMonthPrefix]);

  // ==========================================
  // 4. EMPLOYEE KPIS
  // ==========================================
  const employeeKpis = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status === 'active').length;

    // Present today from attendance records
    const todayAttendance = attendanceRecords.filter((a) => a.date === todayStr);
    const presentToday = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Half-Day').length;

    // On leave today
    const onLeave = leaveRecords.filter((l) => {
      if (l.status !== 'Approved' || !l.startDate || !l.endDate) return false;
      return l.startDate <= todayStr && l.endDate >= todayStr;
    }).length;

    const assignedLeads = leads.filter((l) => !!l.assignedEmployeeId).length;
    const assignedCustomers = customers.filter((c) => !!c.assignedEmployeeId).length;

    return {
      totalEmployees,
      activeEmployees,
      presentToday,
      onLeave,
      assignedLeads,
      assignedCustomers,
    };
  }, [employees, attendanceRecords, leaveRecords, leads, customers, todayStr]);

  // ==========================================
  // 5. INVENTORY KPIS
  // ==========================================
  const inventoryKpis = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((p) => {
      const stock = p.currentStock ?? p.stockQuantity ?? 0;
      const min = p.minStockLevel ?? p.reorderLevel ?? 5;
      return stock > 0 && stock <= min;
    }).length;

    const outOfStock = products.filter((p) => (p.currentStock ?? p.stockQuantity ?? 0) <= 0).length;

    const inventoryValue = products.reduce((sum, p) => {
      const stock = p.currentStock ?? p.stockQuantity ?? 0;
      const cost = p.purchasePrice ?? p.price ?? p.basePrice ?? 0;
      return sum + stock * cost;
    }, 0);

    return {
      totalProducts,
      lowStock,
      outOfStock,
      inventoryValue,
    };
  }, [products]);

  // ==========================================
  // 6. FINANCE KPIS
  // ==========================================
  const financeKpis = useMemo(() => {
    // Revenue = payments received against invoices
    const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
    const revenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Expenses = Approved/Paid expenses
    const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED' || e.status === 'PAID');
    const totalExpenses = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netResult = revenue - totalExpenses;

    const pendingInvoices = invoices.filter((i) => i.status === 'SENT' || i.status === 'PARTIALLY_PAID');
    const pendingPayments = pendingInvoices.reduce((sum, i) => sum + (i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0))), 0);

    return {
      revenue,
      expenses: totalExpenses,
      netResult,
      pendingPayments: Math.max(0, pendingPayments),
    };
  }, [payments, expenses, invoices]);

  // ==========================================
  // 7. ALERT WIDGETS
  // ==========================================

  // Low Stock Items (top 5)
  const lowStockAlerts = useMemo(() => {
    return products
      .filter((p) => {
        const stock = p.currentStock ?? p.stockQuantity ?? 0;
        const min = p.minStockLevel ?? p.reorderLevel ?? 5;
        return stock <= min;
      })
      .slice(0, 5);
  }, [products]);

  // Overdue Invoices (top 5)
  const overdueAlerts = useMemo(() => {
    return invoices
      .filter((i) => {
        if (i.status === 'PAID' || i.status === 'CANCELLED') return false;
        if (!i.dueDate) return false;
        return i.dueDate < todayStr && (i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0))) > 0;
      })
      .map((inv) => {
        const due = new Date(inv.dueDate);
        const t = new Date(todayStr);
        const diffDays = Math.max(1, Math.floor((t.getTime() - due.getTime()) / (1000 * 3600 * 24)));
        return {
          ...inv,
          daysOverdue: diffDays,
          outstanding: inv.balanceAmount ?? (inv.grandTotal - (inv.paidAmount || 0)),
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);
  }, [invoices, todayStr]);

  // Today's Follow-ups (top 5)
  const todayFollowupAlerts = useMemo(() => {
    return followups
      .filter((f) => (f.date || f.followupDate || '').startsWith(todayStr))
      .slice(0, 5);
  }, [followups, todayStr]);

  // Tasks Alert (top 5 overdue/pending)
  const taskAlerts = useMemo(() => {
    return taskRecords
      .filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
      .slice(0, 5);
  }, [taskRecords]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                SparkGenTechnology Executive Management Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Live factual KPI monitoring, real-time collection telemetry & operational alerts
              </p>
            </div>
          </div>
        </div>

        {/* Date Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="Last Week">Last Week</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="Last Quarter">Last Quarter</option>
              <option value="This Year">This Year</option>
              <option value="Last Year">Last Year</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {datePreset === 'Custom' && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>MIS Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Category Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'sales', 'collection', 'activity', 'employee', 'inventory', 'finance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveKpiTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors whitespace-nowrap cursor-pointer ${
              activeKpiTab === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {tab === 'all' ? 'All Metric Domains' : `${tab} Domain`}
          </button>
        ))}
      </div>

      {/* ========================================================
          1. SALES KPI CARDS
          ======================================================== */}
      {(activeKpiTab === 'all' || activeKpiTab === 'sales') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>Sales & Conversion Domain</span>
            </h3>
            <button
              onClick={() => onNavigate('leads')}
              className="text-2xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>View Leads</span> <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Leads</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{salesKpis.totalLeads}</div>
              <div className="text-2xs text-slate-500">
                <strong className="text-blue-600">{salesKpis.newLeads}</strong> new in active filter
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Converted Leads</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{salesKpis.convertedLeads}</div>
              <div className="text-2xs text-slate-500">
                Conversion Rate: <strong className="text-emerald-700">{salesKpis.conversionRate}%</strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Customers</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{salesKpis.totalCustomers}</div>
              <div className="text-2xs text-slate-500">
                <strong className="text-indigo-600">{salesKpis.newCustomers}</strong> registered in period
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Sales / Invoiced Value</span>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-700">₹{formatINR(salesKpis.invoiceValue)}</div>
              <div className="text-2xs text-slate-500">
                Accepted Deals: <strong>₹{formatINR(salesKpis.salesValue)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. COLLECTION KPI CARDS
          ======================================================== */}
      {(activeKpiTab === 'all' || activeKpiTab === 'collection') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Collection & Receivables Domain</span>
            </h3>
            <button
              onClick={() => onNavigate('finance', 'invoices')}
              className="text-2xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              <span>View Invoices</span> <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-400">Total Invoiced</div>
              <div className="text-xl font-black text-slate-900">₹{formatINR(collectionKpis.totalInvoiced)}</div>
              <div className="text-2xs text-slate-500">Active billed invoices</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-400">Total Collected</div>
              <div className="text-xl font-black text-emerald-700">₹{formatINR(collectionKpis.totalCollected)}</div>
              <div className="text-2xs text-emerald-600 font-semibold">Realized bank / cash</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-400">Pending Receivables</div>
              <div className="text-xl font-black text-amber-700">₹{formatINR(collectionKpis.pendingReceivables)}</div>
              <div className="text-2xs text-slate-500">Awaiting payment settlement</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="text-xs text-slate-400">Overdue Receivables</div>
              <div className="text-xl font-black text-rose-700">₹{formatINR(collectionKpis.overdueReceivables)}</div>
              <div className="text-2xs text-rose-600 font-semibold">
                {collectionKpis.overdueCount} invoice{collectionKpis.overdueCount === 1 ? '' : 's'} past due date
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. ACTIVITY & ENGAGEMENT DOMAIN
          ======================================================== */}
      {(activeKpiTab === 'all' || activeKpiTab === 'activity') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
              <span>Activity & Engagement Domain</span>
            </h3>
            <button
              onClick={() => onNavigate('calls')}
              className="text-2xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              <span>View Calls</span> <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Calls Today</div>
              <div className="text-lg font-black text-slate-900 mt-1">{activityKpis.callsToday}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Calls Month</div>
              <div className="text-lg font-black text-slate-900 mt-1">{activityKpis.callsThisMonth}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Follow-ups Today</div>
              <div className="text-lg font-black text-blue-700 mt-1">{activityKpis.followupsToday}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Pending Follow-up</div>
              <div className="text-lg font-black text-amber-700 mt-1">{activityKpis.pendingFollowups}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Meetings</div>
              <div className="text-lg font-black text-slate-900 mt-1">{activityKpis.totalMeetings}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Proposals Sent</div>
              <div className="text-lg font-black text-purple-700 mt-1">{activityKpis.proposalsSent}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Accepted</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{activityKpis.proposalsAccepted}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. EMPLOYEE & HR DOMAIN
          ======================================================== */}
      {(activeKpiTab === 'all' || activeKpiTab === 'employee') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-teal-600" />
              <span>Employee & Work Activity Domain</span>
            </h3>
            <button
              onClick={() => onNavigate('employees')}
              className="text-2xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
            >
              <span>Employee Directory</span> <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Total Staff</div>
              <div className="text-lg font-black text-slate-900 mt-1">{employeeKpis.totalEmployees}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Active Staff</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{employeeKpis.activeEmployees}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Present Today</div>
              <div className="text-lg font-black text-blue-700 mt-1">{employeeKpis.presentToday}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">On Leave</div>
              <div className="text-lg font-black text-amber-700 mt-1">{employeeKpis.onLeave}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Assigned Leads</div>
              <div className="text-lg font-black text-slate-900 mt-1">{employeeKpis.assignedLeads}</div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="text-2xs text-slate-400 font-bold uppercase">Assigned Customers</div>
              <div className="text-lg font-black text-slate-900 mt-1">{employeeKpis.assignedCustomers}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. INVENTORY & FINANCE DOMAINS (TWO-COLUMN)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Column */}
        {(activeKpiTab === 'all' || activeKpiTab === 'inventory') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>Inventory Domain</span>
              </h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-2xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
              >
                <span>Stock Management</span> <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-2xs text-slate-400 font-bold uppercase">Catalog Products</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{inventoryKpis.totalProducts}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-2xs text-amber-700 font-bold uppercase">Low Stock</div>
                <div className="text-lg font-black text-amber-800 mt-0.5">{inventoryKpis.lowStock}</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <div className="text-2xs text-rose-700 font-bold uppercase">Out of Stock</div>
                <div className="text-lg font-black text-rose-800 mt-0.5">{inventoryKpis.outOfStock}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-2xs text-emerald-700 font-bold uppercase">Stock Valuation</div>
                <div className="text-sm font-black text-emerald-800 mt-1">₹{formatINR(inventoryKpis.inventoryValue)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Finance Column */}
        {(activeKpiTab === 'all' || activeKpiTab === 'finance') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span>Finance & Net Result Domain</span>
              </h3>
              <button
                onClick={() => onNavigate('finance', 'dashboard')}
                className="text-2xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                <span>Finance Hub</span> <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-2xs text-emerald-700 font-bold uppercase">Revenue</div>
                <div className="text-sm font-black text-emerald-800 mt-1">₹{formatINR(financeKpis.revenue)}</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <div className="text-2xs text-rose-700 font-bold uppercase">Expenses</div>
                <div className="text-sm font-black text-rose-800 mt-1">₹{formatINR(financeKpis.expenses)}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-2xs text-blue-700 font-bold uppercase">Net Result</div>
                <div className={`text-sm font-black mt-1 ${financeKpis.netResult >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
                  ₹{formatINR(financeKpis.netResult)}
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-2xs text-amber-700 font-bold uppercase">Pending Due</div>
                <div className="text-sm font-black text-amber-800 mt-1">₹{formatINR(financeKpis.pendingPayments)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          OPERATIONAL ALERTS SECTION (SECTIONS 26, 27, 28, 29)
          ======================================================== */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Real-Time Operational Alerts & Action Items</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Section 26: Low Stock Alert */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Low Stock Alert</span>
                </div>
                <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {lowStockAlerts.length} item{lowStockAlerts.length === 1 ? '' : 's'}
                </span>
              </div>

              {lowStockAlerts.length === 0 ? (
                <p className="text-2xs text-slate-400 py-3 text-center">No inventory alerts.</p>
              ) : (
                <div className="space-y-2">
                  {lowStockAlerts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => onNavigate('inventory')}
                      className="p-2 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 border border-amber-100 transition-colors cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-900 truncate">{prod.name}</div>
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-0.5">
                        <span>Stock: <strong className="text-amber-800">{prod.currentStock ?? prod.stockQuantity ?? 0}</strong></span>
                        <span>Min: {prod.minStockLevel ?? prod.reorderLevel ?? 5}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('inventory')}
              className="mt-3 w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors cursor-pointer text-center"
            >
              Open Inventory
            </button>
          </div>

          {/* Section 27: Overdue Payment Alert */}
          <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Overdue Payments</span>
                </div>
                <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {overdueAlerts.length} invoice{overdueAlerts.length === 1 ? '' : 's'}
                </span>
              </div>

              {overdueAlerts.length === 0 ? (
                <p className="text-2xs text-slate-400 py-3 text-center">No overdue invoices.</p>
              ) : (
                <div className="space-y-2">
                  {overdueAlerts.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => onNavigate('finance', 'invoices')}
                      className="p-2 rounded-xl bg-rose-50/60 hover:bg-rose-100/60 border border-rose-100 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span className="truncate">{inv.customerName}</span>
                        <span className="text-rose-700 shrink-0 font-extrabold">₹{formatINR(inv.outstanding)}</span>
                      </div>
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-0.5">
                        <span className="font-mono">{inv.invoiceNumber}</span>
                        <span className="text-rose-600 font-semibold">{inv.daysOverdue} days overdue</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('finance', 'invoices')}
              className="mt-3 w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer text-center"
            >
              Open Invoices
            </button>
          </div>

          {/* Section 28: Today's Follow-up Alert */}
          <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                  <CalendarClock className="w-4 h-4 text-blue-600" />
                  <span>Today&apos;s Follow-ups</span>
                </div>
                <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {todayFollowupAlerts.length} follow-up{todayFollowupAlerts.length === 1 ? '' : 's'}
                </span>
              </div>

              {todayFollowupAlerts.length === 0 ? (
                <p className="text-2xs text-slate-400 py-3 text-center">No follow-ups for today.</p>
              ) : (
                <div className="space-y-2">
                  {todayFollowupAlerts.map((fup) => (
                    <div
                      key={fup.id}
                      onClick={() => onNavigate('followups')}
                      className="p-2 rounded-xl bg-blue-50/60 hover:bg-blue-100/60 border border-blue-100 transition-colors cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-900 truncate">{fup.companyName || 'Valued Client'}</div>
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-0.5">
                        <span>{fup.time || '11:00'} • {fup.employeeName || 'Staff'}</span>
                        <span className="font-semibold text-blue-700">{fup.status || 'Pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('followups')}
              className="mt-3 w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer text-center"
            >
              Open Follow-ups
            </button>
          </div>

          {/* Section 29: Task Alert */}
          <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Pending Tasks</span>
                </div>
                <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {taskAlerts.length} task{taskAlerts.length === 1 ? '' : 's'}
                </span>
              </div>

              {taskAlerts.length === 0 ? (
                <p className="text-2xs text-slate-400 py-3 text-center">No pending tasks.</p>
              ) : (
                <div className="space-y-2">
                  {taskAlerts.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onNavigate('tasks')}
                      className="p-2 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/60 border border-indigo-100 transition-colors cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-900 truncate">{t.title}</div>
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-0.5">
                        <span>Due: {t.dueDate || 'N/A'}</span>
                        <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 font-extrabold rounded-md text-3xs">
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('tasks')}
              className="mt-3 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer text-center"
            >
              Open Task Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
