import React, { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, InvoiceRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const InvoicesReportView: React.FC = () => {
  const { invoices, employees, customers, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    customerId: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'status' | 'customer' | 'employee' | 'date'>('status');

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

  const scopedInvoices = useMemo(() => {
    if (isAdmin) return invoices;
    return invoices.filter(
      (i) => i.createdBy === userProfile?.uid || i.assignedEmployeeId === userProfile?.uid
    );
  }, [invoices, isAdmin, userProfile]);

  const filteredInvoices = useMemo(() => {
    return scopedInvoices.filter((i) => {
      const dt = i.invoiceDate || i.createdAt || '';
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

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (i.invoiceNumber || '').toLowerCase().includes(q) ||
          (i.customerName || '').toLowerCase().includes(q) ||
          (i.notes || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedInvoices, activeDateRange, filters, searchQuery]);

  // Section 8 specifications:
  // Show: Total Invoices, Draft, Sent, Partially Paid, Paid, Overdue, Cancelled
  // Metrics: Total Invoice Value, Paid Amount, Pending Amount, Overdue Amount
  const invoiceMetrics = useMemo(() => {
    let draftCount = 0;
    let sentCount = 0;
    let partiallyPaidCount = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let cancelledCount = 0;

    let totalValue = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    filteredInvoices.forEach((i) => {
      const gTotal = Number(i.grandTotal || 0);
      const paid = Number(i.paidAmount || 0);
      const balance = i.balanceAmount !== undefined ? Number(i.balanceAmount) : Math.max(0, gTotal - paid);

      totalValue += gTotal;
      paidAmount += paid;

      const isOverdue =
        i.dueDate && i.dueDate < todayStr && i.status !== 'PAID' && i.status !== 'CANCELLED' && balance > 0;

      if (isOverdue) {
        overdueCount++;
        overdueAmount += balance;
      }

      const st = i.status;
      if (st === 'DRAFT') {
        draftCount++;
      } else if (st === 'SENT') {
        sentCount++;
        pendingAmount += balance;
      } else if (st === 'PARTIALLY_PAID') {
        partiallyPaidCount++;
        pendingAmount += balance;
      } else if (st === 'PAID') {
        paidCount++;
      } else if (st === 'CANCELLED') {
        cancelledCount++;
      } else if (st === 'OVERDUE') {
        pendingAmount += balance;
      }
    });

    return {
      totalCount: filteredInvoices.length,
      draftCount,
      sentCount,
      partiallyPaidCount,
      paidCount,
      overdueCount,
      cancelledCount,
      totalValue,
      paidAmount,
      pendingAmount: Math.max(0, pendingAmount),
      overdueAmount: Math.max(0, overdueAmount),
    };
  }, [filteredInvoices, todayStr]);

  const invoiceColumns: DrillDownColumn[] = [
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Date', accessor: 'invoiceDate', format: (val, row) => formatDateDisplayIST(val || row.createdAt) },
    { header: 'Due Date', accessor: 'dueDate', format: (val) => val ? formatDateDisplayIST(val) : '—' },
    { header: 'Status', accessor: 'status' },
    { header: 'Grand Total (INR)', accessor: 'grandTotal', align: 'right', format: (val) => formatINR(val || 0) },
    { header: 'Paid (INR)', accessor: 'paidAmount', align: 'right', format: (val) => formatINR(val || 0) },
    { header: 'Balance (INR)', accessor: 'balanceAmount', align: 'right', format: (val, row) => formatINR(val !== undefined ? val : row.grandTotal - (row.paidAmount || 0)) },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalValue: number; items: InvoiceRecord[] }>();

    filteredInvoices.forEach((i) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'status') {
        key = i.status || 'DRAFT';
        label = key;
      } else if (groupBy === 'customer') {
        key = i.customerName || 'Customer';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((e) => e.uid === i.createdBy || e.uid === i.assignedEmployeeId);
        key = emp ? emp.name || emp.email : 'Billing Desk';
        label = key;
      } else if (groupBy === 'date') {
        key = (i.invoiceDate || i.createdAt || '').substring(0, 10);
        label = key ? formatDateDisplayIST(key) : 'Unknown Date';
      }

      const existing = map.get(key) || { label, count: 0, totalValue: 0, items: [] };
      existing.count += 1;
      existing.totalValue += Number(i.grandTotal || 0);
      existing.items.push(i);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredInvoices, groupBy, employees]);

  const maxValue = useMemo(() => Math.max(...groupedData.map((d) => d.totalValue), 1), [groupedData]);

  const handleExportExcel = () => {
    const rows = filteredInvoices.map((i) => ({
      'Invoice #': i.invoiceNumber,
      Customer: i.customerName,
      Date: i.invoiceDate || '',
      'Due Date': i.dueDate || '',
      Status: i.status,
      'Grand Total': i.grandTotal || 0,
      Paid: i.paidAmount || 0,
      Balance: i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0)),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices_Report');
    XLSX.writeFile(wb, `SparkGen_InvoicesReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredInvoices.map((i) => ({
      'Invoice #': i.invoiceNumber,
      Customer: i.customerName,
      Date: i.invoiceDate || '',
      'Due Date': i.dueDate || '',
      Status: i.status,
      'Grand Total': i.grandTotal || 0,
      Paid: i.paidAmount || 0,
      Balance: i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0)),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_InvoicesReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredInvoices.map((i) => ({
      'Invoice #': i.invoiceNumber,
      Customer: i.customerName,
      Date: i.invoiceDate || '',
      Status: i.status,
      'Total (INR)': i.grandTotal || 0,
      'Paid (INR)': i.paidAmount || 0,
    }));

    const doc = generateReportPdf({
      reportTitle: `Enterprise Invoicing & Commercial Billing Report`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Customer: filters.customerId || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Total Invoiced', value: formatINR(invoiceMetrics.totalValue) },
        { label: 'Total Collected', value: formatINR(invoiceMetrics.paidAmount) },
        { label: 'Pending Balance', value: formatINR(invoiceMetrics.pendingAmount) },
        { label: 'Overdue Amount', value: formatINR(invoiceMetrics.overdueAmount) },
      ],
      columns: [
        { header: 'Invoice #', dataKey: 'Invoice #' },
        { header: 'Customer', dataKey: 'Customer' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Total (INR)', dataKey: 'Total (INR)', align: 'right' },
        { header: 'Paid (INR)', dataKey: 'Paid (INR)', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_InvoicesReport_${Date.now()}.pdf`);
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
        showCustomerFilter={true}
        showEmployeeFilter={true}
        showStatusFilter={true}
        statusOptions={['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']}
        totalRecordsCount={filteredInvoices.length}
      />

      {/* Top Value Cards (Section 8 requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Invoiced Portfolio',
              subtitle: 'All invoices in active filter',
              data: filteredInvoices,
              columns: invoiceColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Total Invoice Value</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(invoiceMetrics.totalValue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">{invoiceMetrics.totalCount} invoices total</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Paid / Collected Invoices',
              subtitle: 'Invoices with status PAID or payments applied',
              data: filteredInvoices.filter((i) => (i.paidAmount || 0) > 0),
              columns: invoiceColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Paid Amount</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {formatINR(invoiceMetrics.paidAmount)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">{invoiceMetrics.paidCount} fully settled</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Pending Receivables Balance',
              subtitle: 'Unpaid and partially paid active balances',
              data: filteredInvoices.filter((i) => i.status === 'SENT' || i.status === 'PARTIALLY_PAID'),
              columns: invoiceColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Pending Amount</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono mt-1">
            {formatINR(invoiceMetrics.pendingAmount)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Awaiting customer clearance</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Overdue Invoices',
              subtitle: 'Past due date with open balances',
              data: filteredInvoices.filter((i) => {
                const bal = i.balanceAmount ?? (i.grandTotal - (i.paidAmount || 0));
                return i.dueDate && i.dueDate < todayStr && i.status !== 'PAID' && i.status !== 'CANCELLED' && bal > 0;
              }),
              columns: invoiceColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Overdue Amount</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-700 font-mono mt-1">
            {formatINR(invoiceMetrics.overdueAmount)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">{invoiceMetrics.overdueCount} overdue invoices</div>
        </div>
      </div>

      {/* Invoice Status Distribution Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <span className="text-2xs text-slate-400 font-bold uppercase">Draft</span>
          <div className="text-lg font-black text-slate-700 mt-0.5">{invoiceMetrics.draftCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <span className="text-2xs text-blue-500 font-bold uppercase">Sent</span>
          <div className="text-lg font-black text-blue-700 mt-0.5">{invoiceMetrics.sentCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <span className="text-2xs text-amber-500 font-bold uppercase">Partially Paid</span>
          <div className="text-lg font-black text-amber-700 mt-0.5">{invoiceMetrics.partiallyPaidCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <span className="text-2xs text-emerald-600 font-bold uppercase">Paid</span>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{invoiceMetrics.paidCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <span className="text-2xs text-rose-600 font-bold uppercase">Overdue</span>
          <div className="text-lg font-black text-rose-700 mt-0.5">{invoiceMetrics.overdueCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <span className="text-2xs text-slate-400 font-bold uppercase">Cancelled</span>
          <div className="text-lg font-black text-slate-700 mt-0.5">{invoiceMetrics.cancelledCount}</div>
        </div>
      </div>

      {/* Breakdown by Dimension */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Invoice Value Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown by Status, Customer, Employee, or Date. Click any row to drill down.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'status', label: 'By Status' },
                { id: 'customer', label: 'By Customer' },
                { id: 'employee', label: 'By Employee' },
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
            <div className="py-8 text-center text-slate-400 text-xs">No invoice records found.</div>
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
                      subtitle: `${item.count} invoices, total ${formatINR(item.totalValue)}`,
                      data: item.items,
                      columns: invoiceColumns,
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
                      <span className="text-slate-500 font-semibold">{item.count} invoices</span>
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
