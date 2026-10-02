import React, { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Send,
  Layers,
  BarChart2,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, ProposalRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const ProposalsReportView: React.FC = () => {
  const { proposals, employees, customers, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
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

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(filters.datePreset, filters.startDate, filters.endDate);
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  const scopedProposals = useMemo(() => {
    if (isAdmin) return proposals;
    return proposals.filter(
      (p) => p.assignedEmployeeId === userProfile?.uid || p.createdBy === userProfile?.uid
    );
  }, [proposals, isAdmin, userProfile]);

  const filteredProposals = useMemo(() => {
    return scopedProposals.filter((p) => {
      const dt = p.proposalDate || p.createdAt || '';
      if (!isWithinDateRange(dt, activeDateRange)) return false;

      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (p.assignedEmployeeId !== filters.employeeId && p.createdBy !== filters.employeeId) return false;
      }
      if (filters.customerId && filters.customerId !== 'ALL') {
        if (p.customerId !== filters.customerId) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (p.status !== filters.status) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (p.proposalNumber || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.clientName || '').toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedProposals, activeDateRange, filters, searchQuery]);

  // Section 7 specifications:
  // Show: Draft, Sent, Viewed, Accepted, Rejected, Expired, Cancelled
  // Metrics: Total Proposal Value, Accepted Proposal Value, Pending Proposal Value, Rejected Proposal Value
  // Calculate proposal conversion from actual records. Do not count draft proposals as sent proposals.
  const proposalMetrics = useMemo(() => {
    let draftCount = 0;
    let sentCount = 0;
    let viewedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let expiredCount = 0;
    let cancelledCount = 0;

    let totalValue = 0;
    let acceptedValue = 0;
    let pendingValue = 0;
    let rejectedValue = 0;

    filteredProposals.forEach((p) => {
      const val = Number(p.grandTotal || p.totalAmount || 0);
      totalValue += val;

      const st = p.status;
      if (st === 'Draft') {
        draftCount++;
      } else if (st === 'Sent') {
        sentCount++;
        pendingValue += val;
      } else if (st === 'Viewed' || st === 'Under Discussion') {
        viewedCount++;
        pendingValue += val;
      } else if (st === 'Accepted') {
        acceptedCount++;
        acceptedValue += val;
      } else if (st === 'Rejected') {
        rejectedCount++;
        rejectedValue += val;
      } else if (st === 'Expired') {
        expiredCount++;
      } else if (st === 'Cancelled') {
        cancelledCount++;
      } else {
        pendingValue += val;
      }
    });

    // Real conversion rate: Accepted / Sent or Viewed proposals (excluding drafts)
    const formallySentCount = sentCount + viewedCount + acceptedCount + rejectedCount + expiredCount;
    const conversionRate = formallySentCount > 0 ? ((acceptedCount / formallySentCount) * 100).toFixed(1) : '0.0';

    return {
      draftCount,
      sentCount,
      viewedCount,
      acceptedCount,
      rejectedCount,
      expiredCount,
      cancelledCount,
      totalValue,
      acceptedValue,
      pendingValue,
      rejectedValue,
      formallySentCount,
      conversionRate,
    };
  }, [filteredProposals]);

  const proposalColumns: DrillDownColumn[] = [
    { header: 'Proposal #', accessor: 'proposalNumber' },
    { header: 'Customer', accessor: 'customerName', format: (val, row) => val || row.clientName || '—' },
    { header: 'Title', accessor: 'title', format: (val) => val || 'Standard Commercial Quotation' },
    { header: 'Status', accessor: 'status' },
    { header: 'Date', accessor: 'proposalDate', format: (val, row) => formatDateDisplayIST(val || row.createdAt) },
    { header: 'Employee', accessor: 'assignedEmployeeName', format: (val, row) => val || row.createdByName || '—' },
    { header: 'Grand Total (INR)', accessor: 'grandTotal', align: 'right', format: (val, row) => formatINR(val || row.totalAmount || 0) },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalValue: number; items: ProposalRecord[] }>();

    filteredProposals.forEach((p) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'status') {
        key = p.status || 'Draft';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((e) => e.uid === p.assignedEmployeeId || e.uid === p.createdBy);
        key = emp ? emp.name || emp.email : p.assignedEmployeeName || 'Unassigned';
        label = key;
      } else if (groupBy === 'customer') {
        key = p.customerName || p.clientName || 'Customer';
        label = key;
      } else if (groupBy === 'date') {
        key = (p.proposalDate || p.createdAt || '').substring(0, 10);
        label = key ? formatDateDisplayIST(key) : 'Unknown Date';
      }

      const existing = map.get(key) || { label, count: 0, totalValue: 0, items: [] };
      existing.count += 1;
      existing.totalValue += Number(p.grandTotal || p.totalAmount || 0);
      existing.items.push(p);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredProposals, groupBy, employees]);

  const maxValue = useMemo(() => Math.max(...groupedData.map((d) => d.totalValue), 1), [groupedData]);

  const handleExportExcel = () => {
    const rows = filteredProposals.map((p) => ({
      'Proposal #': p.proposalNumber,
      Customer: p.customerName || p.clientName || '',
      Title: p.title || '',
      Status: p.status,
      Amount: p.grandTotal || p.totalAmount || 0,
      Date: p.proposalDate || p.createdAt || '',
      Employee: p.assignedEmployeeName || p.createdByName || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proposals_Report');
    XLSX.writeFile(wb, `SparkGen_ProposalsReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredProposals.map((p) => ({
      'Proposal #': p.proposalNumber,
      Customer: p.customerName || p.clientName || '',
      Title: p.title || '',
      Status: p.status,
      Amount: p.grandTotal || p.totalAmount || 0,
      Date: p.proposalDate || p.createdAt || '',
      Employee: p.assignedEmployeeName || p.createdByName || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_ProposalsReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredProposals.map((p) => ({
      'Proposal #': p.proposalNumber,
      Customer: p.customerName || p.clientName || '',
      Status: p.status,
      Date: p.proposalDate || p.createdAt || '',
      Employee: p.assignedEmployeeName || p.createdByName || '',
      Amount: p.grandTotal || p.totalAmount || 0,
    }));

    const doc = generateReportPdf({
      reportTitle: `Commercial Quotations & Proposal Analytics`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Total Value', value: formatINR(proposalMetrics.totalValue) },
        { label: 'Accepted Value', value: formatINR(proposalMetrics.acceptedValue) },
        { label: 'Pending Value', value: formatINR(proposalMetrics.pendingValue) },
        { label: 'Conversion Rate', value: `${proposalMetrics.conversionRate}%` },
      ],
      columns: [
        { header: 'Proposal #', dataKey: 'Proposal #' },
        { header: 'Customer', dataKey: 'Customer' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Employee', dataKey: 'Employee' },
        { header: 'Amount (INR)', dataKey: 'Amount', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_ProposalsReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({ datePreset: 'This Month', employeeId: 'ALL', customerId: 'ALL', status: 'ALL' })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showCustomerFilter={true}
        showStatusFilter={true}
        statusOptions={['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Cancelled']}
        totalRecordsCount={filteredProposals.length}
      />

      {/* Financial Valuation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Proposal Portfolio',
              subtitle: 'All proposals in current active filter',
              data: filteredProposals,
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Total Value</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(proposalMetrics.totalValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">{filteredProposals.length} total proposals</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Accepted Commercial Orders',
              subtitle: 'Proposals formally accepted by clients',
              data: filteredProposals.filter((p) => p.status === 'Accepted'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Accepted Value</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {formatINR(proposalMetrics.acceptedValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            <strong>{proposalMetrics.acceptedCount}</strong> accepted • Conversion: {proposalMetrics.conversionRate}%
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Pending Proposal Value',
              subtitle: 'Proposals sent or viewed, awaiting client decision',
              data: filteredProposals.filter((p) => ['Sent', 'Viewed', 'Under Discussion'].includes(p.status)),
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Pending Value</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono mt-1">
            {formatINR(proposalMetrics.pendingValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            {proposalMetrics.sentCount + proposalMetrics.viewedCount} active proposals pending
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Rejected Proposal Value',
              subtitle: 'Proposals declined or rejected by clients',
              data: filteredProposals.filter((p) => p.status === 'Rejected'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Rejected Value</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-700 font-mono mt-1">
            {formatINR(proposalMetrics.rejectedValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">{proposalMetrics.rejectedCount} rejected proposals</div>
        </div>
      </div>

      {/* Lifecycle Status Counts (Section 7 specs: Draft, Sent, Viewed, Accepted, Rejected, Expired, Cancelled) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Draft Proposals',
              subtitle: 'Draft proposals not yet dispatched to client',
              data: filteredProposals.filter((p) => p.status === 'Draft'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-slate-400"
        >
          <span className="text-2xs text-slate-400 font-bold uppercase">Draft</span>
          <div className="text-lg font-black text-slate-700 mt-0.5">{proposalMetrics.draftCount}</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Sent Proposals',
              subtitle: 'Formally dispatched to clients',
              data: filteredProposals.filter((p) => p.status === 'Sent'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-blue-400"
        >
          <span className="text-2xs text-blue-500 font-bold uppercase">Sent</span>
          <div className="text-lg font-black text-blue-700 mt-0.5">{proposalMetrics.sentCount}</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Viewed Proposals',
              subtitle: 'Opened and inspected by customer',
              data: filteredProposals.filter((p) => p.status === 'Viewed' || p.status === 'Under Discussion'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-indigo-400"
        >
          <span className="text-2xs text-indigo-500 font-bold uppercase">Viewed</span>
          <div className="text-lg font-black text-indigo-700 mt-0.5">{proposalMetrics.viewedCount}</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Accepted Proposals',
              subtitle: 'Confirmed orders',
              data: filteredProposals.filter((p) => p.status === 'Accepted'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-emerald-400"
        >
          <span className="text-2xs text-emerald-600 font-bold uppercase">Accepted</span>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{proposalMetrics.acceptedCount}</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Rejected Proposals',
              subtitle: 'Declined proposals',
              data: filteredProposals.filter((p) => p.status === 'Rejected'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-rose-400"
        >
          <span className="text-2xs text-rose-500 font-bold uppercase">Rejected</span>
          <div className="text-lg font-black text-rose-700 mt-0.5">{proposalMetrics.rejectedCount}</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Expired Proposals',
              subtitle: 'Exceeded validity date without acceptance',
              data: filteredProposals.filter((p) => p.status === 'Expired'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-amber-400"
        >
          <span className="text-2xs text-amber-500 font-bold uppercase">Expired</span>
          <div className="text-lg font-black text-amber-700 mt-0.5">{proposalMetrics.expiredCount}</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Cancelled Proposals',
              subtitle: 'Cancelled proposals',
              data: filteredProposals.filter((p) => p.status === 'Cancelled'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center cursor-pointer hover:border-slate-400"
        >
          <span className="text-2xs text-slate-400 font-bold uppercase">Cancelled</span>
          <div className="text-lg font-black text-slate-700 mt-0.5">{proposalMetrics.cancelledCount}</div>
        </div>
      </div>

      {/* Dimensional Breakdown */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Proposal Value Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown by Status, Employee, Customer, or Date. Click any row to drill down.
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
            <div className="py-8 text-center text-slate-400 text-xs">No proposal records found.</div>
          ) : (
            groupedData.map((item, idx) => {
              const pct = Math.max(Math.round((item.totalValue / maxValue) * 100), 4);
              return (
                <div
                  key={idx}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Drill-down: ${item.label}`,
                      subtitle: `${item.count} proposals, value ${formatINR(item.totalValue)}`,
                      data: item.items,
                      columns: proposalColumns,
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
                      <span className="text-slate-500 font-semibold">{item.count} orders</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(item.totalValue)}</span>
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
