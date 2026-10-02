import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Eye,
  Download,
  Building2,
  DollarSign,
  AlertCircle,
  FileCheck,
  Edit2,
  Ban,
  X,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ExpenseRecord, ExpenseStatus } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';
import { ExpenseModal } from '../modals/ExpenseModal';

export const ExpensesView: React.FC = () => {
  const {
    expenses,
    expenseCategories,
    vendors,
    approveExpense,
    rejectExpense,
    markExpensePaid,
    cancelExpense,
  } = useCrmData();

  const { isAdmin, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRecord | null>(null);

  // Reject modal state
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Attachment preview modal
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = exp.expenseId.toLowerCase().includes(term);
        const matchDesc = (exp.description || '').toLowerCase().includes(term);
        const matchCat = (exp.categoryName || '').toLowerCase().includes(term);
        const matchVen = (exp.vendorName || exp.vendor || '').toLowerCase().includes(term);
        if (!matchId && !matchDesc && !matchCat && !matchVen) return false;
      }

      if (statusFilter !== 'all' && exp.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && exp.categoryId !== categoryFilter) {
        return false;
      }

      if (vendorFilter !== 'all' && exp.vendorId !== vendorFilter) {
        return false;
      }

      return true;
    });
  }, [expenses, searchTerm, statusFilter, categoryFilter, vendorFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalApproved = 0;
    let thisMonthTotal = 0;

    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();

    expenses.forEach((e) => {
      if (e.status === 'CANCELLED' || e.status === 'REJECTED') return;

      const tot = e.total || e.amount || 0;
      if (e.status === 'PAID') totalPaid += tot;
      if (e.status === 'PENDING_APPROVAL') totalPending += tot;
      if (e.status === 'APPROVED') totalApproved += tot;

      if (e.expenseDate) {
        const d = new Date(e.expenseDate);
        if (d.getFullYear() === currYear && d.getMonth() === currMonth) {
          thisMonthTotal += tot;
        }
      }
    });

    return { totalPaid, totalPending, totalApproved, thisMonthTotal };
  }, [expenses]);

  const handleApprove = async (id: string) => {
    try {
      await approveExpense(id);
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingExpenseId || !rejectionReason.trim()) return;
    try {
      await rejectExpense(rejectingExpenseId, rejectionReason.trim());
      setRejectingExpenseId(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markExpensePaid(id);
    } catch (err) {
      console.error('Mark paid error:', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this expense record?')) return;
    try {
      await cancelExpense(id);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Expense Management</h2>
          <p className="text-xs text-slate-400">
            Record, verify, approve, and disburse operational expenses and vendor bills
          </p>
        </div>

        <button
          onClick={() => {
            setExpenseToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>This Month Expenses</span>
            <Receipt className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">
            {formatCurrency(metrics.thisMonthTotal)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Current cycle operating total</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Paid (Settled)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {formatCurrency(metrics.totalPaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Disbursed and accounted</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Approved (Unpaid)</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-400">
            {formatCurrency(metrics.totalApproved)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Authorized for bank disbursement</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {formatCurrency(metrics.totalPending)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Awaiting management clearance</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by expense #, description, category, vendor..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.company || v.vendorName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Expense ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Bill</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <span>No expense records found.</span>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      {exp.expenseId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {exp.expenseDate}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {exp.categoryName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {exp.vendorName || exp.vendor || '—'}
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-300">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      {formatCurrency(exp.tax)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      {formatCurrency(exp.total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {exp.attachmentUrl ? (
                        <button
                          onClick={() => setPreviewAttachmentUrl(exp.attachmentUrl!)}
                          title="View attached bill"
                          className="p-1 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/30 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          exp.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : exp.status === 'APPROVED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : exp.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : exp.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : exp.status === 'DRAFT'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {exp.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Draft */}
                        {exp.status === 'DRAFT' && (
                          <button
                            onClick={() => {
                              setExpenseToEdit(exp);
                              setIsModalOpen(true);
                            }}
                            title="Edit Draft Expense"
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Admin Approval Actions */}
                        {isAdmin && exp.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleApprove(exp.id)}
                              title="Approve Expense"
                              className="px-2 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectingExpenseId(exp.id)}
                              title="Reject Expense"
                              className="px-2 py-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* Mark Paid (When approved) */}
                        {isAdmin && exp.status === 'APPROVED' && (
                          <button
                            onClick={() => handleMarkPaid(exp.id)}
                            title="Mark Disbursed & Paid"
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-300 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition flex items-center gap-1 shadow"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Mark Paid</span>
                          </button>
                        )}

                        {/* Cancel */}
                        {exp.status !== 'CANCELLED' && exp.status !== 'PAID' && (
                          <button
                            onClick={() => handleCancel(exp.id)}
                            title="Cancel Expense"
                            className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800/40 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
      />

      {/* Rejection Modal */}
      {rejectingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Reject Expense Submission</span>
            </h3>
            <p className="text-xs text-slate-400">
              Please specify the audit reason for rejecting this expenditure voucher.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing tax invoice receipt, duplicate entry, personal expense..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectingExpenseId(null);
                  setRejectionReason('');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Attachment Preview Modal */}
      {previewAttachmentUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white">Voucher Bill Document</span>
              <button
                onClick={() => setPreviewAttachmentUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              {previewAttachmentUrl.startsWith('data:application/pdf') || previewAttachmentUrl.includes('.pdf') ? (
                <iframe src={previewAttachmentUrl} className="w-full h-[600px] rounded-lg" title="PDF Document" />
              ) : (
                <img src={previewAttachmentUrl} alt="Voucher Bill" className="max-h-[600px] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
