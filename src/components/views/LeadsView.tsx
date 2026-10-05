import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Mail,
  FileCheck,
  FileText,
  UserCheck,
  Edit2,
  Calendar,
  Download,
  ArrowRight,
  RotateCcw,
  X,
  Clock,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Lead, Customer, CustomerStatus, LeadStatus } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CallModal, WhatsAppModal, EmailModal } from '../modals/ActionModals';
import { DuplicateWarningModal } from '../sales/DuplicateWarningModal';

interface LeadsViewProps {
  onOpenLeadModal: (lead?: Lead) => void;
  onOpenProposalModal: (lead?: any) => void;
  onOpenSTSModal: (lead?: any) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  onOpenLeadModal,
  onOpenProposalModal,
  onOpenSTSModal,
}) => {
  const { leads, updateLead, convertLeadToCustomer, employees, checkDuplicateCustomer } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [followupDateFilter, setFollowupDateFilter] = useState<string>('ALL');
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  // Duplicate warning modal state
  const [duplicateModalData, setDuplicateModalData] = useState<{
    lead: Lead;
    matches: any[];
  } | null>(null);

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isWaOpen, setIsWaOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  const permittedLeads = useMemo(() => {
    if (isAdmin) {
      return leads;
    }
    return leads.filter(
      (l) =>
        l.assignedEmployeeId === userProfile?.uid ||
        l.assignedEmployeeId === userProfile?.employeeId ||
        l.createdBy === userProfile?.uid
    );
  }, [leads, isAdmin, userProfile]);

  const leadSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.leadSource) set.add(l.leadSource);
    });
    return Array.from(set).sort();
  }, [leads]);

  const isFiltered = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      statusFilter !== 'ALL' ||
      employeeFilter !== 'ALL' ||
      sourceFilter !== 'ALL' ||
      followupDateFilter !== 'ALL'
    );
  }, [searchTerm, statusFilter, employeeFilter, sourceFilter, followupDateFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setEmployeeFilter('ALL');
    setSourceFilter('ALL');
    setFollowupDateFilter('ALL');
  };

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return permittedLeads.filter((l) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.companyName.toLowerCase().includes(q) ||
        l.contactPerson.toLowerCase().includes(q) ||
        l.mobile.includes(q) ||
        (l.alternateMobile && l.alternateMobile.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        l.leadId.toLowerCase().includes(q) ||
        (l.city && l.city.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchesEmployee = employeeFilter === 'ALL' || l.assignedEmployeeId === employeeFilter;
      const matchesSource = sourceFilter === 'ALL' || l.leadSource === sourceFilter;

      // Follow-up Date Filter
      let matchesFollowup = true;
      if (followupDateFilter !== 'ALL') {
        const fupDate = l.nextFollowupDate || l.nextFollowUp;
        if (!fupDate) {
          matchesFollowup = false;
        } else if (followupDateFilter === 'TODAY') {
          matchesFollowup = fupDate.startsWith(todayStr);
        } else if (followupDateFilter === 'TOMORROW') {
          matchesFollowup = fupDate.startsWith(tomorrowStr);
        } else if (followupDateFilter === 'OVERDUE') {
          matchesFollowup = fupDate < todayStr;
        } else if (followupDateFilter === 'UPCOMING') {
          matchesFollowup = fupDate >= todayStr;
        }
      }

      return matchesSearch && matchesStatus && matchesEmployee && matchesSource && matchesFollowup;
    });
  }, [permittedLeads, searchTerm, statusFilter, employeeFilter, sourceFilter, followupDateFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateLead(id, { status: newStatus as any });
  };

  const handleAssignEmployee = async (id: string, empId: string) => {
    const emp = employees.find((e) => e.uid === empId);
    await updateLead(id, {
      assignedEmployeeId: empId,
      assignedEmployeeName: emp?.name || 'Unassigned',
    });
  };

  const handleConvert = (lead: Lead) => {
    // Duplicate customer check using phone, email, and GST
    const dupCheck = checkDuplicateCustomer({
      phone: lead.phone || lead.mobile,
      email: lead.email,
      gstNumber: lead.gstNumber,
    });

    if (dupCheck.hasDuplicate) {
      setDuplicateModalData({ lead, matches: dupCheck.matches });
    } else {
      executeLeadConversion(lead);
    }
  };

  const executeLeadConversion = async (lead: Lead) => {
    if (confirm(`Convert prospect "${lead.companyName}" (${lead.leadId}) into a Customer account?\n\nThis will automatically generate a new Customer ID (CUST-2026-XXXX), copy all contact details, mark this lead as Converted / Won, and log the event in the activity timeline.`)) {
      setConvertingLeadId(lead.id);
      try {
        const newCustId = await convertLeadToCustomer(lead.id);
        alert(`Success! Lead converted to Customer account (${newCustId}).`);
        setDuplicateModalData(null);
      } catch (err: any) {
        alert(err.message || 'Failed to convert lead');
      } finally {
        setConvertingLeadId(null);
      }
    }
  };

  const handleExportCsv = () => {
    const exportRows = filteredLeads.map((l) => ({
      'Lead ID': l.leadId,
      'Company Name': l.companyName,
      'Contact Person': l.contactPerson,
      Mobile: l.mobile,
      'Alternate Mobile': l.alternateMobile || l.alternateNumber || '',
      Email: l.email || '',
      City: l.city || '',
      State: l.state || '',
      Status: l.status,
      'Estimated Value': l.estimatedValue || 0,
      'Lead Source': l.leadSource || '',
      'Assigned Employee': l.assignedEmployeeName || '',
      'Is Converted': l.isConverted ? 'Yes' : 'No',
      'Converted Customer ID': l.convertedCustomerId || '',
      'Next Follow-up Date': l.nextFollowupDate || l.nextFollowUp || '',
      'Next Follow-up Time': l.nextFollowupTime || '',
      Notes: l.notes || '',
      'Created Date': l.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_export_${Date.now()}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      New: 'bg-blue-100 text-blue-800 border-blue-200',
      Contacted: 'bg-purple-100 text-purple-800 border-purple-200',
      Qualified: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      Proposal: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Proposal Sent': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      Negotiation: 'bg-orange-100 text-orange-800 border-orange-200',
      Won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Lost: 'bg-rose-100 text-rose-800 border-rose-200',
      Junk: 'bg-slate-200 text-slate-700 border-slate-300',
    };
    return map[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-amber-600" />
            Lead Management ({filteredLeads.length})
          </h2>
          <p className="text-xs text-slate-500">
            Track early stage prospects, convert to corporate clients, initiate calls and technical quotes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('exportData') && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          )}

          {(isAdmin || hasPermission('createLead')) && (
            <button
              onClick={() => onOpenLeadModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Company Name, Contact Person, Mobile, Email, Lead ID..."
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Lead Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
              <option value="Junk">Junk</option>
            </select>
          </div>

          {/* Assigned Executive Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Assigned Executive
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Executives</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Source Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Lead Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Sources</option>
              {leadSources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up Date Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Follow-up Schedule
            </label>
            <select
              value={followupDateFilter}
              onChange={(e) => setFollowupDateFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Schedules</option>
              <option value="TODAY">Due Today</option>
              <option value="TOMORROW">Due Tomorrow</option>
              <option value="OVERDUE">Overdue</option>
              <option value="UPCOMING">Upcoming</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Lead ID / Prospect</th>
                <th className="py-3 px-4 font-semibold">Contact & Phone</th>
                <th className="py-3 px-4 font-semibold">Source / Est. Value</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Assigned To</th>
                <th className="py-3 px-4 font-semibold">Next Follow-up</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No leads found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isFiltered ? 'Try clearing or changing your filter options.' : 'Create your first sales lead to begin prospecting.'}
                    </p>
                    {isFiltered && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                          {lead.leadId}
                        </span>
                        {lead.isConverted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            {lead.convertedCustomerId || 'Converted'}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 mt-0.5">{lead.companyName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{lead.contactPerson}</div>
                      <a
                        href={`tel:${lead.mobile}`}
                        className="text-[11px] text-indigo-600 font-mono hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-slate-400" /> {lead.mobile}
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-800 block">{lead.leadSource || 'Direct'}</span>
                      {lead.estimatedValue ? (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          ₹{lead.estimatedValue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Unvalued</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${getStatusBadge(
                          lead.status
                        )} bg-transparent cursor-pointer`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                        <option value="Junk">Junk</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {isAdmin ? (
                        <select
                          value={lead.assignedEmployeeId || ''}
                          onChange={(e) => handleAssignEmployee(lead.id, e.target.value)}
                          className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-slate-900 max-w-[130px] truncate"
                        >
                          <option value="">Unassigned</option>
                          {employees.map((emp) => (
                            <option key={emp.uid} value={emp.uid}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{lead.assignedEmployeeName || 'Unassigned'}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {lead.nextFollowupDate || lead.nextFollowUp ? (
                        <span className="font-medium text-amber-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {lead.nextFollowupDate || lead.nextFollowUp}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Convert to Customer button */}
                        {!lead.isConverted && (isAdmin || hasPermission('createCustomer')) && (
                          <button
                            onClick={() => handleConvert(lead)}
                            disabled={convertingLeadId === lead.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs transition-colors"
                            title="Convert Prospect to Customer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {convertingLeadId === lead.id ? 'Converting...' : 'Convert'}
                          </button>
                        )}

                        {/* Call */}
                        {hasPermission('makeCalls') && (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsCallOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Log Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* WhatsApp */}
                        {hasPermission('sendWhatsApp') && (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsWaOpen(true);
                            }}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                            title="WhatsApp Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Email */}
                        {hasPermission('sendEmail') && (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsEmailOpen(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Send Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Create Proposal */}
                        {hasPermission('createProposal') && (
                          <button
                            onClick={() => onOpenProposalModal(lead)}
                            className="p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Generate Commercial Proposal"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit */}
                        {(isAdmin || hasPermission('editLead')) && (
                          <button
                            onClick={() => onOpenLeadModal(lead)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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

      {/* Action Modals */}
      {selectedLead && (
        <>
          <CallModal
            isOpen={isCallOpen}
            onClose={() => setIsCallOpen(false)}
            entity={selectedLead}
            entityType="lead"
          />
          <WhatsAppModal
            isOpen={isWaOpen}
            onClose={() => setIsWaOpen(false)}
            entity={selectedLead}
            entityType="lead"
          />
          <EmailModal
            isOpen={isEmailOpen}
            onClose={() => setIsEmailOpen(false)}
            entity={selectedLead}
            entityType="lead"
          />
        </>
      )}

      {/* Duplicate Warning Modal on Convert */}
      {duplicateModalData && (
        <DuplicateWarningModal
          isOpen={true}
          onClose={() => setDuplicateModalData(null)}
          matches={duplicateModalData.matches}
          onCreateAnyway={() => executeLeadConversion(duplicateModalData.lead)}
          onUseExistingCustomer={(existingCust: Customer) => {
            alert(`Linked to existing customer: ${existingCust.companyName} (${existingCust.customerId}). Original lead history preserved.`);
            setDuplicateModalData(null);
          }}
        />
      )}
    </div>
  );
};
