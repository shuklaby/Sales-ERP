import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Target,
  FileCheck,
  Kanban,
  CalendarClock,
  PhoneCall,
  Calendar,
  FileText,
  Activity,
  BarChart3,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  User,
  Users,
  Building,
  Sparkles,
  Phone,
  Trash2,
  RotateCcw,
  CheckSquare,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { Lead, STSRecord, CallRecord, FollowUpRecord, ProposalRecord, Customer } from '../../types/crm';
import { calculateSalesMetrics } from '../../services/salesService';

import { SalesPipelineKanban } from '../sales/SalesPipelineKanban';
import { TalkHuiModal } from '../sales/TalkHuiModal';
import { FollowUpOutcomeModal } from '../sales/FollowUpOutcomeModal';
import { BulkLeadUploadView } from '../sales/BulkLeadUploadView';
import { BulkSTSUploadView } from '../sales/BulkSTSUploadView';
import { TodayFollowupsView } from '../sales/TodayFollowupsView';
import { SalesSettingsTab } from '../sales/SalesSettingsTab';
import { SalesActivityTimeline } from '../sales/SalesActivityTimeline';
import { DuplicateWarningModal } from '../sales/DuplicateWarningModal';

import { LeadModal } from '../modals/LeadModal';
import { STSModal } from '../modals/STSModal';
import { CallModal } from '../modals/ActionModals';

export type SalesTab =
  | 'dashboard'
  | 'leads'
  | 'sts'
  | 'pipeline'
  | 'follow-ups'
  | 'calls'
  | 'meetings'
  | 'proposals'
  | 'activities'
  | 'reports'
  | 'settings'
  | 'today'
  | 'import-leads'
  | 'import-sts';

interface SalesHubViewProps {
  initialTab?: SalesTab;
  employeeMode?: boolean;
  onOpenProposalModal?: (proposal?: ProposalRecord) => void;
}

