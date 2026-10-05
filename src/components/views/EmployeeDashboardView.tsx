import React, { useState, useMemo } from 'react';
import {
  Users,
  Target,
  FileCheck,
  PhoneCall,
  CalendarClock,
  FileText,
  Clock,
  Plus,
  Play,
  Square,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Phone,
  Mail,
  Building,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveView } from '../common/Sidebar';
import { formatMinutesToDuration, calculateLeaveBalances } from '../../services/hrService';
import { formatINR, formatDateDisplayIST } from '../../utils/dateRangeUtils';
import { ProposalRecord, Customer, Lead, STSRecord, FollowUpRecord } from '../../types/crm';

interface EmployeeDashboardViewProps {
  onNavigate: (view: ActiveView) => void;
  onOpenCustomerModal: () => void;
  onOpenLeadModal: () => void;
  onOpenProposalModal: () => void;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({
  onNavigate,
  onOpenCustomerModal,
  onOpenLeadModal,
  onOpenProposalModal,
}) => {
  const { userProfile, hasPermission } = useAuth();
  const {
    customers,
    leads,
    proposals,
    stsRecords,
    calls,
    followups,
    taskRecords,
    attendanceRecords,
    leaveRecords,
    leaveTypeRecords,
    employeeRecords,
    checkInEmployee,
    checkOutEmployee,
    completeFollowUp,
    updateTaskStatus,
  } = useCrmData();

  const [isClockLoading, setIsClockLoading] = useState(false);

  // STRICT EMPLOYEE DATA SCOPING: An employee ONLY sees their assigned records
  const myEmpId = useMemo(() => {
    return employeeRecords.find(
      (e) =>
        e.uid === userProfile?.uid ||
        e.email.toLowerCase() === (userProfile?.email || '').toLowerCase()
    )?.id;
  }, [employeeRecords, userProfile]);

  const myCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.assignedEmployeeId === userProfile?.uid ||
        c.assignedEmployeeId === userProfile?.employeeId ||
        c.createdBy === userProfile?.uid
    );
  }, [customers, userProfile]);

  const myLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        l.assignedEmployeeId === userProfile?.uid ||
        l.assignedEmployeeId === userProfile?.employeeId ||
        l.createdBy === userProfile?.uid
    );
  }, [leads, userProfile]);

  const myProposals = useMemo(() => {
    return proposals.filter(
      (p) =>
        p.assignedEmployeeId === userProfile?.uid ||
        p.assignedEmployeeId === userProfile?.employeeId ||
        p.createdBy === userProfile?.uid
    );
  }, [proposals, userProfile]);

  const mySTS = useMemo(() => {
    return stsRecords.filter(
      (s) =>
        s.assignedEmployeeId === userProfile?.uid ||
        s.assignedEmployeeId === userProfile?.employeeId ||
        s.employeeId === userProfile?.uid ||
        (s as any).createdBy === userProfile?.uid
    );
  }, [stsRecords, userProfile]);

  const todayStr = new Date().toISOString().split('T')[0];

  const myCallsToday = useMemo(() => {
    return calls.filter(
      (c) =>
        (c.employeeId === userProfile?.uid || c.employeeId === userProfile?.employeeId) &&
        (c.callDate?.startsWith(todayStr) || c.createdAt?.startsWith(todayStr))
    );
  }, [calls, userProfile, todayStr]);

  const myFollowups = useMemo(() => {
    return followups.filter(
      (f) =>
        f.employeeId === userProfile?.uid ||
        f.employeeId === userProfile?.employeeId
    );
  }, [followups, userProfile]);

  const myDueFollowupsToday = useMemo(() => {
    return myFollowups.filter(
      (f) => f.date === todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'
    );
  }, [myFollowups, todayStr]);

  const myOverdueFollowups = useMemo(() => {
    return myFollowups.filter(
      (f) => f.date < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'
    );
  }, [myFollowups, todayStr]);

  const myTasks = useMemo(() => {
    return taskRecords.filter(
      (t) =>
        t.assignedTo === userProfile?.uid ||
        t.assignedTo === userProfile?.employeeId ||
        (myEmpId && t.assignedTo === myEmpId) ||
        t.createdBy === userProfile?.uid
    );
  }, [taskRecords, userProfile, myEmpId]);

  const myWonProposalsValue = useMemo(() => {
    return myProposals
      .filter((p) => p.status === 'Accepted' || p.paymentStatus === 'Paid')
      .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  }, [myProposals]);

  const myLeaveBalances = useMemo(() => {
    if (!myEmpId) return [];
    return calculateLeaveBalances(myEmpId, leaveTypeRecords, leaveRecords);
  }, [myEmpId, leaveTypeRecords, leaveRecords]);

  // Today's attendance
  const myTodayAttendance = useMemo(() => {
    return attendanceRecords.find(
      (a) =>
        (a.employeeId === myEmpId || a.employeeId === userProfile?.uid) &&
        a.date === todayStr
    );
  }, [attendanceRecords, myEmpId, userProfile, todayStr]);

  const handleQuickClock = async () => {
    const targetEmpId = myEmpId || userProfile?.uid;
    if (!targetEmpId) return;
    setIsClockLoading(true);
    try {
      if (!myTodayAttendance) {
        await checkInEmployee(targetEmpId);
      } else if (!myTodayAttendance.checkOut) {
        await checkOutEmployee(targetEmpId);
      }
    } catch (err) {
      console.warn('Attendance clock error:', err);
    } finally {
      setIsClockLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner & Operations Console Greeting */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/50">
                Employee Operations Console
              </span>
              <span className="text-xs text-slate-400">• SparkGenTechnology Sales-ERP</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-1 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Welcome, {userProfile?.name}
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              {userProfile?.designation || 'Sales Executive'} &bull; Department: {userProfile?.department || 'Sales'} &bull; ID: {userProfile?.employeeId || 'EMP'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('createProposal') && (
              <button
                onClick={onOpenProposalModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Proposal
              </button>
            )}
            {hasPermission('createCustomer') && (
              <button
                onClick={onOpenCustomerModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 text-indigo-400" /> New Customer
              </button>
            )}
            {hasPermission('createLead') && (
              <button
                onClick={onOpenLeadModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-indigo-400" /> New Lead
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Quick Attendance Bar & Employee Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Shift Attendance</span>
            <span className="text-sm font-bold text-slate-800">
              {myTodayAttendance
                ? myTodayAttendance.checkOut
                  ? `Shift Closed (Completed ${formatMinutesToDuration(myTodayAttendance.workDuration || 0)})`
                  : `Checked In at ${myTodayAttendance.checkIn ? new Date(myTodayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}`
                : 'Not Checked In Yet'}
            </span>
          </div>
        </div>

        {(!myTodayAttendance || !myTodayAttendance.checkOut) && (
          <button
            onClick={handleQuickClock}
            disabled={isClockLoading}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 ${
              !myTodayAttendance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {!myTodayAttendance ? (
              <>
                <Play className="w-3.5 h-3.5 fill-white" /> Check In Shift
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 fill-white" /> Check Out Shift
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Personal Operational Metrics (Strictly Scoped to this Employee) */}
      <div>
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          My Operational Indicators (Assigned Records)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* My Customers */}
          <div
            onClick={() => onNavigate('customers')}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Customers</span>
              <Users className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{myCustomers.length}</span>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
              View Accounts <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* My Proposals */}
          <div
            onClick={() => onNavigate('proposals')}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Proposals</span>
              <FileText className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{myProposals.length}</span>
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5 mt-1">
              View Proposals <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* My Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">My Leads</span>
              <Target className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-slate-900 block">{myLeads.length}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
              View Leads <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Due Follow-ups Today */}
          <div
            onClick={() => onNavigate('followups')}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Today</span>
              <CalendarClock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-amber-700 block">{myDueFollowupsToday.length}</span>
            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-1">
              Pending Outreach <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Overdue Follow-ups */}
          <div
            onClick={() => onNavigate('followups')}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overdue</span>
              <AlertCircle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-rose-600 block">{myOverdueFollowups.length}</span>
            <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 mt-1">
              Action Required <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Workspace: Left = Due Follow-ups & Active Proposals, Right = Tasks & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Today's Follow-up Schedule */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Today's Follow-ups ({myDueFollowupsToday.length})</h3>
            </div>
            <button
              onClick={() => onNavigate('followups')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              All Follow-ups <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {myDueFollowupsToday.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No pending follow-ups for today</p>
              <p className="text-[11px] text-slate-400 mt-1">You are all caught up with your scheduled client communications.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {myDueFollowupsToday.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-indigo-50/40 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 block truncate">{f.companyName || f.contactPerson}</span>
                    <span className="text-[11px] text-slate-500 block truncate">{f.notes || 'Routine follow-up call'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(f as any).mobile && (
                      <a
                        href={`tel:${(f as any).mobile}`}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                        title="Call Contact"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => completeFollowUp(f.id, 'Follow-up executed successfully')}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: My Active Commercial Proposals */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">My Recent Proposals ({myProposals.length})</h3>
            </div>
            <button
              onClick={() => onNavigate('proposals')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View Proposals <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {myProposals.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No proposals created yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Create your first proposal to start closing opportunities.</p>
              <button
                onClick={onOpenProposalModal}
                className="mt-3 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                + New Proposal
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {myProposals.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/70 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{p.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">#{p.proposalNumber}</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-800 block mt-0.5">
                      {formatINR(p.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        p.status === 'Accepted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.paymentStatus && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          p.paymentStatus === 'Paid'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Assigned Tasks & Deadlines Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">My Assigned Tasks ({myTasks.length})</h3>
          </div>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            Task Board <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {myTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No open tasks assigned to you.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTasks.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs"
              >
                <input
                  type="checkbox"
                  checked={t.status === 'Completed'}
                  onChange={() => updateTaskStatus(t.id, t.status === 'Completed' ? 'In Progress' : 'Completed')}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0 flex-1">
                  <span className={`font-semibold block truncate ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {t.title}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Due: {t.dueDate || 'Flexible'} &bull; Priority: {t.priority || 'Normal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
