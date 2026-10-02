import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  Layers,
  Users,
  Building,
  Calendar,
  BarChart2,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, ExpenseRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const ExpensesReportView: React.FC = () => {
  const { expenses, expenseCategories, employees, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    category: 'ALL',
    employeeId: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'category' | 'vendor' | 'employee' | 'method' | 'monthly'>('category');

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

  const currentMonthPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const scopedExpenses = useMemo(() => {
    if (isAdmin) return expenses;
    return expenses.filter(
      (e) => e.recordedBy === userProfile?.uid || (e as any).employeeId === userProfile?.uid
    );
  }, [expenses, isAdmin, userProfile]);

  const filteredExpenses = useMemo(() => {
    return scopedExpenses.filter((e) => {
      // Typically Approved or Paid expenses are official company expenditure
      if (filters.status && filters.status !== 'ALL') {
        if (e.status !== filters.status) return false;
      }

      const eDate = e.date || (e as any).expenseDate || e.createdAt || '';
      if (!isWithinDateRange(eDate, activeDateRange)) return false;

      if (filters.category && filters.category !== 'ALL') {
        if (e.category !== filters.category && e.categoryId !== filters.category) return false;
      }
      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (e.recordedBy !== filters.employeeId && (e as any).employeeId !== filters.employeeId) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (e.description || '').toLowerCase().includes(q) ||
          (e.vendor || '').toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedExpenses, activeDateRange, filters, searchQuery]);

  // Section 10 specs:
  // Show: Total Expenses, Monthly Expenses, Expense Category, Vendor, Employee, Payment Method
  const expenseMetrics = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthlyExpenses = scopedExpenses
      .filter((e) => (e.date || e.createdAt || '').startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const paidExpenses = filteredExpenses
      .filter((e) => e.status === 'PAID')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const pendingApprovalExpenses = filteredExpenses
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      totalExpenses,
      monthlyExpenses,
      paidExpenses,
      pendingApprovalExpenses,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses, scopedExpenses, currentMonthPrefix]);

  const expenseColumns: DrillDownColumn[] = [
    { header: 'Description', accessor: 'description' },
    { header: 'Category', accessor: 'category' },
    { header: 'Vendor', accessor: 'vendor', format: (val) => val || '—' },
    { header: 'Date', accessor: 'date', format: (val, row) => formatDateDisplayIST(val || row.createdAt) },
    { header: 'Payment Method', accessor: 'paymentMethod', format: (val) => val || 'Bank Transfer' },
    { header: 'Status', accessor: 'status' },
    { header: 'Amount (INR)', accessor: 'amount', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalAmount: number; items: ExpenseRecord[] }>();

    filteredExpenses.forEach((e) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'category') {
        key = e.category || 'General';
        label = key;
      } else if (groupBy === 'vendor') {
        key = e.vendor || 'Direct / Miscellaneous';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((em) => em.uid === e.recordedBy || em.uid === (e as any).employeeId);
        key = emp ? emp.name || emp.email : (e as any).recordedByName || 'Staff';
        label = key;
      } else if (groupBy === 'method') {
        key = e.paymentMethod || 'Bank';
        label = key;
      } else if (groupBy === 'monthly') {
        key = (e.date || e.createdAt || '').substring(0, 7);
        label = key || 'Unknown Month';
      }

      const existing = map.get(key) || { label, count: 0, totalAmount: 0, items: [] };
      existing.count += 1;
      existing.totalAmount += Number(e.amount) || 0;
      existing.items.push(e);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredExpenses, groupBy, employees]);

  const maxAmount = useMemo(() => Math.max(...groupedData.map((d) => d.totalAmount), 1), [groupedData]);

  const handleExportExcel = () => {
    const rows = filteredExpenses.map((e) => ({
      Description: e.description,
      Category: e.category,
      Vendor: e.vendor || '',
      Amount: e.amount || 0,
      Date: e.date || '',
      Status: e.status,
      Method: e.paymentMethod || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expense_Report');
    XLSX.writeFile(wb, `SparkGen_ExpenseReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredExpenses.map((e) => ({
      Description: e.description,
      Category: e.category,
      Vendor: e.vendor || '',
      Amount: e.amount || 0,
      Date: e.date || '',
      Status: e.status,
      Method: e.paymentMethod || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_ExpenseReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredExpenses.map((e) => ({
      Description: e.description,
      Category: e.category,
      Vendor: e.vendor || '—',
      Date: e.date || '',
      Status: e.status,
      Amount: e.amount || 0,
    }));

    const doc = generateReportPdf({
      reportTitle: `Operational & Administrative Expenditure Audit`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Category: filters.category || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Total Expenses', value: formatINR(expenseMetrics.totalExpenses) },
        { label: 'This Month', value: formatINR(expenseMetrics.monthlyExpenses) },
        { label: 'Paid Out', value: formatINR(expenseMetrics.paidExpenses) },
      ],
      columns: [
        { header: 'Description', dataKey: 'Description' },
        { header: 'Category', dataKey: 'Category' },
        { header: 'Vendor', dataKey: 'Vendor' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Amount (INR)', dataKey: 'Amount', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_ExpenseReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({ datePreset: 'This Month', category: 'ALL', employeeId: 'ALL', status: 'ALL' })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showCategoryFilter={true}
        showEmployeeFilter={true}
        showStatusFilter={true}
        statusOptions={['APPROVED', 'PAID', 'PENDING', 'REJECTED']}
        totalRecordsCount={filteredExpenses.length}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Period Expenses',
              subtitle: 'All expenses incurred in active date range',
              data: filteredExpenses,
              columns: expenseColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Period Outflow</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">
            {formatINR(expenseMetrics.totalExpenses)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">{expenseMetrics.count} recorded vouchers</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'This Month Expenses',
              subtitle: `Month ${currentMonthPrefix}`,
              data: scopedExpenses.filter((e) => (e.date || e.createdAt || '').startsWith(currentMonthPrefix)),
              columns: expenseColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">This Month Expenses</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {formatINR(expenseMetrics.monthlyExpenses)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Current fiscal month spending</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Paid Expenses',
              subtitle: 'Vouchers already paid out',
              data: filteredExpenses.filter((e) => e.status === 'PAID'),
              columns: expenseColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Settled (Paid)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {formatINR(expenseMetrics.paidExpenses)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Disbursed cash outflow</div>
        </div>
      </div>

      {/* Breakdown by Category, Vendor, Employee, Method, Monthly */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-rose-600" />
              Expense Distribution & Charts
            </h3>
            <p className="text-xs text-slate-500">
              Charts for Expense Trend, Category Distribution, and Vendor Expenses.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'category', label: 'By Category' },
                { id: 'vendor', label: 'By Vendor' },
                { id: 'employee', label: 'By Employee' },
                { id: 'method', label: 'By Method' },
                { id: 'monthly', label: 'Monthly Trend' },
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
            <div className="py-8 text-center text-slate-400 text-xs">No expenses recorded for this filter.</div>
          ) : (
            groupedData.map((item, idx) => {
              const pct = Math.max(Math.round((item.totalAmount / maxAmount) * 100), 4);
              return (
                <div
                  key={idx}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Drill-down: ${item.label}`,
                      subtitle: `${item.count} expense vouchers totaling ${formatINR(item.totalAmount)}`,
                      data: item.items,
                      columns: expenseColumns,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-2xs text-slate-400 font-mono">#{idx + 1}</span>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500 font-semibold">{item.count} items</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(item.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
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
