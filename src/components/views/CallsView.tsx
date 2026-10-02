import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  Search,
  Filter,
  Phone,
  Calendar,
  User,
  Download,
  Plus,
  RotateCcw,
  Eye,
  Clock,
  Building2,
  Target,
  CheckCircle,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CallRecord, CallStatus, Customer, Lead } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CallModal, CallDetailModal } from '../modals/ActionModals';

export const CallsView: React.FC = () => {
  const { calls, employees, customers, leads, logCall } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [leadFilter, setLeadFilter] = useState('ALL');

  // Modals state
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<CallRecord | null>(null);
  const [callToRecordOutcome, setCallToRecordOutcome] = useState<CallRecord | null>(null);
  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [selectedEntityForNewCall, setSelectedEntityForNewCall] = useState<{
    entity: Customer | Lead;
    type: 'customer' | 'lead';
  } | null>(null);

  // Quick manual log form modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedEntityKey, setSelectedEntityKey] = useState('');
  const [manualStatus, setManualStatus] = useState<CallStatus>('Connected');
  const [manualOutcome, setManualOutcome] = useState('Product presentation & pricing');
  const [manualNotes, setManualNotes] = useState('');
  const [manualFollowUpDate, setManualFollowUpDate] = useState('');
  const [manualFollowUpTime, setManualFollowUpTime] = useState('11:00');

  const todayStr = new Date().toISOString().split('T')[0];

  const permittedCalls = useMemo(() => {
    if (isAdmin || hasPermission('canViewAllCustomers') || hasPermission('viewCustomers')) {
      return calls;
    }
    return calls.filter((c) => c.employeeId === userProfile?.uid);
  }, [calls, isAdmin, hasPermission, userProfile]);

  const filteredCalls = useMemo(() => {
    return permittedCalls.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        c.callId.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.notes ? c.notes.toLowerCase().includes(q) : false) ||
        (c.outcome ? c.outcome.toLowerCase().includes(q) : false);

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesEmployee = employeeFilter === 'ALL' || c.employeeId === employeeFilter;

      // Customer and Lead filters
      const matchesCustomer =
        customerFilter === 'ALL' || c.customerId === customerFilter;
      const matchesLead = leadFilter === 'ALL' || c.leadId === leadFilter;

      // Date filter
      let matchesDate = true;
      const callDate = (c.initiatedAt || c.dateTime || c.createdAt).split('T')[0];
      if (dateFilter === 'TODAY') {
        matchesDate = callDate === todayStr;
      } else if (dateFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        matchesDate = callDate === yDate;
      } else if (dateFilter === 'THIS_WEEK') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        matchesDate = callDate >= weekAgo;
      } else if (dateFilter === 'THIS_MONTH') {
        const monthPrefix = todayStr.slice(0, 7);
        matchesDate = callDate.startsWith(monthPrefix);
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesEmployee &&
        matchesCustomer &&
        matchesLead &&
        matchesDate
      );
    });
  }, [
    permittedCalls,
    searchTerm,
    statusFilter,
    employeeFilter,
    customerFilter,
    leadFilter,
    dateFilter,
    todayStr,
  ]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setEmployeeFilter('ALL');
    setDateFilter('ALL');
    setCustomerFilter('ALL');
    setLeadFilter('ALL');
  };

  const isFiltered =
    searchTerm !== '' ||
    statusFilter !== 'ALL' ||
    employeeFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    customerFilter !== 'ALL' ||
    leadFilter !== 'ALL';

  const formatDurationDisplay = (sec: number | null | undefined) => {
    if (sec === null || sec === undefined) {
      return 'Duration not available';
    }
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const handleExportCsv = () => {
    const exportRows = filteredCalls.map((c) => ({
      'Call ID': c.callId,
      'Client / Organization': c.companyName,
      'Contact Person': c.contactPerson,
      'Phone Number': c.mobile,
      'Executive Name': c.employeeName,
      'Date & Time': c.initiatedAt || c.dateTime,
      Status: c.status,
      Duration: formatDurationDisplay(c.actualDuration),
      Outcome: c.outcome || 'N/A',
      'Follow-up Date': c.nextFollowupDate || c.followUpDate || 'None',
      Notes: c.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Call_Logs');
    XLSX.writeFile(wb, `calls_log_${Date.now()}.xlsx`);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    let customerId: string | undefined;
    let leadId: string | undefined;
    let companyName = '';
    let contactPerson = '';
    let mobile = '';

    if (selectedEntityKey.startsWith('cust_')) {
      const id = selectedEntityKey.replace('cust_', '');
      const cust = customers.find((c) => c.id === id);
      if (cust) {
        customerId = cust.id;
        companyName = cust.companyName;
        contactPerson = cust.contactPerson;
        mobile = cust.mobile;
      }
    } else if (selectedEntityKey.startsWith('lead_')) {
      const id = selectedEntityKey.replace('lead_', '');
      const ld = leads.find((l) => l.id === id);
      if (ld) {
        leadId = ld.id;
        companyName = ld.companyName;
        contactPerson = ld.contactPerson;
        mobile = ld.mobile;
      }
    }

    if (!mobile) return;

    await logCall({
      customerId,
      leadId,
      companyName,
      contactPerson,
      mobile,
      employeeId: userProfile.uid,
      employeeName: userProfile.name,
      dateTime: new Date().toISOString(),
      initiatedAt: new Date().toISOString(),
      status: manualStatus,
      outcome: manualOutcome,
      notes: manualNotes,
      nextFollowupDate: manualFollowUpDate || undefined,
      nextFollowupTime: manualFollowUpDate ? manualFollowUpTime : undefined,
      followUpDate: manualFollowUpDate || undefined,
      actualDuration: null,
    });

    setIsManualModalOpen(false);
    setSelectedEntityKey('');
    setManualNotes('');
    setManualFollowUpDate('');
  };

  const getStatusBadge = (status: CallRecord['status']) => {
    switch (status) {
      case 'Connected':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Callback Requested':
      case 'Follow-up Required':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Busy':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'No Answer':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Switched Off':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Wrong Number':
      case 'Invalid Number':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'initiated':
        return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse font-bold';
      case 'Not Connected':
        return 'bg-slate-200 text-slate-800 border-slate-300';
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
            <PhoneCall className="w-6 h-6 text-emerald-600" />
            Calls & Telephony Log ({filteredCalls.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time call attempts, device dialer launches, outcomes, and scheduled follow-up tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('exportData') && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          )}

          {(isAdmin || hasPermission('makeCalls')) && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" /> Log Call Activity
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search call ID, company, phone, notes..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Call Statuses</option>
              <option value="initiated">Initiated / In Progress</option>
              <option value="Connected">Connected</option>
              <option value="Not Connected">Not Connected</option>
              <option value="Busy">Busy</option>
              <option value="No Answer">No Answer</option>
              <option value="Switched Off">Switched Off</option>
              <option value="Wrong Number">Wrong Number</option>
              <option value="Callback Requested">Callback Requested</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">Past 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>

          {/* Employee Filter */}
          {isAdmin ? (
            <div>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Executives</option>
                {employees.map((emp) => (
                  <option key={emp.uid} value={emp.uid}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-medium">
              Viewing authorized calls for {userProfile?.name}
            </div>
          )}
        </div>

        {/* Secondary Row: Customer and Lead Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.customerId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={leadFilter}
              onChange={(e) => setLeadFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Leads</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.companyName} ({l.leadId})
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <div className="flex items-center justify-end">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calls Table (Matching Exact Columns Specified) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Call ID</th>
                <th className="py-3 px-4 font-semibold">Customer / Lead</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Date / Time</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Duration</th>
                <th className="py-3 px-4 font-semibold">Outcome</th>
                <th className="py-3 px-4 font-semibold">Follow-up</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <PhoneCall className="w-8 h-8 mx-auto mb-2 stroke-1 text-slate-300" />
                    <p className="font-semibold text-slate-600">No calls matching criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isFiltered ? 'Try clearing or modifying the applied filters.' : 'Use the Call button on any customer or lead to start dialing.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Call ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.callId}
                    </td>

                    {/* Customer / Lead */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.companyName}</div>
                      <span className="text-[11px] text-slate-500">{c.contactPerson}</span>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <a
                        href={`tel:${c.mobile}`}
                        className="font-mono text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Phone className="w-3 h-3 text-slate-400" /> {c.mobile}
                      </a>
                    </td>

                    {/* Employee */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {c.employeeName}
                    </td>

                    {/* Date / Time */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div>
                        {new Date(c.initiatedAt || c.dateTime).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(c.initiatedAt || c.dateTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Duration (duration not available if unrecorded, NOT 0 mins) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium ${
                          c.actualDuration ? 'text-slate-900 font-bold' : 'text-slate-400 italic'
                        }`}
                      >
                        {formatDurationDisplay(c.actualDuration)}
                      </span>
                    </td>

                    {/* Outcome */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 font-medium">
                        {c.outcome || c.notes || '—'}
                      </p>
                    </td>

                    {/* Follow-up */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.nextFollowupDate || c.followUpDate ? (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {c.nextFollowupDate || c.followUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedCallForDetail(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Call Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* If status is initiated, allow recording outcome */}
                        {c.status === 'initiated' && (
                          <button
                            onClick={() => setCallToRecordOutcome(c)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold border border-indigo-200 transition-colors"
                            title="Record Call Outcome"
                          >
                            Outcome
                          </button>
                        )}

                        {/* Quick Dial */}
                        <a
                          href={`tel:${c.mobile}`}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Dial Client"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Details Modal */}
      {selectedCallForDetail && (
        <CallDetailModal
          isOpen={!!selectedCallForDetail}
          onClose={() => setSelectedCallForDetail(null)}
          call={selectedCallForDetail}
          onRecordOutcome={(call) => setCallToRecordOutcome(call)}
        />
      )}

      {/* Record Outcome Modal for in-progress call */}
      {callToRecordOutcome && (
        <CallModal
          isOpen={!!callToRecordOutcome}
          onClose={() => setCallToRecordOutcome(null)}
          entity={{
            id: callToRecordOutcome.customerId || callToRecordOutcome.leadId || callToRecordOutcome.id,
            companyName: callToRecordOutcome.companyName,
            contactPerson: callToRecordOutcome.contactPerson,
            mobile: callToRecordOutcome.mobile,
          } as any}
          entityType={callToRecordOutcome.customerId ? 'customer' : 'lead'}
          existingCallToRecord={callToRecordOutcome}
        />
      )}

      {/* Manual Quick Log Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-6 overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Log Phone Call Activity</h3>
                  <p className="text-xs text-emerald-100">Attach call record to an existing customer or lead</p>
                </div>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer or Lead *
                </label>
                <select
                  required
                  value={selectedEntityKey}
                  onChange={(e) => setSelectedEntityKey(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Account --</option>
                  <optgroup label="Customers">
                    {customers.map((c) => (
                      <option key={`cust_${c.id}`} value={`cust_${c.id}`}>
                        {c.companyName} — {c.contactPerson} ({c.mobile})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Leads">
                    {leads.map((l) => (
                      <option key={`lead_${l.id}`} value={`lead_${l.id}`}>
                        {l.companyName} — {l.contactPerson} ({l.mobile})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Call Status *</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as CallStatus)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Connected">Connected</option>
                    <option value="Not Connected">Not Connected</option>
                    <option value="Busy">Busy</option>
                    <option value="No Answer">No Answer</option>
                    <option value="Switched Off">Switched Off</option>
                    <option value="Wrong Number">Wrong Number</option>
                    <option value="Callback Requested">Callback Requested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome Summary</label>
                  <input
                    type="text"
                    value={manualOutcome}
                    onChange={(e) => setManualOutcome(e.target.value)}
                    placeholder="e.g. Quotation Requested"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discussion Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Key topics discussed, objections, client reaction, pricing terms..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                  Schedule Linked Follow-up (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Follow-up Date</label>
                    <input
                      type="date"
                      value={manualFollowUpDate}
                      onChange={(e) => setManualFollowUpDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Follow-up Time</label>
                    <input
                      type="time"
                      value={manualFollowUpTime}
                      onChange={(e) => setManualFollowUpTime(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Save Call Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
