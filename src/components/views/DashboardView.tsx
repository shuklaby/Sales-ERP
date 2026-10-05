import React, { useState, useMemo } from 'react';
import {
  Users,
  Target,
  FileCheck,
  PhoneCall,
  CalendarClock,
  FileText,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Plus,
  Filter,
  Calendar,
  Layers,
  HelpCircle,
  Eye,
  Send,
  Building,
  UserCheck,
  AlertTriangle,
  Info,
  DollarSign,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  BarChart2,
  CheckSquare,
  Bell,
  Play,
  Square,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveView } from '../common/Sidebar';
import {
  formatMinutesToDuration,
  calculateLeaveBalances,
} from '../../services/hrService';
import {
  DateRangePreset,
  DateRange,
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import { ManagementDashboard } from '../dashboard/ManagementDashboard';
import { EmployeeDashboardView } from './EmployeeDashboardView';

interface DashboardViewProps {
  onNavigate: (view: ActiveView) => void;
  onOpenCustomerModal: () => void;
  onOpenLeadModal: () => void;
  onOpenProposalModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenCustomerModal,
  onOpenLeadModal,
  onOpenProposalModal,
}) => {
  const {
    customers,
    leads,
    proposals,
    stsRecords,
    calls,
    followups,
    activities,
    employees,
    taskRecords,
    attendanceRecords,
    leaveRecords,
    leaveTypeRecords,
    employeeRecords,
    notifications,
    checkInEmployee,
    checkOutEmployee,
  } = useCrmData();
  const { userProfile, isAdmin, hasPermission } = useAuth();

  // Date Range Filter State (Section 2)
  const [dashboardMode, setDashboardMode] = useState<'management' | 'commercial'>('management');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('This Month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Selected date-based chart metric (Section 15)
  const [selectedChartMetric, setSelectedChartMetric] = useState<
    'leads' | 'customers' | 'calls' | 'followups' | 'proposals' | 'accepted'
  >('proposals');

  // Compute Active Date Range
  const activeDateRange: DateRange = useMemo(() => {
    return getDateRangeFromPreset(datePreset, customStart, customEnd);
  }, [datePreset, customStart, customEnd]);

  // Authorization scoping (Section 13: Employee sees their own authorized records, Admin sees all)
  const scopedCustomers = useMemo(() => {
    if (isAdmin) return customers;
    return customers.filter(
      (c) => c.assignedEmployeeId === userProfile?.uid || c.createdBy === userProfile?.uid
    );
  }, [customers, isAdmin, userProfile]);

  const scopedLeads = useMemo(() => {
    if (isAdmin) return leads;
    return leads.filter(
      (l) => l.assignedEmployeeId === userProfile?.uid || l.createdBy === userProfile?.uid
    );
  }, [leads, isAdmin, userProfile]);

  const scopedProposals = useMemo(() => {
    if (isAdmin) return proposals;
    return proposals.filter(
      (p) => p.assignedEmployeeId === userProfile?.uid || p.createdBy === userProfile?.uid
    );
  }, [proposals, isAdmin, userProfile]);

  const scopedSTS = useMemo(() => {
    if (isAdmin) return stsRecords;
    return stsRecords.filter(
      (s) =>
        s.assignedEmployeeId === userProfile?.uid ||
        s.employeeId === userProfile?.uid ||
        (s as any).createdBy === userProfile?.uid
    );
  }, [stsRecords, isAdmin, userProfile]);

  const scopedCalls = useMemo(() => {
    if (isAdmin) return calls;
    return calls.filter((c) => c.employeeId === userProfile?.uid);
  }, [calls, isAdmin, userProfile]);

  const scopedFollowups = useMemo(() => {
    if (isAdmin) return followups;
    return followups.filter((f) => f.employeeId === userProfile?.uid);
  }, [followups, isAdmin, userProfile]);

  // ==================== DATE-FILTERED DATASETS ====================
  const dateFilteredLeads = useMemo(() => {
    return scopedLeads.filter((l) =>
      isWithinDateRange(l.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
  }, [scopedLeads, activeDateRange]);

  const dateFilteredCustomers = useMemo(() => {
    return scopedCustomers.filter((c) =>
      isWithinDateRange(c.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
  }, [scopedCustomers, activeDateRange]);

  const dateFilteredProposals = useMemo(() => {
    return scopedProposals.filter((p) =>
      isWithinDateRange(p.createdAt || p.proposalDate, activeDateRange.startDate, activeDateRange.endDate)
    );
  }, [scopedProposals, activeDateRange]);

  const dateFilteredSTS = useMemo(() => {
    return scopedSTS.filter((s) =>
      isWithinDateRange(s.date || (s as any).createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
  }, [scopedSTS, activeDateRange]);

  const dateFilteredCalls = useMemo(() => {
    return scopedCalls.filter((c) =>
      isWithinDateRange(c.dateTime || c.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
  }, [scopedCalls, activeDateRange]);

  const dateFilteredFollowups = useMemo(() => {
    return scopedFollowups.filter((f) =>
      isWithinDateRange(f.date || f.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
  }, [scopedFollowups, activeDateRange]);

  // Today string in Asia/Kolkata
  const todayYmd = useMemo(() => {
    const now = new Date();
    const kolkataStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const kd = new Date(kolkataStr);
    const y = kd.getFullYear();
    const m = String(kd.getMonth() + 1).padStart(2, '0');
    const d = String(kd.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // ==================== 1. TOP-LEVEL KPI METRICS ====================
  const kpis = useMemo(() => {
    // Total Leads & New
    const totalLeadsCount = dateFilteredLeads.length;
    const newLeadsCount = dateFilteredLeads.filter((l) => l.status === 'New').length;

    // Active Customers: Customers with status other than Inactive or Lost
    const activeCustomersCount = dateFilteredCustomers.filter(
      (c) => c.status !== 'Inactive' && c.status !== 'Lost'
    ).length;

    // STS Metrics
    const totalStsCount = dateFilteredSTS.length;
    const openStsCount = dateFilteredSTS.filter(
      (s) => s.status !== 'Won' && s.status !== 'Lost' && s.status !== 'Closed'
    ).length;

    // Proposal Metrics
    const totalPropsCount = dateFilteredProposals.length;
    const sentPropsCount = dateFilteredProposals.filter((p) => p.status === 'Sent' || p.sentAt).length;
    const viewedPropsCount = dateFilteredProposals.filter((p) => p.status === 'Viewed' || p.viewedAt).length;
    const acceptedPropsCount = dateFilteredProposals.filter((p) => p.status === 'Accepted').length;
    const rejectedPropsCount = dateFilteredProposals.filter((p) => p.status === 'Rejected').length;

    // Follow-ups (Due Today & Overdue based on real calendar status)
    const followupsDueToday = scopedFollowups.filter(
      (f) => f.date === todayYmd && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;
    const followupsOverdue = scopedFollowups.filter(
      (f) => f.date < todayYmd && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    // Calls count in period
    const callsCount = dateFilteredCalls.length;

    // Section 4 Pipeline Value Calculations:
    // Open Pipeline: active open opportunities with valid amount from open STS + active non-terminal proposals
    const openStsVal = dateFilteredSTS
      .filter((s) => s.status !== 'Won' && s.status !== 'Lost' && s.status !== 'Closed')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const openPropsVal = dateFilteredProposals
      .filter((p) => p.status !== 'Accepted' && p.status !== 'Rejected' && p.status !== 'Cancelled')
      .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

    const pipelineVal = openStsVal > 0 ? openStsVal : openPropsVal;

    // Won Value: Accepted commercial proposals during selected period
    const wonVal = dateFilteredProposals
      .filter((p) => p.status === 'Accepted')
      .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

    return {
      totalLeads: totalLeadsCount,
      newLeads: newLeadsCount,
      activeCustomers: activeCustomersCount,
      totalSTS: totalStsCount,
      openSTS: openStsCount,
      totalProposals: totalPropsCount,
      proposalsSent: sentPropsCount,
      proposalsViewed: viewedPropsCount,
      proposalsAccepted: acceptedPropsCount,
      proposalsRejected: rejectedPropsCount,
      followupsToday: followupsDueToday,
      overdueFollowups: followupsOverdue,
      calls: callsCount,
      pipelineValue: pipelineVal,
      wonValue: wonVal,
    };
  }, [
    dateFilteredLeads,
    dateFilteredCustomers,
    dateFilteredSTS,
    dateFilteredProposals,
    dateFilteredCalls,
    scopedFollowups,
    todayYmd,
  ]);

  // ==================== 3. SALES FUNNEL DATA ====================
  // Funnel stages: Leads -> Contacted -> Interested -> Meeting -> Proposal Sent -> Negotiation -> Won
  const funnelStages = useMemo(() => {
    // 1. Leads
    const leadsCount = dateFilteredLeads.length;

    // 2. Contacted (leads contacted or calls connected)
    const contactedCount =
      dateFilteredLeads.filter((l) => l.status === 'Contacted').length +
      dateFilteredCustomers.filter((c) => c.status === 'Contacted').length;

    // 3. Interested (qualified/interested customers or leads)
    const interestedCount =
      dateFilteredCustomers.filter((c) => c.status === 'Interested').length +
      dateFilteredLeads.filter((l) => l.status === 'Qualified').length;

    // 4. Meeting (meetings scheduled/completed or customer in meeting stage)
    const meetingCount = dateFilteredCustomers.filter((c) => c.status === 'Meeting').length;

    // 5. Proposal Sent (proposals in Sent or Viewed or customer in Proposal Sent)
    const proposalSentCount = dateFilteredProposals.filter(
      (p) => p.status === 'Sent' || p.status === 'Viewed' || p.sentAt
    ).length;

    // 6. Negotiation (proposals Under Discussion or customers in Negotiation)
    const negotiationCount =
      dateFilteredProposals.filter((p) => p.status === 'Under Discussion').length +
      dateFilteredCustomers.filter((c) => c.status === 'Negotiation').length;

    // 7. Won (accepted proposals or won customers)
    const wonCount = dateFilteredProposals.filter((p) => p.status === 'Accepted').length;

    return [
      { name: 'Leads', count: leadsCount, view: 'leads' as ActiveView, color: 'bg-indigo-600' },
      { name: 'Contacted', count: contactedCount, view: 'calls' as ActiveView, color: 'bg-blue-600' },
      { name: 'Interested', count: interestedCount, view: 'customers' as ActiveView, color: 'bg-cyan-600' },
      { name: 'Meeting', count: meetingCount, view: 'customers' as ActiveView, color: 'bg-teal-600' },
      { name: 'Proposal Sent', count: proposalSentCount, view: 'proposals' as ActiveView, color: 'bg-amber-600' },
      { name: 'Negotiation', count: negotiationCount, view: 'proposals' as ActiveView, color: 'bg-orange-600' },
      { name: 'Won', count: wonCount, view: 'proposals' as ActiveView, color: 'bg-emerald-600' },
    ];
  }, [dateFilteredLeads, dateFilteredCustomers, dateFilteredProposals]);

  // Max count for funnel scaling
  const maxFunnelCount = useMemo(() => {
    return Math.max(...funnelStages.map((s) => s.count), 1);
  }, [funnelStages]);

  // ==================== 5 & 6. PROPOSAL ANALYTICS ====================
  const proposalStats = useMemo(() => {
    const statuses = [
      'Draft',
      'Generated',
      'Sent',
      'Viewed',
      'Under Discussion',
      'Accepted',
      'Rejected',
      'Expired',
    ] as const;

    const counts: Record<string, number> = {};
    const values: Record<string, number> = {};

    statuses.forEach((st) => {
      const match = dateFilteredProposals.filter((p) => p.status === st);
      counts[st] = match.length;
      values[st] = match.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
    });

    const totalVal = dateFilteredProposals.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
    const sentVal = values['Sent'] || 0;
    const viewedVal = values['Viewed'] || 0;
    const acceptedVal = values['Accepted'] || 0;
    const rejectedVal = values['Rejected'] || 0;

    return {
      counts,
      values,
      totalCount: dateFilteredProposals.length,
      totalVal,
      sentVal,
      viewedVal,
      acceptedVal,
      rejectedVal,
    };
  }, [dateFilteredProposals]);

  // ==================== 7. CUSTOMER ANALYTICS ====================
  const customerStats = useMemo(() => {
    const total = dateFilteredCustomers.length;
    const newCust = dateFilteredCustomers.filter((c) => c.status === 'New').length;
    const active = dateFilteredCustomers.filter((c) => c.status !== 'Inactive' && c.status !== 'Lost').length;
    const inactive = dateFilteredCustomers.filter((c) => c.status === 'Inactive').length;

    // Cross-link checks
    const withFollowups = dateFilteredCustomers.filter((c) =>
      scopedFollowups.some((f) => f.customerId === c.customerId || f.customerId === c.id)
    ).length;

    const withOpenSTS = dateFilteredCustomers.filter((c) =>
      scopedSTS.some(
        (s) =>
          (s.customerId === c.customerId || s.customerId === c.id) &&
          s.status !== 'Won' &&
          s.status !== 'Lost' &&
          s.status !== 'Closed'
      )
    ).length;

    const withProposals = dateFilteredCustomers.filter((c) =>
      scopedProposals.some((p) => p.customerId === c.customerId || p.customerId === c.id)
    ).length;

    return {
      total,
      newCust,
      active,
      inactive,
      withFollowups,
      withOpenSTS,
      withProposals,
    };
  }, [dateFilteredCustomers, scopedFollowups, scopedSTS, scopedProposals]);

  // ==================== 8. LEAD ANALYTICS ====================
  const leadStats = useMemo(() => {
    const stages = [
      'New',
      'Contacted',
      'Qualified',
      'Meeting',
      'Proposal',
      'Negotiation',
      'Won',
      'Lost',
    ] as const;

    const counts: Record<string, number> = {};
    stages.forEach((st) => {
      counts[st] = dateFilteredLeads.filter((l) => (l.status as any) === st).length;
    });

    return {
      total: dateFilteredLeads.length,
      counts,
    };
  }, [dateFilteredLeads]);

  // ==================== 9. CALL ANALYTICS ====================
  const callStats = useMemo(() => {
    const counts = {
      Connected: 0,
      'Not Connected': 0,
      Busy: 0,
      'No Answer': 0,
      'Callback Requested': 0,
      'Wrong Number': 0,
      Other: 0,
    };

    dateFilteredCalls.forEach((c) => {
      const st = c.status;
      if (st in counts) {
        counts[st as keyof typeof counts]++;
      } else {
        counts.Other++;
      }
    });

    return {
      total: dateFilteredCalls.length,
      counts,
    };
  }, [dateFilteredCalls]);

  // ==================== 10. FOLLOW-UP ANALYTICS ====================
  const followupStats = useMemo(() => {
    const dueToday = scopedFollowups.filter(
      (f) => f.date === todayYmd && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    const completedToday = scopedFollowups.filter(
      (f) => f.completedAt && f.completedAt.startsWith(todayYmd)
    ).length;

    const overdue = scopedFollowups.filter(
      (f) => f.date < todayYmd && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    const upcoming = scopedFollowups.filter(
      (f) => f.date > todayYmd && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    const cancelled = scopedFollowups.filter((f) => f.status === 'Cancelled').length;
    const completedTotal = scopedFollowups.filter((f) => f.status === 'Completed').length;
    const pendingTotal = scopedFollowups.filter(
      (f) => f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    return {
      dueToday,
      completedToday,
      overdue,
      upcoming,
      cancelled,
      completedTotal,
      pendingTotal,
    };
  }, [scopedFollowups, todayYmd]);

  // ==================== 11. STS ANALYTICS ====================
  const stsStats = useMemo(() => {
    const statuses = [
      'New',
      'In Progress',
      'Follow-up',
      'Proposal Required',
      'Won',
      'Lost',
      'Closed',
    ] as const;

    const counts: Record<string, number> = {};
    statuses.forEach((st) => {
      counts[st] = dateFilteredSTS.filter((s) => s.status === st).length;
    });

    const totalVal = dateFilteredSTS.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const openVal = dateFilteredSTS
      .filter((s) => s.status !== 'Won' && s.status !== 'Lost' && s.status !== 'Closed')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const wonVal = dateFilteredSTS
      .filter((s) => s.status === 'Won')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    return {
      total: dateFilteredSTS.length,
      counts,
      totalVal,
      openVal,
      wonVal,
    };
  }, [dateFilteredSTS]);

  // ==================== 15 & 16. SALES & VALUE TRENDS ====================
  // Generate daily points for the active date range (up to 31 days)
  const trendDays = useMemo(() => {
    const list: string[] = [];
    const s = new Date(activeDateRange.startDate);
    const e = new Date(activeDateRange.endDate);

    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
    const step = diffDays > 31 ? Math.ceil(diffDays / 30) : 1;

    const curr = new Date(s);
    while (curr <= e && list.length < 31) {
      const ymStr = curr.toISOString().split('T')[0];
      list.push(ymStr);
      curr.setDate(curr.getDate() + step);
    }
    return list;
  }, [activeDateRange]);

  const salesTrendData = useMemo(() => {
    return trendDays.map((day) => {
      let count = 0;
      if (selectedChartMetric === 'leads') {
        count = scopedLeads.filter((l) => l.createdAt && l.createdAt.startsWith(day)).length;
      } else if (selectedChartMetric === 'customers') {
        count = scopedCustomers.filter((c) => c.createdAt && c.createdAt.startsWith(day)).length;
      } else if (selectedChartMetric === 'calls') {
        count = scopedCalls.filter(
          (c) => (c.dateTime && c.dateTime.startsWith(day)) || (c.createdAt && c.createdAt.startsWith(day))
        ).length;
      } else if (selectedChartMetric === 'followups') {
        count = scopedFollowups.filter((f) => f.date === day).length;
      } else if (selectedChartMetric === 'proposals') {
        count = scopedProposals.filter(
          (p) => (p.createdAt && p.createdAt.startsWith(day)) || (p.proposalDate && p.proposalDate.startsWith(day))
        ).length;
      } else if (selectedChartMetric === 'accepted') {
        count = scopedProposals.filter(
          (p) => p.status === 'Accepted' && p.acceptedAt && p.acceptedAt.startsWith(day)
        ).length;
      }
      return { day, count };
    });
  }, [trendDays, selectedChartMetric, scopedLeads, scopedCustomers, scopedCalls, scopedFollowups, scopedProposals]);

  const maxTrendCount = useMemo(() => {
    return Math.max(...salesTrendData.map((d) => d.count), 1);
  }, [salesTrendData]);

  const valueTrendData = useMemo(() => {
    return trendDays.map((day) => {
      const propVal = scopedProposals
        .filter(
          (p) => (p.createdAt && p.createdAt.startsWith(day)) || (p.proposalDate && p.proposalDate.startsWith(day))
        )
        .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

      const wonVal = scopedProposals
        .filter((p) => p.status === 'Accepted' && p.acceptedAt && p.acceptedAt.startsWith(day))
        .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

      return { day, propVal, wonVal };
    });
  }, [trendDays, scopedProposals]);

  const maxValueTrend = useMemo(() => {
    return Math.max(
      ...valueTrendData.map((d) => Math.max(d.propVal, d.wonVal)),
      1
    );
  }, [valueTrendData]);

  // ==================== 17. LEAD SOURCE REPORT ====================
  const leadSourceStats = useMemo(() => {
    const map = new Map<
      string,
      { source: string; leadCount: number; convCount: number; propCount: number; wonCount: number }
    >();

    dateFilteredLeads.forEach((lead) => {
      const src = lead.leadSource || lead.source || 'Direct / Unknown';
      if (!map.has(src)) {
        map.set(src, { source: src, leadCount: 0, convCount: 0, propCount: 0, wonCount: 0 });
      }
      const entry = map.get(src)!;
      entry.leadCount++;

      if (lead.isConverted || lead.convertedCustomerId) {
        entry.convCount++;
      }

      // Correlate with proposals
      const relProps = scopedProposals.filter(
        (p) => p.leadId === lead.id || p.leadId === lead.leadId || p.customerId === lead.convertedCustomerId
      );
      if (relProps.length > 0) {
        entry.propCount += relProps.length;
        if (relProps.some((p) => p.status === 'Accepted')) {
          entry.wonCount++;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.leadCount - a.leadCount);
  }, [dateFilteredLeads, scopedProposals]);

  // ==================== 18. CUSTOMER STATUS REPORT ====================
  const customerStatusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    dateFilteredCustomers.forEach((c) => {
      const st = c.status || 'Active';
      dist[st] = (dist[st] || 0) + 1;
    });
    return dist;
  }, [dateFilteredCustomers]);

  // ==================== 12. EMPLOYEE MATRIX (ADMIN ONLY) ====================
  const employeeMatrix = useMemo(() => {
    if (!isAdmin) return [];

    return employees.map((emp) => {
      const empLeads = scopedLeads.filter(
        (l) => l.assignedEmployeeId === emp.uid || l.createdBy === emp.uid
      );
      const empCusts = scopedCustomers.filter(
        (c) => c.assignedEmployeeId === emp.uid || c.createdBy === emp.uid
      );
      const empCalls = scopedCalls.filter((c) => c.employeeId === emp.uid);
      const connectedCalls = empCalls.filter((c) => c.status === 'Connected').length;

      const empFollowups = scopedFollowups.filter((f) => f.employeeId === emp.uid);
      const completedF = empFollowups.filter((f) => f.status === 'Completed').length;
      const overdueF = empFollowups.filter(
        (f) => f.date < todayYmd && f.status !== 'Completed' && f.status !== 'Cancelled'
      ).length;

      const empSTS = scopedSTS.filter(
        (s) => s.assignedEmployeeId === emp.uid || s.employeeId === emp.uid
      );
      const empProps = scopedProposals.filter(
        (p) => p.assignedEmployeeId === emp.uid || p.createdBy === emp.uid
      );

      const propsSent = empProps.filter((p) => p.status === 'Sent' || p.sentAt).length;
      const propsViewed = empProps.filter((p) => p.status === 'Viewed' || p.viewedAt).length;
      const propsAccepted = empProps.filter((p) => p.status === 'Accepted').length;

      const propVal = empProps.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
      const wonVal = empProps
        .filter((p) => p.status === 'Accepted')
        .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

      return {
        emp,
        leadsAssigned: empLeads.length,
        customersAssigned: empCusts.length,
        calls: empCalls.length,
        connectedCalls,
        followups: empFollowups.length,
        completedFollowups: completedF,
        overdueFollowups: overdueF,
        stsCreated: empSTS.length,
        proposalsCreated: empProps.length,
        proposalsSent: propsSent,
        proposalsViewed: propsViewed,
        proposalsAccepted: propsAccepted,
        proposalValue: propVal,
        wonValue: wonVal,
      };
    });
  }, [
    isAdmin,
    employees,
    scopedLeads,
    scopedCustomers,
    scopedCalls,
    scopedFollowups,
    scopedSTS,
    scopedProposals,
    todayYmd,
  ]);

  // Section 10: Employee Personal Workspace Metrics
  const myEmpId = useMemo(() => {
    const matched = employeeRecords.find(
      (e) => e.employeeId === userProfile?.uid || e.id === userProfile?.uid || e.email === userProfile?.email
    );
    return matched ? matched.id : userProfile?.uid || '';
  }, [employeeRecords, userProfile]);

  const myTasks = useMemo(() => {
    return taskRecords.filter(
      (t) =>
        t.assignedTo === userProfile?.uid ||
        t.assignedTo === myEmpId ||
        (userProfile?.email && t.assignedToName?.includes(userProfile.email))
    );
  }, [taskRecords, userProfile, myEmpId]);

  const myTodayAttendance = useMemo(() => {
    return attendanceRecords.find(
      (a) => (a.employeeId === myEmpId || a.employeeId === userProfile?.uid) && a.date === todayYmd
    );
  }, [attendanceRecords, myEmpId, userProfile, todayYmd]);

  const myLeaveBalances = useMemo(() => {
    if (!myEmpId) return [];
    return calculateLeaveBalances(myEmpId, leaveTypeRecords, leaveRecords);
  }, [myEmpId, leaveTypeRecords, leaveRecords]);

  const myUnreadNotifications = useMemo(() => {
    return notifications.filter(
      (n) => !n.read && (isAdmin || n.userId === userProfile?.uid || n.userId === 'all_admins')
    );
  }, [notifications, isAdmin, userProfile]);

  const [isClockLoading, setIsClockLoading] = useState(false);
  const handleQuickClock = async () => {
    if (!myEmpId) return;
    setIsClockLoading(true);
    try {
      if (!myTodayAttendance) {
        await checkInEmployee(myEmpId, 'Web');
      } else if (!myTodayAttendance.checkOut) {
        await checkOutEmployee(myTodayAttendance.id);
      }
    } catch (err: any) {
      alert(err.message || 'Attendance action failed');
    } finally {
      setIsClockLoading(false);
    }
  };

  // ROLE SECURITY GUARD: If user is an employee, render dedicated Employee Operations Dashboard
  if (!isAdmin) {
    return (
      <EmployeeDashboardView
        onNavigate={onNavigate}
        onOpenCustomerModal={onOpenCustomerModal}
        onOpenLeadModal={onOpenLeadModal}
        onOpenProposalModal={onOpenProposalModal}
      />
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner & Action Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/50">
                {isAdmin ? 'Superadmin Executive Dashboard' : 'Employee Operations Console'}
              </span>
              <span className="text-xs text-slate-400">• SparkGenTechnology</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-1 flex items-center gap-2">
              <BarChart2 className="w-7 h-7 text-indigo-400" />
              Real-Time Sales & Commercial Analytics
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Live data-driven intelligence streaming real-time Firestore activity, opportunity pipelines, and commercial metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowInfoModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="Metric Calculations & Definitions"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> Definitions & Calculations
            </button>

            {hasPermission('createProposal') && (
              <button
                onClick={onOpenProposalModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> New Proposal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Mode Switcher: Executive Management Dashboard (Phase 20) vs Commercial Operations Console */}
      {isAdmin && (
        <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider pl-2">Dashboard View:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDashboardMode('management')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dashboardMode === 'management'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Executive Management Dashboard (Phase 20)
              </button>
              <button
                onClick={() => setDashboardMode('commercial')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dashboardMode === 'commercial'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sales & Operations Console
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && dashboardMode === 'management' ? (
        <ManagementDashboard
          onNavigate={onNavigate}
          onOpenCustomerModal={onOpenCustomerModal}
          onOpenLeadModal={onOpenLeadModal}
          onOpenProposalModal={onOpenProposalModal}
        />
      ) : (
        <>
          {/* SECTION 10: EMPLOYEE DASHBOARD WORKSPACE (Factual Real-Time Information) */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 rounded-3xl border border-indigo-100 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              ★
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                My Operational Workspace (Personal Console)
              </h2>
              <span className="text-[11px] text-slate-500">
                Factual real-time summary for <strong>{userProfile?.name || 'Staff User'}</strong>
              </span>
            </div>
          </div>

          {/* Quick Attendance Widget */}
          <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Today's Attendance</span>
                <span className="font-semibold text-slate-800">
                  {myTodayAttendance
                    ? myTodayAttendance.checkOut
                      ? `Shift Closed (${formatMinutesToDuration(myTodayAttendance.workDuration || 0)})`
                      : `Checked In at ${myTodayAttendance.checkIn ? new Date(myTodayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}`
                    : 'Not Checked In'}
                </span>
              </div>
            </div>

            {(!myTodayAttendance || !myTodayAttendance.checkOut) && (
              <button
                onClick={handleQuickClock}
                disabled={isClockLoading}
                className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1 shadow-xs transition disabled:opacity-50 ${
                  !myTodayAttendance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {!myTodayAttendance ? (
                  <>
                    <Play className="w-3 h-3 fill-white" /> Check In
                  </>
                ) : (
                  <>
                    <Square className="w-3 h-3 fill-white" /> Check Out
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 9 Factual Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. My Customers */}
          <div
            onClick={() => onNavigate('customers')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">My Customers</span>
            <span className="text-xl font-black text-slate-900 block mt-1">{scopedCustomers.length}</span>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              View Accounts <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 2. My Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">My Leads</span>
            <span className="text-xl font-black text-slate-900 block mt-1">{scopedLeads.length}</span>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              Pipeline Prospects <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 3. My Proposals */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">My Proposals</span>
            <span className="text-xl font-black text-slate-900 block mt-1">{scopedProposals.length}</span>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              Quotes & Deals <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 4. My Pending Follow-ups */}
          <div
            onClick={() => onNavigate('followups')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Follow-ups</span>
            <span className="text-xl font-black text-amber-950 block mt-1">
              {scopedFollowups.filter((f) => f.status !== 'Completed' && f.status !== 'Cancelled').length}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-1">
              Scheduled Actions <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 5. My Tasks */}
          <div
            onClick={() => onNavigate('tasks')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">My Tasks</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-indigo-950">{myTasks.filter((t) => t.status !== 'Completed').length}</span>
              <span className="text-[10px] text-slate-400">/ {myTasks.length}</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              Active Deadlines <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 6. Leave Balance Overview */}
          <div
            onClick={() => onNavigate('leave')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition col-span-2 sm:col-span-1"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Leave Balance</span>
            <span className="text-xl font-black text-slate-900 block mt-1">
              {myLeaveBalances.reduce((sum, b) => sum + b.remaining, 0)} <span className="text-xs font-normal text-slate-500">Days</span>
            </span>
            <span className="text-[10px] text-slate-500 block truncate mt-1">
              {myLeaveBalances.map((b) => `${b.code}: ${b.remaining}`).join(' • ') || 'Configured Quotas'}
            </span>
          </div>

          {/* 7. Notifications */}
          <div
            onClick={() => onNavigate('notifications')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition col-span-2 sm:col-span-1"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Recent Alerts</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{myUnreadNotifications.length}</span>
              {myUnreadNotifications.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                  New
                </span>
              )}
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              Notification Center <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* 8. Communication Hub (Tickets / Customer Queries) */}
          <div
            onClick={() => onNavigate('communication')}
            className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition col-span-2 sm:col-span-1"
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Support Tickets</span>
            <span className="text-xl font-black text-slate-900 block mt-1">Live</span>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              Communication Hub <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. Global Date Range Filter Strip (Section 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Date Filter Period:
            </span>
            <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
              {activeDateRange.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs">
            {(
              [
                'Today',
                'Yesterday',
                'Last 7 Days',
                'Last 30 Days',
                'This Month',
                'Last Month',
                'This Quarter',
                'This Year',
                'Custom Range',
              ] as DateRangePreset[]
            ).map((p) => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  datePreset === p
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {datePreset === 'Custom Range' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1 text-xs"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              * Times evaluated in Asia/Kolkata (IST)
            </span>
          </div>
        )}
      </div>

      {/* 3. Top-Level 15 KPI Cards (Section 1) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {isAdmin
              ? 'Management Key Performance Indicators (Real-time Firestore)'
              : `My Operations & Activity KPIs (${userProfile?.name})`}
          </span>
          <span className="text-[11px] text-slate-400">
            * Cards with &bull; reflect the applied date range
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Total Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Total Leads &bull;</span>
              <Target className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.totalLeads}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Recorded in period</span>
          </div>

          {/* New Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">New Leads &bull;</span>
              <Target className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.newLeads}</span>
            <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Pending outreach</span>
          </div>

          {/* Active Customers */}
          <div
            onClick={() => onNavigate('customers')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Active Clients &bull;</span>
              <Building className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.activeCustomers}</span>
            <span className="text-[10px] text-blue-700 font-medium mt-0.5 block">Excludes Inactive/Lost</span>
          </div>

          {/* Total STS */}
          <div
            onClick={() => onNavigate('sts')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Total STS &bull;</span>
              <FileCheck className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.totalSTS}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Spec requests</span>
          </div>

          {/* Open STS */}
          <div
            onClick={() => onNavigate('sts')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Open STS &bull;</span>
              <FileCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.openSTS}</span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Under technical review</span>
          </div>

          {/* Total Proposals */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Total Proposals &bull;</span>
              <FileText className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.totalProposals}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Commercial offers</span>
          </div>

          {/* Proposals Sent */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Proposals Sent &bull;</span>
              <Send className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.proposalsSent}</span>
            <span className="text-[10px] text-blue-700 font-medium mt-0.5 block">Dispatched to client</span>
          </div>

          {/* Proposals Viewed */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Proposals Viewed &bull;</span>
              <Eye className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.proposalsViewed}</span>
            <span className="text-[10px] text-cyan-700 font-medium mt-0.5 block">Opened online by client</span>
          </div>

          {/* Proposals Accepted */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-bold uppercase">Accepted &bull;</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-emerald-950 block">{kpis.proposalsAccepted}</span>
            <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">Won deals</span>
          </div>

          {/* Proposals Rejected */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-[11px] font-bold uppercase">Rejected &bull;</span>
              <XCircle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-rose-950 block">{kpis.proposalsRejected}</span>
            <span className="text-[10px] text-rose-700 font-medium mt-0.5 block">Declined commercial</span>
          </div>

          {/* Follow-ups Today */}
          <div
            onClick={() => onNavigate('followups')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Follow-ups Today</span>
              <CalendarClock className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.followupsToday}</span>
            <span className="text-[10px] text-purple-700 font-semibold mt-0.5 block">Due: {todayYmd}</span>
          </div>

          {/* Overdue Follow-ups */}
          <div
            onClick={() => onNavigate('followups')}
            className={`p-4 rounded-2xl border shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
              kpis.overdueFollowups > 0
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase text-rose-700">Overdue Follow-ups</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-rose-900 block">{kpis.overdueFollowups}</span>
            <span className="text-[10px] text-rose-700 font-medium mt-0.5 block">Requires immediate call</span>
          </div>

          {/* Calls */}
          <div
            onClick={() => onNavigate('calls')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Calls Logged &bull;</span>
              <PhoneCall className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{kpis.calls}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Logged call outcomes</span>
          </div>

          {/* Pipeline Value */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-indigo-900 mb-1">
              <span className="text-[11px] font-bold uppercase">Pipeline Value &bull;</span>
              <TrendingUp className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-lg font-black text-indigo-950 block truncate font-mono">
              {formatINR(kpis.pipelineValue)}
            </span>
            <span className="text-[10px] text-indigo-700 font-semibold mt-0.5 block">Active open opportunities</span>
          </div>

          {/* Won Value */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-emerald-900 mb-1">
              <span className="text-[11px] font-bold uppercase">Won Commercial &bull;</span>
              <DollarSign className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-lg font-black text-emerald-950 block truncate font-mono">
              {formatINR(kpis.wonValue)}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">Accepted proposals</span>
          </div>
        </div>
      </div>

      {/* 4. Sales Funnel (Section 3) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Real Commercial Sales Funnel
            </h3>
            <p className="text-xs text-slate-500">
              Progression of sales pipeline from leads to won business. Click any stage to open filtered records.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Conversion: {dateFilteredLeads.length > 0 ? ((kpis.proposalsAccepted / dateFilteredLeads.length) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 pt-2">
          {funnelStages.map((stage, idx) => {
            const widthPct = Math.max(Math.round((stage.count / maxFunnelCount) * 100), 8);
            return (
              <div
                key={stage.name}
                onClick={() => onNavigate(stage.view)}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer text-center space-y-2 group shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>#{idx + 1}</span>
                  <span className="text-[10px] uppercase font-mono">{stage.view}</span>
                </div>

                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div>
                  <span className="text-xl font-black text-slate-900 block group-hover:text-indigo-600 transition-colors">
                    {stage.count}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 block truncate mt-0.5">
                    {stage.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Proposal & Commercial Analytics Breakdown (Section 5 & 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proposal Status Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Proposal Lifecycle Analytics
              </h3>
              <p className="text-xs text-slate-500">
                Detailed proposal count & commercial snapshot valuation ({proposalStats.totalCount} total)
              </p>
            </div>
            <button
              onClick={() => onNavigate('proposals')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              View Proposals
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(proposalStats.counts).map(([st, count]) => {
              const val = proposalStats.values[st] || 0;
              return (
                <div
                  key={st}
                  onClick={() => onNavigate('proposals')}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                    {st}
                  </span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">{count}</span>
                  <span className="text-[10px] font-mono text-indigo-700 block truncate mt-0.5">
                    {formatINR(val)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Proposal Value Highlights */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Dispatched</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatINR(proposalStats.sentVal)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Client Viewed</span>
              <span className="font-mono font-bold text-cyan-800 text-sm">
                {formatINR(proposalStats.viewedVal)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Accepted (Won)</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatINR(proposalStats.acceptedVal)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Lead Analytics */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Customer & Lead Engagement
              </h3>
              <p className="text-xs text-slate-500">Cross-collection relational connectivity metrics</p>
            </div>
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Client Directory
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Clients</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5">{customerStats.total}</span>
              <span className="text-[10px] text-slate-500">{customerStats.active} Active accounts</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">With Follow-ups</span>
              <span className="text-xl font-black text-purple-900 block mt-0.5">
                {customerStats.withFollowups}
              </span>
              <span className="text-[10px] text-slate-500">Active touchpoints</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">With Open STS</span>
              <span className="text-xl font-black text-teal-900 block mt-0.5">
                {customerStats.withOpenSTS}
              </span>
              <span className="text-[10px] text-slate-500">Requirement logged</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">With Proposals</span>
              <span className="text-xl font-black text-indigo-900 block mt-0.5">
                {customerStats.withProposals}
              </span>
              <span className="text-[10px] text-slate-500">Offers prepared</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">New Leads</span>
              <span className="text-xl font-black text-amber-900 block mt-0.5">{leadStats.counts['New'] || 0}</span>
              <span className="text-[10px] text-slate-500">Awaiting contact</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Qualified Leads</span>
              <span className="text-xl font-black text-emerald-900 block mt-0.5">
                {leadStats.counts['Qualified'] || 0}
              </span>
              <span className="text-[10px] text-slate-500">Ready for proposal</span>
            </div>
          </div>

          {/* Call Status Breakdown Notice (Section 9) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                Logged Calls: {callStats.total} ({callStats.counts.Connected} Connected,{' '}
                {callStats.counts['Callback Requested']} Callbacks)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 italic">Telephony connected</span>
          </div>
        </div>
      </div>

      {/* 6. Date-Based Sales & Value Trends Charts (Section 15 & 16) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                Sales Activity Chronological Trend
              </h3>
              <p className="text-xs text-slate-500">Actual daily volume across selected metric</p>
            </div>

            <select
              value={selectedChartMetric}
              onChange={(e) => setSelectedChartMetric(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800 outline-none"
            >
              <option value="proposals">Proposals Generated</option>
              <option value="accepted">Accepted Proposals</option>
              <option value="leads">New Leads</option>
              <option value="customers">New Customers</option>
              <option value="calls">Calls Logged</option>
              <option value="followups">Follow-ups Scheduled</option>
            </select>
          </div>

          {salesTrendData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No records for this timeframe.</div>
          ) : (
            <div className="space-y-2">
              <div className="h-44 flex items-end gap-1 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
                {salesTrendData.map((d) => {
                  const barHeight = Math.max(Math.round((d.count / maxTrendCount) * 100), 4);
                  return (
                    <div
                      key={d.day}
                      className="flex-1 min-w-[14px] flex flex-col items-center gap-1 group relative"
                    >
                      <div
                        className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all"
                        style={{ height: `${barHeight}%` }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                        {d.day}: {d.count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{salesTrendData[0]?.day}</span>
                <span>Actual chronological data points</span>
                <span>{salesTrendData[salesTrendData.length - 1]?.day}</span>
              </div>
            </div>
          )}
        </div>

        {/* Commercial Valuation Trend (Section 16) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Commercial Value Trend (INR)
              </h3>
              <p className="text-xs text-slate-500">Proposal Value vs Won Commercial Volume</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-indigo-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Proposal Value
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Won Value
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-44 flex items-end gap-1 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
              {valueTrendData.map((d) => {
                const propHeight = Math.max(Math.round((d.propVal / maxValueTrend) * 100), 2);
                const wonHeight = Math.max(Math.round((d.wonVal / maxValueTrend) * 100), 2);
                return (
                  <div
                    key={d.day}
                    className="flex-1 min-w-[16px] flex items-end justify-center gap-0.5 group relative"
                  >
                    <div
                      className="w-1/2 bg-indigo-400 hover:bg-indigo-500 rounded-t-xs transition-all"
                      style={{ height: `${propHeight}%` }}
                    />
                    <div
                      className="w-1/2 bg-emerald-500 hover:bg-emerald-600 rounded-t-xs transition-all"
                      style={{ height: `${wonHeight}%` }}
                    />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      {d.day} | Prop: {formatINR(d.propVal)} | Won: {formatINR(d.wonVal)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{valueTrendData[0]?.day}</span>
              <span>All monetary totals in INR</span>
              <span>{valueTrendData[valueTrendData.length - 1]?.day}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Lead Source Analysis (Section 17) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Lead Source Acquisition & Conversion Report
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated from authentic Firestore leadSource fields and linked commercial opportunities
            </p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            Full Reports
          </button>
        </div>

        {leadSourceStats.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No leads recorded in this selected date period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Lead Source</th>
                  <th className="py-2.5 px-3 text-center">Lead Count</th>
                  <th className="py-2.5 px-3 text-center">Customer Conversions</th>
                  <th className="py-2.5 px-3 text-center">Proposal Dispatches</th>
                  <th className="py-2.5 px-3 text-center">Won Deals</th>
                  <th className="py-2.5 px-3 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadSourceStats.map((row) => {
                  const rate =
                    row.leadCount > 0 ? ((row.convCount / row.leadCount) * 100).toFixed(1) : '0';
                  return (
                    <tr key={row.source} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.source}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{row.leadCount}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{row.convCount}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{row.propCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{row.wonCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-700">
                        {rate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. Team Activity & Performance Matrix (Section 12 - Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Employee Sales Performance & Activity Matrix (/admin/employees/performance)
              </h3>
              <p className="text-xs text-slate-500">
                Authorized administrative operational summary. Strictly data-driven (no subjective rankings).
              </p>
            </div>
            <button
              onClick={() => onNavigate('employees')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Employee Directory
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3 text-center">Leads Assigned</th>
                  <th className="py-2.5 px-3 text-center">Customers</th>
                  <th className="py-2.5 px-3 text-center">Calls</th>
                  <th className="py-2.5 px-3 text-center">Connected</th>
                  <th className="py-2.5 px-3 text-center">Follow-ups</th>
                  <th className="py-2.5 px-3 text-center">Completed</th>
                  <th className="py-2.5 px-3 text-center">STS</th>
                  <th className="py-2.5 px-3 text-center">Proposals</th>
                  <th className="py-2.5 px-3 text-center">Sent</th>
                  <th className="py-2.5 px-3 text-center">Won Deals</th>
                  <th className="py-2.5 px-3 text-right">Won Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeMatrix.map((row) => (
                  <tr key={row.emp.uid} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{row.emp.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{row.emp.email}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      {row.leadsAssigned}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      {row.customersAssigned}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{row.calls}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-medium">
                      {row.connectedCalls}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{row.followups}</td>
                    <td className="py-2.5 px-3 text-center text-blue-700 font-medium">
                      {row.completedFollowups}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{row.stsCreated}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-900">
                      {row.proposalsCreated}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{row.proposalsSent}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {row.proposalsAccepted}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatINR(row.wonValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Live Chronological Activity Stream (Section 14) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live CRM Activity & Communications Audit Feed
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of real actions, updates, proposal decisions, and transmissions
            </p>
          </div>
          <button
            onClick={() => onNavigate('activities')}
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            All Activities ({activities.length})
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No CRM activity recorded yet.</div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {activities.slice(0, 10).map((act) => (
              <div
                key={act.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs mt-0.5">
                    {act.type.includes('call') ? (
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                    ) : act.type.includes('proposal') ? (
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    ) : act.type.includes('lead') ? (
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{act.title}</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">{act.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Actor: <span className="font-semibold text-slate-700">{act.userName}</span>
                      {act.userRole ? ` (${act.userRole})` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {act.timestamp ? formatDateDisplayIST(act.timestamp) : '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {act.timestamp
                      ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10. Calculations & Data Definitions Modal (Section 34) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Executive KPI Definitions & Calculation Rules (Section 34)
                </h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <span className="font-bold text-indigo-900 block">Open Pipeline Value:</span>
                <p className="text-[11px] text-indigo-800">
                  Calculated from active Open STS opportunities with a valid estimate amount, or active generated/sent proposals not yet in a terminal state (Accepted, Rejected, Cancelled). Never counts the same commercial opportunity twice.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 block">Won Value:</span>
                <p className="text-[11px] text-emerald-800">
                  Represents the sum total of proposals with status <code>Accepted</code> within the selected date range. Based entirely on the immutable financial snapshot captured at proposal generation.
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Core Terminology
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-[11px]">
                  <li>
                    <strong>Lead:</strong> A prospect or inquiry recorded in the CRM before conversion into an account.
                  </li>
                  <li>
                    <strong>Customer / Client:</strong> An active corporate account with contact coordinates and assigned account representative.
                  </li>
                  <li>
                    <strong>STS (Sales Target / Technical Specification):</strong> Preliminary technical scoping record defining requirements and estimated value.
                  </li>
                  <li>
                    <strong>Proposal:</strong> Official commercial offer including GST, line items, banking remittance, and contractual terms.
                  </li>
                  <li>
                    <strong>Call Records:</strong> Genuine telephonic logs. Call duration is only displayed when provided by authentic telephony integration.
                  </li>
                  <li>
                    <strong>Timezone Standard:</strong> All date ranges, daily timelines, and reports are evaluated in Asia/Kolkata (IST).
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Close Definitions
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
