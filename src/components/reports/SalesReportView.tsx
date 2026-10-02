import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Package,
  Layers,
  Calendar,
  ChevronRight,
  Filter,
  BarChart2,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, ProposalRecord, InvoiceRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

type SalesGroupBy =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'employee'
  | 'customer'
  | 'product'
  | 'service'
  | 'source'
  | 'status';

export const SalesReportView: React.FC = () => {
  const { proposals, invoices, employees, customers, products, services, leads, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  // Filters State
  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    customerId: 'ALL',
    productId: 'ALL',
    serviceId: 'ALL',
    source: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroupBy, setActiveGroupBy] = useState<SalesGroupBy>('monthly');

  // Drill-down Modal State
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

  // Scoped proposals & invoices based on role
  const scopedProposals = useMemo(() => {
    if (isAdmin) return proposals;
    return proposals.filter(
      (p) => p.assignedEmployeeId === userProfile?.uid || p.createdBy === userProfile?.uid
    );
  }, [proposals, isAdmin, userProfile]);

  const scopedInvoices = useMemo(() => {
    if (isAdmin) return invoices;
    return invoices.filter(
      (i) => i.createdBy === userProfile?.uid || i.assignedEmployeeId === userProfile?.uid
    );
  }, [invoices, isAdmin, userProfile]);

  // Filtered Proposals (Primary sales record for proposals/sales order value)
  const filteredProposals = useMemo(() => {
    return scopedProposals.filter((p) => {
      const dt = p.proposalDate || p.createdAt;
      if (!isWithinDateRange(dt, activeDateRange)) return false;

      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (p.assignedEmployeeId !== filters.employeeId && p.createdBy !== filters.employeeId) return false;
      }
      if (filters.customerId && filters.customerId !== 'ALL') {
        if (p.customerId !== filters.customerId && p.id !== filters.customerId) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (p.status !== filters.status) return false;
      }
      if (filters.productId && filters.productId !== 'ALL') {
        const hasProd = p.lineItems?.some((li) => li.productId === filters.productId);
        if (!hasProd) return false;
      }
      if (filters.serviceId && filters.serviceId !== 'ALL') {
        const hasSvc = p.lineItems?.some((li) => (li as any).serviceId === filters.serviceId);
        if (!hasSvc) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (p.proposalNumber || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.clientName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedProposals, activeDateRange, filters, searchQuery]);

  // Filtered Invoices (Recognized revenue / invoice value)
  const filteredInvoices = useMemo(() => {
    return scopedInvoices.filter((i) => {
      const dt = i.invoiceDate || i.createdAt;
      if (!isWithinDateRange(dt, activeDateRange)) return false;
      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (i.createdBy !== filters.employeeId && i.assignedEmployeeId !== filters.employeeId) return false;
      }
      if (filters.customerId && filters.customerId !== 'ALL') {
        if (i.customerId !== filters.customerId) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (i.status !== filters.status) return false;
      }
      return true;
    });
  }, [scopedInvoices, activeDateRange, filters]);

  // ==========================================
  // TOP METRIC CARDS WITH FACTUAL TOTALS
  // ==========================================
  const salesMetrics = useMemo(() => {
    const totalProposalCount = filteredProposals.length;
    const acceptedProps = filteredProposals.filter((p) => p.status === 'Accepted');
    const acceptedCount = acceptedProps.length;

    const totalSalesValue = acceptedProps.reduce((sum, p) => sum + (p.grandTotal || p.totalAmount || 0), 0);
    const pipelineValue = filteredProposals
      .filter((p) => p.status === 'Sent' || p.status === 'Viewed' || p.status === 'Under Discussion')
      .reduce((sum, p) => sum + (p.grandTotal || p.totalAmount || 0), 0);

    const nonCancelledInvoices = filteredInvoices.filter((i) => i.status !== 'CANCELLED');
    const totalInvoicedValue = nonCancelledInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
    const totalCollectedValue = nonCancelledInvoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);

    const conversionRate = totalProposalCount > 0 ? ((acceptedCount / totalProposalCount) * 100).toFixed(1) : '0.0';

    return {
      totalProposalCount,
      acceptedCount,
      totalSalesValue,
      pipelineValue,
      totalInvoicedValue,
      totalCollectedValue,
      conversionRate,
      acceptedProps,
    };
  }, [filteredProposals, filteredInvoices]);

  // ==========================================
  // DRILL-DOWN HANDLER FOR METRICS
  // ==========================================
  const proposalColumns: DrillDownColumn[] = [
    { header: 'Proposal #', accessor: 'proposalNumber' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Date', accessor: 'proposalDate', format: (val) => formatDateDisplayIST(val) },
    { header: 'Status', accessor: 'status' },
    { header: 'Grand Total (INR)', accessor: 'grandTotal', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  const invoiceColumns: DrillDownColumn[] = [
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Date', accessor: 'invoiceDate', format: (val) => formatDateDisplayIST(val) },
    { header: 'Status', accessor: 'status' },
    { header: 'Grand Total (INR)', accessor: 'grandTotal', align: 'right', format: (val) => formatINR(val || 0) },
    { header: 'Paid (INR)', accessor: 'paidAmount', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  // ==========================================
  // GROUPED SALES DATA (TABLE & CHARTS)
  // ==========================================
  const groupedSalesData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalValue: number; acceptedValue: number; items: ProposalRecord[] }>();

    filteredProposals.forEach((p) => {
      let key = 'Other';
      let label = 'Other';

      if (activeGroupBy === 'daily') {
        const dt = (p.proposalDate || p.createdAt || '').substring(0, 10);
        key = dt || 'Unknown Date';
        label = dt ? formatDateDisplayIST(dt) : 'Unknown Date';
      } else if (activeGroupBy === 'monthly') {
        const m = (p.proposalDate || p.createdAt || '').substring(0, 7);
        key = m || 'Unknown Month';
        label = m || 'Unknown Month';
      } else if (activeGroupBy === 'yearly') {
        const y = (p.proposalDate || p.createdAt || '').substring(0, 4);
        key = y || 'Unknown Year';
        label = y || 'Unknown Year';
      } else if (activeGroupBy === 'weekly') {
        const dt = new Date(p.proposalDate || p.createdAt || Date.now());
        const weekNum = Math.ceil(dt.getDate() / 7);
        const m = (p.proposalDate || p.createdAt || '').substring(0, 7);
        key = `${m}-W${weekNum}`;
        label = `${m} Week ${weekNum}`;
      } else if (activeGroupBy === 'quarterly') {
        const dt = new Date(p.proposalDate || p.createdAt || Date.now());
        const q = Math.floor(dt.getMonth() / 3) + 1;
        key = `${dt.getFullYear()}-Q${q}`;
        label = `${dt.getFullYear()} Q${q}`;
      } else if (activeGroupBy === 'employee') {
        const emp = employees.find((e) => e.uid === p.assignedEmployeeId || e.uid === p.createdBy);
        key = emp ? emp.name || emp.email : 'Unassigned';
        label = key;
      } else if (activeGroupBy === 'customer') {
        key = p.customerName || 'Unknown Customer';
        label = key;
      } else if (activeGroupBy === 'status') {
        key = p.status || 'Draft';
        label = key;
      } else if (activeGroupBy === 'source') {
        // Correlate with lead source if available
        const relLead = leads.find((l) => l.id === p.leadId || l.convertedCustomerId === p.customerId);
        key = relLead?.source || 'Direct';
        label = key;
      } else if (activeGroupBy === 'product' || activeGroupBy === 'service') {
        if (p.lineItems && p.lineItems.length > 0) {
          p.lineItems.forEach((li) => {
            const itemKey = li.name || li.description || 'General Item';
            const val = li.totalAmount || li.lineTotal || (li.unitPrice * (li.quantity || 1)) || 0;
            const existing = map.get(itemKey) || { label: itemKey, count: 0, totalValue: 0, acceptedValue: 0, items: [] };
            existing.count += 1;
            existing.totalValue += val;
            if (p.status === 'Accepted') existing.acceptedValue += val;
            existing.items.push(p);
            map.set(itemKey, existing);
          });
          return;
        } else {
          key = 'No Items Listed';
          label = key;
        }
      }

      const existing = map.get(key) || { label, count: 0, totalValue: 0, acceptedValue: 0, items: [] };
      existing.count += 1;
      const pVal = p.grandTotal || p.totalAmount || 0;
      existing.totalValue += pVal;
      if (p.status === 'Accepted') {
        existing.acceptedValue += pVal;
      }
      existing.items.push(p);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredProposals, activeGroupBy, employees, leads]);

  // Max value for chart visual scaling
  const maxGroupValue = useMemo(() => {
    return Math.max(...groupedSalesData.map((d) => d.totalValue), 1);
  }, [groupedSalesData]);

  // ==========================================
  // EXPORT HANDLERS (EXCEL, CSV, PRINT/PDF)
  // ==========================================
  const handleExportExcel = () => {
    const rows = filteredProposals.map((p) => ({
      'Proposal Number': p.proposalNumber,
      Customer: p.customerName || p.clientName || '',
      Date: p.proposalDate || p.createdAt || '',
      Status: p.status,
      'Grand Total (INR)': p.grandTotal || 0,
      Employee: p.assignedEmployeeName || p.createdByName || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales_Report');
    XLSX.writeFile(wb, `SparkGen_SalesReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredProposals.map((p) => ({
      'Proposal Number': p.proposalNumber,
      Customer: p.customerName || p.clientName || '',
      Date: p.proposalDate || p.createdAt || '',
      Status: p.status,
      'Grand Total (INR)': p.grandTotal || 0,
      Employee: p.assignedEmployeeName || p.createdByName || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_SalesReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredProposals.map((p) => ({
      'Proposal Number': p.proposalNumber,
      Customer: p.customerName || p.clientName || '',
      Date: p.proposalDate || p.createdAt || '',
      Status: p.status,
      'Grand Total (INR)': p.grandTotal || 0,
      Employee: p.assignedEmployeeName || p.createdByName || '',
    }));

    const doc = generateReportPdf({
      reportTitle: `Comprehensive Sales Commercial Analytics (${activeGroupBy.toUpperCase()})`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Customer: filters.customerId || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Accepted Sales', value: formatINR(salesMetrics.totalSalesValue) },
        { label: 'Invoiced Revenue', value: formatINR(salesMetrics.totalInvoicedValue) },
        { label: 'Pipeline Value', value: formatINR(salesMetrics.pipelineValue) },
        { label: 'Conversion Rate', value: `${salesMetrics.conversionRate}%` },
      ],
      columns: [
        { header: 'Proposal #', dataKey: 'Proposal Number' },
        { header: 'Customer', dataKey: 'Customer' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Employee', dataKey: 'Employee' },
        { header: 'Amount (INR)', dataKey: 'Grand Total (INR)', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_SalesReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({
            datePreset: 'This Month',
            employeeId: 'ALL',
            customerId: 'ALL',
            productId: 'ALL',
            serviceId: 'ALL',
            source: 'ALL',
            status: 'ALL',
          })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showCustomerFilter={true}
        showProductFilter={true}
        showStatusFilter={true}
        statusOptions={['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired']}
        totalRecordsCount={filteredProposals.length}
      />

      {/* 2. Top Summary KPI Cards (Clickable Drill-down) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Accepted Commercial Sales',
              subtitle: 'Proposals marked as Accepted by customers',
              data: salesMetrics.acceptedProps,
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Sales Value</span>
            <DollarSign className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {formatINR(salesMetrics.totalSalesValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            <strong>{salesMetrics.acceptedCount}</strong> accepted orders • Click to drill down
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Invoiced Value',
              subtitle: 'Invoices issued within the selected period',
              data: filteredInvoices,
              columns: invoiceColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Invoiced Value</span>
            <TrendingUp className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-blue-700 font-mono mt-1">
            {formatINR(salesMetrics.totalInvoicedValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            Collected: <strong className="text-emerald-600">{formatINR(salesMetrics.totalCollectedValue)}</strong>
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Active Sales Pipeline Opportunities',
              subtitle: 'Proposals currently sent, viewed, or under negotiation',
              data: filteredProposals.filter((p) => p.status === 'Sent' || p.status === 'Viewed'),
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Pipeline Value</span>
            <Target className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(salesMetrics.pipelineValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Pending customer decision</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'All Filtered Proposals',
              subtitle: 'Total proposals evaluated in this period',
              data: filteredProposals,
              columns: proposalColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Conversion</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">
            {salesMetrics.conversionRate}%
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            {salesMetrics.acceptedCount} won of {salesMetrics.totalProposalCount} proposals
          </div>
        </div>
      </div>

      {/* 3. Sales Breakdown Mode Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Sales Distribution & Categorical Reports
            </h3>
            <p className="text-xs text-slate-500">
              Select dimensionality to inspect revenue distributions and trends.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'monthly', label: 'Monthly' },
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'quarterly', label: 'Quarterly' },
                { id: 'yearly', label: 'Yearly' },
                { id: 'employee', label: 'By Employee' },
                { id: 'customer', label: 'By Customer' },
                { id: 'product', label: 'By Product' },
                { id: 'service', label: 'By Service' },
                { id: 'source', label: 'By Source' },
                { id: 'status', label: 'By Status' },
              ] as { id: SalesGroupBy; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveGroupBy(mode.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeGroupBy === mode.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Trend Bars (Chart) */}
        <div className="space-y-3">
          {groupedSalesData.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No sales records match the selected date range and filter criteria.
            </div>
          ) : (
            <div className="space-y-2.5">
              {groupedSalesData.slice(0, 10).map((group, idx) => {
                const pct = Math.max(Math.round((group.totalValue / maxGroupValue) * 100), 4);
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setDrillDownState({
                        isOpen: true,
                        title: `Drill-down: ${group.label}`,
                        subtitle: `${group.count} proposal(s) with total ${formatINR(group.totalValue)}`,
                        data: group.items,
                        columns: proposalColumns,
                      })
                    }
                    className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-2xs text-slate-400 font-mono">#{idx + 1}</span>
                        {group.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-semibold text-2xs">
                          {group.count} order(s)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatINR(group.totalValue)}
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Detailed Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Factual Record Register ({filteredProposals.length} Proposals)
          </h4>
          <span className="text-2xs text-slate-400 font-medium">Click any row to view drill-down</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="p-3">Proposal #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Employee</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProposals.slice(0, 25).map((p) => (
                <tr
                  key={p.id}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Proposal ${p.proposalNumber}`,
                      subtitle: `Client: ${p.customerName || p.clientName}`,
                      data: [p],
                      columns: proposalColumns,
                    })
                  }
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-mono font-bold text-blue-700">{p.proposalNumber}</td>
                  <td className="p-3 font-semibold text-slate-900">{p.customerName || p.clientName}</td>
                  <td className="p-3 text-slate-500">{formatDateDisplayIST(p.proposalDate || p.createdAt)}</td>
                  <td className="p-3 text-slate-600">{p.assignedEmployeeName || p.createdByName || '—'}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-2xs font-bold border ${
                        p.status === 'Accepted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p.status === 'Sent' || p.status === 'Viewed'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(p.grandTotal || p.totalAmount || 0)}
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
