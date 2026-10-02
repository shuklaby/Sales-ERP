import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Shield,
  UserX,
  UserCheck,
  BarChart2,
  Calendar,
  PhoneCall,
  CalendarClock,
  Target,
  Building,
  FileCheck,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Eye,
  Trash2,
} from 'lucide-react';
import { UserProfile, EmployeeRecord, EmploymentStatus } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { EmployeeModal } from '../modals/EmployeeModal';
import { EmployeeProfileView } from './EmployeeProfileView';
import {
  DateRangePreset,
  DateRange,
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';

export const EmployeesView: React.FC = () => {
  const {
    employees,
    employeeRecords,
    updateEmployeeStatus,
    updateEmployeeEmploymentStatus,
    canDeleteEmployee,
    deleteEmployeeRecord,
    customers,
    leads,
    proposals,
    calls,
    followups,
    stsRecords,
  } = useCrmData();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'directory' | 'performance'>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<EmployeeRecord | UserProfile | null>(null);

  // Selected employee for drilldown in /admin/employees/:employeeId
  const [selectedProfileEmpId, setSelectedProfileEmpId] = useState<string | null>(null);

  // Selected employee for drilldown in /admin/employees/performance
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  // Date Range state for Performance tab
  const [datePreset, setDatePreset] = useState<DateRangePreset>('This Month');
  const activeDateRange: DateRange = useMemo(() => {
    return getDateRangeFromPreset(datePreset);
  }, [datePreset]);

  // Sync route on mount / route change
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/performance')) {
      setActiveTab('performance');
      setSelectedProfileEmpId(null);
    } else {
      const parts = path.split('/').filter(Boolean);
      // /admin/employees/:employeeId
      if (parts.length >= 3 && parts[1] === 'employees' && parts[2] !== 'performance') {
        setSelectedProfileEmpId(parts[2]);
      }
    }
  }, []);

  const handleTabChange = (t: 'directory' | 'performance') => {
    setActiveTab(t);
    setSelectedProfileEmpId(null);
    const basePath = isAdmin ? '/admin/employees' : '/employee/employees';
    window.history.pushState(null, '', t === 'performance' ? `${basePath}/performance` : basePath);
  };

  const handleOpenProfile = (empId: string) => {
    setSelectedProfileEmpId(empId);
    window.history.pushState(null, '', `/admin/employees/${empId}`);
  };

  const handleCloseProfile = () => {
    setSelectedProfileEmpId(null);
    window.history.pushState(null, '', '/admin/employees');
  };

  // Unified list of employees (combines employeeRecords and existing user profiles)
  const unifiedEmployees = useMemo(() => {
    const recMap = new Map<string, any>();

    // Add employee records first
    employeeRecords.forEach((er) => {
      recMap.set(er.id, {
        id: er.id,
        uid: er.employeeId || er.id,
        name: er.name || `${er.firstName} ${er.lastName}`,
        email: er.email,
        phone: er.phone,
        employeeCode: er.employeeCode,
        department: er.department,
        designation: er.designation,
        role: er.roleName?.toLowerCase().includes('admin') ? 'admin' : 'employee',
        roleName: er.roleName || 'Employee',
        employmentStatus: er.employmentStatus || 'Active',
        status: er.employmentStatus === 'Inactive' || er.employmentStatus === 'Suspended' ? 'inactive' : 'active',
        dataScope: er.dataScope || 'Own Records',
        permissions: er.permissions,
        createdAt: er.createdAt,
      });
    });

    // Add user profiles if not already added
    employees.forEach((u) => {
      if (!recMap.has(u.id) && !recMap.has(u.uid)) {
        recMap.set(u.id || u.uid, {
          id: u.id,
          uid: u.uid,
          name: u.name,
          email: u.email,
          phone: (u as any).phone || '',
          employeeCode: (u as any).employeeCode || 'EMP-2026-0001',
          department: u.department || 'Sales',
          designation: (u as any).designation || 'Sales Executive',
          role: u.role,
          roleName: u.role === 'admin' ? 'Super Admin' : 'Sales Executive',
          employmentStatus: u.status === 'active' ? 'Active' : 'Inactive',
          status: u.status,
          dataScope: (u as any).dataScope || (u.role === 'admin' ? 'All Records' : 'Own Records'),
          permissions: u.permissions,
          createdAt: u.createdAt,
        });
      }
    });

    return Array.from(recMap.values());
  }, [employeeRecords, employees]);

  const filteredEmployees = useMemo(() => {
    return unifiedEmployees.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'All' || e.employmentStatus === statusFilter;
      const matchDept = deptFilter === 'All' || e.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [unifiedEmployees, searchTerm, statusFilter, deptFilter]);

  const handleToggleStatus = async (emp: any) => {
    const nextStatus = emp.employmentStatus === 'Active' ? 'Inactive' : 'Active';
    if (emp.id && employeeRecords.some((r) => r.id === emp.id)) {
      await updateEmployeeEmploymentStatus(emp.id, nextStatus as EmploymentStatus);
    } else {
      await updateEmployeeStatus(emp.id, nextStatus === 'Active' ? 'active' : 'inactive');
    }
  };

  const handleDeleteEmployee = async (emp: any) => {
    const check = canDeleteEmployee(emp.id || emp.uid);
    if (!check.canDelete) {
      alert(`Cannot delete employee: ${check.reason}`);
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete employee ${emp.name}?`)) {
      return;
    }
    try {
      await deleteEmployeeRecord(emp.id);
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  // Selected Employee object (defaults to first employee if none selected)
  const activeEmployee = useMemo(() => {
    if (selectedEmpId) {
      return employees.find((e) => e.uid === selectedEmpId) || employees[0] || null;
    }
    return employees[0] || null;
  }, [employees, selectedEmpId]);

  // ==================== SECTION 12: EMPLOYEE PERFORMANCE METRICS ====================
  const empPerformance = useMemo(() => {
    if (!activeEmployee) return null;
    const uid = activeEmployee.uid;

    // Filtered by date range
    const empLeads = leads.filter(
      (l) =>
        (l.assignedEmployeeId === uid || l.createdBy === uid) &&
        isWithinDateRange(l.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );

    const empCusts = customers.filter(
      (c) =>
        (c.assignedEmployeeId === uid || c.createdBy === uid) &&
        isWithinDateRange(c.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );

    const empCalls = calls.filter(
      (c) =>
        c.employeeId === uid &&
        isWithinDateRange(c.dateTime || c.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
    const connectedCalls = empCalls.filter((c) => c.status === 'Connected').length;

    const empFollowups = followups.filter(
      (f) =>
        f.employeeId === uid &&
        isWithinDateRange(f.date || f.createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );
    const completedF = empFollowups.filter((f) => f.status === 'Completed').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueF = followups.filter(
      (f) =>
        f.employeeId === uid &&
        f.date < todayStr &&
        f.status !== 'Completed' &&
        f.status !== 'Cancelled'
    ).length;

    const empSTS = stsRecords.filter(
      (s) =>
        (s.assignedEmployeeId === uid || s.employeeId === uid || (s as any).createdBy === uid) &&
        isWithinDateRange(s.date || (s as any).createdAt, activeDateRange.startDate, activeDateRange.endDate)
    );

    const empProps = proposals.filter(
      (p) =>
        (p.assignedEmployeeId === uid || p.createdBy === uid) &&
        isWithinDateRange(p.createdAt || p.proposalDate, activeDateRange.startDate, activeDateRange.endDate)
    );

    const propsSent = empProps.filter((p) => p.status === 'Sent' || p.sentAt).length;
    const propsViewed = empProps.filter((p) => p.status === 'Viewed' || p.viewedAt).length;
    const propsAccepted = empProps.filter((p) => p.status === 'Accepted').length;

    const propValue = empProps.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
    const wonValue = empProps
      .filter((p) => p.status === 'Accepted')
      .reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

    return {
      leadsAssigned: empLeads.length,
      customersAssigned: empCusts.length,
      calls: empCalls.length,
      connectedCalls,
      followups: empFollowups.length,
      completedFollowups: completedF,
      overdueFollowups: overdueF,
      stsCreated: empSTS.length,
      proposalsCreated: empProps.length,
      proposalsSent: propsSent,
      proposalsViewed: propsViewed,
      proposalsAccepted: propsAccepted,
      proposalValue: propValue,
      wonValue: wonValue,
    };
  }, [activeEmployee, leads, customers, calls, followups, stsRecords, proposals, activeDateRange]);

  if (selectedProfileEmpId) {
    return (
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <EmployeeProfileView
          employeeId={selectedProfileEmpId}
          onBack={handleCloseProfile}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest uppercase font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {isAdmin ? 'Superadmin Team Management' : 'Employee Directory'}
            </span>
            <span className="text-xs text-slate-400">• SparkGenTechnology</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Employee Management & Performance Center
          </h1>
          <p className="text-xs text-slate-500">
            Configure access credentials, module permissions, and review factual data-driven activity audit metrics.
          </p>
        </div>

        {isAdmin && activeTab === 'directory' && (
          <button
            onClick={() => {
              setEmployeeToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add Team Member
          </button>
        )}
      </div>

      {/* 2. Tab Navigation */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <button
          onClick={() => handleTabChange('directory')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'directory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Team Directory ({unifiedEmployees.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTabChange('performance')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'performance'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Employee Activity & Performance (/admin/employees/performance)
          </button>
        )}
      </div>

      {/* TAB 1: Team Directory & Permissions */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code, name, email, department..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Probation">Probation</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
                <option value="Exited">Exited</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold"
              >
                <option value="All">All Departments</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Accounts">Accounts & Finance</option>
                <option value="Support">Support</option>
                <option value="Operations">Operations</option>
                <option value="HR">HR</option>
                <option value="Management">Management</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Employee ID</th>
                    <th className="py-3.5 px-4 font-semibold">Employee Details</th>
                    <th className="py-3.5 px-4 font-semibold">Department & Title</th>
                    <th className="py-3.5 px-4 font-semibold">System Role</th>
                    <th className="py-3.5 px-4 font-semibold">Employment Status</th>
                    <th className="py-3.5 px-4 font-semibold">Scope</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No team members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                            {emp.employeeCode}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <span className="text-[11px] text-slate-500 font-mono">{emp.email}</span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{emp.department || 'Sales'}</div>
                            <span className="text-[11px] text-slate-500">{emp.designation || 'Executive'}</span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                emp.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {emp.roleName || (emp.role === 'admin' ? 'Super Admin' : 'Employee')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                emp.employmentStatus === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : emp.employmentStatus === 'Probation'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : emp.employmentStatus === 'On Leave'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : emp.employmentStatus === 'Suspended'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {emp.employmentStatus || 'Active'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-slate-600 text-[11px] font-medium">
                              {emp.dataScope || 'Own Records'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenProfile(emp.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 text-xs font-semibold transition"
                                title="View Complete 12-Tab Profile"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Profile
                              </button>

                              <button
                                onClick={() => {
                                  setEmployeeToEdit(emp);
                                  setIsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs"
                                title="Edit Employee"
                              >
                                <Shield className="w-3.5 h-3.5 text-slate-600" /> Edit
                              </button>

                              {emp.role !== 'admin' && (
                                <button
                                  onClick={() => handleToggleStatus(emp)}
                                  className={`p-1.5 rounded-lg ${
                                    emp.employmentStatus === 'Active'
                                      ? 'text-rose-600 hover:bg-rose-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={emp.employmentStatus === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                                >
                                  {emp.employmentStatus === 'Active' ? (
                                    <UserX className="w-3.5 h-3.5" />
                                  ) : (
                                    <UserCheck className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {isAdmin && emp.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteEmployee(emp)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete (With Business Record Safety Guard)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 2: Employee Activity & Performance Dashboard (Section 12 - /admin/employees/performance) */}
      {activeTab === 'performance' && isAdmin && (
        <div className="space-y-6">
          {/* Controls: Employee Selector + Date Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Team Member:
              </span>
              <select
                value={activeEmployee?.uid || ''}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-900 text-xs"
              >
                {employees.map((emp) => (
                  <option key={emp.uid} value={emp.uid}>
                    {emp.name} ({emp.department || 'Sales'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {(['Today', 'This Month', 'Last Month', 'This Quarter', 'This Year'] as DateRangePreset[]).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setDatePreset(p)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        datePreset === p
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {activeEmployee && empPerformance && (
            <div className="space-y-6">
              {/* Employee Summary Card */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                    Individual Performance Audit (Section 12)
                  </span>
                  <h3 className="text-xl font-black mt-0.5">{activeEmployee.name}</h3>
                  <span className="text-xs text-slate-400">
                    {activeEmployee.department || 'Sales Department'} &bull; {activeEmployee.email} &bull; Period:{' '}
                    {activeDateRange.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Won Value</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {formatINR(empPerformance.wonValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Pipeline Total</span>
                    <span className="text-xl font-black text-indigo-300 font-mono">
                      {formatINR(empPerformance.proposalValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 14 Factual Activity Cards (Section 12) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Customers Assigned</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {empPerformance.customersAssigned}
                  </span>
                  <span className="text-[10px] text-slate-400">Active accounts</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Leads Assigned</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {empPerformance.leadsAssigned}
                  </span>
                  <span className="text-[10px] text-slate-400">Prospect pipeline</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Calls Logged</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {empPerformance.calls}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {empPerformance.connectedCalls} Connected
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Follow-ups</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {empPerformance.followups}
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">
                    {empPerformance.completedFollowups} Completed
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Overdue Tasks</span>
                  <span
                    className={`text-2xl font-black block mt-1 ${
                      empPerformance.overdueFollowups > 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {empPerformance.overdueFollowups}
                  </span>
                  <span className="text-[10px] text-slate-400">Pending resolution</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">STS Created</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {empPerformance.stsCreated}
                  </span>
                  <span className="text-[10px] text-slate-400">Technical specs</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Proposals Created</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {empPerformance.proposalsCreated}
                  </span>
                  <span className="text-[10px] text-slate-400">Generated offers</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Proposals Sent</span>
                  <span className="text-2xl font-black text-blue-900 block mt-1">
                    {empPerformance.proposalsSent}
                  </span>
                  <span className="text-[10px] text-blue-700">Dispatched to client</span>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Proposals Viewed</span>
                  <span className="text-2xl font-black text-cyan-900 block mt-1">
                    {empPerformance.proposalsViewed}
                  </span>
                  <span className="text-[10px] text-cyan-700">Opened by client</span>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Accepted (Won)</span>
                  <span className="text-2xl font-black text-emerald-950 block mt-1">
                    {empPerformance.proposalsAccepted}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">Closed deals</span>
                </div>

                <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-200 shadow-2xs col-span-2">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase block">Proposal Pipeline Value</span>
                  <span className="text-xl font-black text-indigo-950 block mt-1 font-mono">
                    {formatINR(empPerformance.proposalValue)}
                  </span>
                  <span className="text-[10px] text-indigo-700">Total generated proposals</span>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 shadow-2xs col-span-2">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase block">Won Commercial Total</span>
                  <span className="text-xl font-black text-emerald-950 block mt-1 font-mono">
                    {formatINR(empPerformance.wonValue)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">Contracted revenue</span>
                </div>
              </div>

              {/* Factual compliance notice (Section 12: No subjective ratings) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Notice: Employee operational records are strictly factual and derived from real-time database transactions.
                  SalesSphere CRM does not compute subjective rankings or employee scorecards.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeToEdit={employeeToEdit}
      />
    </div>
  );
};
