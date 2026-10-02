import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Phone,
  MessageSquare,
  RotateCcw,
  XCircle,
  Download,
  Calendar,
  User,
  CheckCircle2,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FollowUpRecord, FollowUpStatus, Customer, Lead } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CallModal, WhatsAppModal, RescheduleFollowUpModal } from '../modals/ActionModals';
import { FollowUpOutcomeModal } from '../sales/FollowUpOutcomeModal';

export const FollowUpsView: React.FC = () => {
  const {
    followups,
    addFollowUp,
    completeFollowUp,
    completeFollowUpWithOutcome,
    cancelFollowUp,
    customers,
    leads,
    employees,
  } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Action Modals State
  const [activeFollowupForReschedule, setActiveFollowupForReschedule] = useState<FollowUpRecord | null>(null);
  const [outcomeFollowup, setOutcomeFollowup] = useState<FollowUpRecord | null>(null);
  const [callModalEntity, setCallModalEntity] = useState<{ entity: Customer | Lead; type: 'customer' | 'lead' } | null>(null);
  const [waModalEntity, setWaModalEntity] = useState<{ entity: Customer | Lead; type: 'customer' | 'lead' } | null>(null);

  // Create Form State
  const [selectedEntityKey, setSelectedEntityKey] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [reason, setReason] = useState('Commercial proposal check & requirement review');
  const [notes, setNotes] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Employee-based authorization filter
  const permittedFollowups = useMemo(() => {
    if (isAdmin || hasPermission('canViewAllCustomers') || hasPermission('viewCustomers')) {
      return followups;
    }
    return followups.filter((f) => f.employeeId === userProfile?.uid);
  }, [followups, isAdmin, hasPermission, userProfile]);

  // Real-time counts for the dashboard cards
  const dueTodayCount = useMemo(
    () => permittedFollowups.filter((f) => f.date === todayStr && f.status !== 'Completed' && f.status !== 'Cancelled').length,
    [permittedFollowups, todayStr]
  );

  const overdueCount = useMemo(
    () => permittedFollowups.filter((f) => f.date < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled').length,
    [permittedFollowups, todayStr]
  );

  const upcomingCount = useMemo(
    () => permittedFollowups.filter((f) => f.date > todayStr && f.status !== 'Completed' && f.status !== 'Cancelled').length,
    [permittedFollowups, todayStr]
  );

  const completedCount = useMemo(
    () => permittedFollowups.filter((f) => f.status === 'Completed').length,
    [permittedFollowups]
  );

  const cancelledCount = useMemo(
    () => permittedFollowups.filter((f) => f.status === 'Cancelled').length,
    [permittedFollowups]
  );

  const filteredFollowups = useMemo(() => {
    return permittedFollowups.filter((f) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (f.followupId && f.followupId.toLowerCase().includes(q)) ||
        f.companyName.toLowerCase().includes(q) ||
        f.contactPerson.toLowerCase().includes(q) ||
        f.reason.toLowerCase().includes(q) ||
        (f.notes && f.notes.toLowerCase().includes(q)) ||
        f.employeeName.toLowerCase().includes(q);

      const matchesEmployee = employeeFilter === 'ALL' || f.employeeId === employeeFilter;

      let matchesTab = true;
      if (activeTab === 'DUE_TODAY') {
        matchesTab = f.date === todayStr && f.status !== 'Completed' && f.status !== 'Cancelled';
      } else if (activeTab === 'OVERDUE') {
        matchesTab = f.date < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled';
      } else if (activeTab === 'UPCOMING') {
        matchesTab = f.date > todayStr && f.status !== 'Completed' && f.status !== 'Cancelled';
      } else if (activeTab === 'COMPLETED') {
        matchesTab = f.status === 'Completed';
      } else if (activeTab === 'CANCELLED') {
        matchesTab = f.status === 'Cancelled';
      }

      return matchesSearch && matchesEmployee && matchesTab;
    });
  }, [permittedFollowups, searchTerm, employeeFilter, activeTab, todayStr]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    let customerId: string | undefined;
    let leadId: string | undefined;
    let companyName = '';
    let contactPerson = '';

    if (selectedEntityKey.startsWith('cust_')) {
      const id = selectedEntityKey.replace('cust_', '');
      const cust = customers.find((c) => c.id === id);
      if (cust) {
        customerId = cust.id;
        companyName = cust.companyName;
        contactPerson = cust.contactPerson;
      }
    } else if (selectedEntityKey.startsWith('lead_')) {
      const id = selectedEntityKey.replace('lead_', '');
      const ld = leads.find((l) => l.id === id);
      if (ld) {
        leadId = ld.id;
        companyName = ld.companyName;
        contactPerson = ld.contactPerson;
      }
    }

    if (!companyName) return;

    setIsSubmitting(true);
    try {
      const assignedEmp = employees.find((e) => e.uid === assignedEmployeeId);

      await addFollowUp({
        customerId,
        leadId,
        companyName,
        contactPerson,
        employeeId: assignedEmployeeId || userProfile.uid,
        employeeName: assignedEmp?.name || userProfile.name,
        date,
        time,
        reason,
        notes,
        status: date < todayStr ? 'Overdue' : date === todayStr ? 'Due Today' : 'Upcoming',
      });

      setIsCreateModalOpen(false);
      setSelectedEntityKey('');
      setNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const exportRows = filteredFollowups.map((f) => ({
      'Follow-up ID': f.followupId || f.id,
      'Organization / Client': f.companyName,
      'Contact Person': f.contactPerson,
      'Scheduled Date': f.date,
      'Scheduled Time': f.time,
      Reason: f.reason,
      Status: f.status,
      'Assigned Executive': f.employeeName,
      Notes: f.notes || '',
      'Completed At': f.completedAt || 'N/A',
      'Created Date': f.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Follow_ups');
    XLSX.writeFile(wb, `followups_schedule_${Date.now()}.xlsx`);
  };

  const getStatusBadge = (status: FollowUpStatus, itemDate: string) => {
    if (status === 'Completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'Cancelled') return 'bg-slate-100 text-slate-600 border-slate-200 line-through';
    if (itemDate < todayStr) return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
    if (itemDate === todayStr) return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Helper to resolve client mobile number for direct Call/WhatsApp
  const resolveClientEntity = (f: FollowUpRecord): { entity: Customer | Lead; type: 'customer' | 'lead' } | null => {
    if (f.customerId) {
      const cust = customers.find((c) => c.id === f.customerId);
      if (cust) return { entity: cust, type: 'customer' };
    }
    if (f.leadId) {
      const ld = leads.find((l) => l.id === f.leadId);
      if (ld) return { entity: ld, type: 'lead' };
    }
    // Fallback: match by company name
    const matchCust = customers.find((c) => c.companyName.toLowerCase() === f.companyName.toLowerCase());
    if (matchCust) return { entity: matchCust, type: 'customer' };
    const matchLead = leads.find((l) => l.companyName.toLowerCase() === f.companyName.toLowerCase());
    if (matchLead) return { entity: matchLead, type: 'lead' };

    return null;
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-purple-600" />
            Follow-up & Task Management ({filteredFollowups.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time client touchpoints, reminder alerts, rescheduling, and execution tracking
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

          {(isAdmin || hasPermission('createFollowup')) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule Follow-up
            </button>
          )}
        </div>
      </div>

      {/* 7. FOLLOW-UP DASHBOARD: Overdue, Due Today, Upcoming (Real-time Firestore Data) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Overdue */}
        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'OVERDUE'
              ? 'bg-rose-50 border-rose-300 shadow-sm ring-2 ring-rose-500'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Overdue</span>
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950">{overdueCount}</div>
          <span className="text-[11px] font-semibold text-rose-600 mt-1 block">Requires immediate action</span>
        </div>

        {/* Due Today */}
        <div
          onClick={() => setActiveTab('DUE_TODAY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'DUE_TODAY'
              ? 'bg-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-500'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Due Today</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950">{dueTodayCount}</div>
          <span className="text-[11px] font-semibold text-amber-700 mt-1 block">Scheduled for today</span>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setActiveTab('UPCOMING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'UPCOMING'
              ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-500'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Upcoming</span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950">{upcomingCount}</div>
          <span className="text-[11px] font-semibold text-blue-700 mt-1 block">Future scheduled tasks</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950">{completedCount}</div>
          <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">Successfully executed</span>
        </div>

        {/* All Tasks */}
        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer col-span-2 md:col-span-1 ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-800'
              : 'bg-white border-slate-200 hover:border-slate-400 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              All Tasks
            </span>
            <div className={`p-1.5 rounded-lg ${activeTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${activeTab === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
            {permittedFollowups.length}
          </div>
          <span className={`text-[11px] font-medium block mt-1 ${activeTab === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
            Total pipeline reminders
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, reason, person, executive..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-purple-600"
            >
              <option value="ALL">All Executives</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}

          {(searchTerm || employeeFilter !== 'ALL' || activeTab !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEmployeeFilter('ALL');
                setActiveTab('ALL');
              }}
              className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Followups Table with Required Actions (Call, WhatsApp, Complete, Reschedule, Cancel) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Scheduled Date & Time</th>
                <th className="py-3 px-4 font-semibold">Client Organization</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Reason / Objective</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold">Assigned Executive</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFollowups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarClock className="w-8 h-8 mx-auto mb-2 stroke-1 text-slate-300" />
                    <p className="font-semibold text-slate-600">No follow-ups found in this view</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Schedule a new client follow-up to keep track of reminders.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFollowups.map((f) => {
                  const resolved = resolveClientEntity(f);

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Scheduled Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{f.date}</div>
                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" /> {f.time}
                        </span>
                      </td>

                      {/* Client Organization */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {f.companyName}
                        {f.followupId && (
                          <span className="text-[10px] text-slate-400 font-mono block font-normal">
                            {f.followupId}
                          </span>
                        )}
                      </td>

                      {/* Contact Person */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {f.contactPerson}
                      </td>

                      {/* Reason / Objective */}
                      <td className="py-3 px-4 max-w-xs font-semibold text-slate-800">
                        {f.reason}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 max-w-xs text-slate-500 line-clamp-2">
                        {f.notes || '—'}
                      </td>

                      {/* Assigned Executive */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {f.employeeName}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(
                            f.status,
                            f.date
                          )}`}
                        >
                          {f.status === 'Upcoming' && f.date < todayStr
                            ? 'Overdue'
                            : f.status === 'Upcoming' && f.date === todayStr
                            ? 'Due Today'
                            : f.status}
                        </span>
                      </td>

                      {/* Actions: Call, WhatsApp, Complete, Reschedule, Cancel */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Quick Call */}
                          {resolved && hasPermission('makeCalls') && (
                            <button
                              onClick={() => setCallModalEntity(resolved)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title={`Call ${f.contactPerson}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 2. Quick WhatsApp */}
                          {resolved && hasPermission('sendWhatsApp') && (
                            <button
                              onClick={() => setWaModalEntity(resolved)}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title={`WhatsApp ${f.contactPerson}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3. Complete Action */}
                          {f.status !== 'Completed' && f.status !== 'Cancelled' && (
                            <button
                              onClick={() => setOutcomeFollowup(f)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors"
                              title="Record Follow-up Outcome & Complete"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Complete
                            </button>
                          )}

                          {/* 4. Reschedule Action */}
                          {f.status !== 'Completed' && f.status !== 'Cancelled' && (
                            <button
                              onClick={() => setActiveFollowupForReschedule(f)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-semibold transition-colors"
                              title="Reschedule Follow-up"
                            >
                              <RotateCcw className="w-3 h-3" /> Reschedule
                            </button>
                          )}

                          {/* 5. Cancel Action */}
                          {f.status !== 'Completed' && f.status !== 'Cancelled' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Cancel follow-up with ${f.companyName}?`)) {
                                  cancelFollowUp(f.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel Follow-up"
                            >
                              <XCircle className="w-3.5 h-3.5" />
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

      {/* Follow-up Outcome Modal on Completion */}
      {outcomeFollowup && (
        <FollowUpOutcomeModal
          isOpen={!!outcomeFollowup}
          onClose={() => setOutcomeFollowup(null)}
          followup={outcomeFollowup}
        />
      )}

      {/* Reschedule Modal */}
      {activeFollowupForReschedule && (
        <RescheduleFollowUpModal
          isOpen={!!activeFollowupForReschedule}
          onClose={() => setActiveFollowupForReschedule(null)}
          followup={activeFollowupForReschedule}
        />
      )}

      {/* Call Modal */}
      {callModalEntity && (
        <CallModal
          isOpen={!!callModalEntity}
          onClose={() => setCallModalEntity(null)}
          entity={callModalEntity.entity}
          entityType={callModalEntity.type}
        />
      )}

      {/* WhatsApp Modal */}
      {waModalEntity && (
        <WhatsAppModal
          isOpen={!!waModalEntity}
          onClose={() => setWaModalEntity(null)}
          entity={waModalEntity.entity}
          entityType={waModalEntity.type}
        />
      )}

      {/* Create Follow-up Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-6 overflow-hidden border border-slate-200">
            <div className="bg-purple-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Schedule Commercial Follow-up</h3>
                  <p className="text-xs text-purple-100">Connect follow-up with any customer or lead in real time</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-purple-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer or Lead Account *
                </label>
                <select
                  required
                  value={selectedEntityKey}
                  onChange={(e) => setSelectedEntityKey(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-purple-600"
                >
                  <option value="">-- Select Client / Prospect --</option>
                  <optgroup label="Customers">
                    {customers.map((c) => (
                      <option key={`cust_${c.id}`} value={`cust_${c.id}`}>
                        {c.companyName} — {c.contactPerson}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Leads">
                    {leads.map((l) => (
                      <option key={`lead_${l.id}`} value={`lead_${l.id}`}>
                        {l.companyName} — {l.contactPerson}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Time *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Objective *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Quotation feedback, technical discussion..."
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Background info, agenda points, target pricing..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Executive</label>
                  <select
                    value={assignedEmployeeId}
                    onChange={(e) => setAssignedEmployeeId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="">Default ({userProfile?.name})</option>
                    {employees.map((emp) => (
                      <option key={emp.uid} value={emp.uid}>
                        {emp.name} ({emp.department || 'Sales'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Scheduling...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
