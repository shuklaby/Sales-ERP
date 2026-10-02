import React, { useState, useMemo } from 'react';
import {
  Users,
  Target,
  Building,
  PhoneCall,
  CalendarClock,
  FileText,
  DollarSign,
  BarChart2,
  Calendar,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, UserProfile } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const EmployeesReportView: React.FC = () => {
  const {
    employees,
    leads,
    customers,
    calls,
    followups,
    meetings,
    proposals,
    invoices,
    payments,
    companySettings,
  } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: any[];
    columns: DrillDownColumn[];
  }>({
    isOpen: false,
    title: '',
    data: [],
    columns: [],
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(filters.datePreset, filters.startDate, filters.endDate);
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  // Section 14 security rule:
  // "For authorized managers/admin. Use factual activity records. Do not create subjective performance labels."
  const authorizedEmployees = useMemo(() => {
    if (isAdmin) return employees;
    // Sales manager/team lead or self
    return employees.filter((e) => e.uid === userProfile?.uid);
  }, [employees, isAdmin, userProfile]);

  const employeeActivityList = useMemo(() => {
    return authorizedEmployees
      .filter((emp) => {
        if (filters.employeeId && filters.employeeId !== 'ALL' && emp.uid !== filters.employeeId) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            (emp.name || '').toLowerCase().includes(q) ||
            (emp.email || '').toLowerCase().includes(q) ||
            (emp.role || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .map((emp) => {
        // Factual counts within active date range
        const empLeads = leads.filter(
          (l) =>
            (l.assignedEmployeeId === emp.uid || l.createdBy === emp.uid) &&
            isWithinDateRange(l.createdAt, activeDateRange)
        );

        const empCustomers = customers.filter(
          (c) =>
            (c.assignedEmployeeId === emp.uid || c.createdBy === emp.uid) &&
            isWithinDateRange(c.createdAt, activeDateRange)
        );

        const empCalls = calls.filter(
          (c) =>
            c.employeeId === emp.uid &&
            isWithinDateRange(c.dateTime || c.createdAt || '', activeDateRange)
        );

        const empFollowups = followups.filter(
          (f) =>
            f.employeeId === emp.uid &&
            isWithinDateRange(f.date || f.followupDate || f.createdAt || '', activeDateRange)
        );

        const empMeetings = meetings.filter(
          (m) =>
            (m.employeeId === emp.uid || m.hostEmployeeId === emp.uid) &&
            isWithinDateRange(m.date || m.meetingDate || (m as any).createdAt || '', activeDateRange)
        );

        const empProposals = proposals.filter(
          (p) =>
            (p.assignedEmployeeId === emp.uid || p.createdBy === emp.uid) &&
            isWithinDateRange(p.proposalDate || p.createdAt || '', activeDateRange)
        );

        const empInvoices = invoices.filter(
          (i) =>
            (i.createdBy === emp.uid || i.assignedEmployeeId === emp.uid) &&
            isWithinDateRange(i.invoiceDate || i.createdAt || '', activeDateRange)
        );

        const empPayments = payments.filter(
          (p) =>
            p.status === 'COMPLETED' &&
            (p.recordedBy === emp.uid || (p as any).assignedEmployeeId === emp.uid) &&
            isWithinDateRange(p.paymentDate || p.createdAt || '', activeDateRange)
        );

        const collectedAmount = empPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        return {
          employee: emp,
          id: emp.uid,
          name: emp.name || emp.email,
          role: emp.role,
          lastLogin: (emp as any).lastLoginAt ? formatDateDisplayIST((emp as any).lastLoginAt) : 'Active Session',
          assignedLeads: empLeads.length,
          assignedCustomers: empCustomers.length,
          callsCount: empCalls.length,
          followupsCount: empFollowups.length,
          meetingsCount: empMeetings.length,
          proposalsCount: empProposals.length,
          invoicesCount: empInvoices.length,
          collectedAmount,
          rawLeads: empLeads,
          rawCalls: empCalls,
          rawFollowups: empFollowups,
          rawProposals: empProposals,
        };
      });
  }, [authorizedEmployees, leads, customers, calls, followups, meetings, proposals, invoices, payments, activeDateRange, filters.employeeId, searchQuery]);

  // Overall totals
  const overallTotals = useMemo(() => {
    return {
      employees: employeeActivityList.length,
      leads: employeeActivityList.reduce((sum, e) => sum + e.assignedLeads, 0),
      calls: employeeActivityList.reduce((sum, e) => sum + e.callsCount, 0),
      followups: employeeActivityList.reduce((sum, e) => sum + e.followupsCount, 0),
      meetings: employeeActivityList.reduce((sum, e) => sum + e.meetingsCount, 0),
      proposals: employeeActivityList.reduce((sum, e) => sum + e.proposalsCount, 0),
      collected: employeeActivityList.reduce((sum, e) => sum + e.collectedAmount, 0),
    };
  }, [employeeActivityList]);

  const empDrillDownCols: DrillDownColumn[] = [
    { header: 'Employee', accessor: 'name' },
    { header: 'Role', accessor: 'role' },
    { header: 'Leads', accessor: 'assignedLeads', align: 'center' },
    { header: 'Calls', accessor: 'callsCount', align: 'center' },
    { header: 'Follow-ups', accessor: 'followupsCount', align: 'center' },
    { header: 'Meetings', accessor: 'meetingsCount', align: 'center' },
    { header: 'Proposals', accessor: 'proposalsCount', align: 'center' },
    { header: 'Collection (INR)', accessor: 'collectedAmount', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  const handleExportExcel = () => {
    const rows = employeeActivityList.map((e) => ({
      Employee: e.name,
      Role: e.role,
      'Last Login': e.lastLogin,
      'Assigned Leads': e.assignedLeads,
      'Assigned Customers': e.assignedCustomers,
      Calls: e.callsCount,
      'Follow-ups': e.followupsCount,
      Meetings: e.meetingsCount,
      Proposals: e.proposalsCount,
      Invoices: e.invoicesCount,
      'Collection (INR)': e.collectedAmount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee_Activity');
    XLSX.writeFile(wb, `SparkGen_EmployeeActivity_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = employeeActivityList.map((e) => ({
      Employee: e.name,
      Role: e.role,
      'Last Login': e.lastLogin,
      'Assigned Leads': e.assignedLeads,
      'Assigned Customers': e.assignedCustomers,
      Calls: e.callsCount,
      'Follow-ups': e.followupsCount,
      Meetings: e.meetingsCount,
      Proposals: e.proposalsCount,
      Invoices: e.invoicesCount,
      'Collection (INR)': e.collectedAmount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_EmployeeActivity_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = employeeActivityList.map((e) => ({
      Employee: e.name,
      Role: e.role,
      Leads: e.assignedLeads,
      Calls: e.callsCount,
      'Follow-ups': e.followupsCount,
      Proposals: e.proposalsCount,
      'Collection (INR)': formatINR(e.collectedAmount),
    }));

    const doc = generateReportPdf({
      reportTitle: `Operational Staff Activity & Workload Register`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
      },
      summaryMetrics: [
        { label: 'Active Staff', value: String(overallTotals.employees) },
        { label: 'Total Calls', value: String(overallTotals.calls) },
        { label: 'Follow-ups', value: String(overallTotals.followups) },
        { label: 'Total Collected', value: formatINR(overallTotals.collected) },
      ],
      columns: [
        { header: 'Employee', dataKey: 'Employee' },
        { header: 'Role', dataKey: 'Role' },
        { header: 'Leads', dataKey: 'Leads', align: 'center' },
        { header: 'Calls', dataKey: 'Calls', align: 'center' },
        { header: 'Follow-ups', dataKey: 'Follow-ups', align: 'center' },
        { header: 'Proposals', dataKey: 'Proposals', align: 'center' },
        { header: 'Collection', dataKey: 'Collection (INR)', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_EmployeeActivity_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() => setFilters({ datePreset: 'This Month', employeeId: 'ALL' })}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        totalRecordsCount={employeeActivityList.length}
      />

      {/* Aggregate KPI Strip (Factual records only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Staff Count</div>
          <div className="text-xl font-black text-slate-900 mt-1">{overallTotals.employees}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Active personnel</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Leads Handled</div>
          <div className="text-xl font-black text-blue-600 mt-1">{overallTotals.leads}</div>
          <div className="text-2xs text-slate-500 mt-0.5">In period</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Calls Logged</div>
          <div className="text-xl font-black text-indigo-600 mt-1">{overallTotals.calls}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Telephony dials</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Follow-ups</div>
          <div className="text-xl font-black text-amber-600 mt-1">{overallTotals.followups}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Touchpoint actions</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Meetings</div>
          <div className="text-xl font-black text-purple-600 mt-1">{overallTotals.meetings}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Client conferences</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Proposals</div>
          <div className="text-xl font-black text-slate-800 mt-1">{overallTotals.proposals}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Quotations issued</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Collection</div>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {formatINR(overallTotals.collected)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Recovered revenue</div>
        </div>
      </div>

      {/* Factual Activity Matrix Table (Section 14: No subjective labels) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Factual Activity Register ({employeeActivityList.length} Personnel)
          </h4>
          <span className="text-2xs text-slate-400">Strict factual metrics without subjective rankings</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="p-3">Employee</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Leads</th>
                <th className="p-3 text-center">Customers</th>
                <th className="p-3 text-center">Calls</th>
                <th className="p-3 text-center">Follow-ups</th>
                <th className="p-3 text-center">Meetings</th>
                <th className="p-3 text-center">Proposals</th>
                <th className="p-3 text-center">Invoices</th>
                <th className="p-3 text-right">Collection (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {employeeActivityList.map((e) => (
                <tr
                  key={e.id}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Activity: ${e.name}`,
                      subtitle: `Role: ${e.role} • Leads: ${e.assignedLeads} • Calls: ${e.callsCount}`,
                      data: [e],
                      columns: empDrillDownCols,
                    })
                  }
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-semibold text-slate-900">{e.name}</td>
                  <td className="p-3 text-slate-500 capitalize">{e.role}</td>
                  <td className="p-3 text-center font-bold text-blue-700">{e.assignedLeads}</td>
                  <td className="p-3 text-center text-slate-700">{e.assignedCustomers}</td>
                  <td className="p-3 text-center font-bold text-indigo-700">{e.callsCount}</td>
                  <td className="p-3 text-center text-amber-700 font-semibold">{e.followupsCount}</td>
                  <td className="p-3 text-center text-purple-700">{e.meetingsCount}</td>
                  <td className="p-3 text-center font-bold text-slate-900">{e.proposalsCount}</td>
                  <td className="p-3 text-center text-slate-600">{e.invoicesCount}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    {formatINR(e.collectedAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      <ReportDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState((prev) => ({ ...prev, isOpen: false }))}
        title={drillDownState.title}
        subtitle={drillDownState.subtitle}
        data={drillDownState.data}
        columns={drillDownState.columns}
      />
    </div>
  );
};
