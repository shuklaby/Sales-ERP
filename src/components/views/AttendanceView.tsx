import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  User,
  Building,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Edit,
  Printer,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, EmployeeRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  formatMinutesToDuration,
  calculateAttendanceMetrics,
} from '../../services/hrService';

export const AttendanceView: React.FC = () => {
  const {
    attendanceRecords,
    employeeRecords,
    employees,
    departmentRecords,
    checkInEmployee,
    checkOutEmployee,
    correctAttendance,
  } = useCrmData();

  const { isAdmin, userProfile, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'my-attendance' | 'admin-register' | 'report'>(
    isAdmin ? 'admin-register' : 'my-attendance'
  );

  // Filters for Admin view
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Attendance Correction Modal
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [corrCheckIn, setCorrCheckIn] = useState('');
  const [corrCheckOut, setCorrCheckOut] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [isSubmittingCorr, setIsSubmittingCorr] = useState(false);
  const [corrError, setCorrError] = useState('');

  // Live timer state for current active check-in
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Current logged in employee ID
  const myEmployeeId = useMemo(() => {
    const matched = employeeRecords.find(
      (e) => e.employeeId === userProfile?.uid || e.id === userProfile?.uid || e.email === userProfile?.email
    );
    return matched ? matched.id : userProfile?.uid || '';
  }, [employeeRecords, userProfile]);

  // Today in YYYY-MM-DD
  const todayYmd = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Update digital clock every second
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Today's attendance record for current employee
  const todayMyAttendance = useMemo(() => {
    if (!myEmployeeId) return null;
    return (
      attendanceRecords.find((a) => a.employeeId === myEmployeeId && a.date === todayYmd) ||
      null
    );
  }, [attendanceRecords, myEmployeeId, todayYmd]);

  // Handle Self Check-In
  const handleCheckIn = async () => {
    if (!myEmployeeId) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      await checkInEmployee(myEmployeeId, 'Web');
      setActionMessage({ type: 'success', text: 'Checked in successfully using server timestamp.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Check-in failed.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Self Check-Out
  const handleCheckOut = async () => {
    if (!todayMyAttendance) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      await checkOutEmployee(todayMyAttendance.id);
      setActionMessage({ type: 'success', text: 'Checked out successfully. Work duration computed.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Check-out failed.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filtered records for Admin Register
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((a) => {
      const matchEmp = filterEmployeeId === 'All' || a.employeeId === filterEmployeeId;
      const matchDept = filterDepartment === 'All' || a.department === filterDepartment;
      const matchStatus = filterStatus === 'All' || a.status === filterStatus;
      const matchStart = !filterStartDate || a.date >= filterStartDate;
      const matchEnd = !filterEndDate || a.date <= filterEndDate;
      return matchEmp && matchDept && matchStatus && matchStart && matchEnd;
    });
  }, [attendanceRecords, filterEmployeeId, filterDepartment, filterStatus, filterStartDate, filterEndDate]);

  // Attendance Report Metrics (Section 19)
  const reportMetrics = useMemo(() => {
    return calculateAttendanceMetrics(attendanceRecords, {
      employeeId: filterEmployeeId !== 'All' ? filterEmployeeId : undefined,
      department: filterDepartment !== 'All' ? filterDepartment : undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    });
  }, [attendanceRecords, filterEmployeeId, filterDepartment, filterStartDate, filterEndDate]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Attendance ID', 'Date', 'Employee', 'Department', 'Check In', 'Check Out', 'Duration (mins)', 'Status', 'Correction Reason'];
    const rows = filteredRecords.map((r) => [
      r.attendanceId,
      r.date,
      `"${r.employeeName}"`,
      `"${r.department || ''}"`,
      r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '',
      r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '',
      r.workDuration || 0,
      r.status,
      r.correction ? `"${r.correction.reason}"` : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Register_${todayYmd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open correction modal
  const openCorrection = (record: AttendanceRecord) => {
    setCorrectionTarget(record);
    setCorrCheckIn(record.checkIn ? record.checkIn.slice(11, 16) : '09:30');
    setCorrCheckOut(record.checkOut ? record.checkOut.slice(11, 16) : '18:30');
    setCorrReason('');
    setCorrError('');
  };

  // Submit correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;
    if (!corrReason.trim()) {
      setCorrError('Correction reason is mandatory.');
      return;
    }
    setIsSubmittingCorr(true);
    setCorrError('');
    try {
      const fullCheckIn = `${correctionTarget.date}T${corrCheckIn}:00.000Z`;
      const fullCheckOut = corrCheckOut ? `${correctionTarget.date}T${corrCheckOut}:00.000Z` : undefined;

      await correctAttendance(correctionTarget.id, {
        correctedCheckIn: fullCheckIn,
        correctedCheckOut: fullCheckOut,
        reason: corrReason.trim(),
      });
      setCorrectionTarget(null);
    } catch (err: any) {
      setCorrError(err.message || 'Correction failed');
    } finally {
      setIsSubmittingCorr(false);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Late':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Half Day':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Absent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Leave':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Holiday':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Attendance & Time Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Server timestamp validated check-ins, work duration audit & factual report calculation.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('my-attendance')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'my-attendance' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Attendance
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin-register')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'admin-register' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Admin Register
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'report' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Attendance Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. MY ATTENDANCE TAB */}
      {activeTab === 'my-attendance' && (
        <div className="space-y-6">
          {/* Time Clock Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-md border border-indigo-900/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                  ● IST Real-Time Server Time
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mb-2">
                  {currentTime || 'Loading clock...'}
                </div>
                <p className="text-xs text-slate-300">
                  Today is{' '}
                  <strong className="text-white">
                    {new Date().toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                </p>
              </div>

              {/* Action Buttons & Status */}
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Today's Status:</span>
                  {todayMyAttendance ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                        todayMyAttendance.checkOut
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {todayMyAttendance.checkOut
                        ? `Shift Completed (${formatMinutesToDuration(todayMyAttendance.workDuration || 0)})`
                        : 'Currently Checked In'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-500/20 text-slate-300 border border-slate-500/30">
                      Not Checked In Yet
                    </span>
                  )}
                </div>

                {todayMyAttendance && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-200 py-1 border-y border-white/10">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase">Check In Time</span>
                      <span className="font-bold">
                        {todayMyAttendance.checkIn ? new Date(todayMyAttendance.checkIn).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase">Check Out Time</span>
                      <span className="font-bold">
                        {todayMyAttendance.checkOut ? new Date(todayMyAttendance.checkOut).toLocaleTimeString() : 'Active'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  {!todayMyAttendance ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={isActionLoading}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-white" /> Check In Now
                    </button>
                  ) : !todayMyAttendance.checkOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={isActionLoading}
                      className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <Square className="w-4 h-4 fill-white" /> Check Out
                    </button>
                  ) : (
                    <div className="text-center text-xs text-emerald-300 font-semibold py-1 w-full flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> You have concluded check-in for today.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Self Attendance History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                My Attendance History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check In</th>
                    <th className="p-3.5">Check Out</th>
                    <th className="p-3.5">Work Duration</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Correction Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceRecords
                    .filter((a) => a.employeeId === myEmployeeId)
                    .map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-semibold font-mono text-slate-800">{att.date}</td>
                        <td className="p-3.5 text-slate-600">
                          {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          {formatMinutesToDuration(att.workDuration || 0)}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(att.status)}`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {att.correction ? (
                            <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Approved Correction: {att.correction.reason}
                            </span>
                          ) : (
                            'Original Record'
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN REGISTER TAB */}
      {activeTab === 'admin-register' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 max-w-[200px]"
              >
                <option value="All">All Employees</option>
                {employeeRecords.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeCode})
                  </option>
                ))}
              </select>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="All">All Departments</option>
                {departmentRecords.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
                <option value="Holiday">Holiday</option>
              </select>

              <input
                type="date"
                placeholder="From Date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <input
                type="date"
                placeholder="To Date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Record ID</th>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check In</th>
                    <th className="p-3.5">Check Out</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Correction Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {att.attendanceId}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">{att.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{att.employeeCode}</span>
                      </td>
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">{att.department || 'Sales'}</td>
                      <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">{att.date}</td>
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {formatMinutesToDuration(att.workDuration || 0)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(att.status)}`}>
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openCorrection(att)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                        >
                          <Edit className="w-3.5 h-3.5" /> Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE REPORT TAB (Section 19: Factual Calculated Metrics) */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Present Days</span>
              <span className="text-2xl font-black text-emerald-950 block mt-1">{reportMetrics.presentDays}</span>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Late Arrivals</span>
              <span className="text-2xl font-black text-amber-950 block mt-1">{reportMetrics.lateDays}</span>
            </div>
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Leave Days</span>
              <span className="text-2xl font-black text-purple-950 block mt-1">{reportMetrics.leaveDays}</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Absent Days</span>
              <span className="text-2xl font-black text-rose-950 block mt-1">{reportMetrics.absentDays}</span>
            </div>
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Avg Work Duration</span>
              <span className="text-2xl font-black text-indigo-950 block mt-1">{reportMetrics.averageWorkDurationFormatted}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              Section 19 Compliance: These metrics are strictly factual calculated figures based on logged check-in and check-out timestamps.
              SparkGenTechnology does not calculate subjective rating inferences from attendance data.
            </span>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Attendance Timestamp Correction
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Employee: <strong>{correctionTarget.employeeName}</strong> ({correctionTarget.employeeCode}) • Date: <strong>{correctionTarget.date}</strong>
            </p>

            {corrError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs mb-4">
                {corrError}
              </div>
            )}

            <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600">
                <span className="font-bold text-slate-800 block text-[11px]">Original Recorded Values:</span>
                <div>Check In: {correctionTarget.checkIn ? new Date(correctionTarget.checkIn).toLocaleTimeString() : 'None'}</div>
                <div>Check Out: {correctionTarget.checkOut ? new Date(correctionTarget.checkOut).toLocaleTimeString() : 'None'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Corrected Check In</label>
                  <input
                    type="time"
                    required
                    value={corrCheckIn}
                    onChange={(e) => setCorrCheckIn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Corrected Check Out</label>
                  <input
                    type="time"
                    value={corrCheckOut}
                    onChange={(e) => setCorrCheckOut(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reason for Correction (Audit Mandate) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="Explain why correction is required..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorr}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isSubmittingCorr ? 'Saving...' : 'Approve Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
