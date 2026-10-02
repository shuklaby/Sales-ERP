import React, { useState, useMemo } from 'react';
import {
  Clock,
  UserCheck,
  UserX,
  Calendar,
  AlertTriangle,
  BarChart2,
  Users,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, AttendanceRecord } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const AttendanceReportView: React.FC = () => {
  const { attendanceRecords, employees, leaveRecords, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: any[];
    columns: DrillDownColumn[];
  }>({
    isOpen: false,
    title: '',
    data: [],
    columns: [],
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(filters.datePreset, filters.startDate, filters.endDate);
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  const scopedAttendance = useMemo(() => {
    if (isAdmin) return attendanceRecords;
    return attendanceRecords.filter((a) => a.employeeId === userProfile?.uid);
  }, [attendanceRecords, isAdmin, userProfile]);

  const filteredAttendance = useMemo(() => {
    return scopedAttendance.filter((a) => {
      if (!isWithinDateRange(a.date, activeDateRange)) return false;

      if (filters.employeeId && filters.employeeId !== 'ALL' && a.employeeId !== filters.employeeId) {
        return false;
      }
      if (filters.status && filters.status !== 'ALL' && a.status !== filters.status) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const emp = employees.find((e) => e.uid === a.employeeId);
        const nameMatch = (emp?.name || '').toLowerCase().includes(q) || (a.employeeName || '').toLowerCase().includes(q);
        const dateMatch = a.date.includes(q);
        if (!nameMatch && !dateMatch) return false;
      }
      return true;
    });
  }, [scopedAttendance, activeDateRange, filters, searchQuery, employees]);

  // Section 15 metrics:
  // Total Employees, Present, Absent, Half Day, Leave, Working Hours, Late Arrivals
  const attendanceKpis = useMemo(() => {
    const totalEmployees = employees.length;
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let lateArrivals = 0;
    let totalWorkingMinutes = 0;

    filteredAttendance.forEach((a) => {
      const st = a.status;
      if (st === 'Present') presentCount++;
      else if (st === 'Absent') absentCount++;
      else if (st === 'Half-Day' || st === 'Half Day') halfDayCount++;

      if (a.isLate) lateArrivals++;
      if (a.workDurationMinutes) {
        totalWorkingMinutes += Number(a.workDurationMinutes);
      }
    });

    const leaveCount = leaveRecords.filter((l) => {
      if (l.status !== 'Approved') return false;
      return isWithinDateRange(l.startDate, activeDateRange) || isWithinDateRange(l.endDate, activeDateRange);
    }).length;

    const totalHours = (totalWorkingMinutes / 60).toFixed(1);

    return {
      totalEmployees,
      presentCount,
      absentCount,
      halfDayCount,
      leaveCount,
      totalHours,
      lateArrivals,
      recordsCount: filteredAttendance.length,
    };
  }, [employees, filteredAttendance, leaveRecords, activeDateRange]);

  const attColumns: DrillDownColumn[] = [
    { header: 'Employee', accessor: 'employeeName', format: (val, row) => val || row.employeeId },
    { header: 'Date', accessor: 'date', format: (val) => formatDateDisplayIST(val) },
    { header: 'Status', accessor: 'status' },
    { header: 'Check In', accessor: 'checkIn', format: (val) => val ? val.substring(11, 16) : '—' },
    { header: 'Check Out', accessor: 'checkOut', format: (val) => val ? val.substring(11, 16) : '—' },
    { header: 'Duration', accessor: 'workDurationMinutes', format: (val) => val ? `${Math.floor(val / 60)}h ${val % 60}m` : '—' },
    { header: 'Late Arrival', accessor: 'isLate', format: (val) => val ? 'Yes (Late)' : 'On Time' },
  ];

  const handleExportExcel = () => {
    const rows = filteredAttendance.map((a) => ({
      Employee: a.employeeName || a.employeeId,
      Date: a.date,
      Status: a.status,
      'Check In': a.checkIn || '',
      'Check Out': a.checkOut || '',
      'Work Duration (mins)': a.workDurationMinutes || 0,
      'Late Arrival': a.isLate ? 'Yes' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Report');
    XLSX.writeFile(wb, `SparkGen_AttendanceReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredAttendance.map((a) => ({
      Employee: a.employeeName || a.employeeId,
      Date: a.date,
      Status: a.status,
      'Check In': a.checkIn || '',
      'Check Out': a.checkOut || '',
      'Work Duration (mins)': a.workDurationMinutes || 0,
      'Late Arrival': a.isLate ? 'Yes' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_AttendanceReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredAttendance.map((a) => ({
      Employee: a.employeeName || a.employeeId,
      Date: a.date,
      Status: a.status,
      'Check In': a.checkIn ? a.checkIn.substring(11, 16) : '—',
      'Check Out': a.checkOut ? a.checkOut.substring(11, 16) : '—',
      Late: a.isLate ? 'Yes' : 'No',
    }));

    const doc = generateReportPdf({
      reportTitle: `HR Attendance & Workforce Physical Log Register`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Present Count', value: String(attendanceKpis.presentCount) },
        { label: 'Absent Count', value: String(attendanceKpis.absentCount) },
        { label: 'Late Arrivals', value: String(attendanceKpis.lateArrivals) },
        { label: 'Work Hours', value: `${attendanceKpis.totalHours} hrs` },
      ],
      columns: [
        { header: 'Employee', dataKey: 'Employee' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Check In', dataKey: 'Check In', align: 'center' },
        { header: 'Check Out', dataKey: 'Check Out', align: 'center' },
        { header: 'Late', dataKey: 'Late', align: 'center' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_AttendanceReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() => setFilters({ datePreset: 'This Month', employeeId: 'ALL', status: 'ALL' })}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showStatusFilter={true}
        statusOptions={['Present', 'Absent', 'Half-Day', 'On-Leave']}
        totalRecordsCount={filteredAttendance.length}
      />

      {/* KPI Cards (Section 15 specs: Total Employees, Present, Absent, Half Day, Leave, Working Hours, Late Arrivals) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Total Staff</div>
          <div className="text-xl font-black text-slate-900 mt-1">{attendanceKpis.totalEmployees}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Employees on payroll</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Present Attendance Logs',
              subtitle: 'Full day attendance records in period',
              data: filteredAttendance.filter((a) => a.status === 'Present'),
              columns: attColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Present</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{attendanceKpis.presentCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Recorded present shifts</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Absent Shifts',
              subtitle: 'Marked absent logs',
              data: filteredAttendance.filter((a) => a.status === 'Absent'),
              columns: attColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Absent</div>
          <div className="text-xl font-black text-rose-600 mt-1">{attendanceKpis.absentCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Unexcused absence</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Half-Day Logs',
              subtitle: 'Half day attendance shifts',
              data: filteredAttendance.filter((a) => a.status === 'Half-Day' || a.status === 'Half Day'),
              columns: attColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Half Day</div>
          <div className="text-xl font-black text-amber-600 mt-1">{attendanceKpis.halfDayCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Partial working shifts</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Approved Leave</div>
          <div className="text-xl font-black text-purple-700 mt-1">{attendanceKpis.leaveCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Formal leaves taken</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Working Hours</div>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">{attendanceKpis.totalHours}h</div>
          <div className="text-2xs text-slate-500 mt-0.5">Cumulative hours logged</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Late Arrival Logs',
              subtitle: 'Check-in past company grace window',
              data: filteredAttendance.filter((a) => a.isLate),
              columns: attColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Late Arrivals</div>
          <div className="text-xl font-black text-orange-600 mt-1">{attendanceKpis.lateArrivals}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Clocked in late</div>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Attendance Log Register ({filteredAttendance.length} Entries)
          </h4>
          <span className="text-2xs text-slate-400">Strictly read-only audit log</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="p-3">Employee</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Check In</th>
                <th className="p-3 text-center">Check Out</th>
                <th className="p-3 text-center">Duration</th>
                <th className="p-3 text-center">Late Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredAttendance.map((a) => (
                <tr
                  key={a.id}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Attendance: ${a.employeeName || a.employeeId}`,
                      subtitle: `Date: ${formatDateDisplayIST(a.date)} • Status: ${a.status}`,
                      data: [a],
                      columns: attColumns,
                    })
                  }
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-semibold text-slate-900">{a.employeeName || a.employeeId}</td>
                  <td className="p-3 text-slate-500">{formatDateDisplayIST(a.date)}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-bold border ${
                        a.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : a.status === 'Absent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : a.status === 'Half-Day' || a.status === 'Half Day'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700">
                    {a.checkIn ? a.checkIn.substring(11, 16) : '—'}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700">
                    {a.checkOut ? a.checkOut.substring(11, 16) : '—'}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600">
                    {a.workDurationMinutes ? `${Math.floor(a.workDurationMinutes / 60)}h ${a.workDurationMinutes % 60}m` : '—'}
                  </td>
                  <td className="p-3 text-center">
                    {a.isLate ? (
                      <span className="text-2xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Late
                      </span>
                    ) : (
                      <span className="text-2xs text-slate-400">On Time</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      <ReportDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState((prev) => ({ ...prev, isOpen: false }))}
        title={drillDownState.title}
        subtitle={drillDownState.subtitle}
        data={drillDownState.data}
        columns={drillDownState.columns}
      />
    </div>
  );
};
