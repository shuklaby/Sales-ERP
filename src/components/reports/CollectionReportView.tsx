import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Building,
  Users,
  Calendar,
  CheckCircle2,
  BarChart2,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, PaymentRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const CollectionReportView: React.FC = () => {
  const { payments, invoices, employees, customers, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    customerId: 'ALL',
    paymentMethod: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'method' | 'employee' | 'customer' | 'date'>('method');

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
  const currentMonthPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const scopedPayments = useMemo(() => {
    if (isAdmin) return payments;
    return payments.filter(
      (p) => p.recordedBy === userProfile?.uid || (p as any).assignedEmployeeId === userProfile?.uid
    );
  }, [payments, isAdmin, userProfile]);

  const filteredPayments = useMemo(() => {
    return scopedPayments.filter((p) => {
      // Only factual COMPLETED payments represent collected money
      if (p.status !== 'COMPLETED') return false;

      const pDate = p.paymentDate || p.createdAt || '';
      if (!isWithinDateRange(pDate, activeDateRange)) return false;

      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (p.recordedBy !== filters.employeeId && (p as any).assignedEmployeeId !== filters.employeeId) {
          return false;
        }
      }
      if (filters.customerId && filters.customerId !== 'ALL') {
        if (p.customerId !== filters.customerId) return false;
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
        if (p.paymentMethod !== filters.paymentMethod) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (p.paymentNumber || '').toLowerCase().includes(q) ||
          (p.customerName || '').toLowerCase().includes(q) ||
          (p.transactionReference || '').toLowerCase().includes(q) ||
          (p.invoiceNumber || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedPayments, activeDateRange, filters, searchQuery]);

  // Section 9 specifications:
  // Show: Total Collection, Today's Collection, Monthly Collection, Employee Collection, Customer Collection
  // Breakdown: Payment Gateway, Bank Transfer, UPI, Cash
  const collectionMetrics = useMemo(() => {
    const totalCollection = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const todayCollection = scopedPayments
      .filter((p) => p.status === 'COMPLETED' && (p.paymentDate || p.createdAt || '').startsWith(todayStr))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const monthCollection = scopedPayments
      .filter((p) => p.status === 'COMPLETED' && (p.paymentDate || p.createdAt || '').startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let gatewayTotal = 0;
    let bankTransferTotal = 0;
    let upiTotal = 0;
    let cashTotal = 0;
    let otherTotal = 0;

    filteredPayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      const m = (p.paymentMethod || '').toUpperCase();
      if (m.includes('GATEWAY') || m.includes('ONLINE') || m.includes('RAZORPAY') || m.includes('STRIPE')) {
        gatewayTotal += amt;
      } else if (m.includes('BANK') || m.includes('NEFT') || m.includes('RTGS') || m.includes('IMPS')) {
        bankTransferTotal += amt;
      } else if (m.includes('UPI')) {
        upiTotal += amt;
      } else if (m.includes('CASH')) {
        cashTotal += amt;
      } else {
        otherTotal += amt;
      }
    });

    return {
      totalCollection,
      todayCollection,
      monthCollection,
      gatewayTotal,
      bankTransferTotal,
      upiTotal,
      cashTotal,
      otherTotal,
      transactionCount: filteredPayments.length,
    };
  }, [filteredPayments, scopedPayments, todayStr, currentMonthPrefix]);

  const paymentColumns: DrillDownColumn[] = [
    { header: 'Payment #', accessor: 'paymentNumber' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Method', accessor: 'paymentMethod' },
    { header: 'Reference', accessor: 'transactionReference', format: (val) => val || '—' },
    { header: 'Date', accessor: 'paymentDate', format: (val, row) => formatDateDisplayIST(val || row.createdAt) },
    { header: 'Amount (INR)', accessor: 'amount', align: 'right', format: (val) => formatINR(val || 0) },
  ];

  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalAmount: number; items: PaymentRecord[] }>();

    filteredPayments.forEach((p) => {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'method') {
        key = p.paymentMethod || 'Other';
        label = key;
      } else if (groupBy === 'employee') {
        const emp = employees.find((e) => e.uid === p.recordedBy || e.uid === (p as any).assignedEmployeeId);
        key = emp ? emp.name || emp.email : p.recordedByName || 'Finance Desk';
        label = key;
      } else if (groupBy === 'customer') {
        key = p.customerName || 'Customer';
        label = key;
      } else if (groupBy === 'date') {
        key = (p.paymentDate || p.createdAt || '').substring(0, 10);
        label = key ? formatDateDisplayIST(key) : 'Unknown Date';
      }

      const existing = map.get(key) || { label, count: 0, totalAmount: 0, items: [] };
      existing.count += 1;
      existing.totalAmount += Number(p.amount) || 0;
      existing.items.push(p);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPayments, groupBy, employees]);

  const maxAmount = useMemo(() => Math.max(...groupedData.map((d) => d.totalAmount), 1), [groupedData]);

  const handleExportExcel = () => {
    const rows = filteredPayments.map((p) => ({
      'Payment #': p.paymentNumber,
      Customer: p.customerName,
      'Invoice #': p.invoiceNumber,
      Method: p.paymentMethod,
      Reference: p.transactionReference || '',
      Amount: p.amount || 0,
      Date: p.paymentDate || p.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collection_Report');
    XLSX.writeFile(wb, `SparkGen_CollectionReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredPayments.map((p) => ({
      'Payment #': p.paymentNumber,
      Customer: p.customerName,
      'Invoice #': p.invoiceNumber,
      Method: p.paymentMethod,
      Reference: p.transactionReference || '',
      Amount: p.amount || 0,
      Date: p.paymentDate || p.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_CollectionReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredPayments.map((p) => ({
      'Payment #': p.paymentNumber,
      Customer: p.customerName,
      'Invoice #': p.invoiceNumber,
      Method: p.paymentMethod,
      Reference: p.transactionReference || '—',
      Amount: p.amount || 0,
    }));

    const doc = generateReportPdf({
      reportTitle: `Cash Inflow & Revenue Collection Audit`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Customer: filters.customerId || 'ALL',
        Method: filters.paymentMethod || 'ALL',
      },
      summaryMetrics: [
        { label: 'Total Inflow', value: formatINR(collectionMetrics.totalCollection) },
        { label: "Today's Collection", value: formatINR(collectionMetrics.todayCollection) },
        { label: 'This Month', value: formatINR(collectionMetrics.monthCollection) },
        { label: 'Bank / UPI', value: formatINR(collectionMetrics.bankTransferTotal + collectionMetrics.upiTotal) },
      ],
      columns: [
        { header: 'Payment #', dataKey: 'Payment #' },
        { header: 'Customer', dataKey: 'Customer' },
        { header: 'Invoice #', dataKey: 'Invoice #' },
        { header: 'Method', dataKey: 'Method', align: 'center' },
        { header: 'Reference', dataKey: 'Reference' },
        { header: 'Amount (INR)', dataKey: 'Amount', align: 'right' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_CollectionReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({ datePreset: 'This Month', employeeId: 'ALL', customerId: 'ALL', paymentMethod: 'ALL' })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showCustomerFilter={true}
        showEmployeeFilter={true}
        showPaymentMethodFilter={true}
        totalRecordsCount={filteredPayments.length}
      />

      {/* Primary Collection KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Filtered Collection',
              subtitle: 'Completed payment receipts in active range',
              data: filteredPayments,
              columns: paymentColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Period Collection</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {formatINR(collectionMetrics.totalCollection)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            <strong>{collectionMetrics.transactionCount}</strong> transactions completed
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: "Today's Inflow Transactions",
              subtitle: `Cleared on ${todayStr}`,
              data: scopedPayments.filter((p) => p.status === 'COMPLETED' && (p.paymentDate || p.createdAt || '').startsWith(todayStr)),
              columns: paymentColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Today's Collection</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono mt-1">
            {formatINR(collectionMetrics.todayCollection)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Immediate 24hr liquidity</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'This Month Total Collection',
              subtitle: `All receipts for month ${currentMonthPrefix}`,
              data: scopedPayments.filter((p) => p.status === 'COMPLETED' && (p.paymentDate || p.createdAt || '').startsWith(currentMonthPrefix)),
              columns: paymentColumns,
            })
          }
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Monthly Collection</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-1">
            {formatINR(collectionMetrics.monthCollection)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Current fiscal month performance</div>
        </div>
      </div>

      {/* Payment Channel Breakdown (Section 9 specs: Payment Gateway, Bank Transfer, UPI, Cash) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Payment Gateway Receipts',
              subtitle: 'Online card, gateway & checkout receipts',
              data: filteredPayments.filter((p) => {
                const m = (p.paymentMethod || '').toUpperCase();
                return m.includes('GATEWAY') || m.includes('ONLINE') || m.includes('RAZORPAY') || m.includes('STRIPE');
              }),
              columns: paymentColumns,
            })
          }
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer"
        >
          <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Payment Gateway</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {formatINR(collectionMetrics.gatewayTotal)}
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Bank Transfer Receipts',
              subtitle: 'NEFT, RTGS, IMPS bank remittances',
              data: filteredPayments.filter((p) => {
                const m = (p.paymentMethod || '').toUpperCase();
                return m.includes('BANK') || m.includes('NEFT') || m.includes('RTGS') || m.includes('IMPS');
              }),
              columns: paymentColumns,
            })
          }
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer"
        >
          <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Bank Transfer</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {formatINR(collectionMetrics.bankTransferTotal)}
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'UPI Receipts',
              subtitle: 'Instant UPI QR/VPA collections',
              data: filteredPayments.filter((p) => (p.paymentMethod || '').toUpperCase().includes('UPI')),
              columns: paymentColumns,
            })
          }
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer"
        >
          <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">UPI</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {formatINR(collectionMetrics.upiTotal)}
          </div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Cash Receipts',
              subtitle: 'Physical cash settlements',
              data: filteredPayments.filter((p) => (p.paymentMethod || '').toUpperCase().includes('CASH')),
              columns: paymentColumns,
            })
          }
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer"
        >
          <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Cash</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {formatINR(collectionMetrics.cashTotal)}
          </div>
        </div>
      </div>

      {/* Breakdown by Dimension */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Collection Dimensions & Ranking
            </h3>
            <p className="text-xs text-slate-500">
              Only displaying real factual completed payment records.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'method', label: 'By Method' },
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
            <div className="py-8 text-center text-slate-400 text-xs">No payment records found.</div>
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
                      subtitle: `${item.count} payment transactions totaling ${formatINR(item.totalAmount)}`,
                      data: item.items,
                      columns: paymentColumns,
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
                      <span className="text-slate-500 font-semibold">{item.count} receipts</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(item.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full"
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
