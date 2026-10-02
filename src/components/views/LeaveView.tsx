import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  User,
  Shield,
  Trash2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { LeaveRecord, LeaveStatus, LeaveTypeRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { calculateLeaveBalances } from '../../services/hrService';

export const LeaveView: React.FC = () => {
  const {
    leaveRecords,
    leaveTypeRecords,
    employeeRecords,
    employees,
    applyLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    holidayRecords,
  } = useCrmData();

  const { isAdmin, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'my-leaves' | 'approvals' | 'calendar'>(
    isAdmin ? 'approvals' : 'my-leaves'
  );

  // Apply Leave Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Rejection Modal
  const [rejectTarget, setRejectTarget] = useState<LeaveRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Current logged in employee ID
  const myEmployeeId = useMemo(() => {
    const match = employeeRecords.find(
      (e) => e.employeeId === userProfile?.uid || e.id === userProfile?.uid || e.email === userProfile?.email
    );
    return match ? match.id : userProfile?.uid || '';
  }, [employeeRecords, userProfile]);

  // Number of days calculation
  const calculatedDays = useMemo(() => {
    if (!fromDate || !toDate) return 1;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [fromDate, toDate]);

  // Leave balances for current user
  const myLeaveBalances = useMemo(() => {
    if (!myEmployeeId) return [];
    return calculateLeaveBalances(myEmployeeId, leaveTypeRecords, leaveRecords);
  }, [myEmployeeId, leaveTypeRecords, leaveRecords]);

  // My Leave Applications
  const myLeaves = useMemo(() => {
    return leaveRecords
      .filter((l) => l.employeeId === myEmployeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leaveRecords, myEmployeeId]);

  // Pending Approvals (for Admin or Manager)
  const pendingApprovals = useMemo(() => {
    return leaveRecords
      .filter((l) => l.status === 'Pending')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [leaveRecords]);

  // All historical leaves (for Admin)
  const allHistoricalLeaves = useMemo(() => {
    return leaveRecords.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leaveRecords]);

  const handleOpenApply = () => {
    setSelectedLeaveTypeId(leaveTypeRecords[0]?.id || '');
    setFromDate(new Date().toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setApplyError('');
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployeeId) {
      setApplyError('Employee profile could not be identified.');
      return;
    }
    if (calculatedDays <= 0) {
      setApplyError('End date must be on or after start date.');
      return;
    }
    if (!reason.trim()) {
      setApplyError('Please provide a reason for your leave application.');
      return;
    }

    const typeObj = leaveTypeRecords.find((t) => t.id === selectedLeaveTypeId) || leaveTypeRecords[0];
    const myProfile = employeeRecords.find((e) => e.id === myEmployeeId);

    setIsApplying(true);
    setApplyError('');

    try {
      await applyLeave({
        employeeId: myEmployeeId,
        employeeCode: myProfile?.employeeCode || 'EMP',
        employeeName: myProfile?.name || `${myProfile?.firstName || 'Staff'} ${myProfile?.lastName || ''}`,
        department: myProfile?.department || 'Sales',
        leaveTypeId: typeObj?.id || 'casual',
        leaveType: typeObj?.name || 'Casual Leave',
        fromDate,
        toDate,
        numberOfDays: calculatedDays,
        reason: reason.trim(),
      });
      setIsApplyModalOpen(false);
    } catch (err: any) {
      setApplyError(err.message || 'Error submitting leave request.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      await approveLeave(leaveId);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleOpenReject = (leave: LeaveRecord) => {
    setRejectTarget(leave);
    setRejectionReason('');
    setRejectError('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      setRejectError('Rejection reason is required.');
      return;
    }

    setIsRejecting(true);
    try {
      await rejectLeave(rejectTarget.id, rejectionReason.trim());
      setRejectTarget(null);
    } catch (err: any) {
      setRejectError(err.message || 'Rejection failed.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCancelMyLeave = async (leaveId: string) => {
    if (!window.confirm('Cancel this pending leave request?')) return;
    try {
      await cancelLeave(leaveId);
    } catch (err: any) {
      alert(`Error cancelling leave: ${err.message}`);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Leave Management & Entitlements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Leave balance tracking, approval governance, rejection justifications & holiday calendar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('my-leaves')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'my-leaves' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Leaves
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'approvals' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Pending Approvals</span>
                {pendingApprovals.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Holidays (2026)
            </button>
          </div>

          <button
            onClick={handleOpenApply}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        </div>
      </div>

      {/* 1. MY LEAVES TAB */}
      {activeTab === 'my-leaves' && (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              My Leave Balances (Calendar Year 2026)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {myLeaveBalances.map((b) => (
                <div key={b.typeId} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{b.typeName}</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {b.code}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-indigo-950 font-mono">{b.remaining}</span>
                    <span className="text-xs font-semibold text-slate-500">Days Left</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                    <span>Allocated: {b.allocated}</span>
                    <span>Used: {b.used}</span>
                    <span>Pending: {b.pending}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                My Leave History ({myLeaves.length})
              </h3>
            </div>
            {myLeaves.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                You haven't submitted any leave applications yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Leave #</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">From Date</th>
                      <th className="p-3.5">To Date</th>
                      <th className="p-3.5">Days</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{l.leaveId}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{l.leaveType}</td>
                        <td className="p-3.5 font-mono text-slate-600">{l.fromDate}</td>
                        <td className="p-3.5 font-mono text-slate-600">{l.toDate}</td>
                        <td className="p-3.5 font-bold text-slate-900">{l.numberOfDays}</td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">{l.reason}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(l.status)}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {l.status === 'Pending' && (
                            <button
                              onClick={() => handleCancelMyLeave(l.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                            >
                              Cancel Request
                            </button>
                          )}
                          {l.status === 'Rejected' && l.rejectionReason && (
                            <span className="text-[10px] text-rose-600 italic block">
                              Reason: {l.rejectionReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ADMIN APPROVALS TAB */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {/* Pending Applications Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pending Decisions ({pendingApprovals.length})
                </h3>
              </div>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No pending leave requests awaiting approval. All caught up!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Leave ID</th>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Leave Type</th>
                      <th className="p-3.5">Dates</th>
                      <th className="p-3.5">Days</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">{l.leaveId}</td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800 block">{l.employeeName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{l.employeeCode}</span>
                        </td>
                        <td className="p-3.5 text-slate-600 whitespace-nowrap">{l.department}</td>
                        <td className="p-3.5 font-semibold text-slate-800 whitespace-nowrap">{l.leaveType}</td>
                        <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {l.fromDate} → {l.toDate}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{l.numberOfDays}</td>
                        <td className="p-3.5 text-slate-600 max-w-xs">{l.reason}</td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(l.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(l)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical Leaves Audit */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                All Organization Leaves ({allHistoricalLeaves.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Days</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Decision Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allHistoricalLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-mono font-bold text-indigo-600">{l.leaveId}</td>
                      <td className="p-3.5 font-bold text-slate-800">{l.employeeName}</td>
                      <td className="p-3.5 text-slate-700">{l.leaveType}</td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {l.fromDate} → {l.toDate}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{l.numberOfDays}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(l.status)}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {l.status === 'Approved' && l.approvedAt && `Approved on ${l.approvedAt.split('T')[0]}`}
                        {l.status === 'Rejected' && l.rejectionReason && `Reason: ${l.rejectionReason}`}
                        {l.status === 'Cancelled' && 'Cancelled by employee'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. HOLIDAYS CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Configured Public & Statutory Holidays (2026)
                </h3>
                <p className="text-xs text-slate-500">
                  Employee attendance calculations automatically recognize these configured non-working days.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Holiday ID</th>
                    <th className="p-3.5">Holiday Name</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Day</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holidayRecords.map((h) => {
                    const dayName = new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' });
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{h.holidayId}</td>
                        <td className="p-3.5 font-bold text-slate-800">{h.name}</td>
                        <td className="p-3.5 font-mono text-slate-700">{h.date}</td>
                        <td className="p-3.5 text-slate-600">{dayName}</td>
                        <td className="p-3.5 text-slate-500">{h.description}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Apply for Leave</h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit your absence request for review by department administration.
            </p>

            {applyError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs mb-4">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Leave Category *</label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  {leaveTypeRecords.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Max {t.annualLimit} days/year)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <span className="text-indigo-900 font-semibold">Total Requested Duration:</span>
                <span className="text-base font-black text-indigo-950 font-mono">
                  {calculatedDays} {calculatedDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detail reason for absence..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplying}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isApplying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reject Leave Application</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the compliance reason for declining <strong>{rejectTarget.employeeName}</strong>'s request.
            </p>

            {rejectError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs mb-4">
                {rejectError}
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Rejection Reason (Mandatory) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Critical release milestone on selected dates, insufficient remaining quota, overlapping team absences..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
