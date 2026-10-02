import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CreditNote } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';
import { generateCreditNotePdf } from '../../utils/creditDebitNotePdfGenerator';
import { CreditNoteModal } from '../modals/CreditNoteModal';

export const CreditNotesView: React.FC = () => {
  const { creditNotes, customers, companySettings } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter((cn) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = cn.creditNoteNumber.toLowerCase().includes(term);
        const matchCust = (cn.customerName || '').toLowerCase().includes(term);
        const matchInv = (cn.invoiceNumber || '').toLowerCase().includes(term);
        const matchReason = (cn.reason || '').toLowerCase().includes(term);
        if (!matchNum && !matchCust && !matchInv && !matchReason) return false;
      }

      if (statusFilter !== 'all' && cn.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [creditNotes, searchTerm, statusFilter]);

  const totalCreditAmount = useMemo(() => {
    return creditNotes
      .filter((cn) => cn.status !== 'Cancelled')
      .reduce((sum, cn) => sum + (cn.amount || 0), 0);
  }, [creditNotes]);

  const handleDownloadPdf = (cn: CreditNote) => {
    try {
      const doc = generateCreditNotePdf(cn, companySettings);
      doc.save(`${cn.creditNoteNumber}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
    }
  };

  const handlePrint = (cn: CreditNote) => {
    try {
      const doc = generateCreditNotePdf(cn, companySettings);
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Credit Notes Management</h2>
          <p className="text-xs text-slate-400">
            Issue and track formal commercial credit notes reducing customer receivables
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Total Credits Issued: </span>
            <span className="font-bold text-amber-400">{formatCurrency(totalCreditAmount)}</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Issue Credit Note
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
            placeholder="Search by credit note #, customer, invoice #, reason..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Applied">Applied</option>
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
                <th className="py-3 px-4">Credit Note #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Linked Invoice</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredCreditNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <span>No credit notes found.</span>
                  </td>
                </tr>
              ) : (
                filteredCreditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {cn.creditNoteNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {cn.customerName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-blue-400">
                      {cn.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {cn.date}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(cn.amount)}
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-300">
                      {cn.reason}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cn.status === 'Applied'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : cn.status === 'Issued'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {cn.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadPdf(cn)}
                          title="Download PDF"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrint(cn)}
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

      <CreditNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