export const SalesHubView: React.FC<SalesHubViewProps> = ({
  initialTab = 'dashboard',
  employeeMode = false,
  onOpenProposalModal,
}) => {
  const {
    leads,
    stsRecords,
    calls,
    followups,
    proposals,
    meetings,
    customers,
    employees,
    updateLead,
    convertLeadToCustomer,
    updateSTS,
    initiateCall,
    addFollowUp,
    bulkAssignLeads,
    bulkUpdateLeadStatus,
    bulkAssignSTS,
    bulkUpdateSTSStatus,
    checkDuplicateCustomer,
  } = useCrmData();

  const { isAdmin, userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<SalesTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Modals state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLeadToEdit, setSelectedLeadToEdit] = useState<Lead | null>(null);

  const [isSTSModalOpen, setIsSTSModalOpen] = useState(false);
  const [selectedSTSToEdit, setSelectedSTSToEdit] = useState<STSRecord | null>(null);

  const [talkHuiSTS, setTalkHuiSTS] = useState<STSRecord | null>(null);
  const [outcomeFollowup, setOutcomeFollowup] = useState<FollowUpRecord | null>(null);

  // Direct Call modal
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callEntity, setCallEntity] = useState<any>(null);

  // Duplicate warning state on convert
  const [duplicateModalData, setDuplicateModalData] = useState<{
    lead: Lead;
    matches: any[];
  } | null>(null);

  // Bulk selection states for Leads & STS
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedSTSIds, setSelectedSTSIds] = useState<string[]>([]);
  const [bulkAssignEmployeeId, setBulkAssignEmployeeId] = useState('');
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState<'leads' | 'sts'>('leads');

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [repFilter, setRepFilter] = useState('ALL');

  // RBAC Permission Scoping
  const isEmployeeOnly = employeeMode || (!isAdmin && !hasPermission('canViewAllCustomers') && !hasPermission('viewCustomers'));

  const permittedLeads = useMemo(() => {
    if (!isEmployeeOnly) return leads;
    return leads.filter(
      (l) => l.assignedEmployeeId === userProfile?.uid || l.createdBy === userProfile?.uid
    );
  }, [leads, isEmployeeOnly, userProfile]);

  const permittedSTS = useMemo(() => {
    if (!isEmployeeOnly) return stsRecords;
    return stsRecords.filter(
      (s) => s.assignedEmployeeId === userProfile?.uid || s.createdBy === userProfile?.uid
    );
  }, [stsRecords, isEmployeeOnly, userProfile]);

  const permittedCalls = useMemo(() => {
    if (!isEmployeeOnly) return calls;
    return calls.filter((c) => c.employeeId === userProfile?.uid);
  }, [calls, isEmployeeOnly, userProfile]);

  const permittedFollowups = useMemo(() => {
    if (!isEmployeeOnly) return followups;
    return followups.filter((f) => f.employeeId === userProfile?.uid);
  }, [followups, isEmployeeOnly, userProfile]);

  const permittedProposals = useMemo(() => {
    if (!isEmployeeOnly) return proposals;
    return proposals.filter(
      (p) => p.assignedEmployeeId === userProfile?.uid || p.createdBy === userProfile?.uid
    );
  }, [proposals, isEmployeeOnly, userProfile]);

  // Metrics
  const metrics = useMemo(() => {
    return calculateSalesMetrics({
      leads: permittedLeads,
      stsRecords: permittedSTS,
      calls: permittedCalls,
      followups: permittedFollowups,
      proposals: permittedProposals,
      employees,
    });
  }, [permittedLeads, permittedSTS, permittedCalls, permittedFollowups, permittedProposals, employees]);

  // Lead Conversion handler
  const handleInitiateLeadConversion = (lead: Lead) => {
    const dupCheck = checkDuplicateCustomer({
      phone: lead.phone || lead.mobile,
      email: lead.email,
      gstNumber: lead.gstNumber,
    });

    if (dupCheck.hasDuplicate) {
      setDuplicateModalData({ lead, matches: dupCheck.matches });
    } else {
      executeLeadConversion(lead.id);
    }
  };

  const executeLeadConversion = async (leadId: string) => {
    try {
      await convertLeadToCustomer(leadId);
      alert('Lead successfully converted to Customer! Customer record and history preserved.');
      setDuplicateModalData(null);
    } catch (err: any) {
      alert(`Conversion notice: ${err?.message || 'Failed to convert lead'}`);
    }
  };

  // Quick Call click
  const handleDirectDial = async (entity: { id: string; name: string; contactPerson: string; phone?: string; mobile?: string; type: 'lead' | 'sts' | 'customer' }) => {
    const phoneNum = entity.phone || entity.mobile;
    if (!phoneNum) {
      alert('No phone number listed for this record.');
      return;
    }

    try {
      await initiateCall({
        customerId: entity.type === 'customer' ? entity.id : undefined,
        leadId: entity.type === 'lead' ? entity.id : undefined,
        companyName: entity.name,
        contactPerson: entity.contactPerson,
        mobile: phoneNum,
      });
      setCallEntity(entity);
      setIsCallModalOpen(true);
    } catch (err: any) {
      console.error('Dialer error:', err);
    }
  };

  // Export Leads
  const handleExportLeads = () => {
    const data = permittedLeads.map((l) => ({
      'Lead Number': l.leadNumber || l.leadId,
      'Company Name': l.companyName,
      'Contact Person': l.contactPerson,
      'Phone': l.phone || l.mobile,
      'Email': l.email || '',
      'GST Number': l.gstNumber || '',
      'Status': l.status,
      'Priority': l.priority || 'Medium',
      'Source': l.source || l.leadSource || 'Direct',
      'Estimated Value': l.estimatedValue || 0,
      'Assigned Rep': l.assignedEmployeeName || 'Unassigned',
      'Next Follow-up': l.nextFollowupDate || l.nextFollowUp || '',
      'Requirement': l.requirement || '',
      'Created Date': l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_export_${Date.now()}.xlsx`);
  };

  // Export STS
  const handleExportSTS = () => {
    const data = permittedSTS.map((s) => ({
      'STS Number': s.stsNumber,
      'Customer / Client': s.companyName,
      'Contact Person': s.contactPerson,
      'Phone': s.phone || '',
      'Email': s.email || '',
      'Requirement': s.requirement,
      'Status': s.status,
      'Talk Status': s.talkStatus || 'Not Spoken',
      'Amount': s.amount || 0,
      'Assigned Rep': s.assignedEmployeeName || 'Unassigned',
      'Next Follow-up': s.followUpDate || '',
      'Remarks': s.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'STS_Records');
    XLSX.writeFile(wb, `sts_export_${Date.now()}.xlsx`);
  };

  // Bulk actions
  const handleConfirmBulkAssign = async () => {
    if (!bulkAssignEmployeeId) return;
    const emp = employees.find((e) => e.uid === bulkAssignEmployeeId);
    const empName = emp?.name || 'Assigned Rep';

    if (bulkAssignTarget === 'leads') {
      await bulkAssignLeads(selectedLeadIds, bulkAssignEmployeeId, empName);
      setSelectedLeadIds([]);
    } else {
      await bulkAssignSTS(selectedSTSIds, bulkAssignEmployeeId, empName);
      setSelectedSTSIds([]);
    }
    setIsBulkAssignModalOpen(false);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              {isEmployeeOnly ? 'Employee Sales Workspace' : 'Enterprise Sales Suite & CRM'}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEmployeeOnly ? 'My Sales Operations & Pipeline' : 'Unified Sales Pipeline, Leads & STS'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Real-time pipeline orchestration, STS technical tracking, instant call logging, duplicate customer guard, and conversion automation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                setSelectedLeadToEdit(null);
                setIsLeadModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Lead
            </button>
            <button
              onClick={() => {
                setSelectedSTSToEdit(null);
                setIsSTSModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              New STS
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Today's Actions
            {metrics.dueTodayFollowupsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                activeTab === 'today' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
              }`}>
                {metrics.dueTodayFollowupsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4" />
            Leads
            <span className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
              activeTab === 'leads' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'
            }`}>
              {permittedLeads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sts')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'sts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            STS (Sales Tracking)
            <span className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
              activeTab === 'sts' ? 'bg-white text-blue-700' : 'bg-amber-100 text-amber-800'
            }`}>
              {permittedSTS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'pipeline'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Kanban className="w-4 h-4" />
            Pipeline (Kanban)
          </button>

          <button
            onClick={() => setActiveTab('follow-ups')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'follow-ups'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            Follow-ups
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'calls'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            Calls Log
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'meetings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Meetings
          </button>

          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'proposals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Proposals
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'activities'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Timeline
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Reports
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              Sources & Stages
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Active Leads</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {metrics.activeLeads}
              </div>
              <div className="text-3xs text-slate-400 mt-1">
                Total pipeline: ₹{metrics.totalPipelineValue.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Deals Won</span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {metrics.wonLeads}
              </div>
              <div className="text-3xs text-emerald-600 font-semibold mt-1">
                Conversion: {metrics.conversionRate}% (₹{metrics.wonPipelineValue.toLocaleString('en-IN')})
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-amber-800 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>STS Pipeline</span>
                <FileCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {metrics.totalSTS}
              </div>
              <div className="text-3xs text-slate-500 mt-1">
                Valuation: ₹{metrics.totalSTSValue.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-blue-800 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Today's Actions</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-900 mt-2">
                {metrics.dueTodayFollowupsCount}
              </div>
              <div className="text-3xs text-slate-500 mt-1">
                {metrics.callsTodayCount} calls made today • {metrics.overdueFollowupsCount} overdue
              </div>
            </div>
          </div>

          {/* Pipeline Funnel & Source Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Pipeline Conversion Funnel
              </h3>
              <div className="space-y-3 pt-2">
                {metrics.sourcePerformance.slice(0, 5).map((sp) => (
                  <div key={sp.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{sp.source}</span>
                      <span>
                        {sp.wonCount} won / {sp.count} leads ({sp.conversionRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(8, sp.conversionRate))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Executive Deal Conversion Leaderboard
              </h3>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {metrics.employeePerformance.map((emp, i) => (
                  <div key={emp.employeeId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-black text-2xs flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{emp.employeeName}</div>
                        <div className="text-3xs text-slate-400">{emp.department} • {emp.callsCount} calls</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-700">
                        ₹{emp.totalWonValue.toLocaleString('en-IN')}
                      </div>
                      <div className="text-3xs text-slate-500 font-semibold">
                        {emp.wonCount} won ({emp.conversionRate}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TODAY'S ACTIONS */}
      {activeTab === 'today' && (
        <TodayFollowupsView
          onOpenLeadModal={(lead) => {
            setSelectedLeadToEdit(lead || null);
            setIsLeadModalOpen(true);
          }}
          onOpenSTSModal={(sts) => {
            setSelectedSTSToEdit(sts || null);
            setIsSTSModalOpen(true);
          }}
          onOpenProposalModal={onOpenProposalModal}
        />
      )}

      {/* TAB 3: LEADS REGISTRY */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search leads by name, phone, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="ALL">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('import-leads')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Import
                </button>
              )}
              <button
                onClick={handleExportLeads}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedLeadToEdit(null);
                  setIsLeadModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lead
              </button>
            </div>
          </div>

          {/* Bulk Action Toolbar if selected */}
          {selectedLeadIds.length > 0 && isAdmin && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <span className="font-bold text-blue-900">
                {selectedLeadIds.length} lead(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBulkAssignTarget('leads');
                    setIsBulkAssignModalOpen(true);
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs"
                >
                  Bulk Assign Rep
                </button>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      bulkUpdateLeadStatus(selectedLeadIds, e.target.value);
                      setSelectedLeadIds([]);
                    }
                  }}
                  defaultValue=""
                  className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg font-bold text-blue-950"
                >
                  <option value="" disabled>Change Status...</option>
                  <option value="Contacted">Set Contacted</option>
                  <option value="Interested">Set Interested</option>
                  <option value="Won">Set Won</option>
                  <option value="Lost">Set Lost</option>
                </select>
                <button
                  onClick={() => setSelectedLeadIds([])}
                  className="text-slate-500 hover:text-slate-800 text-2xs font-semibold underline px-1"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Leads Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-3xs border-b border-slate-200">
                  <tr>
                    {isAdmin && (
                      <th className="px-3 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.length === permittedLeads.length && permittedLeads.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeadIds(permittedLeads.map((l) => l.id));
                            } else {
                              setSelectedLeadIds([]);
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Lead Number</th>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Contact Person & Phone</th>
                    <th className="px-4 py-3">Stage / Status</th>
                    <th className="px-4 py-3">Est. Value</th>
                    <th className="px-4 py-3">Assigned Rep</th>
                    <th className="px-4 py-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permittedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No leads records in your authorized registry.
                      </td>
                    </tr>
                  ) : (
                    permittedLeads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      return (
                        <tr key={lead.id} className={isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'}>
                          {isAdmin && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLeadIds((prev) => [...prev, lead.id]);
                                  } else {
                                    setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
                                  }
                                }}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 font-mono font-bold text-blue-700">
                            {lead.leadNumber || lead.leadId}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedLeadToEdit(lead);
                                setIsLeadModalOpen(true);
                              }}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {lead.companyName}
                            </button>
                            <div className="text-3xs text-slate-400">
                              Source: {lead.source || lead.leadSource || 'Direct'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{lead.contactPerson}</div>
                            <div className="text-3xs text-slate-500 font-mono">
                              {lead.phone || lead.mobile}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-slate-100 text-slate-800">
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-700">
                            ₹{(Number(lead.estimatedValue) || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {lead.assignedEmployeeName || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {lead.phone || lead.mobile ? (
                                <button
                                  onClick={() =>
                                    handleDirectDial({
                                      id: lead.id,
                                      name: lead.companyName,
                                      contactPerson: lead.contactPerson,
                                      mobile: lead.phone || lead.mobile,
                                      type: 'lead',
                                    })
                                  }
                                  title="Call Client"
                                  className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                              ) : null}

                              {!lead.isConverted && (
                                <button
                                  onClick={() => handleInitiateLeadConversion(lead)}
                                  title="Convert to Customer"
                                  className="p-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedLeadToEdit(lead);
                                  setIsLeadModalOpen(true);
                                }}
                                title="Edit Lead"
                                className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
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
      )}

      {/* TAB 4: STS MODULE */}
      {activeTab === 'sts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search STS number, customer, scope..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('import-sts')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Import STS
                </button>
              )}
              <button
                onClick={handleExportSTS}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedSTSToEdit(null);
                  setIsSTSModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create STS
              </button>
            </div>
          </div>

          {/* STS Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-3xs border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">STS Number</th>
                    <th className="px-4 py-3">Client / Organization</th>
                    <th className="px-4 py-3">Requirement & Scope</th>
                    <th className="px-4 py-3">Valuation</th>
                    <th className="px-4 py-3">Talk Hui Status</th>
                    <th className="px-4 py-3">STS Status</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permittedSTS.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No Sales Tracking Sheet records in this view.
                      </td>
                    </tr>
                  ) : (
                    permittedSTS.map((sts) => (
                      <tr key={sts.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-amber-700">
                          {sts.stsNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{sts.companyName}</div>
                          <div className="text-3xs text-slate-500">{sts.contactPerson}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="line-clamp-2 text-slate-700">{sts.requirement}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700">
                          ₹{(Number(sts.amount || sts.estimatedValue) || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setTalkHuiSTS(sts)}
                            className={`px-2.5 py-1 rounded-lg text-3xs font-extrabold uppercase transition-all shadow-2xs flex items-center gap-1 ${
                              sts.talkStatus === 'Yes'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sts.talkStatus === 'Callback'
                                ? 'bg-amber-100 text-amber-800'
                                : sts.talkStatus === 'Not Reachable'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-slate-100 text-slate-500 border border-slate-300'
                            }`}
                          >
                            <span>Talk Hui: {sts.talkStatus || 'Pending'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-slate-100 text-slate-700">
                            {sts.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {sts.assignedEmployeeName || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {sts.phone && (
                              <button
                                onClick={() =>
                                  handleDirectDial({
                                    id: sts.id,
                                    name: sts.companyName,
                                    contactPerson: sts.contactPerson,
                                    phone: sts.phone,
                                    type: 'sts',
                                  })
                                }
                                title="Call Client"
                                className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedSTSToEdit(sts);
                                setIsSTSModalOpen(true);
                              }}
                              title="Edit STS"
                              className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 5: PIPELINE KANBAN */}
      {activeTab === 'pipeline' && (
        <SalesPipelineKanban
          onOpenLeadModal={(lead) => {
            setSelectedLeadToEdit(lead || null);
            setIsLeadModalOpen(true);
          }}
          onConvertLead={handleInitiateLeadConversion}
        />
      )}

      {/* TAB 6: FOLLOW-UPS */}
      {activeTab === 'follow-ups' && (
        <div className="space-y-4">
          <TodayFollowupsView
            onOpenLeadModal={(l) => {
              setSelectedLeadToEdit(l || null);
              setIsLeadModalOpen(true);
            }}
            onOpenSTSModal={(s) => {
              setSelectedSTSToEdit(s || null);
              setIsSTSModalOpen(true);
            }}
            onOpenProposalModal={onOpenProposalModal}
          />
        </div>
      )}

      {/* TAB 7: CALLS LOG */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              Telephony Call Records & Dial Log
            </h3>
            <div className="text-xs text-slate-400">Total calls recorded: {permittedCalls.length}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Call ID</th>
                  <th className="px-4 py-3">Client / Organization</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Outcome & Notes</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Executive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permittedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No calls logged yet. Click phone buttons across leads to initiate calls.
                    </td>
                  </tr>
                ) : (
                  permittedCalls.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">{c.callId}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.companyName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{c.mobile || c.phoneNumber}</td>
                      <td className="px-4 py-3 uppercase text-3xs font-black text-slate-500">{c.direction || 'Outgoing'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-slate-100 text-slate-800">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-600">
                        {c.outcome || c.notes || 'No discussion notes'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(c.initiatedAt || c.dateTime || c.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.employeeName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: MEETINGS */}
      {activeTab === 'meetings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Client Meetings & Demo Appointments
            </h3>
          </div>

          <div className="space-y-3">
            {meetings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No meetings scheduled
              </div>
            ) : (
              meetings.map((m) => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{m.title}</h4>
                    <p className="text-xs text-slate-500">
                      {m.companyName} • {m.date} at {m.time}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-blue-100 text-blue-800">
                    {m.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 9: PROPOSALS */}
      {activeTab === 'proposals' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Proposals Associated With Sales Leads & Accounts
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Proposal No.</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permittedProposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No proposals in this view.
                    </td>
                  </tr>
                ) : (
                  permittedProposals.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">{p.proposalNumber}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{p.clientName}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        ₹{(p.grandTotal || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-slate-100 text-slate-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {onOpenProposalModal && (
                          <button
                            onClick={() => onOpenProposalModal(p)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-2xs"
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 10: ACTIVITIES TIMELINE */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Sales Activity Timeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological audit feed of lead creations, stage transitions, calls, Talk Hui interactions, and proposal conversions.
            </p>
          </div>
          <SalesActivityTimeline limit={100} />
        </div>
      )}

      {/* TAB 11: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Lead Acquisition Channel Effectiveness
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Acquisition Channel</th>
                    <th className="px-4 py-3">Total Leads</th>
                    <th className="px-4 py-3">Deals Won</th>
                    <th className="px-4 py-3">Conversion %</th>
                    <th className="px-4 py-3">Revenue Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.sourcePerformance.map((sp) => (
                    <tr key={sp.source} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-slate-900">{sp.source}</td>
                      <td className="px-4 py-3">{sp.count}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{sp.wonCount}</td>
                      <td className="px-4 py-3 font-black text-blue-700">{sp.conversionRate}%</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        ₹{sp.totalValue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 12: SETTINGS (ADMIN ONLY) */}
      {activeTab === 'settings' && isAdmin && (
        <SalesSettingsTab />
      )}

      {/* TAB 13: BULK LEAD IMPORT */}
      {activeTab === 'import-leads' && (
        <BulkLeadUploadView onDone={() => setActiveTab('leads')} />
      )}

      {/* TAB 14: BULK STS IMPORT */}
      {activeTab === 'import-sts' && (
        <BulkSTSUploadView onDone={() => setActiveTab('sts')} />
      )}

      {/* MODALS */}
      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setSelectedLeadToEdit(null);
        }}
        leadToEdit={selectedLeadToEdit}
      />

      <STSModal
        isOpen={isSTSModalOpen}
        onClose={() => {
          setIsSTSModalOpen(false);
          setSelectedSTSToEdit(null);
        }}
        stsToEdit={selectedSTSToEdit}
      />

      <TalkHuiModal
        isOpen={!!talkHuiSTS}
        onClose={() => setTalkHuiSTS(null)}
        sts={talkHuiSTS}
      />

      <FollowUpOutcomeModal
        isOpen={!!outcomeFollowup}
        onClose={() => setOutcomeFollowup(null)}
        followup={outcomeFollowup}
      />

      {duplicateModalData && (
        <DuplicateWarningModal
          isOpen={!!duplicateModalData}
          onClose={() => setDuplicateModalData(null)}
          matches={duplicateModalData.matches}
          onUseExistingCustomer={(cust) => {
            alert(`Linked to existing customer: ${cust.companyName} (${cust.customerId})`);
            setDuplicateModalData(null);
          }}
          onCreateAnyway={() => {
            executeLeadConversion(duplicateModalData.lead.id);
          }}
        />
      )}

      {/* Bulk Assign Employee Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-900">
              Bulk Reassign {bulkAssignTarget === 'leads' ? selectedLeadIds.length : selectedSTSIds.length} {bulkAssignTarget === 'leads' ? 'Leads' : 'STS Records'}
            </h3>
            <select
              value={bulkAssignEmployeeId}
              onChange={(e) => setBulkAssignEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
            >
              <option value="">Select Target Sales Executive...</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name} ({emp.department || 'Sales'})
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!bulkAssignEmployeeId}
                onClick={handleConfirmBulkAssign}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
