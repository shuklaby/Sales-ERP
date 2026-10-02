import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart2,
  Clock,
  User,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, CallRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const CallsReportView: React.FC = () => {
  const { calls, employees, customers, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    customerId: 'ALL',
    status: 'ALL',
  });
  const [callTypeFilter, setCallTypeFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'outcome' | 'employee' | 'customer' | 'date'>('outcome');

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

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const scopedCalls = useMemo(() => {
    if (isAdmin) return calls;
    return calls.filter((c) => c.employeeId === userProfile?.uid);
  }, [calls, isAdmin, userProfile]);

  const filteredCalls = useMemo(() => {
    return scopedCalls.filter((c) => {
      const dt = c.dateTime || c.createdAt || c.callDate || '';
      if (!isWithinDateRange(dt, activeDateRange)) return false;

      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (c.employeeId !== filters.employeeId) return false;
      }
      if (filters.customerId && filters.customerId !== 'ALL') {
        if (c.customerId !== filters.customerId) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (c.status !== filters.status) return false;
      }
      if (callTypeFilter !== 'ALL') {
        const type = (c.type || c.callType || 'OUTGOING').toUpperCase();
        if (type !== callTypeFilter) return false;
      }
      if (outcomeFilter !== 'ALL') {
        const outcome = c.outcome || c.status || 'Other';
        if (outcome !== outcomeFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (c.contactPerson || '').toLowerCase().includes(q) ||
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.phoneNumber || c.mobile || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedCalls, activeDateRange, filters, callTypeFilter, outcomeFilter, searchQuery]);

  // Specific Section 5 metrics:
  // Show: Total Calls, Today's Calls, Incoming Calls, Outgoing Calls, Connected Calls, Missed Calls, Call Outcomes
  const callMetrics = useMemo(() => {
    const totalCalls = filteredCalls.length;
    const callsToday = scopedCalls.filter((c) => (c.dateTime || c.createdAt || '').startsWith(todayStr)).length;

    let incoming = 0;
    let outgoing = 0;
    let connected = 0;
    let missed = 0;

    filteredCalls.forEach((c) => {
      const type = (c.type || c.callType || 'OUTGOING').toUpperCase();
      if (type === 'INCOMING') incoming++;
      else outgoing++;

      const st = (c.status || c.outcome || '').toLowerCase();
      if (st.includes('connected') || st.includes('completed') || st.includes('answered')) {
        connected++;
      } else if (st.includes('missed') || st.includes('no answer') || st.includes('unanswered')) {
        missed++;
      }
    });

    return {
      totalCalls,
      callsToday,
      incoming,
      outgoing,
      connected,
      missed,
    };
  }, [filteredCalls, scopedCalls, todayStr]);

  const callColumns: DrillDownColumn[] = [
    { header: 'Contact / Company', accessor: 'companyName', format: (val, row) => `${val || '—'} (${row.contactPerson || '—'})` },
    { header: 'Phone Number', accessor: 'phoneNumber', format: (val, row) => val || row.mobile || '—' },
    { header: 'Type', accessor: 'type', format: (val, row) => val || row.callType || 'Outgoing' },
    { header: 'Status / Outcome', accessor: 'status', format: (val, row) => row.outcome || val || '—' },
    { header: 'Duration', accessor: 'duration', format: (val) => val ? `${val}s` : '—' },
    { header: 'Employee', accessor: 'employeeName', format: (val) => val || '—' },
    { header: 'Date & Time', accessor: 'dateTime', format: (val, row) => formatDateDisplayIST(val || row.createdAt) },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; items: CallRecord[] }>();

    filteredCalls.forEach((c) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'outcome') {
        key = c.outcome || c.status || 'Unspecified';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((e) => e.uid === c.employeeId);
        key = emp ? emp.name || emp.email : c.employeeName || 'Unassigned';
        label = key;
      } else if (groupBy === 'customer') {
        key = c.companyName || c.contactPerson || 'Direct Call';
        label = key;
      } else if (groupBy === 'date') {
        key = (c.dateTime || c.createdAt || '').substring(0, 10);
        label = key ? formatDateDisplayIST(key) : 'Unknown Date';
      }

      const existing = map.get(key) || { label, count: 0, items: [] };
      existing.count += 1;
      existing.items.push(c);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredCalls, groupBy, employees]);

  const maxCount = useMemo(() => Math.max(...groupedData.map((d) => d.count), 1), [groupedData]);

  const handleExportExcel = () => {
    const rows = filteredCalls.map((c) => ({
      Company: c.companyName || '',
      Contact: c.contactPerson || '',
      Phone: c.phoneNumber || c.mobile || '',
      Type: c.type || c.callType || 'Outgoing',
      Status: c.status || '',
      Outcome: c.outcome || '',
      Duration: c.duration ? `${c.duration}s` : '',
      Employee: c.employeeName || '',
      Date: c.dateTime || c.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calls_Report');
    XLSX.writeFile(wb, `SparkGen_CallsReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredCalls.map((c) => ({
      Company: c.companyName || '',
      Contact: c.contactPerson || '',
      Phone: c.phoneNumber || c.mobile || '',
      Type: c.type || c.callType || 'Outgoing',
      Status: c.status || '',
      Outcome: c.outcome || '',
      Duration: c.duration ? `${c.duration}s` : '',
      Employee: c.employeeName || '',
      Date: c.dateTime || c.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_CallsReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredCalls.map((c) => ({
      'Contact / Company': `${c.companyName || '—'} (${c.contactPerson || '—'})`,
      Phone: c.phoneNumber || c.mobile || '',
      Type: c.type || c.callType || 'Outgoing',
      Outcome: c.outcome || c.status || '—',
      Duration: c.duration ? `${c.duration}s` : '—',
      Employee: c.employeeName || '—',
    }));

    const doc = generateReportPdf({
      reportTitle: `Telephony & Operational Calling Analytics`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Customer: filters.customerId || 'ALL',
        Type: callTypeFilter,
      },
      summaryMetrics: [
        { label: 'Total Calls', value: String(callMetrics.totalCalls) },
        { label: 'Today Calls', value: String(callMetrics.callsToday) },
        { label: 'Connected', value: String(callMetrics.connected) },
        { label: 'Missed', value: String(callMetrics.missed) },
      ],
      columns: [
        { header: 'Contact / Company', dataKey: 'Contact / Company' },
        { header: 'Phone', dataKey: 'Phone' },
        { header: 'Type', dataKey: 'Type', align: 'center' },
        { header: 'Outcome', dataKey: 'Outcome' },
        { header: 'Duration', dataKey: 'Duration', align: 'center' },
        { header: 'Employee', dataKey: 'Employee' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_CallsReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() => {
          setFilters({ datePreset: 'This Month', employeeId: 'ALL', customerId: 'ALL', status: 'ALL' });
          setCallTypeFilter('ALL');
          setOutcomeFilter('ALL');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showCustomerFilter={true}
        showStatusFilter={true}
        statusOptions={['Connected', 'Not Connected', 'Busy', 'No Answer', 'Callback Requested', 'Wrong Number']}
        totalRecordsCount={filteredCalls.length}
      />

      {/* Extra Filters Strip for Call Type & Outcome */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-2xs">Call Type:</span>
        {(['ALL', 'INCOMING', 'OUTGOING'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setCallTypeFilter(t)}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
              callTypeFilter === t
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Telephony Calls',
              subtitle: 'All calls registered in active filter range',
              data: filteredCalls,
              columns: callColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Total Calls</div>
          <div className="text-xl font-black text-slate-900 mt-1">{callMetrics.totalCalls}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Click for drill-down</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: "Today's Calls",
              subtitle: `Logged on ${todayStr}`,
              data: scopedCalls.filter((c) => (c.dateTime || c.createdAt || '').startsWith(todayStr)),
              columns: callColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Calls Today</div>
          <div className="text-xl font-black text-blue-600 mt-1">{callMetrics.callsToday}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Current day activity</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Connected Calls',
              subtitle: 'Calls successfully connected/answered',
              data: filteredCalls.filter((c) => {
                const st = (c.status || c.outcome || '').toLowerCase();
                return st.includes('connected') || st.includes('completed') || st.includes('answered');
              }),
              columns: callColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Connected</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{callMetrics.connected}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Factual connected logs</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Missed / No Answer Calls',
              subtitle: 'Calls not connected or missed',
              data: filteredCalls.filter((c) => {
                const st = (c.status || c.outcome || '').toLowerCase();
                return st.includes('missed') || st.includes('no answer') || st.includes('unanswered');
              }),
              columns: callColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Missed / No Ans</div>
          <div className="text-xl font-black text-rose-600 mt-1">{callMetrics.missed}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Unanswered calls</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Incoming Calls',
              subtitle: 'Calls received inbound',
              data: filteredCalls.filter((c) => (c.type || c.callType || '').toUpperCase() === 'INCOMING'),
              columns: callColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Incoming</div>
          <div className="text-xl font-black text-indigo-600 mt-1">{callMetrics.incoming}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Inbound volume</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Outgoing Calls',
              subtitle: 'Outbound calls dialed',
              data: filteredCalls.filter((c) => (c.type || c.callType || 'OUTGOING').toUpperCase() === 'OUTGOING'),
              columns: callColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Outgoing</div>
          <div className="text-xl font-black text-slate-800 mt-1">{callMetrics.outgoing}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Outbound dialed</div>
        </div>
      </div>

      {/* Breakdown by Dimension */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Call Distribution & Outcome Analytics
            </h3>
            <p className="text-xs text-slate-500">
              Only displaying recorded information stored by provider/system.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'outcome', label: 'By Outcome' },
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
            <div className="py-8 text-center text-slate-400 text-xs">No calls found.</div>
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
                      subtitle: `${item.count} call records`,
                      data: item.items,
                      columns: callColumns,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-2xs text-slate-400 font-mono">#{idx + 1}</span>
                      {item.label}
                    </span>
                    <span className="font-bold text-slate-900">{item.count} calls</span>
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
