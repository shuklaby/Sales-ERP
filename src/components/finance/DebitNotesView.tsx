import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { DebitNote } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';
import { generateDebitNotePdf } from '../../utils/creditDebitNotePdfGenerator';
import { DebitNoteModal } from '../modals/DebitNoteModal';

export const DebitNotesView: React.FC = () => {
  const { debitNotes, finalizeDebitNote, companySettings } = useCrmData();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredDebitNotes = useMemo(() => {
    return debitNotes.filter((dn) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = dn.debitNoteNumber.toLowerCase().includes(term);
        const matchCust = (dn.customerName || '').toLowerCase().includes(term);
        const matchInv = (dn.invoiceNumber || '').toLowerCase().includes(term);
        const matchReason = (dn.reason || '').toLowerCase().includes(term);
        if (!matchNum && !matchCust && !matchInv && !matchReason) return false;
      }

      if (statusFilter !== 'all' && dn.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [debitNotes, searchTerm, statusFilter]);

  const totalDebitAmount = useMemo(() => {
    return debitNotes
      .filter((dn) => dn.status !== 'Cancelled')
      .reduce((sum, dn) => sum + (dn.total || dn.amount || 0), 0);
  }, [debitNotes]);

  const handleDownloadPdf = (dn: DebitNote) => {
    try {
      const doc = generateDebitNotePdf(dn, companySettings);
      doc.save(`${dn.debitNoteNumber}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
    }
  };

  const handlePrint = (dn: DebitNote) => {
    try {
      const doc = generateDebitNotePdf(dn, companySettings);
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  const handleFinalize = async (dn: DebitNote) => {
    if (!confirm(`Finalize Debit Note ${dn.debitNoteNumber}?\n\nOnce finalized, this document becomes immutable and permanently binds to customer ledger receivables.`)) {
      return;
    }
    try {
      await finalizeDebitNote(dn.id);
    } catch (err) {
      console.error('Finalize error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Debit Notes Management</h2>
          <p className="text-xs text-slate-400">
            Issue and finalize supplementary debit vouchers against customer accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Total Debits: </span>
            <span className="font-bold text-blue-400">{formatCurrency(totalDebitAmount)}</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Create Debit Note
          </button>
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
            placeholder="Search by debit note #, customer, invoice #, reason..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Finalized">Finalized</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Debit Note #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Related Invoice</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredDebitNotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <span>No debit notes found.</span>
                  </td>
                </tr>
              ) : (
                filteredDebitNotes.map((dn) => (
                  <tr key={dn.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {dn.debitNoteNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {dn.customerName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {dn.invoiceNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {dn.date}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                      {formatCurrency(dn.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      {formatCurrency(dn.tax)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      {formatCurrency(dn.total)}
                    </td>
                    <td className="py-3.5 px-4 max-w-[180px] truncate text-slate-300">
                      {dn.reason}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          dn.status === 'Finalized'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : dn.status === 'Draft'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {dn.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {dn.status === 'Draft' && (
                          <button
                            onClick={() => handleFinalize(dn)}
                            title="Finalize Debit Note"
                            className="px-2 py-1 text-[11px] font-bold text-blue-400 hover:text-white bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 rounded-lg transition flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Finalize</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPdf(dn)}
                          title="Download PDF"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrint(dn)}
                          title="Print Document"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DebitNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
