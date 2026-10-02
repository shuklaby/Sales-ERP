import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  BarChart2,
  Phone,
  MessageSquare,
  Mail,
  User,
  ExternalLink,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, FollowUpRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

interface FollowupsReportViewProps {
  initialTodayOnly?: boolean;
}

export const FollowupsReportView: React.FC<FollowupsReportViewProps> = ({ initialTodayOnly = false }) => {
  const { followups, employees, customers, completeFollowUp, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [todayMode, setTodayMode] = useState(initialTodayOnly);
  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: initialTodayOnly ? 'Today' : 'This Month',
    employeeId: 'ALL',
    customerId: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'status' | 'employee' | 'customer' | 'date'>('status');

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

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (window.location.pathname.includes('/followups/today')) {
      setTodayMode(true);
      setFilters((prev) => ({ ...prev, datePreset: 'Today' }));
    }
  }, []);

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(filters.datePreset, filters.startDate, filters.endDate);
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  const scopedFollowups = useMemo(() => {
    if (isAdmin) return followups;
    return followups.filter((f) => f.employeeId === userProfile?.uid);
  }, [followups, isAdmin, userProfile]);

  const filteredFollowups = useMemo(() => {
    return scopedFollowups.filter((f) => {
      const fDate = (f.date || f.followupDate || f.createdAt || '').substring(0, 10);
      if (todayMode) {
        if (fDate !== todayStr) return false;
      } else {
        if (!isWithinDateRange(fDate, activeDateRange)) return false;
      }

      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (f.employeeId !== filters.employeeId) return false;
      }
      if (filters.customerId && filters.customerId !== 'ALL') {
        if (f.customerId !== filters.customerId) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (f.status !== filters.status) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (f.companyName || '').toLowerCase().includes(q) ||
          (f.contactPerson || '').toLowerCase().includes(q) ||
          (f.notes || '').toLowerCase().includes(q) ||
          (f.summary || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedFollowups, todayMode, todayStr, activeDateRange, filters, searchQuery]);

  // Section 6 specs:
  // Today's Follow-ups, Upcoming, Completed, Pending, Overdue, Cancelled
  const followupMetrics = useMemo(() => {
    const all = scopedFollowups;
    const dueToday = all.filter(
      (f) => (f.date || f.followupDate || '').startsWith(todayStr) && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    const upcoming = all.filter(
      (f) => (f.date || f.followupDate || '') > todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    const completed = filteredFollowups.filter((f) => f.status === 'Completed').length;
    const pending = filteredFollowups.filter((f) => f.status === 'Pending' || f.status === 'Scheduled').length;

    const overdue = all.filter(
      (f) => (f.date || f.followupDate || '') < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'
    ).length;

    const cancelled = filteredFollowups.filter((f) => f.status === 'Cancelled').length;

    return {
      dueToday,
      upcoming,
      completed,
      pending,
      overdue,
      cancelled,
      totalFiltered: filteredFollowups.length,
    };
  }, [scopedFollowups, filteredFollowups, todayStr]);

  const followupColumns: DrillDownColumn[] = [
    { header: 'Company Name', accessor: 'companyName' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Scheduled Date', accessor: 'date', format: (val, row) => formatDateDisplayIST(val || row.followupDate) },
    { header: 'Time', accessor: 'time', format: (val) => val || '—' },
    { header: 'Status', accessor: 'status' },
    { header: 'Assigned Employee', accessor: 'employeeName' },
    { header: 'Notes / Summary', accessor: 'notes', format: (val, row) => val || row.summary || '—' },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; items: FollowUpRecord[] }>();

    filteredFollowups.forEach((f) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'status') {
        key = f.status || 'Pending';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((e) => e.uid === f.employeeId);
        key = emp ? emp.name || emp.email : f.employeeName || 'Unassigned';
        label = key;
      } else if (groupBy === 'customer') {
        key = f.companyName || f.contactPerson || 'Customer';
        label = key;
      } else if (groupBy === 'date') {
        key = (f.date || f.followupDate || f.createdAt || '').substring(0, 10);
        label = key ? formatDateDisplayIST(key) : 'Unknown Date';
      }

      const existing = map.get(key) || { label, count: 0, items: [] };
      existing.count += 1;
      existing.items.push(f);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredFollowups, groupBy, employees]);

  const maxCount = useMemo(() => Math.max(...groupedData.map((d) => d.count), 1), [groupedData]);

  const handleCompleteFollowup = async (fId: string) => {
    try {
      await completeFollowUp(fId, 'Completed via Follow-ups Today MIS');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportExcel = () => {
    const rows = filteredFollowups.map((f) => ({
      Company: f.companyName,
      Contact: f.contactPerson,
      Date: f.date || f.followupDate || '',
      Time: f.time || '',
      Status: f.status,
      Employee: f.employeeName || '',
      Notes: f.notes || f.summary || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Followup_Report');
    XLSX.writeFile(wb, `SparkGen_FollowupReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredFollowups.map((f) => ({
      Company: f.companyName,
      Contact: f.contactPerson,
      Date: f.date || f.followupDate || '',
      Time: f.time || '',
      Status: f.status,
      Employee: f.employeeName || '',
      Notes: f.notes || f.summary || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_FollowupReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredFollowups.map((f) => ({
      Company: f.companyName,
      Contact: f.contactPerson,
      Date: f.date || f.followupDate || '',
      Time: f.time || '—',
      Status: f.status,
      Employee: f.employeeName || '—',
    }));

    const doc = generateReportPdf({
      reportTitle: todayMode ? "Today's Follow-up Operational Audit" : 'Follow-up Lifecycle Analytics',
      dateRangeLabel: todayMode ? `Today (${formatDateDisplayIST(todayStr)})` : activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Due Today', value: String(followupMetrics.dueToday) },
        { label: 'Overdue', value: String(followupMetrics.overdue) },
        { label: 'Completed', value: String(followupMetrics.completed) },
        { label: 'Pending', value: String(followupMetrics.pending) },
      ],
      columns: [
        { header: 'Company', dataKey: 'Company' },
        { header: 'Contact', dataKey: 'Contact' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Time', dataKey: 'Time', align: 'center' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Employee', dataKey: 'Employee' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_FollowupReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher: Full Report vs Today's Dedicated Followups (/reports/followups/today) */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {todayMode ? "Today's Follow-up Desk (/reports/followups/today)" : 'Comprehensive Follow-up Analytics'}
            </h2>
            <p className="text-2xs text-slate-500">
              Manage client touchpoints, reschedule, and verify action completions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTodayMode(false);
              setFilters((prev) => ({ ...prev, datePreset: 'This Month' }));
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !todayMode ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Periods
          </button>
          <button
            onClick={() => {
              setTodayMode(true);
              setFilters((prev) => ({ ...prev, datePreset: 'Today' }));
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              todayMode ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's Queue ({followupMetrics.dueToday})
          </button>
        </div>
      </div>

      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({ datePreset: todayMode ? 'Today' : 'This Month', employeeId: 'ALL', customerId: 'ALL', status: 'ALL' })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showCustomerFilter={true}
        showStatusFilter={true}
        statusOptions={['Scheduled', 'Pending', 'Completed', 'Cancelled', 'Rescheduled']}
        totalRecordsCount={filteredFollowups.length}
      />

      {/* KPI Cards (Section 6 requirements) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => {
            setTodayMode(true);
            setFilters((prev) => ({ ...prev, datePreset: 'Today' }));
          }}
          className={`p-3.5 rounded-2xl border shadow-2xs hover:shadow-md transition-all cursor-pointer ${
            todayMode ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Due Today</div>
          <div className="text-xl font-black text-indigo-700 mt-1">{followupMetrics.dueToday}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Scheduled for today</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Upcoming Follow-ups',
              subtitle: 'Scheduled beyond today',
              data: scopedFollowups.filter(
                (f) => (f.date || f.followupDate || '') > todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'
              ),
              columns: followupColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Upcoming</div>
          <div className="text-xl font-black text-blue-600 mt-1">{followupMetrics.upcoming}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Future dates</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Overdue Follow-ups',
              subtitle: 'Past dates needing attention',
              data: scopedFollowups.filter(
                (f) => (f.date || f.followupDate || '') < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'
              ),
              columns: followupColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Overdue</div>
          <div className="text-xl font-black text-rose-600 mt-1">{followupMetrics.overdue}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Missed target dates</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Completed Follow-ups',
              subtitle: 'Successfully completed',
              data: filteredFollowups.filter((f) => f.status === 'Completed'),
              columns: followupColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Completed</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{followupMetrics.completed}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Successfully closed</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Pending Follow-ups',
              subtitle: 'Active pending items',
              data: filteredFollowups.filter((f) => f.status === 'Pending' || f.status === 'Scheduled'),
              columns: followupColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Pending</div>
          <div className="text-xl font-black text-amber-600 mt-1">{followupMetrics.pending}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Active schedule</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Cancelled Follow-ups',
              subtitle: 'Follow-ups marked as cancelled',
              data: filteredFollowups.filter((f) => f.status === 'Cancelled'),
              columns: followupColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Cancelled</div>
          <div className="text-xl font-black text-slate-500 mt-1">{followupMetrics.cancelled}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Cancelled touchpoints</div>
        </div>
      </div>

      {/* Today's Actionable Queue if todayMode */}
      {todayMode && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              <span>Today's Follow-up Action Queue ({filteredFollowups.length})</span>
            </h3>
            <span className="text-2xs text-slate-400">{formatDateDisplayIST(todayStr)}</span>
          </div>

          {filteredFollowups.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No follow-ups due today! Great job staying ahead of schedule.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFollowups.map((f) => (
                <div
                  key={f.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{f.companyName || 'General Account'}</h4>
                      <p className="text-2xs text-slate-500">{f.contactPerson || 'Contact Person'}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${
                        f.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>

                  <p className="text-2xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                    {f.notes || f.summary || 'No discussion notes provided.'}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-slate-400 font-mono">
                      {f.time ? `Time: ${f.time}` : 'Anytime today'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {f.status !== 'Completed' && (
                        <button
                          onClick={() => handleCompleteFollowup(f.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-bold transition-colors cursor-pointer"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Breakdown by Dimension */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Follow-up Metrics Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown by Employee, Customer, Status, or Date. Click any row to drill down.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'status', label: 'By Status' },
                { id: 'employee', label: 'By Employee' },
                { id: 'customer', label: 'By Customer' },
                { id: 'date', label: 'By Date' },
              ] as { id: typeof groupBy; label: string }[]
            ).map((g) => (
              <button
                key={g.id}
                onClick={() => setGroupBy(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  groupBy === g.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {groupedData.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No follow-ups recorded.</div>
          ) : (
            groupedData.map((item, idx) => {
              const pct = Math.max(Math.round((item.count / maxCount) * 100), 4);
              return (
                <div
                  key={idx}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Drill-down: ${item.label}`,
                      subtitle: `${item.count} follow-up record(s)`,
                      data: item.items,
                      columns: followupColumns,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-2xs text-slate-400 font-mono">#{idx + 1}</span>
                      {item.label}
                    </span>
                    <span className="font-bold text-slate-900">{item.count} items</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
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
