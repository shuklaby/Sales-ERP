import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart2,
  Users,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, STSRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const STSAnalyticsView: React.FC = () => {
  const { stsRecords, employees, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'status' | 'employee' | 'date' | 'source'>('status');

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

  const scopedSTS = useMemo(() => {
    if (isAdmin) return stsRecords;
    return stsRecords.filter(
      (s) =>
        s.assignedEmployeeId === userProfile?.uid ||
        s.employeeId === userProfile?.uid ||
        (s as any).createdBy === userProfile?.uid
      );
  }, [stsRecords, isAdmin, userProfile]);

  const filteredSTS = useMemo(() => {
    return scopedSTS.filter((s) => {
      const dt = s.date || (s as any).createdAt;
      if (!isWithinDateRange(dt, activeDateRange)) return false;
      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (s.assignedEmployeeId !== filters.employeeId && s.employeeId !== filters.employeeId) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (s.status !== filters.status) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (s.stsNumber || '').toLowerCase().includes(q) ||
          (s.companyName || '').toLowerCase().includes(q) ||
          (s.contactPerson || '').toLowerCase().includes(q) ||
          (s.requirement || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedSTS, activeDateRange, filters, searchQuery]);

  // Specific Section 4 requirements:
  // Show: Total STS, New STS, Talk Hui, Follow-up, Converted, Lost, Pending
  // Metrics: STS Created, STS Updated, STS Converted, STS Pending, STS by Employee, STS by Source, STS by Date
  const stsMetrics = useMemo(() => {
    const totalSTS = filteredSTS.length;
    const newSTS = filteredSTS.filter((s) => s.status === 'New' || (s.status as any) === 'Draft').length;
    const talkHui = filteredSTS.filter(
      (s) => s.status === 'Talk Hui' || (s.status as any) === 'Contacted' || (s.status as any) === 'In Discussion'
    ).length;
    const followup = filteredSTS.filter(
      (s) => s.status === 'Follow-up' || (s.status as any) === 'Follow Up' || s.followupDate
    ).length;
    const converted = filteredSTS.filter(
      (s) => s.status === 'Converted' || s.status === 'Won' || (s.status as any) === 'Proposal Created'
    ).length;
    const lost = filteredSTS.filter((s) => s.status === 'Lost' || (s.status as any) === 'Dropped').length;
    const pending = filteredSTS.filter(
      (s) => s.status !== 'Converted' && s.status !== 'Won' && s.status !== 'Lost'
    ).length;

    const totalAmount = filteredSTS.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const convertedAmount = filteredSTS
      .filter((s) => s.status === 'Converted' || s.status === 'Won')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    return {
      totalSTS,
      newSTS,
      talkHui,
      followup,
      converted,
      lost,
      pending,
      totalAmount,
      convertedAmount,
    };
  }, [filteredSTS]);

  const stsColumns: DrillDownColumn[] = [
    { header: 'STS Number', accessor: 'stsNumber' },
    { header: 'Company Name', accessor: 'companyName' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Requirement', accessor: 'requirement' },
    { header: 'Status', accessor: 'status' },
    { header: 'Amount (INR)', accessor: 'amount', align: 'right', format: (val) => formatINR(val || 0) },
    { header: 'Follow-up', accessor: 'followupDate', format: (val) => val ? formatDateDisplayIST(val) : '—' },
    { header: 'Date', accessor: 'date', format: (val) => formatDateDisplayIST(val) },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalAmount: number; items: STSRecord[] }>();

    filteredSTS.forEach((s) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'status') {
        key = s.status || 'New';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((e) => e.uid === s.assignedEmployeeId || e.uid === s.employeeId);
        key = emp ? emp.name || emp.email : s.employeeName || 'Unassigned';
        label = key;
      } else if (groupBy === 'date') {
        key = (s.date || (s as any).createdAt || '').substring(0, 10);
        label = key ? formatDateDisplayIST(key) : 'Unknown Date';
      } else if (groupBy === 'source') {
        key = (s as any).source || 'Direct';
        label = key;
      }

      const existing = map.get(key) || { label, count: 0, totalAmount: 0, items: [] };
      existing.count += 1;
      existing.totalAmount += Number(s.amount) || 0;
      existing.items.push(s);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredSTS, groupBy, employees]);

  const maxCount = useMemo(() => {
    return Math.max(...groupedData.map((d) => d.count), 1);
  }, [groupedData]);

  const handleExportExcel = () => {
    const rows = filteredSTS.map((s) => ({
      'STS #': s.stsNumber,
      Company: s.companyName,
      Contact: s.contactPerson,
      Requirement: s.requirement,
      Status: s.status,
      Amount: s.amount || 0,
      Followup: s.followupDate || '',
      Date: s.date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'STS_Analytics');
    XLSX.writeFile(wb, `SparkGen_STSAnalytics_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredSTS.map((s) => ({
      'STS #': s.stsNumber,
      Company: s.companyName,
      Contact: s.contactPerson,
      Requirement: s.requirement,
      Status: s.status,
      Amount: s.amount || 0,
      Followup: s.followupDate || '',
      Date: s.date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_STSAnalytics_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredSTS.map((s) => ({
      'STS #': s.stsNumber,
      Company: s.companyName,
      Contact: s.contactPerson,
      Requirement: s.requirement,
      Status: s.status,
      Amount: s.amount || 0,
    }));

    const doc = generateReportPdf({
      reportTitle: `STS Commercial & Technical Requirements Analytics`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Total STS', value: String(stsMetrics.totalSTS) },
        { label: 'Talk Hui', value: String(stsMetrics.talkHui) },
        { label: 'Converted', value: String(stsMetrics.converted) },
        { label: 'Pending', value: String(stsMetrics.pending) },
      ],
      columns: [
        { header: 'STS #', dataKey: 'STS #' },
        { header: 'Company', dataKey: 'Company' },
        { header: 'Contact', dataKey: 'Contact' },
        { header: 'Requirement', dataKey: 'Requirement' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Amount (INR)', dataKey: 'Amount', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_STSAnalytics_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({
            datePreset: 'This Month',
            employeeId: 'ALL',
            status: 'ALL',
          })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showStatusFilter={true}
        statusOptions={['New', 'Talk Hui', 'Follow-up', 'Converted', 'Won', 'Lost', 'Pending']}
        totalRecordsCount={filteredSTS.length}
      />

      {/* KPI Cards (Section 4 specs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total STS Records',
              subtitle: 'All STS requirements in active range',
              data: filteredSTS,
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Total STS</div>
          <div className="text-xl font-black text-slate-900 mt-1">{stsMetrics.totalSTS}</div>
          <div className="text-2xs text-slate-500 mt-0.5">All tickets</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'New STS Tickets',
              subtitle: 'Newly logged requirement tickets',
              data: filteredSTS.filter((s) => s.status === 'New' || (s.status as any) === 'Draft'),
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">New STS</div>
          <div className="text-xl font-black text-blue-600 mt-1">{stsMetrics.newSTS}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Fresh intake</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Talk Hui (Contacted)',
              subtitle: 'STS with active initial discussions',
              data: filteredSTS.filter(
                (s) => s.status === 'Talk Hui' || (s.status as any) === 'Contacted' || (s.status as any) === 'In Discussion'
              ),
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Talk Hui</div>
          <div className="text-xl font-black text-indigo-600 mt-1">{stsMetrics.talkHui}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Conversation held</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Follow-up STS',
              subtitle: 'STS tickets queued for follow-up',
              data: filteredSTS.filter((s) => s.status === 'Follow-up' || s.followupDate),
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Follow-up</div>
          <div className="text-xl font-black text-amber-600 mt-1">{stsMetrics.followup}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Action pending</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Converted STS',
              subtitle: 'STS converted to won orders or proposals',
              data: filteredSTS.filter((s) => s.status === 'Converted' || s.status === 'Won'),
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Converted</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{stsMetrics.converted}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Successfully won</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Lost STS',
              subtitle: 'STS tickets that were lost or dropped',
              data: filteredSTS.filter((s) => s.status === 'Lost'),
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Lost</div>
          <div className="text-xl font-black text-rose-600 mt-1">{stsMetrics.lost}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Closed without win</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Pending STS',
              subtitle: 'STS tickets awaiting closure',
              data: filteredSTS.filter((s) => s.status !== 'Converted' && s.status !== 'Won' && s.status !== 'Lost'),
              columns: stsColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Pending</div>
          <div className="text-xl font-black text-purple-700 mt-1">{stsMetrics.pending}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Active backlog</div>
        </div>
      </div>

      {/* Breakdown by Dimension */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              STS Dimensional Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Inspect STS Created, Updated, Converted, and Pending metrics.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'status', label: 'By Status' },
                { id: 'employee', label: 'By Employee' },
                { id: 'date', label: 'By Date' },
                { id: 'source', label: 'By Source' },
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
            <div className="py-8 text-center text-slate-400 text-xs">No STS data found.</div>
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
                      subtitle: `${item.count} STS tickets, total requirement ${formatINR(item.totalAmount)}`,
                      data: item.items,
                      columns: stsColumns,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-2xs text-slate-400 font-mono">#{idx + 1}</span>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-semibold text-slate-600">{item.count} tickets</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(item.totalAmount)}</span>
                    </div>
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
