import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  DollarSign,
  Eye,
  Mail,
  Ban,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  ArrowUpDown,
  Copy,
  Printer,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceRecord, InvoiceStatus } from '../../types/crm';
import { formatCurrency, calculateDaysOverdue } from '../../utils/financeUtils';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';

interface InvoicesViewProps {
  onOpenCreateInvoice: () => void;
  onSelectInvoice: (invoice: InvoiceRecord) => void;
  onRecordPayment: (invoice: InvoiceRecord) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onOpenCreateInvoice,
  onSelectInvoice,
  onRecordPayment,
}) => {
  const { invoices, customers, employees, duplicateInvoice } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Filtered and sorted invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Employee permission check: if regular employee without viewInvoices permission, limit to assigned customers
        if (!isAdmin && !hasPermission('viewInvoices')) {
          if (inv.createdBy !== userProfile?.uid) {
            const cust = customers.find((c) => c.id === inv.customerId);
            if (cust?.assignedEmployeeId !== userProfile?.uid) {
              return false;
            }
          }
        }

        // Search match
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNum = inv.invoiceNumber.toLowerCase().includes(term);
          const matchCust = (inv.customerSnapshot?.companyName || '').toLowerCase().includes(term);
          const matchNotes = (inv.notes || '').toLowerCase().includes(term);
          if (!matchNum && !matchCust && !matchNotes) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (inv.status !== statusFilter) return false;
        }

        // Customer filter
        if (customerFilter !== 'all') {
          if (inv.customerId !== customerFilter) return false;
        }

        // Employee filter
        if (employeeFilter !== 'all') {
          if (inv.createdBy !== employeeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.grandTotal - a.grandTotal;
        }
        if (sortBy === 'amount_asc') {
          return a.grandTotal - b.grandTotal;
        }
        return 0;
      });
  }, [invoices, searchTerm, statusFilter, customerFilter, employeeFilter, sortBy, isAdmin, hasPermission, userProfile, customers]);

  const handleDownloadPdf = (inv: InvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const doc = generateInvoicePdf(inv);
      doc.save(`${inv.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  const handlePrint = (inv: InvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const doc = generateInvoicePdf(inv);
      window.open(doc.output('bloburl'), '_blank');
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const handleDuplicate = async (inv: InvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dup = await duplicateInvoice(inv.id);
      onSelectInvoice(dup);
    } catch (err) {
      console.error('Duplicate invoice error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Invoice Management</h2>
          <p className="text-xs text-slate-400">
            Create, issue, track, and reconcile official commercial tax invoices
          </p>
        </div>

        <button
          onClick={onOpenCreateInvoice}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice number, client company, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Issued">Issued</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div>
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

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                    No invoice records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const daysOverdue = calculateDaysOverdue(inv.dueDate);
                  const isOverdue = daysOverdue > 0 && inv.status !== 'Paid' && inv.status !== 'Cancelled';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>{inv.invoiceNumber}</span>
                        </div>
                        {inv.proposalSnapshot && (
                          <span className="text-[10px] text-slate-500 block">
                            Ref: {inv.proposalSnapshot.proposalNumber}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {inv.customerSnapshot?.companyName || 'Client'}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {inv.customerSnapshot?.contactPerson || 'N/A'}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>
                          <span className="text-slate-500">Issued: </span>
                          <span>{inv.invoiceDate}</span>
                        </div>
                        <div className={isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                          <span className="text-slate-500">Due: </span>
                          <span>{inv.dueDate}</span>
                          {isOverdue && (
                            <span className="ml-1 text-[10px] font-bold">
                              ({daysOverdue}d overdue)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {formatCurrency(inv.grandTotal, inv.currency)}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                        {formatCurrency(inv.paidAmount, inv.currency)}
                      </td>

                      {/* Outstanding */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                        {formatCurrency(inv.outstandingAmount, inv.currency)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : inv.status === 'Overdue' || isOverdue
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : inv.status === 'Partially Paid'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : inv.status === 'Cancelled'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isOverdue && inv.status !== 'Paid' && inv.status !== 'Cancelled'
                            ? 'OVERDUE'
                            : inv.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            title="View Invoice Details"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDownloadPdf(inv, e)}
                            title="Download PDF"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handlePrint(inv, e)}
                            title="Print Invoice"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(inv, e)}
                            title="Duplicate Invoice"
                            className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                            <button
                              onClick={() => onRecordPayment(inv)}
                              title="Record Payment"
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
