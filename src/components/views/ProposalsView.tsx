import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Eye,
  Building,
  Printer,
  CopyPlus,
  Edit2,
  Trash2,
  Ban,
  ExternalLink,
  Clock,
  History,
  FileCheck,
} from 'lucide-react';
import { ProposalRecord, ProposalStatus, InvoiceRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { generateProposalPdf } from '../../utils/proposalPdfGenerator';
import { SendProposalEmailModal } from '../modals/SendProposalEmailModal';
import { WhatsAppModal } from '../modals/ActionModals';
import { InvoiceDetailModal } from '../modals/InvoiceDetailModal';
import { numberToWordsINR } from '../../utils/numberToWords';
import { CreateReminderModal } from '../communication/CreateReminderModal';
import { CalendarClock } from 'lucide-react';

interface ProposalsViewProps {
  onOpenProposalModal: (proposalToEdit?: ProposalRecord | null) => void;
  selectedProposalDirect?: ProposalRecord | null;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  onOpenProposalModal,
  selectedProposalDirect,
}) => {
  const { proposals, updateProposalStatus, deleteProposal, duplicateProposal, activities, invoices, createInvoiceFromProposal } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview Drawer
  const [previewProposal, setPreviewProposal] = useState<ProposalRecord | null>(selectedProposalDirect || null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Invoice modal & creation state
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<InvoiceRecord | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceToast, setInvoiceToast] = useState<string | null>(null);

  // Modals for sending
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isWaOpen, setIsWaOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);

  // Reject reason prompt modal
  const [rejectProposalId, setRejectProposalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Authorization Filter (Section 1: Admin can see all proposals. Employees see authorized proposals)
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Role Authorization Guard
      const isAuthorized =
        isAdmin ||
        hasPermission('viewAllProposals') ||
        p.createdBy === userProfile?.uid ||
        p.assignedEmployeeId === userProfile?.uid ||
        p.createdByName === userProfile?.name;

      if (!isAuthorized) return false;

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        p.proposalNumber.toLowerCase().includes(q) ||
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.customerSnapshot?.contactPerson || '').toLowerCase().includes(q) ||
        (p.customerSnapshot?.companyName || '').toLowerCase().includes(q) ||
        (p.createdByName || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, searchTerm, statusFilter, isAdmin, hasPermission, userProfile]);

  const handleDownloadPdf = (prop: ProposalRecord) => {
    const doc = generateProposalPdf(prop);
    doc.save(`${prop.proposalNumber}_${(prop.customerName || 'Proposal').replace(/\s+/g, '_')}.pdf`);
  };

  const handlePrintProposal = (prop: ProposalRecord) => {
    const doc = generateProposalPdf(prop);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl as any;
    document.body.appendChild(iframe);
  };

  const handleCopyLink = (prop: ProposalRecord) => {
    const publicUrl = `${window.location.origin}/proposal/${prop.proposalNumber}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDuplicate = async (prop: ProposalRecord) => {
    try {
      const duplicated = await duplicateProposal(prop.id);
      setPreviewProposal(duplicated);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate proposal');
    }
  };

  const handleCreateInvoice = async (prop: ProposalRecord) => {
    setIsCreatingInvoice(true);
    try {
      const inv = await createInvoiceFromProposal(prop.id);
      setSelectedInvoiceForModal(inv);
      setInvoiceToast(`Tax Invoice ${inv.invoiceNumber} created successfully!`);
      setTimeout(() => setInvoiceToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice from proposal.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleDeleteDraft = async (prop: ProposalRecord) => {
    if (confirm(`Are you sure you want to delete Draft proposal "${prop.proposalNumber}"?`)) {
      try {
        await deleteProposal(prop.id);
        if (previewProposal?.id === prop.id) setPreviewProposal(null);
      } catch (err: any) {
        alert(err.message || 'Failed to delete draft proposal');
      }
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: ProposalStatus) => {
    if (newStatus === 'Rejected') {
      setRejectProposalId(id);
      return;
    }
    await updateProposalStatus(id, newStatus);
    if (previewProposal && previewProposal.id === id) {
      setPreviewProposal((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const confirmRejection = async () => {
    if (!rejectProposalId) return;
    await updateProposalStatus(rejectProposalId, 'Rejected', rejectReason);
    if (previewProposal && previewProposal.id === rejectProposalId) {
      setPreviewProposal((prev) => (prev ? { ...prev, status: 'Rejected', rejectionReason: rejectReason } : null));
    }
    setRejectProposalId(null);
    setRejectReason('');
  };

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Sent':
        return 'bg-blue-100 text-blue-800 border-blue-200 font-semibold';
      case 'Viewed':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold';
      case 'Under Discussion':
        return 'bg-amber-100 text-amber-800 border-amber-200 font-semibold';
      case 'Accepted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
      case 'Expired':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Commercial Proposal Management ({filteredProposals.length})
          </h2>
          <p className="text-xs text-slate-500">
            Professional proposal generator, historical pricing snapshots, lifecycle tracking, and client PDF dispatch
          </p>
        </div>

        {hasPermission('canCreateProposal') && (
          <button
            onClick={() => onOpenProposalModal(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Proposal
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search proposal #, customer, company, created by..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          >
            <option value="ALL">All Proposal Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Viewed">Viewed</option>
            <option value="Under Discussion">Under Discussion</option>
            <option value="Accepted">Accepted (Won)</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Proposal List Table with exact Section 1 columns:
          Proposal Number, Customer, Company, Created By, Date, Valid Until, Amount, Status, Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Proposal Number</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Company</th>
                <th className="py-3 px-4 font-semibold">Created By</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Valid Until</th>
                <th className="py-3 px-4 font-semibold">Amount (INR)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No commercial proposals found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Proposal Number */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setPreviewProposal(prop)}
                        className="font-bold font-mono text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                        title="Click to view proposal details and snapshot"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {prop.proposalNumber}
                      </div>
                      {prop.stsNumber && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          STS: {prop.stsNumber}
                        </span>
                      )}
                    </td>

                    {/* Customer (Contact Person) */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {prop.customerSnapshot?.contactPerson || prop.customerName || 'N/A'}
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{prop.customerSnapshot?.companyName || prop.customerName}</span>
                      </div>
                    </td>

                    {/* Created By */}
                    <td className="py-3 px-4 text-slate-600">
                      {prop.createdByName || 'Sales Team'}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {prop.proposalDate
                        ? new Date(prop.proposalDate).toLocaleDateString('en-IN')
                        : new Date(prop.createdAt).toLocaleDateString('en-IN')}
                    </td>

                    {/* Valid Until */}
                    <td className="py-3 px-4 text-slate-600">
                      {prop.validUntil
                        ? new Date(prop.validUntil).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-black text-slate-900 text-xs font-mono">
                      ₹{prop.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <select
                        value={prop.status}
                        onChange={(e) => handleStatusUpdate(prop.id, e.target.value as ProposalStatus)}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${getStatusBadge(
                          prop.status
                        )} bg-transparent cursor-pointer`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Viewed">Viewed</option>
                        <option value="Under Discussion">Under Discussion</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Expired">Expired</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Preview Drawer */}
                        <button
                          onClick={() => setPreviewProposal(prop)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="View Details & Snapshot"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPdf(prop)}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Proposal */}
                        <button
                          onClick={() => handlePrintProposal(prop)}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print Proposal"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Email */}
                        {hasPermission('canSendEmail') && (
                          <button
                            onClick={() => {
                              setPreviewProposal(prop);
                              setIsEmailOpen(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Email Proposal to Client"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* WhatsApp */}
                        {hasPermission('canSendWhatsApp') && (
                          <button
                            onClick={() => {
                              setPreviewProposal(prop);
                              setIsWaOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Copy Public Link */}
                        <button
                          onClick={() => handleCopyLink(prop)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Copy Public Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate Proposal */}
                        {hasPermission('canCreateProposal') && (
                          <button
                            onClick={() => handleDuplicate(prop)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Proposal (Clone to Draft)"
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Generate or View Tax Invoice for Accepted Proposal */}
                        {prop.status === 'Accepted' && (isAdmin || hasPermission('createInvoice')) && (
                          <button
                            onClick={() => {
                              const existingInv = invoices.find((i) => i.proposalId === prop.id);
                              if (existingInv) {
                                setSelectedInvoiceForModal(existingInv);
                              } else {
                                handleCreateInvoice(prop);
                              }
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title={
                              invoices.some((i) => i.proposalId === prop.id)
                                ? 'View Generated Tax Invoice'
                                : 'Generate Tax Invoice from Proposal'
                            }
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Draft */}
                        {prop.status === 'Draft' && hasPermission('editProposal') && (
                          <button
                            onClick={() => onOpenProposalModal(prop)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Draft Proposal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Draft */}
                        {prop.status === 'Draft' && hasPermission('deleteDraftProposal') && (
                          <button
                            onClick={() => handleDeleteDraft(prop)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Draft Proposal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Proposal Details / Snapshot Drawer */}
      {previewProposal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="bg-slate-950 text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-800 text-indigo-300 font-mono">
                    {previewProposal.proposalNumber}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusBadge(previewProposal.status)}`}>
                    {previewProposal.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight mt-1 text-white">
                  Commercial Proposal Specification & Snapshot
                </h3>
                <p className="text-xs text-slate-400">
                  Client: {previewProposal.customerSnapshot?.companyName || previewProposal.customerName} | Issued: {new Date(previewProposal.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setPreviewProposal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleDownloadPdf(previewProposal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>

              <button
                onClick={() => handlePrintProposal(previewProposal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>

              {hasPermission('canSendEmail') && (
                <button
                  onClick={() => setIsEmailOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </button>
              )}

              {hasPermission('canSendWhatsApp') && (
                <button
                  onClick={() => setIsWaOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>
              )}

              <button
                onClick={() => setIsFollowupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                <CalendarClock className="w-3.5 h-3.5" /> Follow-up / Reminder
              </button>

              <button
                onClick={() => handleCopyLink(previewProposal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied Link' : 'Copy Link'}
              </button>

              {hasPermission('canCreateProposal') && (
                <button
                  onClick={() => handleDuplicate(previewProposal)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <CopyPlus className="w-3.5 h-3.5" /> Duplicate
                </button>
              )}

              {previewProposal.status === 'Draft' && hasPermission('editProposal') && (
                <button
                  onClick={() => {
                    const toEdit = previewProposal;
                    setPreviewProposal(null);
                    onOpenProposalModal(toEdit);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Draft
                </button>
              )}

              {/* Create or View Tax Invoice for Accepted Proposal */}
              {previewProposal.status === 'Accepted' && (isAdmin || hasPermission('createInvoice')) && (
                (() => {
                  const linkedInv = invoices.find((i) => i.proposalId === previewProposal.id);
                  if (linkedInv) {
                    return (
                      <button
                        onClick={() => setSelectedInvoiceForModal(linkedInv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> View Invoice ({linkedInv.invoiceNumber})
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => handleCreateInvoice(previewProposal)}
                      disabled={isCreatingInvoice}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {isCreatingInvoice ? 'Creating Invoice...' : 'Create Invoice'}
                    </button>
                  );
                })()
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Grand Total Card */}
              <div className="bg-linear-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-300 uppercase tracking-wider block font-semibold">
                    Grand Total
                  </span>
                  <span className="text-2xl font-black mt-0.5 block font-mono">
                    ₹{previewProposal.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    Taxable Base: ₹{previewProposal.taxableAmount.toLocaleString()} | GST Total: ₹{previewProposal.gstTotal.toLocaleString()}
                  </span>
                  <div className="mt-2 text-[11px] text-indigo-200 italic">
                    Amount in Words: {numberToWordsINR(previewProposal.grandTotal)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Proposal Lifecycle:</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      previewProposal.status === 'Accepted'
                        ? 'bg-emerald-500 text-white'
                        : previewProposal.status === 'Rejected'
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {previewProposal.status}
                  </span>
                </div>
              </div>

              {/* Customer Snapshot Card (Section 4) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                    Customer Information Snapshot (Immutable for this Proposal)
                  </span>
                  <span className="text-[10px] text-slate-400">Captured at generation</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Company Name</span>
                    <span className="font-semibold text-slate-800">
                      {previewProposal.customerSnapshot?.companyName || previewProposal.customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Contact Person</span>
                    <span className="font-medium text-slate-800">
                      {previewProposal.customerSnapshot?.contactPerson || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Mobile Phone</span>
                    <span className="font-mono text-slate-800">
                      {previewProposal.customerSnapshot?.mobile || previewProposal.customerMobile || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Email Address</span>
                    <span className="text-slate-800">
                      {previewProposal.customerSnapshot?.email || previewProposal.customerEmail || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">GSTIN</span>
                    <span className="font-mono text-slate-800">
                      {previewProposal.customerSnapshot?.gstNumber || previewProposal.customerGst || 'Unregistered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Address & Location</span>
                    <span className="text-slate-800">
                      {[
                        previewProposal.customerSnapshot?.address,
                        previewProposal.customerSnapshot?.city,
                        previewProposal.customerSnapshot?.state,
                        previewProposal.customerSnapshot?.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table (Section 5 pricing engine breakdown) */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Proposal Line Items ({previewProposal.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item & Description</th>
                        <th className="py-2.5 px-3 text-center">Type</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-center">Disc</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-center">GST %</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewProposal.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-slate-800 block">{it.name}</span>
                            {it.description && <span className="text-[10px] text-slate-400">{it.description}</span>}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 uppercase text-[10px] font-semibold">
                            {it.type || 'PRODUCT'}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {it.quantity} {it.unit || ''}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            ₹{it.unitPrice.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {it.discountPercent > 0 ? `${it.discountPercent}%` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            ₹{(it.taxableAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">{it.gstRate}%</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                            ₹{it.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Company & Bank Snapshot (Section 8, 9, 10) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                    Company Snapshot (at generation)
                  </span>
                  <p className="font-semibold text-slate-800">{previewProposal.companySnapshot?.companyName || 'SparkGenTechnology'}</p>
                  <p className="text-slate-600 text-[11px]">{previewProposal.companySnapshot?.address}</p>
                  <p className="text-slate-600 text-[11px]">GSTIN: {previewProposal.companySnapshot?.gstNumber || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">Phone: {previewProposal.companySnapshot?.phone || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">Email: {previewProposal.companySnapshot?.email || 'N/A'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                    Bank Snapshot (at generation)
                  </span>
                  <p className="font-semibold text-slate-800">{previewProposal.bankSnapshot?.bankName || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">A/C No: {previewProposal.bankSnapshot?.accountNumber || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">IFSC: {previewProposal.bankSnapshot?.ifscCode || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">Beneficiary: {previewProposal.bankSnapshot?.accountHolderName || 'N/A'}</p>
                  {previewProposal.bankSnapshot?.upiId && (
                    <p className="text-slate-600 text-[11px]">UPI: {previewProposal.bankSnapshot.upiId}</p>
                  )}
                </div>
              </div>

              {/* Notes & Terms */}
              {previewProposal.notes && (
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    Internal CRM Notes / Scope Specifications
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] whitespace-pre-line">
                    {previewProposal.notes}
                  </div>
                </div>
              )}

              {previewProposal.terms && (
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    Commercial Terms & Conditions
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 whitespace-pre-line text-[11px]">
                    {previewProposal.terms}
                  </div>
                </div>
              )}

              {/* Proposal Activity Timeline (Section 16: Proposal Tracking Timeline) */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" /> Proposal Activity & Lifecycle Timeline
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Real-time audit log</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  {/* Synthesis of real chronological events from proposal data + related activities */}
                  {(() => {
                    const timelineEvents: Array<{
                      id: string;
                      timestamp: string;
                      event: string;
                      userSource: string;
                      type: string;
                    }> = [];

                    if (previewProposal.createdAt) {
                      timelineEvents.push({
                        id: 'evt_created',
                        timestamp: previewProposal.createdAt,
                        event: 'Proposal Created',
                        userSource: previewProposal.createdByName || 'Sales Representative',
                        type: 'CREATED',
                      });
                    }

                    if (previewProposal.proposalDate) {
                      timelineEvents.push({
                        id: 'evt_gen',
                        timestamp: previewProposal.proposalDate,
                        event: 'PDF Generated & Document Finalized',
                        userSource: previewProposal.createdByName || 'System Generator',
                        type: 'GENERATED',
                      });
                    }

                    if (previewProposal.sentAt) {
                      timelineEvents.push({
                        id: 'evt_sent',
                        timestamp: previewProposal.sentAt,
                        event: 'Commercial Proposal Dispatched by Email',
                        userSource: previewProposal.sentBy || 'Commercial Desk',
                        type: 'EMAIL_SENT',
                      });
                    }

                    if (previewProposal.viewedAt) {
                      timelineEvents.push({
                        id: 'evt_viewed',
                        timestamp: previewProposal.viewedAt,
                        event: 'Proposal Document Viewed Online',
                        userSource: 'Client (via secure link)',
                        type: 'VIEWED',
                      });
                    }

                    if (previewProposal.acceptedAt) {
                      timelineEvents.push({
                        id: 'evt_acc',
                        timestamp: previewProposal.acceptedAt,
                        event: 'Proposal Formally Accepted (Won 🎉)',
                        userSource: previewProposal.acceptedBy || 'Authorized Client Representative',
                        type: 'ACCEPTED',
                      });
                    }

                    if (previewProposal.rejectedAt) {
                      timelineEvents.push({
                        id: 'evt_rej',
                        timestamp: previewProposal.rejectedAt,
                        event: `Proposal Rejected: "${previewProposal.rejectionReason || 'No reason provided'}"`,
                        userSource: previewProposal.acceptedBy || 'Client Representative',
                        type: 'REJECTED',
                      });
                    }

                    // Add related activities from activities collection
                    const relatedActs = (activities || []).filter(
                      (a) => a.relatedId === previewProposal.id || a.customerId === previewProposal.customerId
                    );
                    relatedActs.forEach((act) => {
                      if (act.type === 'PROPOSAL_DOWNLOADED') {
                        timelineEvents.push({
                          id: act.id,
                          timestamp: act.timestamp || act.createdAt || new Date().toISOString(),
                          event: 'Proposal Official PDF Downloaded',
                          userSource: act.userName || 'Customer (via link)',
                          type: 'DOWNLOADED',
                        });
                      } else if (act.type === 'FOLLOWUP_CREATED') {
                        timelineEvents.push({
                          id: act.id,
                          timestamp: act.timestamp || act.createdAt || new Date().toISOString(),
                          event: `Commercial Follow-up Scheduled: ${act.title || ''}`,
                          userSource: act.userName || 'Account Executive',
                          type: 'FOLLOWUP_CREATED',
                        });
                      }
                    });

                    // Sort chronologically ascending
                    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                    if (timelineEvents.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic">No timeline events recorded yet.</p>
                      );
                    }

                    return (
                      <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {timelineEvents.map((evt, idx) => (
                          <div key={evt.id || idx} className="relative text-xs">
                            <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-2xs" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="font-bold text-slate-900">{evt.event}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(evt.timestamp).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Actor / Source: <span className="font-medium text-slate-700">{evt.userSource}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Status Update Quick Buttons */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Update Proposal Lifecycle State
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusUpdate(previewProposal.id, 'Sent')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Mark as Sent
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(previewProposal.id, 'Viewed')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Mark as Viewed
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(previewProposal.id, 'Under Discussion')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Mark as Under Discussion
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(previewProposal.id, 'Accepted')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Mark as Accepted (Won)
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(previewProposal.id, 'Rejected')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Mark as Rejected
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(previewProposal.id, 'Cancelled')}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Mark as Cancelled
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Prompt Modal */}
      {rejectProposalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Proposal Rejection Reason</h4>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Budget deferred, chosen competitor, price revised..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectProposalId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Proposal Email & WhatsApp Sending */}
      {previewProposal && (
        <>
          <SendProposalEmailModal
            isOpen={isEmailOpen}
            onClose={() => setIsEmailOpen(false)}
            proposal={previewProposal}
          />
          <WhatsAppModal
            isOpen={isWaOpen}
            onClose={() => setIsWaOpen(false)}
            entity={{
              id: previewProposal.customerId,
              companyName: previewProposal.customerSnapshot?.companyName || previewProposal.customerName,
              contactPerson: previewProposal.customerSnapshot?.contactPerson || previewProposal.customerName,
              mobile: previewProposal.customerSnapshot?.mobile || previewProposal.customerMobile || '',
              email: previewProposal.customerSnapshot?.email || previewProposal.customerEmail || '',
              status: 'Proposal Sent',
            } as any}
            entityType="customer"
          />
          <CreateReminderModal
            isOpen={isFollowupModalOpen}
            onClose={() => setIsFollowupModalOpen(false)}
            initialCustomerId={previewProposal.customerId}
            initialProposalId={previewProposal.id}
            initialTitle={`Follow-up on Proposal ${previewProposal.proposalNumber}`}
            initialMessage={`Check with ${previewProposal.customerName || 'customer'} regarding commercial proposal ${previewProposal.proposalNumber}`}
          />
        </>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={!!selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        invoice={selectedInvoiceForModal}
      />

      {/* Invoice creation toast */}
      {invoiceToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{invoiceToast}</span>
        </div>
      )}
    </div>
  );
};
