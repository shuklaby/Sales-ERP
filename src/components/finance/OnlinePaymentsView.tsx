import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  Receipt,
  Download,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  ChevronDown,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { OnlinePaymentRecord } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';

export const OnlinePaymentsView: React.FC = () => {
  const { onlinePayments, refreshOnlinePayments, initiateRefund, receipts } = useCrmData();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<OnlinePaymentRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<OnlinePaymentRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOnlinePayments();
    setIsRefreshing(false);
  };

  // Filter Online Payments
  const filteredPayments = onlinePayments.filter((p) => {
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matches =
        p.paymentId.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.gatewayPaymentId && p.gatewayPaymentId.toLowerCase().includes(q)) ||
        (p.gatewayOrderId && p.gatewayOrderId.toLowerCase().includes(q));
      if (!matches) return false;
    }

    // Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'Confirmed' && p.status !== 'Confirmed' && p.status !== 'Success') return false;
      if (statusFilter === 'Pending' && p.status !== 'Pending' && p.status !== 'Processing') return false;
      if (statusFilter === 'Failed' && p.status !== 'Failed') return false;
      if (statusFilter === 'Refunded' && p.status !== 'Refunded' && p.status !== 'Partially Refunded') return false;
    }

    // Gateway
    if (gatewayFilter !== 'all' && p.gateway !== gatewayFilter) return false;

    // Date
    if (dateFilter !== 'all') {
      const now = new Date();
      const pDate = new Date(p.createdAt);
      if (dateFilter === 'today') {
        if (pDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (pDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (pDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Calculate KPIs
  const totalVolume = onlinePayments
    .filter((p) => p.status === 'Confirmed' || p.status === 'Success')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const confirmedCount = onlinePayments.filter(
    (p) => p.status === 'Confirmed' || p.status === 'Success'
  ).length;

  const pendingCount = onlinePayments.filter(
    (p) => p.status === 'Pending' || p.status === 'Processing' || p.status === 'Created'
  ).length;

  const totalRefunded = onlinePayments.reduce(
    (acc, p) => acc + (p.refundedAmount || 0),
    0
  );

  const openRefundModal = (payment: OnlinePaymentRecord) => {
    setSelectedPaymentForRefund(payment);
    const alreadyRefunded = payment.refundedAmount || 0;
    const remaining = payment.amount - alreadyRefunded;
    setRefundAmount(remaining.toString());
    setRefundReason('');
    setConfirmCheckbox(false);
    setRefundError(null);
    setIsRefundModalOpen(true);
  };

  const handleExecuteRefund = async () => {
    if (!selectedPaymentForRefund) return;
    const amt = parseFloat(refundAmount);
    const alreadyRefunded = selectedPaymentForRefund.refundedAmount || 0;
    const maxRefundable = selectedPaymentForRefund.amount - alreadyRefunded;

    if (isNaN(amt) || amt <= 0) {
      setRefundError('Please specify a refund amount greater than zero.');
      return;
    }

    if (amt > maxRefundable) {
      setRefundError(`Refund amount cannot exceed available balance of ${formatCurrency(maxRefundable)}.`);
      return;
    }

    if (!refundReason.trim()) {
      setRefundError('Please provide a legitimate commercial or audit reason for the refund.');
      return;
    }

    if (!confirmCheckbox) {
      setRefundError('Please confirm that you authorize this refund.');
      return;
    }

    setRefunding(true);
    setRefundError(null);

    try {
      const res = await initiateRefund({
        paymentId: selectedPaymentForRefund.paymentId,
        refundAmount: amt,
        reason: refundReason.trim(),
      });

      if (!res.success) {
        setRefundError(res.error || 'Refund initiation failed.');
      } else {
        setIsRefundModalOpen(false);
        setSelectedPaymentForRefund(null);
      }
    } catch (e: any) {
      setRefundError(e.message || 'Refund request failed.');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Online Volume</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{formatCurrency(totalVolume)}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">From gateway settlements</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Confirmed Payments</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{confirmedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Server verified & reconciled</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending / In Flight</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Awaiting gateway webhooks</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Refunded</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{formatCurrency(totalRefunded)}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Adjusted in customer ledger</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Payment ID, Invoice, Customer, Gateway Ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending / Processing</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded / Partial</option>
          </select>

          {/* Gateway Filter */}
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">All Gateways</option>
            <option value="razorpay">Razorpay</option>
            <option value="stripe">Stripe</option>
            <option value="other">Other</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>

          {/* Sync / Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            title="Sync with Gateway"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Gateway</span>
          </button>
        </div>
      </div>

      {/* Online Payments Table (Section 19) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Payment ID</th>
                <th className="py-3.5 px-4">Invoice</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Gateway Refs</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created / Confirmed</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No online payment transactions match your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isConfirmed = p.status === 'Confirmed' || p.status === 'Success';
                  const isRefunded = p.status === 'Refunded' || p.status === 'Partially Refunded';
                  const alreadyRefunded = p.refundedAmount || 0;
                  const canRefund = isConfirmed && alreadyRefunded < p.amount && isAdmin;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white select-all">
                        {p.paymentId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-400">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {p.customerName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white text-sm">
                          {formatCurrency(p.amount)}
                        </span>
                        {alreadyRefunded > 0 && (
                          <span className="block text-[10px] text-rose-400">
                            Refunded: {formatCurrency(alreadyRefunded)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                          {p.gateway}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400 font-mono space-y-0.5">
                        <div title="Gateway Order ID" className="truncate max-w-[130px]">
                          Ord: {p.gatewayOrderId || 'N/A'}
                        </div>
                        <div title="Gateway Payment ID" className="truncate max-w-[130px] text-slate-300">
                          Pay: {p.gatewayPaymentId || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isConfirmed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isRefunded
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : p.status === 'Failed'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isConfirmed ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isRefunded ? (
                            <RotateCcw className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                        {p.confirmedAt && (
                          <div className="text-[10px] text-emerald-400 font-medium">
                            Confirmed {new Date(p.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPaymentDetail(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                            title="View Transaction Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {canRefund && (
                            <button
                              onClick={() => openRefundModal(p)}
                              className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Process Gateway Refund"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
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

      {/* Transaction Details Modal */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" /> Online Transaction Details
              </h3>
              <button
                onClick={() => setSelectedPaymentDetail(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs divide-y divide-slate-800/80">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono font-bold text-white select-all">{selectedPaymentDetail.paymentId}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-bold text-blue-400">{selectedPaymentDetail.invoiceNumber}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-white font-medium">{selectedPaymentDetail.customerName}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Gross Amount:</span>
                <span className="font-black text-emerald-400 text-sm">
                  {formatCurrency(selectedPaymentDetail.amount)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Gateway:</span>
                <span className="capitalize text-slate-200 font-semibold">{selectedPaymentDetail.gateway}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Gateway Order ID:</span>
                <span className="font-mono text-slate-300">{selectedPaymentDetail.gatewayOrderId || 'N/A'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Gateway Payment ID:</span>
                <span className="font-mono text-slate-300 select-all">{selectedPaymentDetail.gatewayPaymentId || 'N/A'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Server Verification:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Receipt Generated:</span>
                <span className="text-white font-medium">{selectedPaymentDetail.receiptNumber || 'Automated on confirmation'}</span>
              </div>
              {selectedPaymentDetail.refundedAmount && selectedPaymentDetail.refundedAmount > 0 && (
                <div className="py-1.5 flex justify-between text-rose-400">
                  <span>Refunded Total:</span>
                  <span className="font-bold">{formatCurrency(selectedPaymentDetail.refundedAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPaymentDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal (Section 21) */}
      {isRefundModalOpen && selectedPaymentForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400" /> Initiate Gateway Refund
              </h3>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{refundError}</span>
              </div>
            )}

            {/* Payment Summary */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-bold text-white">{selectedPaymentForRefund.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Amount:</span>
                <span className="font-bold text-white">{formatCurrency(selectedPaymentForRefund.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Available to Refund:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(selectedPaymentForRefund.amount - (selectedPaymentForRefund.refundedAmount || 0))}
                </span>
              </div>
            </div>

            {/* Refund Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPaymentForRefund.amount - (selectedPaymentForRefund.refundedAmount || 0)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Refund Reason (Audit Log) *
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Scope revision, client overpayment settlement..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0"
                />
                <span className="text-[11px] text-slate-400 leading-snug">
                  I understand this will instruct the payment gateway ({selectedPaymentForRefund.gateway.toUpperCase()}) to reverse funds back to the customer's original payment method and adjust the invoice balance accordingly.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refunding || !confirmCheckbox}
                onClick={handleExecuteRefund}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {refunding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> Execute Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
