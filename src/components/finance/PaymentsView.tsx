import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  FileCheck,
  RotateCcw,
  Plus,
  Building2,
  ArrowDownLeft,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { PaymentRecord } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';

interface PaymentsViewProps {
  onOpenRecordPayment: () => void;
  onViewReceipt: (receiptId: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onOpenRecordPayment,
  onViewReceipt,
}) => {
  const { payments, receipts, reversePayment } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Reversal modal
  const [reversalTarget, setReversalTarget] = useState<PaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCust = (p.customerName || '').toLowerCase().includes(term);
        const matchRef = (p.transactionReference || '').toLowerCase().includes(term);
        const matchInv = (p.invoiceNumber || '').toLowerCase().includes(term);
        if (!matchCust && !matchRef && !matchInv) return false;
      }

      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      return true;
    });
  }, [payments, searchTerm, methodFilter, statusFilter]);

  const handleConfirmReversal = async () => {
    if (!reversalTarget || !reversalReason.trim()) return;
    setReversing(true);
    try {
      await reversePayment(reversalTarget.id, reversalReason.trim());
      setReversalTarget(null);
      setReversalReason('');
    } catch (err: any) {
      alert(err.message || 'Payment reversal failed.');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payments & Collections Log</h2>
          <p className="text-xs text-slate-400">
            Immutable settlement transactions, reversals audit, and verified receipt records
          </p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, UTR, invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Channels</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Payment Gateway">Payment Gateway</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Refunded">Refunded / Reversed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Transaction UTR</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receipt / Reversal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    No payment records match your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const receipt = receipts.find((r) => r.paymentId === p.id || r.receiptNumber === p.receiptNumber);
                  const isPositive = p.amount >= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{p.paymentNumber || p.paymentId}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-white">{p.customerName}</td>

                      <td className="py-3 px-4 font-mono text-blue-400">
                        {p.invoiceNumber || 'Advance / Unlinked'}
                      </td>

                      <td className="py-3 px-4 text-slate-300">{p.paymentDate}</td>

                      <td className="py-3 px-4">{p.paymentMethod}</td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {p.transactionReference || 'N/A'}
                      </td>

                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(p.amount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'Confirmed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : p.status === 'Refunded'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {receipt && p.status === 'Confirmed' && (
                            <button
                              onClick={() => onViewReceipt(receipt.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition flex items-center gap-1"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{receipt.receiptNumber}</span>
                            </button>
                          )}

                          {p.status === 'Confirmed' && !p.isReversal && (
                            <button
                              onClick={() => setReversalTarget(p)}
                              title="Reverse / Refund Payment"
                              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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

      {/* Payment Reversal Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <RotateCcw className="w-5 h-5" />
              <span>Reverse Payment {reversalTarget.paymentNumber || reversalTarget.paymentId}</span>
            </div>

            <p className="text-xs text-slate-300">
              You are initiating a financial reversal of{' '}
              <strong className="text-white">{formatCurrency(reversalTarget.amount)}</strong> received from{' '}
              <strong className="text-white">{reversalTarget.customerName}</strong>.
            </p>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
              Strict Audit Compliance: Confirmed payments are never deleted. A reversal record will be
              logged, and any associated invoice outstanding will be restored automatically.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for Reversal *
              </label>
              <textarea
                rows={3}
                placeholder="Specify reason (e.g. Bank chargeback, payment bounced, incorrect amount deposited)..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={reversing || !reversalReason.trim()}
                onClick={handleConfirmReversal}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {reversing ? 'Reversing...' : 'Execute Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
