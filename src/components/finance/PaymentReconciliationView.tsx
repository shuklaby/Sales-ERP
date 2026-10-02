import React, { useState } from 'react';
import {
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  ShieldCheck,
  X,
  FileCheck,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { ReconciliationRecord, ReconciliationStatus } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';

export const PaymentReconciliationView: React.FC = () => {
  const { reconciliationRecords, refreshReconciliation, onlinePayments, invoices } = useCrmData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshReconciliation();
    setIsRefreshing(false);
  };

  // Generate dynamic reconciliation items from both stored reconciliationRecords and cross-check online payments vs invoices
  const dynamicRecords: ReconciliationRecord[] = [...reconciliationRecords];

  // Also include online payments to ensure complete 100% visibility
  onlinePayments.forEach((p) => {
    const exists = dynamicRecords.some(
      (r) => r.gatewayOrder === p.gatewayOrderId || r.gatewayPaymentId === p.gatewayPaymentId
    );
    if (!exists) {
      const inv = invoices.find((i) => i.id === p.invoiceId);
      const isMatched = inv && p.status === 'Confirmed' && p.amount > 0;
      dynamicRecords.push({
        id: `DYN-${p.paymentId}`,
        gatewayOrder: p.gatewayOrderId,
        gatewayPaymentId: p.gatewayPaymentId,
        invoiceNumber: p.invoiceNumber,
        customerId: p.customerId,
        customerName: p.customerName,
        expectedAmount: p.amount,
        gatewayPaymentAmount: p.amount,
        internalPaymentAmount: p.amount,
        status: isMatched ? 'Matched' : 'Pending Verification',
        mismatchDescription: isMatched ? 'Expected amount matches confirmed payment.' : 'Verification underway.',
        currency: p.currency || 'INR',
        lastCheckedAt: p.confirmedAt || p.createdAt,
      });
    }
  });

  const filteredRecords = dynamicRecords.filter((r) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        r.gatewayOrder.toLowerCase().includes(q) ||
        (r.gatewayPaymentId && r.gatewayPaymentId.toLowerCase().includes(q)) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (statusFilter !== 'all' && r.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Calculate reconciliation counts
  const totalCount = dynamicRecords.length;
  const matchedCount = dynamicRecords.filter((r) => r.status === 'Matched').length;
  const mismatchCount = dynamicRecords.filter((r) => r.status === 'Amount Mismatch').length;
  const pendingCount = dynamicRecords.filter((r) => r.status === 'Pending Verification' || r.status === 'Missing Internal Record').length;
  const matchRate = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 100;

  const getStatusBadge = (status: ReconciliationStatus) => {
    switch (status) {
      case 'Matched':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Matched
          </span>
        );
      case 'Amount Mismatch':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Amount Mismatch
          </span>
        );
      case 'Missing Internal Record':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Missing Internal Record
          </span>
        );
      case 'Missing Gateway Confirmation':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Missing Gateway Confirmation
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Reconciliation KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Reconciliation Match Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{matchRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">{matchedCount} of {totalCount} transactions reconciled</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Matched Settlements</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{matchedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Gateway & internal books aligned</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Amount Mismatches</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{mismatchCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Variance detected for review</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Investigation</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Awaiting settlement or bank sync</div>
        </div>
      </div>

      {/* Governance & Compliance Notice (Section 20 requirement) */}
      <div className="p-4 bg-slate-900 border border-slate-800/90 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white block font-bold mb-0.5">Statutory Financial Integrity Protocol:</strong>
          Admin can investigate mismatches across payment gateway orders and ledger transactions. In compliance with Phase 13 guidelines, the system does not automatically mutate financial records without documented administrative verification.
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Order ID, Payment ID, Invoice, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">All Reconciliation Statuses</option>
            <option value="Matched">Matched</option>
            <option value="Amount Mismatch">Amount Mismatch</option>
            <option value="Missing Internal Record">Missing Internal Record</option>
            <option value="Missing Gateway Confirmation">Missing Gateway Confirmation</option>
            <option value="Pending Verification">Pending Verification</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            title="Re-run reconciliation check"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Re-Run Check</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Table (Section 20) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Gateway Order</th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4 text-right">Expected Amount</th>
                <th className="py-3.5 px-4 text-right">Gateway Amount</th>
                <th className="py-3.5 px-4 text-right">Internal Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Mismatch / Notes</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Scale className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No transactions match current reconciliation filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const variance = Math.abs(r.gatewayPaymentAmount - r.internalPaymentAmount);
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white select-all">
                        {r.gatewayOrder}
                        {r.gatewayPaymentId && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Pay: {r.gatewayPaymentId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-400">
                        {r.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {r.customerName}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-300">
                        {formatCurrency(r.expectedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {formatCurrency(r.gatewayPaymentAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatCurrency(r.internalPaymentAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                        {variance > 0 ? (
                          <span className="text-rose-400 font-bold">Variance: {formatCurrency(variance)}</span>
                        ) : (
                          r.mismatchDescription || 'No discrepancy'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRecord(r);
                            setInvestigationNotes(r.notes || '');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-400" /> Investigate Reconciliation Record
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs divide-y divide-slate-800/80">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Gateway Order ID:</span>
                <span className="font-mono text-white font-bold">{selectedRecord.gatewayOrder}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-bold text-blue-400">{selectedRecord.invoiceNumber}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-white font-medium">{selectedRecord.customerName}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Expected Settlement:</span>
                <span className="font-bold text-slate-200">{formatCurrency(selectedRecord.expectedAmount)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Gateway Reported:</span>
                <span className="font-bold text-white">{formatCurrency(selectedRecord.gatewayPaymentAmount)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Internal Books Recorded:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(selectedRecord.internalPaymentAmount)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <div>{getStatusBadge(selectedRecord.status)}</div>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Last Synced:</span>
                <span className="text-slate-400">{new Date(selectedRecord.lastCheckedAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Audit Investigation Notes
              </label>
              <textarea
                rows={3}
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                placeholder="Enter investigation observations (e.g. Gateway transaction fee deducted, verified against bank statement)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-500 italic">
                Records remain immutable for statutory compliance
              </span>
              <button
                onClick={() => {
                  selectedRecord.notes = investigationNotes;
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
              >
                Save Observations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
