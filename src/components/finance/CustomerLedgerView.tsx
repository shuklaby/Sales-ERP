import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Building2,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCrmData } from '../../context/CrmDataContext';
import { Customer, CustomerLedgerEntry } from '../../types/crm';
import { formatCurrency, roundTo2 } from '../../utils/financeUtils';

interface CustomerLedgerViewProps {
  initialCustomerId?: string;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({ initialCustomerId }) => {
  const { customers, invoices, payments, creditNotes, customerAdvances } = useCrmData();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || customers[0]?.id || ''
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Compute live ledger timeline from real Firestore transactions
  const ledgerData = useMemo(() => {
    if (!selectedCustomerId) {
      return { entries: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 };
    }

    const rawTransactions: Array<{
      date: string;
      type: 'Invoice' | 'Payment' | 'Credit Note' | 'Advance' | 'Refund';
      reference: string;
      description: string;
      debit: number;
      credit: number;
      rawId: string;
    }> = [];

    // Invoices (Debit increases customer's balance owed)
    invoices
      .filter((inv) => inv.customerId === selectedCustomerId && inv.status !== 'Cancelled')
      .forEach((inv) => {
        rawTransactions.push({
          date: inv.invoiceDate || inv.createdAt.split('T')[0],
          type: 'Invoice',
          reference: inv.invoiceNumber,
          description: `Tax Invoice billed: ${inv.items?.length || 1} item(s)`,
          debit: roundTo2(inv.grandTotal),
          credit: 0,
          rawId: inv.id,
        });
      });

    // Payments (Credit decreases customer's balance owed)
    payments
      .filter((p) => p.customerId === selectedCustomerId)
      .forEach((p) => {
        if (p.status === 'Confirmed') {
          rawTransactions.push({
            date: p.paymentDate || p.createdAt.split('T')[0],
            type: p.isReversal ? 'Refund' : 'Payment',
            reference: p.paymentNumber || p.paymentId,
            description: p.isReversal
              ? `Payment Reversal: ${p.reversalReason || 'N/A'}`
              : `Payment received via ${p.paymentMethod} (Ref: ${p.transactionReference})`,
            debit: p.isReversal ? roundTo2(Math.abs(p.amount)) : 0,
            credit: !p.isReversal ? roundTo2(p.amount) : 0,
            rawId: p.id,
          });
        }
      });

    // Credit notes
    creditNotes
      .filter((cn) => cn.customerId === selectedCustomerId)
      .forEach((cn) => {
        rawTransactions.push({
          date: cn.date || cn.createdAt.split('T')[0],
          type: 'Credit Note',
          reference: cn.creditNoteNumber,
          description: `Credit Note issued: ${cn.reason}`,
          debit: 0,
          credit: roundTo2(cn.amount),
          rawId: cn.id,
        });
      });

    // Customer Advances
    customerAdvances
      .filter((adv) => adv.customerId === selectedCustomerId)
      .forEach((adv) => {
        rawTransactions.push({
          date: adv.date || adv.createdAt.split('T')[0],
          type: 'Advance',
          reference: adv.advanceId,
          description: `Customer advance recorded: ${adv.notes || 'Unallocated balance'}`,
          debit: 0,
          credit: roundTo2(adv.amount),
          rawId: adv.id,
        });
      });

    // Sort chronologically ascending
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balances
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries: CustomerLedgerEntry[] = rawTransactions.map((tx, idx) => {
      runningBalance = roundTo2(runningBalance + tx.debit - tx.credit);
      totalDebit = roundTo2(totalDebit + tx.debit);
      totalCredit = roundTo2(totalCredit + tx.credit);

      return {
        id: `LED-${idx}-${tx.rawId}`,
        date: tx.date,
        type: tx.type,
        reference: tx.reference,
        description: tx.description,
        debit: tx.debit,
        credit: tx.credit,
        balance: runningBalance,
        rawRecordId: tx.rawId,
      };
    });

    // Filter by date range if specified
    const filteredEntries = entries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    return {
      entries: filteredEntries,
      totalDebit,
      totalCredit,
      closingBalance: runningBalance,
    };
  }, [selectedCustomerId, invoices, payments, creditNotes, customerAdvances, startDate, endDate]);

  const handleExportCSV = () => {
    if (!activeCustomer || ledgerData.entries.length === 0) return;

    const headers = ['Date', 'Type', 'Reference', 'Description', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)'];
    const rows = ledgerData.entries.map((e) => [
      e.date,
      e.type,
      e.reference,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit ? e.debit.toFixed(2) : '0.00',
      e.credit ? e.credit.toFixed(2) : '0.00',
      e.balance.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ledger_${activeCustomer.companyName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!activeCustomer || ledgerData.entries.length === 0) return;

    const exportRows = ledgerData.entries.map((e) => ({
      Date: e.date,
      Type: e.type,
      Reference: e.reference,
      Description: e.description,
      'Debit (INR)': e.debit,
      'Credit (INR)': e.credit,
      'Balance (INR)': e.balance,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Ledger');
    XLSX.writeFile(wb, `Ledger_${activeCustomer.companyName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Customer Financial Ledger</h2>
          <p className="text-xs text-slate-400">
            Real-time double-entry transaction timeline with running balances & statutory reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={ledgerData.entries.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={ledgerData.entries.length === 0}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shadow"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Customer Picker & Range Strip */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" /> Select Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.customerId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Opening Balance
          </span>
          <div className="mt-1.5 text-xl font-bold text-white">₹0.00</div>
          <span className="text-[10px] text-slate-500">Established account inception</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Invoiced (Debits)
          </span>
          <div className="mt-1.5 text-xl font-bold text-slate-200">
            {formatCurrency(ledgerData.totalDebit)}
          </div>
          <span className="text-[10px] text-slate-500">Billed commercial invoices</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Total Paid (Credits)
          </span>
          <div className="mt-1.5 text-xl font-bold text-emerald-400">
            {formatCurrency(ledgerData.totalCredit)}
          </div>
          <span className="text-[10px] text-emerald-500/80">Realized remittances & advances</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
            Closing Balance / Outstanding
          </span>
          <div className="mt-1.5 text-xl font-extrabold text-amber-400">
            {formatCurrency(ledgerData.closingBalance)}
          </div>
          <span className="text-[10px] text-amber-500/80">Net receivables due</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Commercial Particulars</th>
                <th className="py-3 px-4 text-right">Debit (₹)</th>
                <th className="py-3 px-4 text-right">Credit (₹)</th>
                <th className="py-3 px-4 text-right">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {ledgerData.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                    No transactions recorded for this customer in the selected date range.
                  </td>
                </tr>
              ) : (
                ledgerData.entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-400 font-medium">{e.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          e.type === 'Invoice'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : e.type === 'Payment'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : e.type === 'Refund'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{e.reference}</td>
                    <td className="py-3 px-4 text-slate-300">{e.description}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-200">
                      {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-400">
                      {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(e.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
