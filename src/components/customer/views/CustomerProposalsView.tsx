import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Eye,
  MessageSquare,
  AlertCircle,
  FileCheck,
  Calendar,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { ProposalRecord } from '../../../types/crm';
import { formatCurrency } from '../../../utils/financeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const CustomerProposalsView: React.FC = () => {
  const {
    proposals,
    trackProposalView,
    acceptProposal,
    rejectProposal,
    requestProposalChanges,
    customerUser,
  } = useCustomerPortal();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProposal, setSelectedProposal] = useState<ProposalRecord | null>(null);

  // Modals
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);

  const [rejectReasonCategory, setRejectReasonCategory] = useState('Price');
  const [rejectComments, setRejectComments] = useState('');
  const [changeMessage, setChangeMessage] = useState('');
  const [changeDetails, setChangeDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredProposals = proposals.filter((p) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        p.proposalNumber.toLowerCase().includes(q) ||
        (p.title && p.title.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleOpenProposal = async (prop: ProposalRecord) => {
    setSelectedProposal(prop);
    await trackProposalView(prop.id);
  };

  const handleConfirmAccept = async () => {
    if (!selectedProposal) return;
    setIsProcessing(true);
    setActionError(null);
    const res = await acceptProposal(selectedProposal.id);
    setIsProcessing(false);
    if (res.success) {
      setActionSuccess('Proposal confirmed and accepted! SparkGenTechnology team has been notified.');
      setSelectedProposal((prev) => (prev ? { ...prev, status: 'Accepted' } : null));
      setTimeout(() => {
        setIsAcceptModalOpen(false);
        setActionSuccess(null);
      }, 2500);
    } else {
      setActionError(res.error || 'Failed to accept proposal.');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedProposal) return;
    setIsProcessing(true);
    setActionError(null);
    const fullReason = `${rejectReasonCategory}: ${rejectComments.trim() || 'No additional remarks'}`;
    const res = await rejectProposal(selectedProposal.id, fullReason);
    setIsProcessing(false);
    if (res.success) {
      setActionSuccess('Feedback logged. Proposal marked as declined.');
      setSelectedProposal((prev) => (prev ? { ...prev, status: 'Rejected' } : null));
      setTimeout(() => {
        setIsRejectModalOpen(false);
        setActionSuccess(null);
      }, 2500);
    } else {
      setActionError(res.error || 'Failed to reject proposal.');
    }
  };

  const handleConfirmChanges = async () => {
    if (!selectedProposal) return;
    if (!changeMessage.trim()) {
      setActionError('Please specify the message for the account manager.');
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    const res = await requestProposalChanges(selectedProposal.id, changeMessage, changeDetails);
    setIsProcessing(false);
    if (res.success) {
      setActionSuccess('Revision request dispatched to your assigned account executive.');
      setSelectedProposal((prev) => (prev ? { ...prev, status: 'Under Discussion' } : null));
      setTimeout(() => {
        setIsChangesModalOpen(false);
        setActionSuccess(null);
        setChangeMessage('');
        setChangeDetails('');
      }, 2500);
    } else {
      setActionError(res.error || 'Failed to submit changes request.');
    }
  };

  const handleDownloadPdf = (prop: ProposalRecord) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SparkGenTechnology', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('COMMERCIAL PROPOSAL & SCOPE OF WORK', 14, 26);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.text(`Proposal Number: ${prop.proposalNumber}`, 14, 45);
      doc.text(`Date: ${new Date(prop.proposalDate || prop.createdAt).toLocaleDateString()}`, 14, 52);
      doc.text(`Client: ${prop.customerSnapshot?.companyName || 'Client Organization'}`, 14, 59);

      const items = (prop.items || []).map((item, index) => [
        index + 1,
        item.name,
        item.quantity,
        formatCurrency(item.unitPrice),
        item.discount ? `${item.discount}%` : '-',
        formatCurrency(item.total),
      ]);

      autoTable(doc, {
        startY: 68,
        head: [['#', 'Item / Service', 'Qty', 'Unit Price', 'Discount', 'Total']],
        body: items,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 140;
      doc.setFont('helvetica', 'bold');
      doc.text(`Grand Total: ${formatCurrency(prop.totalAmount)}`, 14, finalY + 12);

      doc.save(`${prop.proposalNumber}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" /> Commercial Proposals
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official commercial proposals, scope of work contracts, and technical specifications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Sent">Sent</option>
            <option value="Viewed">Viewed</option>
            <option value="Under Discussion">Under Discussion</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredProposals.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Proposals Found</p>
            <p className="text-[11px] text-slate-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter.'
                : 'Proposals drafted for your organization will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Proposal #</th>
                  <th className="py-3.5 px-4">Title / Scope</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredProposals.map((prop) => {
                  const isAccepted = prop.status === 'Accepted';
                  const isRejected = prop.status === 'Rejected';
                  return (
                    <tr key={prop.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {prop.proposalNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-white block">{prop.title || 'Technical Solution'}</span>
                        <span className="text-[10px] text-slate-500">{prop.items?.length || 0} line items</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(prop.proposalDate || prop.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {prop.validUntil ? new Date(prop.validUntil).toLocaleDateString() : '30 Days'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatCurrency(prop.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isAccepted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isRejected
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : prop.status === 'Under Discussion'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {prop.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenProposal(prop)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(prop)}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Top Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">{selectedProposal.proposalNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedProposal.status === 'Accepted'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : selectedProposal.status === 'Rejected'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {selectedProposal.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{selectedProposal.title || 'Technical & Commercial Scope'}</h3>
                <p className="text-[11px] text-slate-400">
                  Issued by SparkGenTechnology on {new Date(selectedProposal.proposalDate || selectedProposal.createdAt).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedProposal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope / Description */}
            {selectedProposal.scopeOfWork && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Scope:</span>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">{selectedProposal.scopeOfWork}</p>
              </div>
            )}

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Deliverables & Pricing</h4>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Item / Service</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {(selectedProposal.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white block">{it.name}</span>
                          {it.description && <span className="text-[10px] text-slate-500">{it.description}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {formatCurrency(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grand Total Bar */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Proposal Investment Value:</span>
              <span className="text-xl font-black text-white font-mono">{formatCurrency(selectedProposal.totalAmount)}</span>
            </div>

            {/* Commercial Terms */}
            {Boolean(selectedProposal.termsAndConditions) && (
              <div className="space-y-1.5 text-xs">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commercial Terms & Warranty:</h4>
                {Array.isArray(selectedProposal.termsAndConditions) ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    {(selectedProposal.termsAndConditions as any[]).map((term: any, idx: number) => (
                      <li key={idx}>{typeof term === 'string' ? term : term.text || term.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-[11px] leading-relaxed whitespace-pre-line">
                    {String(selectedProposal.termsAndConditions)}
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedProposal)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <a
                  href={`/proposal/${selectedProposal.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Public View
                </a>
              </div>

              {/* Action buttons (only if not already finalized) */}
              {selectedProposal.status !== 'Accepted' && selectedProposal.status !== 'Rejected' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsChangesModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Request Changes
                  </button>
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                  <button
                    onClick={() => setIsAcceptModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Accept Proposal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Accept Proposal (Section 11) */}
      {isAcceptModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Accept Commercial Proposal</h3>
              <p className="text-xs text-slate-400">
                You are confirming proposal <strong>{selectedProposal.proposalNumber}</strong> for{' '}
                <strong className="text-white">{formatCurrency(selectedProposal.totalAmount)}</strong>.
              </p>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1 font-medium text-center">
              "I confirm that I want to accept this proposal."
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmAccept}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
              >
                {isProcessing ? 'Confirming...' : 'Yes, Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Proposal Modal (Section 12) */}
      {isRejectModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Decline Proposal {selectedProposal.proposalNumber}
            </h3>
            <p className="text-xs text-slate-400">
              Please share feedback with SparkGenTechnology to help us tailor our services:
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Primary Reason:</label>
                <select
                  value={rejectReasonCategory}
                  onChange={(e) => setRejectReasonCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Price">Price / Budgetary Constraint</option>
                  <option value="Requirements Changed">Requirements or Project Scope Changed</option>
                  <option value="Timeline">Timeline / Project Delayed</option>
                  <option value="Competitor">Selected Alternative Solution</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Additional Remarks (Optional):</label>
                <textarea
                  rows={3}
                  value={rejectComments}
                  onChange={(e) => setRejectComments(e.target.value)}
                  placeholder="Tell us what could have been better..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {isProcessing ? 'Submitting...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal (Section 13) */}
      {isChangesModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" /> Request Revisions on {selectedProposal.proposalNumber}
            </h3>
            <p className="text-xs text-slate-400">
              Submit your revision notes to your account executive. The proposal will transition to "Under Discussion".
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Message for Account Executive:</label>
                <input
                  type="text"
                  required
                  value={changeMessage}
                  onChange={(e) => setChangeMessage(e.target.value)}
                  placeholder="e.g. Please adjust quantity on item #2 and revise warranty terms"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Detailed Requested Changes:</label>
                <textarea
                  rows={4}
                  value={changeDetails}
                  onChange={(e) => setChangeDetails(e.target.value)}
                  placeholder="Specific scope alterations, preferred price points, or timeline adjustments..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsChangesModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmChanges}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
              >
                {isProcessing ? 'Submitting...' : 'Submit Revisions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
