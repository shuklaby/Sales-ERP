import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Clock,
  MessageSquare,
  FileCheck,
  ShieldCheck,
  Edit2,
  Trash2,
  Plus,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Users,
  Video,
  FileSpreadsheet,
  Tag,
  ArrowRight,
  RefreshCw,
  UserPlus,
  FolderOpen,
} from 'lucide-react';
import {
  Customer,
  Activity,
  ProposalRecord,
  STSRecord,
  CallRecord,
  FollowUpRecord,
  MeetingRecord,
  WhatsAppRecord,
  EmailRecord,
  CustomerStatus,
} from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CallModal, WhatsAppModal, EmailModal, MeetingModal, FollowUpModal } from './ActionModals';
import { CustomerDocumentsTab } from './CustomerDocumentsTab';
import { CustomerPortalTab } from './CustomerPortalTab';
import { CustomerCommunicationTab } from '../communication/CustomerCommunicationTab';

export type CustomerDetailTab =
  | 'overview'
  | 'activities'
  | 'calls'
  | 'whatsapp'
  | 'emails'
  | 'communication'
  | 'meetings'
  | 'followups'
  | 'sts'
  | 'proposals'
  | 'finance'
  | 'documents'
  | 'portal';

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onOpenProposalModal: (customer: Customer) => void;
  onOpenSTSModal: (customer: Customer) => void;
  initialTab?: CustomerDetailTab;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  onClose,
  onEdit,
  onOpenProposalModal,
  onOpenSTSModal,
  initialTab = 'overview',
}) => {
  const {
    customers,
    activities,
    proposals,
    stsRecords,
    calls,
    followups,
    meetings,
    whatsappLogs,
    emailRecords,
    invoices,
    payments,
    receipts,
    creditNotes,
    deleteCustomer,
    updateCustomer,
    employees,
    logActivity,
    updateFollowUpStatus,
    updateMeeting,
  } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<CustomerDetailTab>(initialTab);

  // Modals state
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isWaOpen, setIsWaOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);

  // Quick activity note
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Always use the latest customer data from Firestore context
  const activeCustomer = useMemo(() => {
    if (!customer) return null;
    return customers.find((c) => c.id === customer.id) || customer;
  }, [customer, customers]);

  if (!activeCustomer) return null;

  // Filter all records connected to this customerId
  const customerActivities = activities
    .filter(
      (a) =>
        a.customerId === activeCustomer.id ||
        a.customerId === activeCustomer.customerId ||
        a.metadata?.customerId === activeCustomer.id ||
        a.metadata?.customerId === activeCustomer.customerId
    )
    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime());

  const customerCalls = calls
    .filter((c) => c.customerId === activeCustomer.id || c.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.createdAt || b.dateTime || 0).getTime() - new Date(a.createdAt || a.dateTime || 0).getTime());

  const customerFollowups = followups
    .filter((f) => f.customerId === activeCustomer.id || f.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const customerMeetings = meetings
    .filter((m) => m.customerId === activeCustomer.id || m.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const customerWhatsapp = whatsappLogs
    .filter((w) => w.customerId === activeCustomer.id || w.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const customerEmails = emailRecords
    .filter((e) => e.customerId === activeCustomer.id || e.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());

  const customerSts = stsRecords
    .filter((s) => s.customerId === activeCustomer.id || s.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const customerProposals = proposals
    .filter((p) => p.customerId === activeCustomer.id || p.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const customerInvoices = invoices
    .filter(
      (i) =>
        (i.customerId === activeCustomer.id || i.customerId === activeCustomer.customerId) &&
        i.status !== 'Cancelled'
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const customerPayments = payments
    .filter(
      (p) =>
        (p.customerId === activeCustomer.id || p.customerId === activeCustomer.customerId) &&
        p.status === 'Confirmed'
    )
    .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime());

  const customerReceipts = receipts
    .filter((r) => r.customerId === activeCustomer.id || r.customerId === activeCustomer.customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalInvoiced = customerInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = customerPayments.reduce((s, p) => s + (p.isReversal ? -p.amount : p.amount), 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    await updateCustomer(activeCustomer.id, { status: newStatus });
  };

  const handleAssignEmployee = async (employeeId: string) => {
    const emp = employees.find((e) => e.uid === employeeId);
    await updateCustomer(activeCustomer.id, {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: emp?.name || 'Unassigned',
    });
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete "${activeCustomer.companyName}"? This action cannot be undone.`)) {
      await deleteCustomer(activeCustomer.id);
      onClose();
    }
  };

  const handleAddQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !userProfile) return;
    setIsSavingNote(true);
    try {
      await logActivity(
        'customer_updated',
        'Customer Note Added',
        `${userProfile.name} added note: "${newNote.trim()}"`,
        activeCustomer.id
      );
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const getStatusBadge = (status: Customer['status']) => {
    const map: Record<string, string> = {
      New: 'bg-blue-100 text-blue-800 border-blue-200',
      Contacted: 'bg-purple-100 text-purple-800 border-purple-200',
      Interested: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      Meeting: 'bg-amber-100 text-amber-800 border-amber-200',
      'Proposal Sent': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      Negotiation: 'bg-orange-100 text-orange-800 border-orange-200',
      Won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Lost: 'bg-rose-100 text-rose-800 border-rose-200',
      Inactive: 'bg-slate-200 text-slate-700 border-slate-300',
      'Follow-up': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return map[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const tabs: { id: CustomerDetailTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'activities', label: 'Activities', count: customerActivities.length },
    { id: 'calls', label: 'Calls', count: customerCalls.length },
    { id: 'whatsapp', label: 'WhatsApp', count: customerWhatsapp.length },
    { id: 'emails', label: 'Emails', count: customerEmails.length },
    { id: 'communication', label: 'Communication' },
    { id: 'meetings', label: 'Meetings', count: customerMeetings.length },
    { id: 'followups', label: 'Follow-ups', count: customerFollowups.length },
    { id: 'sts', label: 'STS', count: customerSts.length },
    { id: 'proposals', label: 'Proposals', count: customerProposals.length },
    { id: 'finance', label: 'Finance', count: customerInvoices.length },
    { id: 'documents', label: 'Documents' },
    { id: 'portal', label: 'Portal & Invites' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
        <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-mono font-semibold tracking-wider border border-slate-700">
                  {activeCustomer.customerId}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadge(activeCustomer.status)}`}>
                  {activeCustomer.status}
                </span>
                {activeCustomer.leadSource && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    Source: {activeCustomer.leadSource}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">{activeCustomer.companyName}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {activeCustomer.contactPerson}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {activeCustomer.mobile}
                </span>
                {activeCustomer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {activeCustomer.city}, {activeCustomer.state}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {(isAdmin || hasPermission('editCustomer')) && (
                <button
                  onClick={() => onEdit(activeCustomer)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Edit Customer Details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {(isAdmin || hasPermission('deleteCustomer')) && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete Customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {hasPermission('makeCalls') && (
                <button
                  onClick={() => setIsCallOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" /> Log Call
                </button>
              )}
              {hasPermission('sendWhatsApp') && (
                <button
                  onClick={() => setIsWaOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>
              )}
              {hasPermission('sendEmail') && (
                <button
                  onClick={() => setIsEmailOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </button>
              )}
              {hasPermission('createFollowup') && (
                <button
                  onClick={() => setIsMeetingOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" /> Meeting
                </button>
              )}
              {hasPermission('createFollowup') && (
                <button
                  onClick={() => setIsFollowUpOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5" /> Follow-up
                </button>
              )}
              {hasPermission('createSTS') && (
                <button
                  onClick={() => onOpenSTSModal(activeCustomer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <FileCheck className="w-3.5 h-3.5" /> STS
                </button>
              )}
              {hasPermission('createProposal') && (
                <button
                  onClick={() => onOpenProposalModal(activeCustomer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" /> Proposal
                </button>
              )}
              <button
                onClick={() => setActiveTab('portal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" /> Portal & Invites
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Status Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                <select
                  value={activeCustomer.status}
                  onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium shadow-2xs focus:ring-1 focus:ring-slate-900"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Admin Employee Reassignment */}
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assignee:</span>
                  <select
                    value={activeCustomer.assignedEmployeeId || ''}
                    onChange={(e) => handleAssignEmployee(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium shadow-2xs focus:ring-1 focus:ring-slate-900 max-w-[140px] truncate"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.uid} value={emp.uid}>
                        {emp.name} ({emp.department || 'Sales'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 9 Tabs Bar */}
          <div className="bg-white border-b border-slate-200 px-5 flex overflow-x-auto scrollbar-none gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-3xl">
                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">Calls</span>
                    <span className="text-xl font-bold text-slate-800">{customerCalls.length}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">Follow-ups</span>
                    <span className="text-xl font-bold text-blue-600">{customerFollowups.length}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">STS Specs</span>
                    <span className="text-xl font-bold text-purple-600">{customerSts.length}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">Proposals</span>
                    <span className="text-xl font-bold text-emerald-600">{customerProposals.length}</span>
                  </div>
                </div>

                {/* Company & Contact Profile */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" /> Corporate Account Profile
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Company Name</span>
                      <span className="font-semibold text-slate-900 text-sm">{activeCustomer.companyName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Customer ID</span>
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                        {activeCustomer.customerId}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Primary Contact Person</span>
                      <span className="font-medium text-slate-800">{activeCustomer.contactPerson}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Mobile Number</span>
                      <a
                        href={`tel:${activeCustomer.mobile}`}
                        className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> {activeCustomer.mobile}
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Alternate Mobile</span>
                      <span className="text-slate-800">
                        {activeCustomer.alternateMobile || activeCustomer.alternateNumber || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Corporate Email</span>
                      {activeCustomer.email ? (
                        <a
                          href={`mailto:${activeCustomer.email}`}
                          className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5" /> {activeCustomer.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">GST Number</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {activeCustomer.gstNumber || 'Not Registered / Unspecified'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Assigned Account Manager</span>
                      <span className="font-medium text-slate-800">
                        {activeCustomer.assignedEmployeeName || 'Unassigned'}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block mb-0.5">Address</span>
                      <p className="text-slate-700">
                        {activeCustomer.address ? `${activeCustomer.address}, ` : ''}
                        {activeCustomer.city ? `${activeCustomer.city}, ` : ''}
                        {activeCustomer.state ? `${activeCustomer.state} ` : ''}
                        {activeCustomer.pincode ? `- ${activeCustomer.pincode}` : ''}
                        {!activeCustomer.address && !activeCustomer.city && 'No street address provided.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Next Follow-up</span>
                      <span className="font-medium text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {activeCustomer.nextFollowupDate || activeCustomer.nextFollowUp
                          ? `${activeCustomer.nextFollowupDate || activeCustomer.nextFollowUp} at ${activeCustomer.nextFollowupTime || '11:00'}`
                          : 'No upcoming follow-up scheduled'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Lead Acquisition Source</span>
                      <span className="font-medium text-slate-800">{activeCustomer.leadSource || 'Direct Client'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes & Audit Block */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Account Notes & Record History</h3>
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-200 whitespace-pre-wrap">
                    {activeCustomer.notes || 'No general notes recorded for this account.'}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Created: {new Date(activeCustomer.createdAt).toLocaleString()} by {activeCustomer.createdBy || 'System'}
                    </span>
                    <span>
                      Last Updated: {new Date(activeCustomer.updatedAt).toLocaleString()} by {activeCustomer.updatedBy || 'System'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACTIVITIES TAB */}
            {activeTab === 'activities' && (
              <div className="space-y-4 max-w-3xl">
                {/* Quick note form */}
                <form onSubmit={handleAddQuickNote} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Log Real-Time Customer Note / Milestone
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="e.g. Client requested revised quote with 5-year AMC terms..."
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={isSavingNote || !newNote.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      {isSavingNote ? 'Saving...' : 'Post Activity'}
                    </button>
                  </div>
                </form>

                {/* Timeline */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Customer Real-Time Activity Timeline ({customerActivities.length})
                  </h3>

                  {customerActivities.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No activities logged for this customer yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {customerActivities.map((act) => (
                        <div key={act.id} className="relative group">
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span className="font-semibold text-slate-700">{act.userName} ({act.userRole})</span>
                              <span>{new Date(act.timestamp || act.createdAt || '').toLocaleString()}</span>
                            </div>
                            <div className="font-semibold text-slate-900">{act.title}</div>
                            <p className="text-slate-600">{act.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CALLS TAB */}
            {activeTab === 'calls' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Call Logs ({customerCalls.length})
                  </h3>
                  {hasPermission('makeCalls') && (
                    <button
                      onClick={() => setIsCallOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Call
                    </button>
                  )}
                </div>

                {customerCalls.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No calls recorded yet for {activeCustomer.companyName}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerCalls.map((call) => (
                      <div key={call.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            {call.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(call.createdAt || call.dateTime).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700">{call.notes}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Logged by: {call.employeeName}</span>
                          {call.followUpDate && (
                            <span className="text-amber-600 font-medium">Follow-up: {call.followUpDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. WHATSAPP TAB */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    WhatsApp Communication ({customerWhatsapp.length})
                  </h3>
                  {hasPermission('sendWhatsApp') && (
                    <button
                      onClick={() => setIsWaOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Compose WhatsApp
                    </button>
                  )}
                </div>

                {customerWhatsapp.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No WhatsApp interactions recorded yet. Click &quot;Compose WhatsApp&quot; to initiate a direct chat.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerWhatsapp.map((w) => (
                      <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> {w.mobile}
                          </span>
                          <span>{new Date(w.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 font-mono text-[11px]">
                          {w.message}
                        </p>
                        <span className="text-[11px] text-slate-400 block text-right">Sent by {w.employeeName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. EMAILS TAB */}
            {activeTab === 'emails' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Dispatched Emails ({customerEmails.length})
                  </h3>
                  {hasPermission('sendEmail') && (
                    <button
                      onClick={() => setIsEmailOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Send Email
                    </button>
                  )}
                </div>

                {customerEmails.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No emails logged for this customer yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerEmails.map((email) => (
                      <div key={email.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{email.subject}</span>
                          <span className="text-[11px] text-slate-400">
                            {email.sentAt ? new Date(email.sentAt).toLocaleString() : '-'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs">To: {email.recipient}</p>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap text-[11px]">
                          {email.message}
                        </div>
                        <span className="text-[11px] text-slate-400 block text-right">Sent by {email.employeeName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. MEETINGS TAB */}
            {activeTab === 'meetings' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Scheduled Meetings ({customerMeetings.length})
                  </h3>
                  {hasPermission('createFollowup') && (
                    <button
                      onClick={() => setIsMeetingOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Schedule Meeting
                    </button>
                  )}
                </div>

                {customerMeetings.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No meetings scheduled for this customer.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerMeetings.map((mtg) => (
                      <div key={mtg.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            {mtg.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              mtg.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : mtg.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {mtg.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div>Date & Time: <span className="font-semibold text-slate-900">{mtg.date} at {mtg.time}</span></div>
                          <div>Location: <span className="font-semibold text-slate-900">{mtg.location || 'Virtual'}</span></div>
                        </div>

                        {mtg.meetingLink && (
                          <a
                            href={mtg.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs"
                          >
                            <Video className="w-3.5 h-3.5" /> Open Meeting Room
                          </a>
                        )}

                        {mtg.notes && <p className="text-slate-700 bg-slate-50 p-2 rounded-md">{mtg.notes}</p>}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                          <span>Host: {mtg.employeeName}</span>
                          {mtg.status === 'Scheduled' && (
                            <button
                              onClick={() => updateMeeting(mtg.id, { status: 'Completed' })}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. FOLLOW-UPS TAB */}
            {activeTab === 'followups' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Follow-up Reminders ({customerFollowups.length})
                  </h3>
                  {hasPermission('createFollowup') && (
                    <button
                      onClick={() => setIsFollowUpOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Follow-up
                    </button>
                  )}
                </div>

                {customerFollowups.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No active follow-ups for this customer.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerFollowups.map((fup) => (
                      <div key={fup.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{fup.reason}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fup.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : fup.status === 'Overdue'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {fup.status}
                          </span>
                        </div>

                        <div className="text-slate-600">
                          Due Date: <span className="font-semibold text-slate-900">{fup.date} at {fup.time}</span>
                        </div>

                        {fup.notes && <p className="text-slate-600 bg-slate-50 p-2 rounded-md">{fup.notes}</p>}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                          <span>Assignee: {fup.employeeName}</span>
                          {fup.status !== 'Completed' && (
                            <button
                              onClick={() => updateFollowUpStatus(fup.id, 'Completed')}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 8. STS TAB */}
            {activeTab === 'sts' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sales Technical Specifications (STS) ({customerSts.length})
                  </h3>
                  {hasPermission('createSTS') && (
                    <button
                      onClick={() => onOpenSTSModal(activeCustomer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create STS
                    </button>
                  )}
                </div>

                {customerSts.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No Technical Specification (STS) created for this client yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerSts.map((sts) => (
                      <div key={sts.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-purple-700">{sts.stsNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            {sts.status}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium">{sts.requirement}</p>
                        <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                          <span>Amount: ₹{sts.amount.toLocaleString()}</span>
                          <span>Created: {new Date(sts.createdAt).toLocaleDateString()} by {sts.createdByName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 9. PROPOSALS TAB */}
            {activeTab === 'proposals' && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Commercial Proposals ({customerProposals.length})
                  </h3>
                  {hasPermission('createProposal') && (
                    <button
                      onClick={() => onOpenProposalModal(activeCustomer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Proposal
                    </button>
                  )}
                </div>

                {customerProposals.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                    No proposals generated for {activeCustomer.companyName} yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerProposals.map((prop) => (
                      <div key={prop.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">{prop.proposalNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                prop.status === 'Accepted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : prop.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {prop.status}
                            </span>
                          </div>
                          <span className="font-black text-slate-900 text-sm">
                            ₹{prop.grandTotal.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                          <span>Valid Until: {prop.validUntil}</span>
                          <span>Items: {prop.items.length}</span>
                          <span>Issued by {prop.createdByName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="space-y-5 max-w-3xl">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Invoiced
                    </span>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      ₹{totalInvoiced.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">{customerInvoices.length} invoices</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                      Total Paid
                    </span>
                    <div className="text-base font-bold text-emerald-600 mt-1">
                      ₹{totalPaid.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-emerald-600/80">{customerPayments.length} confirmed payments</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                      Outstanding Balance
                    </span>
                    <div className="text-base font-bold text-amber-600 mt-1">
                      ₹{totalOutstanding.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-amber-600/80">Net receivables due</span>
                  </div>
                </div>

                {/* Invoices */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Invoices ({customerInvoices.length})
                  </h4>
                  {customerInvoices.length === 0 ? (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                      No invoices created for {activeCustomer.companyName} yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerInvoices.map((inv) => (
                        <div key={inv.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.status === 'Partially Paid'
                                    ? 'bg-amber-100 text-amber-800'
                                    : inv.status === 'Overdue'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Issued: {inv.invoiceDate} • Due: {inv.dueDate}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">
                              ₹{inv.grandTotal.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Paid: ₹{inv.paidAmount.toLocaleString()} • Due: ₹{inv.outstandingAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Confirmed Payments ({customerPayments.length})
                  </h4>
                  {customerPayments.length === 0 ? (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                      No confirmed payment records on file.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerPayments.map((p) => (
                        <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {p.paymentMethod} • Ref: {p.transactionReference}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Date: {p.paymentDate} • Invoice: {p.invoiceNumber || 'Direct Settlement'}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600">
                            +₹{p.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 11. DOCUMENTS TAB (Phase 14) */}
            {activeTab === 'documents' && <CustomerDocumentsTab customer={activeCustomer} />}

            {/* 12. PORTAL & INVITES TAB (Phase 14) */}
            {activeTab === 'portal' && <CustomerPortalTab customer={activeCustomer} />}

            {/* 13. COMMUNICATION TAB (Phase 15) */}
            {activeTab === 'communication' && <CustomerCommunicationTab customer={activeCustomer} />}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {isCallOpen && (
        <CallModal
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          entity={activeCustomer}
          entityType="customer"
        />
      )}

      {isWaOpen && (
        <WhatsAppModal
          isOpen={isWaOpen}
          onClose={() => setIsWaOpen(false)}
          entity={activeCustomer}
          entityType="customer"
        />
      )}

      {isEmailOpen && (
        <EmailModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          entity={activeCustomer}
          entityType="customer"
        />
      )}

      {isMeetingOpen && (
        <MeetingModal
          isOpen={isMeetingOpen}
          onClose={() => setIsMeetingOpen(false)}
          entity={activeCustomer}
          entityType="customer"
        />
      )}

      {isFollowUpOpen && (
        <FollowUpModal
          isOpen={isFollowUpOpen}
          onClose={() => setIsFollowUpOpen(false)}
          entity={activeCustomer}
          entityType="customer"
        />
      )}
    </>
  );
};
