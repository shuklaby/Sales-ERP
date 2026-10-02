import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  FileText,
  CreditCard,
  Clock,
  Ban,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getAgingBucket, calculateDaysOverdue, roundTo2 } from '../../utils/financeUtils';

export const FinanceReportsView: React.FC = () => {
  const { invoices, payments, receipts, creditNotes, customers } = useCrmData();
  const { hasPermission, isAdmin } = useAuth();

  const [activeReport, setActiveReport] = useState<
    'invoices' | 'payments' | 'outstanding' | 'receipts' | 'aging' | 'cancelled' | 'creditNotes'
  >('invoices');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');

  // Reports data
  const reportData = useMemo(() => {
    const isWithinRange = (dateStr?: string) => {
      if (!dateStr) return true;
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    };

    if (activeReport === 'invoices') {
      return invoices
        .filter((inv) => {
          if (!isWithinRange(inv.invoiceDate)) return false;
          if (customerFilter !== 'all' && inv.customerId !== customerFilter) return false;
          return true;
        })
        .map((inv) => ({
          'Invoice Number': inv.invoiceNumber,
          Customer: inv.customerSnapshot?.companyName || 'N/A',
          'Invoice Date': inv.invoiceDate,
          'Due Date': inv.dueDate,
          Subtotal: inv.subtotal,
          Discount: inv.discount,
          Tax: inv.tax,
          'Grand Total': inv.grandTotal,
          'Paid Amount': inv.paidAmount,
          Outstanding: inv.outstandingAmount,
          Status: inv.status,
          CreatedBy: inv.createdByName,
        }));
    }

    if (activeReport === 'payments') {
      return payments
        .filter((p) => {
          if (!isWithinRange(p.paymentDate)) return false;
          if (customerFilter !== 'all' && p.customerId !== customerFilter) return false;
          return true;
        })
        .map((p) => ({
          'Payment Ref': p.paymentNumber || p.paymentId,
          Customer: p.customerName,
          'Invoice Number': p.invoiceNumber,
          Date: p.paymentDate,
          Method: p.paymentMethod,
          'UTR / Ref': p.transactionReference,
          Amount: p.amount,
          Status: p.status,
          'Recorded By': p.recordedByName,
        }));
    }

    if (activeReport === 'outstanding') {
      return invoices
        .filter((inv) => {
          if (inv.status === 'Cancelled' || inv.status === 'Paid') return false;
          if (inv.outstandingAmount <= 0) return false;
          if (customerFilter !== 'all' && inv.customerId !== customerFilter) return false;
          return true;
        })
        .map((inv) => ({
          'Invoice Number': inv.invoiceNumber,
          Customer: inv.customerSnapshot?.companyName || 'N/A',
          'Due Date': inv.dueDate,
          'Days Overdue': calculateDaysOverdue(inv.dueDate),
          'Aging Bucket': getAgingBucket(inv.dueDate),
          'Invoice Total': inv.grandTotal,
          'Paid Amount': inv.paidAmount,
          Outstanding: inv.outstandingAmount,
          Status: inv.status,
        }));
    }

    if (activeReport === 'receipts') {
      return receipts
        .filter((r) => {
          if (!isWithinRange(r.paymentDate)) return false;
          if (customerFilter !== 'all' && r.customerId !== customerFilter) return false;
          return true;
        })
        .map((r) => ({
          'Receipt Number': r.receiptNumber,
          Customer: r.customerSnapshot?.companyName || 'N/A',
          'Invoice Number': r.invoiceNumber,
          Date: r.paymentDate,
          Channel: r.paymentMethod,
          'UTR / Reference': r.referenceNumber,
          Amount: r.amount,
          'Amount In Words': r.amountInWords,
        }));
    }

    if (activeReport === 'aging') {
      const buckets: Record<string, { count: number; total: number }> = {
        Current: { count: 0, total: 0 },
        '1-30 Days': { count: 0, total: 0 },
        '31-60 Days': { count: 0, total: 0 },
        '61-90 Days': { count: 0, total: 0 },
        '90+ Days': { count: 0, total: 0 },
      };

      invoices.forEach((inv) => {
        if (inv.status === 'Cancelled' || inv.status === 'Paid') return;
        if (!inv.outstandingAmount || inv.outstandingAmount <= 0) return;
        if (customerFilter !== 'all' && inv.customerId !== customerFilter) return false;

        const bucket = getAgingBucket(inv.dueDate);
        if (buckets[bucket]) {
          buckets[bucket].count += 1;
          buckets[bucket].total = roundTo2(buckets[bucket].total + inv.outstandingAmount);
        }
      });

      return Object.entries(buckets).map(([bucket, d]) => ({
        'Aging Category': bucket,
        'Invoice Count': d.count,
        'Outstanding Receivables (INR)': d.total,
      }));
    }

    if (activeReport === 'cancelled') {
      return invoices
        .filter((inv) => inv.status === 'Cancelled')
        .map((inv) => ({
          'Invoice Number': inv.invoiceNumber,
          Customer: inv.customerSnapshot?.companyName || 'N/A',
          'Grand Total': inv.grandTotal,
          'Cancelled At': inv.cancelledAt || 'N/A',
          'Cancelled By': inv.cancelledByName || 'N/A',
          'Cancellation Reason': inv.cancellationReason || 'N/A',
        }));
    }

    if (activeReport === 'creditNotes') {
      return creditNotes
        .filter((cn) => {
          if (!isWithinRange(cn.date)) return false;
          if (customerFilter !== 'all' && cn.customerId !== customerFilter) return false;
          return true;
        })
        .map((cn) => ({
          'Credit Note #': cn.creditNoteNumber,
          Customer: cn.customerName,
          'Invoice Number': cn.invoiceNumber,
          Date: cn.date,
          Amount: cn.amount,
          Reason: cn.reason,
          Status: cn.status,
          'Created By': cn.createdByName,
        }));
    }

    return [];
  }, [invoices, payments, receipts, creditNotes, activeReport, startDate, endDate, customerFilter]);

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(reportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Finance_Report_${activeReport}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeReport);
    XLSX.writeFile(wb, `Finance_Report_${activeReport}.xlsx`);
  };

  const reportTabs = [
    { id: 'invoices', label: 'Invoice Report', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'payments', label: 'Payment Report', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'outstanding', label: 'Outstanding Report', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'receipts', label: 'Receipt Report', icon: <FileCheck className="w-3.5 h-3.5" /> },
    { id: 'aging', label: 'Aging Report', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'cancelled', label: 'Cancelled Invoices', icon: <Ban className="w-3.5 h-3.5" /> },
    { id: 'creditNotes', label: 'Credit Notes', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Reports & MIS</h2>
          <p className="text-xs text-slate-400">
            Real-time multi-dimensional reports, aging analysis, and Excel/CSV data exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={reportData.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={reportData.length === 0}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shadow"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        {reportTabs.map((tab) => {
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter strip */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Filter by Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto max-h-[550px]">
          {reportData.length === 0 ? (
            <div className="py-16 text-center text-slate-500 italic text-xs">
              No matching records for the selected report filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 sticky top-0 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                <tr>
                  {Object.keys(reportData[0] || {}).map((col) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    {Object.entries(row).map(([key, val], cellIdx) => {
                      const isNumeric =
                        typeof val === 'number' ||
                        key.includes('Amount') ||
                        key.includes('Total') ||
                        key.includes('Outstanding');

                      return (
                        <td
                          key={cellIdx}
                          className={`py-3 px-4 whitespace-nowrap ${
                            isNumeric && typeof val === 'number' ? 'font-mono text-slate-200' : ''
                          }`}
                        >
                          {typeof val === 'number' &&
                          (key.includes('Total') ||
                            key.includes('Amount') ||
                            key.includes('Outstanding') ||
                            key.includes('Subtotal') ||
                            key.includes('Tax') ||
                            key.includes('Discount') ||
                            key.includes('Debit') ||
                            key.includes('Credit'))
                            ? formatCurrency(val)
                            : String(val ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
