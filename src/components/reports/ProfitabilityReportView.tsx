import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, InvoiceRecord, ExpenseRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const ProfitabilityReportView: React.FC = () => {
  const { invoices, payments, expenses, products, services, employees, customers, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    customerId: 'ALL',
    productId: 'ALL',
    serviceId: 'ALL',
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

  // Section 11 rule:
  // "Do not claim profitability where required cost data is missing.
  // If cost information is unavailable, clearly show: 'Cost data unavailable for profitability calculation.'"
  const costDataAvailable = useMemo(() => {
    if (filters.productId && filters.productId !== 'ALL') {
      const prod = products.find((p) => p.id === filters.productId);
      const cost = prod?.purchasePrice ?? (prod as any)?.costPrice;
      return cost !== undefined && cost !== null && Number(cost) > 0;
    }
    if (filters.serviceId && filters.serviceId !== 'ALL') {
      const svc = services.find((s) => s.id === filters.serviceId);
      const cost = (svc as any)?.costPrice;
      return cost !== undefined && cost !== null && Number(cost) > 0;
    }
    // Overall profitability check
    return products.some((p) => (p.purchasePrice || (p as any).costPrice || 0) > 0) || expenses.length > 0;
  }, [products, services, expenses, filters.productId, filters.serviceId]);

  // Scoped datasets
  const scopedInvoices = useMemo(() => {
    if (isAdmin) return invoices;
    return invoices.filter((i) => i.createdBy === userProfile?.uid || i.assignedEmployeeId === userProfile?.uid);
  }, [invoices, isAdmin, userProfile]);

  const scopedExpenses = useMemo(() => {
    if (isAdmin) return expenses;
    return expenses.filter((e) => e.recordedBy === userProfile?.uid);
  }, [expenses, isAdmin, userProfile]);

  // Filtered revenue (Invoices & Payments)
  const filteredInvoices = useMemo(() => {
    return scopedInvoices.filter((i) => {
      if (i.status === 'CANCELLED') return false;
      const dt = i.invoiceDate || i.createdAt || '';
      if (!isWithinDateRange(dt, activeDateRange)) return false;

      if (filters.customerId && filters.customerId !== 'ALL') {
        if (i.customerId !== filters.customerId) return false;
      }
      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (i.createdBy !== filters.employeeId && i.assignedEmployeeId !== filters.employeeId) return false;
      }
      if (filters.productId && filters.productId !== 'ALL') {
        const hasProd = i.items?.some((item) => (item as any).productId === filters.productId);
        if (!hasProd) return false;
      }
      return true;
    });
  }, [scopedInvoices, activeDateRange, filters]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return scopedExpenses.filter((e) => {
      if (e.status === 'REJECTED') return false;
      const dt = e.date || (e as any).expenseDate || e.createdAt || '';
      if (!isWithinDateRange(dt, activeDateRange)) return false;

      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (e.recordedBy !== filters.employeeId) return false;
      }
      return true;
    });
  }, [scopedExpenses, activeDateRange, filters]);

  // Profitability calculations:
  // Revenue = Invoiced / Paid totals
  // Expenses = Actual expenses recorded
  // Net Result = Revenue - Expenses
  const profitabilityMetrics = useMemo(() => {
    const revenue = filteredInvoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    const collectedRevenue = filteredInvoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const netResult = revenue - totalExpenses;
    const netCashMargin = collectedRevenue - totalExpenses;
    const profitMarginPct = revenue > 0 ? ((netResult / revenue) * 100).toFixed(1) : '0.0';

    return {
      revenue,
      collectedRevenue,
      totalExpenses,
      netResult,
      netCashMargin,
      profitMarginPct,
    };
  }, [filteredInvoices, filteredExpenses]);

  const invoiceColumns: DrillDownColumn[] = [
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Date', accessor: 'invoiceDate', format: (val) => formatDateDisplayIST(val) },
    { header: 'Amount (INR)', accessor: 'grandTotal', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  const expenseColumns: DrillDownColumn[] = [
    { header: 'Description', accessor: 'description' },
    { header: 'Category', accessor: 'category' },
    { header: 'Vendor', accessor: 'vendor' },
    { header: 'Date', accessor: 'date', format: (val) => formatDateDisplayIST(val) },
    { header: 'Amount (INR)', accessor: 'amount', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  const handleExportExcel = () => {
    const revenueRows = filteredInvoices.map((i) => ({
      Type: 'Revenue',
      Reference: i.invoiceNumber,
      Entity: i.customerName,
      Date: i.invoiceDate || '',
      Amount: i.grandTotal || 0,
    }));
    const expenseRows = filteredExpenses.map((e) => ({
      Type: 'Expense',
      Reference: e.description,
      Entity: e.vendor || e.category,
      Date: e.date || '',
      Amount: -(e.amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet([...revenueRows, ...expenseRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profitability');
    XLSX.writeFile(wb, `SparkGen_Profitability_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = [
      ...filteredInvoices.map((i) => ({
        Type: 'Revenue',
        Ref: i.invoiceNumber,
        Entity: i.customerName,
        Date: i.invoiceDate || '',
        Amount: i.grandTotal || 0,
      })),
      ...filteredExpenses.map((e) => ({
        Type: 'Expense',
        Ref: e.description,
        Entity: e.vendor || e.category,
        Date: e.date || '',
        Amount: -(e.amount || 0),
      })),
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_Profitability_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = [
      ...filteredInvoices.map((i) => ({
        Type: 'Revenue',
        Ref: i.invoiceNumber,
        Entity: i.customerName,
        Date: i.invoiceDate || '',
        'Amount (INR)': i.grandTotal || 0,
      })),
      ...filteredExpenses.map((e) => ({
        Type: 'Expense',
        Ref: e.description,
        Entity: e.vendor || e.category,
        Date: e.date || '',
        'Amount (INR)': -(e.amount || 0),
      })),
    ];

    const doc = generateReportPdf({
      reportTitle: `Commercial Profitability & Financial Net Margins Audit`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Customer: filters.customerId || 'ALL',
        Employee: filters.employeeId || 'ALL',
      },
      summaryMetrics: [
        { label: 'Revenue', value: formatINR(profitabilityMetrics.revenue) },
        { label: 'Expenses', value: formatINR(profitabilityMetrics.totalExpenses) },
        { label: 'Net Result', value: formatINR(profitabilityMetrics.netResult) },
        { label: 'Net Margin', value: `${profitabilityMetrics.profitMarginPct}%` },
      ],
      columns: [
        { header: 'Type', dataKey: 'Type', align: 'center' },
        { header: 'Reference', dataKey: 'Ref' },
        { header: 'Party / Category', dataKey: 'Entity' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Amount (INR)', dataKey: 'Amount (INR)', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_Profitability_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({ datePreset: 'This Month', employeeId: 'ALL', customerId: 'ALL', productId: 'ALL', serviceId: 'ALL' })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showCustomerFilter={true}
        showEmployeeFilter={true}
        showProductFilter={true}
        totalRecordsCount={filteredInvoices.length + filteredExpenses.length}
      />

      {/* Mandatory Section 11 Warning when cost data is missing */}
      {!costDataAvailable && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="font-bold block">Cost data unavailable for profitability calculation.</strong>
            <span>
              Direct cost/purchase price has not been specified for this selection. Profitability reflects invoice revenue minus recorded operational expenses.
            </span>
          </div>
        </div>
      )}

      {/* Three Primary Cards: Revenue, Expenses, Net Result */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Recognized Invoiced Revenue',
              subtitle: 'Active invoices generated in period',
              data: filteredInvoices,
              columns: invoiceColumns,
            })
          }
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Gross Revenue</span>
            <DollarSign className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono mt-1.5">
            {formatINR(profitabilityMetrics.revenue)}
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Cash Collected: <strong className="text-emerald-700">{formatINR(profitabilityMetrics.collectedRevenue)}</strong>
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Operating Expenses',
              subtitle: 'Recorded vouchers and vendor outflows',
              data: filteredExpenses,
              columns: expenseColumns,
            })
          }
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Operating Expenses</span>
            <TrendingDown className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1.5">
            {formatINR(profitabilityMetrics.totalExpenses)}
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            {filteredExpenses.length} recognized expense vouchers
          </div>
        </div>

        <div
          className={`bg-white p-5 rounded-2xl border shadow-2xs ${
            profitabilityMetrics.netResult >= 0 ? 'border-emerald-300' : 'border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Net Commercial Result</span>
            <TrendingUp className={`w-5 h-5 ${profitabilityMetrics.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          <div
            className={`text-2xl font-black font-mono mt-1.5 ${
              profitabilityMetrics.netResult >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatINR(profitabilityMetrics.netResult)}
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Margin: <strong className="font-bold">{profitabilityMetrics.profitMarginPct}%</strong> (Revenue - Expenses)
          </div>
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
