import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Shield,
  Calendar,
  DollarSign,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Target,
  Users,
  CheckSquare,
  FileCheck,
  Activity,
  FolderOpen,
  Key,
  LogIn,
  Edit,
  UserCheck,
  UserX,
  AlertTriangle,
  Send,
  Eye,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  EmployeeRecord,
  UserProfile,
  EmploymentStatus,
  EmployeePermissions,
  AttendanceRecord,
} from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { EmployeeModal } from '../modals/EmployeeModal';
import { formatMinutesToDuration, calculateLeaveBalances } from '../../services/hrService';
import { formatINR, formatDateDisplayIST } from '../../utils/dateRangeUtils';

export type ProfileTab =
  | 'overview'
  | 'customers'
  | 'leads'
  | 'proposals'
  | 'invoices'
  | 'tasks'
  | 'attendance'
  | 'leave'
  | 'activity'
  | 'documents'
  | 'permissions'
  | 'loginHistory';

interface EmployeeProfileViewProps {
  employeeId: string;
  onBack: () => void;
  initialTab?: ProfileTab;
}

export const EmployeeProfileView: React.FC<EmployeeProfileViewProps> = ({
  employeeId,
  onBack,
  initialTab = 'overview',
}) => {
  const {
    employeeRecords,
    employees,
    updateEmployeeEmploymentStatus,
    customers,
    leads,
    proposals,
    invoices,
    taskRecords,
    attendanceRecords,
    leaveRecords,
    leaveTypeRecords,
    employeeActivityRecords,
    loginHistoryRecords,
    correctAttendance,
  } = useCrmData();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Attendance correction modal state
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [corrCheckIn, setCorrCheckIn] = useState('');
  const [corrCheckOut, setCorrCheckOut] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [corrError, setCorrError] = useState('');

  // Find employee record (from Phase 17 employeeRecords or fallback user profile)
  const currentEmployee: EmployeeRecord | null = useMemo(() => {
    const foundRec = employeeRecords.find(
      (e) => e.id === employeeId || e.employeeId === employeeId || e.employeeCode === employeeId
    );
    if (foundRec) return foundRec;

    const userMatch = employees.find(
      (u) => u.uid === employeeId || u.id === employeeId || u.email === employeeId
    );
    if (userMatch) {
      const parts = (userMatch.name || '').split(' ');
      return {
        id: userMatch.id || userMatch.uid,
        employeeId: userMatch.uid,
        employeeCode: (userMatch as any).employeeCode || 'EMP-2026-0001',
        firstName: parts[0] || 'Employee',
        lastName: parts.slice(1).join(' ') || '',
        name: userMatch.name,
        email: userMatch.email,
        phone: (userMatch as any).phone || '',
        designation: (userMatch as any).designation || 'Sales Executive',
        department: userMatch.department || 'Sales',
        roleId: userMatch.role === 'admin' ? 'role_super_admin' : 'role_sales_exec',
        roleName: userMatch.role === 'admin' ? 'Admin' : 'Sales Executive',
        employmentStatus: userMatch.status === 'active' ? 'Active' : 'Inactive',
        dataScope: (userMatch as any).dataScope || (userMatch.role === 'admin' ? 'All Records' : 'Own Records'),
        joiningDate: userMatch.createdAt ? userMatch.createdAt.split('T')[0] : '2026-01-01',
        hasLoginAccess: true,
        createdBy: 'system',
        salaryDetails: (userMatch as any).salaryDetails || {
          basicSalary: 35000,
          hra: 14000,
          allowances: 6000,
          deductions: 2500,
          grossSalary: 55000,
          netSalary: 52500,
          paymentMode: 'Bank Transfer',
        },
        bankAccountDetails: (userMatch as any).bankAccountDetails,
        address: (userMatch as any).address,
        emergencyContact: (userMatch as any).emergencyContact,
        permissions: userMatch.permissions,
        createdAt: userMatch.createdAt || new Date().toISOString(),
        updatedAt: userMatch.createdAt || new Date().toISOString(),
      };
    }
    return null;
  }, [employeeRecords, employees, employeeId]);

  const targetUid = currentEmployee?.employeeId || currentEmployee?.id || employeeId;

  // Filter linked records for this employee
  const linkedCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.assignedEmployeeId === targetUid ||
        c.assignedEmployeeId === currentEmployee?.id ||
        c.createdBy === targetUid
    );
  }, [customers, targetUid, currentEmployee]);

  const linkedLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        l.assignedEmployeeId === targetUid ||
        l.assignedEmployeeId === currentEmployee?.id ||
        l.createdBy === targetUid
    );
  }, [leads, targetUid, currentEmployee]);

  const linkedProposals = useMemo(() => {
    return proposals.filter(
      (p) =>
        p.assignedEmployeeId === targetUid ||
        p.assignedEmployeeId === currentEmployee?.id ||
        p.createdBy === targetUid
    );
  }, [proposals, targetUid, currentEmployee]);

  const linkedInvoices = useMemo(() => {
    const custIds = new Set(linkedCustomers.map((c) => c.customerId));
    return invoices.filter(
      (i) =>
        i.createdBy === targetUid ||
        (i.customerId && custIds.has(i.customerId)) ||
        (i as any).assignedEmployeeId === targetUid
    );
  }, [invoices, targetUid, linkedCustomers]);

  const linkedTasks = useMemo(() => {
    return taskRecords.filter(
      (t) =>
        t.assignedTo === targetUid ||
        t.assignedTo === currentEmployee?.id ||
        t.assignedTo === currentEmployee?.employeeCode
    );
  }, [taskRecords, targetUid, currentEmployee]);

  const linkedAttendances = useMemo(() => {
    return attendanceRecords
      .filter(
        (a) =>
          a.employeeId === targetUid ||
          a.employeeId === currentEmployee?.id ||
          a.employeeId === currentEmployee?.employeeCode
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, targetUid, currentEmployee]);

  const linkedLeaves = useMemo(() => {
    return leaveRecords
      .filter(
        (l) =>
          l.employeeId === targetUid ||
          l.employeeId === currentEmployee?.id ||
          l.employeeId === currentEmployee?.employeeCode
      )
      .sort((a, b) => b.fromDate.localeCompare(a.fromDate));
  }, [leaveRecords, targetUid, currentEmployee]);

  const leaveBalances = useMemo(() => {
    if (!currentEmployee) return [];
    return calculateLeaveBalances(
      currentEmployee.id,
      leaveTypeRecords,
      leaveRecords
    );
  }, [currentEmployee, leaveTypeRecords, leaveRecords]);

  const linkedActivities = useMemo(() => {
    return employeeActivityRecords
      .filter(
        (act) =>
          act.employeeId === targetUid ||
          act.employeeId === currentEmployee?.id ||
          act.employeeId === currentEmployee?.employeeCode
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [employeeActivityRecords, targetUid, currentEmployee]);

  const linkedLoginHistory = useMemo(() => {
    return loginHistoryRecords
      .filter(
        (lh) =>
          lh.employeeId === targetUid ||
          lh.employeeId === currentEmployee?.id ||
          lh.employeeId === currentEmployee?.employeeCode
      )
      .sort((a, b) => b.loginTime.localeCompare(a.loginTime));
  }, [loginHistoryRecords, targetUid, currentEmployee]);

  const handleStatusChange = async (newStatus: EmploymentStatus) => {
    if (!currentEmployee) return;
    try {
      await updateEmployeeEmploymentStatus(currentEmployee.id, newStatus);
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleOpenCorrection = (att: AttendanceRecord) => {
    setCorrectionTarget(att);
    setCorrCheckIn(att.checkIn ? att.checkIn.slice(11, 16) : '09:30');
    setCorrCheckOut(att.checkOut ? att.checkOut.slice(11, 16) : '18:30');
    setCorrReason('');
    setCorrError('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;
    if (!corrReason.trim()) {
      setCorrError('Correction reason is mandatory for audit compliance.');
      return;
    }
    setIsCorrecting(true);
    try {
      const datePart = correctionTarget.date;
      const fullCheckIn = `${datePart}T${corrCheckIn}:00.000Z`;
      const fullCheckOut = corrCheckOut ? `${datePart}T${corrCheckOut}:00.000Z` : undefined;
      await correctAttendance(correctionTarget.id, {
        correctedCheckIn: fullCheckIn,
        correctedCheckOut: fullCheckOut,
        reason: corrReason.trim(),
      });
      setCorrectionTarget(null);
    } catch (err: any) {
      setCorrError(err.message || 'Failed to submit correction.');
    } finally {
      setIsCorrecting(false);
    }
  };

  if (!currentEmployee) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Employee Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          The requested employee ID ({employeeId}) was not found in active or archived records.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Directory
        </button>
      </div>
    );
  }

  const getStatusBadge = (status?: EmploymentStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Probation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'On Leave':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Suspended':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Inactive':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Exited':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" />, count: linkedCustomers.length },
    { id: 'leads', label: 'Leads', icon: <Target className="w-4 h-4" />, count: linkedLeads.length },
    { id: 'proposals', label: 'Proposals', icon: <FileText className="w-4 h-4" />, count: linkedProposals.length },
    { id: 'invoices', label: 'Invoices', icon: <CreditCard className="w-4 h-4" />, count: linkedInvoices.length },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, count: linkedTasks.length },
    { id: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" />, count: linkedAttendances.length },
    { id: 'leave', label: 'Leave', icon: <Calendar className="w-4 h-4" />, count: linkedLeaves.length },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" />, count: linkedActivities.length },
    { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'permissions', label: 'Permissions', icon: <Key className="w-4 h-4" /> },
    { id: 'loginHistory', label: 'Login History', icon: <LogIn className="w-4 h-4" />, count: linkedLoginHistory.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Back to Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {currentEmployee.employeeCode}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(currentEmployee.employmentStatus)}`}>
                {currentEmployee.employmentStatus || 'Active'}
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-600 font-medium">
                Scope: <strong className="text-slate-800">{currentEmployee.dataScope || 'Own Records'}</strong>
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              {currentEmployee.firstName} {currentEmployee.lastName}
            </h1>
            <p className="text-xs text-slate-500">
              {currentEmployee.designation} • {currentEmployee.department} Department
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-xl border border-indigo-200 transition"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Employee
            </button>

            {currentEmployee.employmentStatus === 'Active' ? (
              <>
                <button
                  onClick={() => handleStatusChange('Suspended')}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-xs rounded-xl border border-amber-200 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Suspend
                </button>
                <button
                  onClick={() => handleStatusChange('Inactive')}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs rounded-xl border border-rose-200 transition"
                >
                  <UserX className="w-3.5 h-3.5" /> Deactivate
                </button>
              </>
            ) : (
              <button
                onClick={() => handleStatusChange('Active')}
                className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs rounded-xl border border-emerald-200 transition"
              >
                <UserCheck className="w-3.5 h-3.5" /> Reactivate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation (12 Tabs) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none px-2 pt-2 bg-slate-50/50">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition -mb-px ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic & Organization Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Organizational Position
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Employee Code</span>
                      <span className="font-mono font-bold text-slate-800">{currentEmployee.employeeCode}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Department</span>
                      <span className="font-semibold text-slate-800">{currentEmployee.department}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Designation</span>
                      <span className="font-semibold text-slate-800">{currentEmployee.designation}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">System Role</span>
                      <span className="font-semibold text-indigo-700">{currentEmployee.roleName || 'Employee'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Data Scope</span>
                      <span className="font-semibold text-slate-800">{currentEmployee.dataScope || 'Own Records'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Date of Joining</span>
                      <span className="font-semibold text-slate-800">{currentEmployee.joiningDate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Manager ID</span>
                      <span className="font-semibold text-slate-800">{currentEmployee.managerId || 'None (Direct Admin)'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Address Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" /> Contact & Residence
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Official Email</span>
                      <span className="font-semibold text-slate-800 break-all">{currentEmployee.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Mobile Phone</span>
                      <span className="font-semibold text-slate-800">{currentEmployee.phone || 'N/A'}</span>
                    </div>
                    <div className="py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 block mb-1">Residential Address</span>
                      <p className="font-medium text-slate-800 leading-relaxed">
                        {currentEmployee.address?.street
                          ? `${currentEmployee.address.street}, ${currentEmployee.address.city}, ${currentEmployee.address.state} - ${currentEmployee.address.pincode}, ${currentEmployee.address.country}`
                          : 'No address registered on file.'}
                      </p>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-500 block mb-1 font-semibold text-rose-700">Emergency Contact</span>
                      <p className="font-medium text-slate-800">
                        {currentEmployee.emergencyContact?.name ? (
                          <>
                            {currentEmployee.emergencyContact.name} ({currentEmployee.emergencyContact.relationship || 'Contact'})
                            <br />
                            <span className="text-slate-500 font-mono text-[11px]">{currentEmployee.emergencyContact.phone}</span>
                          </>
                        ) : (
                          'None provided'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank & Compensation Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Compensation & Bank
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Basic Salary</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatINR(currentEmployee.salaryDetails?.basicSalary || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">HRA</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatINR(currentEmployee.salaryDetails?.hra || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Special Allowances</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatINR(currentEmployee.salaryDetails?.allowances || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                      <span className="font-bold text-emerald-900">Gross Monthly CTC</span>
                      <span className="font-mono font-black text-emerald-900">
                        {formatINR(
                          (currentEmployee.salaryDetails?.basicSalary || 0) +
                            (currentEmployee.salaryDetails?.hra || 0) +
                            (currentEmployee.salaryDetails?.allowances || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Standard Deductions</span>
                      <span className="font-mono font-bold text-rose-700">
                        - {formatINR(currentEmployee.salaryDetails?.deductions || 0)}
                      </span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-500 block mb-1">Bank Settlement Details</span>
                      <p className="font-mono text-[11px] text-slate-700">
                        {currentEmployee.bankAccountDetails?.bankName ? (
                          <>
                            Bank: <strong>{currentEmployee.bankAccountDetails.bankName}</strong>
                            <br />
                            A/C: <strong>{currentEmployee.bankAccountDetails.accountNumber}</strong>
                            <br />
                            IFSC: <strong>{currentEmployee.bankAccountDetails.ifscCode}</strong>
                          </>
                        ) : (
                          'No bank account linked'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factual Performance Summary Strip */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-900 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> Operational Business Attribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Customers</span>
                    <span className="text-lg font-black text-slate-900">{linkedCustomers.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Leads</span>
                    <span className="text-lg font-black text-slate-900">{linkedLeads.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Proposals</span>
                    <span className="text-lg font-black text-slate-900">{linkedProposals.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Invoices</span>
                    <span className="text-lg font-black text-slate-900">{linkedInvoices.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Tasks</span>
                    <span className="text-lg font-black text-slate-900">{linkedTasks.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Attendance</span>
                    <span className="text-lg font-black text-slate-900">{linkedAttendances.length} days</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Assigned Customers ({linkedCustomers.length})
                </h3>
              </div>
              {linkedCustomers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No customers assigned to this employee.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Customer ID</th>
                        <th className="p-3">Company / Client</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">City / State</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-indigo-600">{c.customerId}</td>
                          <td className="p-3 font-semibold text-slate-800">{c.companyName}</td>
                          <td className="p-3 text-slate-600">{c.contactPerson} ({c.email})</td>
                          <td className="p-3 text-slate-500">{c.city || 'N/A'}, {c.state || ''}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. LEADS TAB */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Assigned Leads ({linkedLeads.length})
              </h3>
              {linkedLeads.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No leads assigned to this employee.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Lead ID</th>
                        <th className="p-3">Title / Requirement</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Stage</th>
                        <th className="p-3">Est. Value</th>
                        <th className="p-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedLeads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-indigo-600">{l.leadId}</td>
                          <td className="p-3 font-semibold text-slate-800">{l.contactPerson || 'Lead Prospect'}</td>
                          <td className="p-3 text-slate-600">{l.companyName}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {l.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {formatINR(l.estimatedValue || 0)}
                          </td>
                          <td className="p-3 text-slate-500">{l.createdAt?.split('T')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. PROPOSALS TAB */}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Proposals Created / Handled ({linkedProposals.length})
              </h3>
              {linkedProposals.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No proposals linked to this employee.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Proposal #</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Total Amount</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedProposals.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-indigo-600">{p.proposalNumber}</td>
                          <td className="p-3 font-semibold text-slate-800">{p.customerName || (p as any).leadName || p.proposalNumber}</td>
                          <td className="p-3 text-slate-600">{p.title}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {formatINR(p.totalAmount || 0)}
                          </td>
                          <td className="p-3 text-slate-500">{p.proposalDate || p.createdAt?.split('T')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Invoices Linked ({linkedInvoices.length})
              </h3>
              {linkedInvoices.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No invoices linked to this employee or their accounts.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Issue Date</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                          <td className="p-3 font-semibold text-slate-800">{inv.customerName}</td>
                          <td className="p-3 text-slate-500">{inv.invoiceDate}</td>
                          <td className="p-3 text-slate-500">{inv.dueDate}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">{formatINR(inv.grandTotal || inv.totalAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 6. TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Assigned Tasks ({linkedTasks.length})
              </h3>
              {linkedTasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No active or historical tasks assigned to this employee.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Task #</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-indigo-600">{t.taskNumber}</td>
                          <td className="p-3 font-semibold text-slate-800">{t.title}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.priority === 'Urgent'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : t.priority === 'High'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-mono">{t.dueDate}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 7. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Attendance Records ({linkedAttendances.length})
                </h3>
              </div>
              {linkedAttendances.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No attendance records logged for this employee.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Check In</th>
                        <th className="p-3">Check Out</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Correction Status</th>
                        {isAdmin && <th className="p-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedAttendances.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-semibold text-slate-800 font-mono">{att.date}</td>
                          <td className="p-3 text-slate-600">
                            {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 text-slate-600">
                            {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {formatMinutesToDuration(att.workDuration || 0)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                att.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : att.status === 'Late'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            {att.correction ? (
                              <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                Corrected: {att.correction.reason}
                              </span>
                            ) : (
                              'Original'
                            )}
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleOpenCorrection(att)}
                                className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                              >
                                Correct
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 8. LEAVE TAB */}
          {activeTab === 'leave' && (
            <div className="space-y-6">
              {/* Leave Balances Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Leave Balance Entitlements
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {leaveBalances.map((b) => (
                    <div key={b.typeId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-800 block">{b.typeName}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-indigo-950">{b.remaining}</span>
                        <span className="text-[11px] text-slate-500">Remaining</span>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500 flex justify-between border-t border-slate-200/60 pt-1.5">
                        <span>Allocated: {b.allocated}</span>
                        <span>Used: {b.used}</span>
                        <span>Pending: {b.pending}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave History Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Leave Applications History ({linkedLeaves.length})
                </h4>
                {linkedLeaves.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                    No leave requests on record for this employee.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Leave Type</th>
                          <th className="p-3">From</th>
                          <th className="p-3">To</th>
                          <th className="p-3">Days</th>
                          <th className="p-3">Reason</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {linkedLeaves.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-semibold text-slate-800">{l.leaveType}</td>
                            <td className="p-3 font-mono text-slate-600">{l.fromDate}</td>
                            <td className="p-3 font-mono text-slate-600">{l.toDate}</td>
                            <td className="p-3 font-bold text-slate-800">{l.numberOfDays}</td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">{l.reason}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  l.status === 'Approved'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : l.status === 'Rejected'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-500">
                              {l.status === 'Approved' && l.approvedAt ? `Approved on ${l.approvedAt.split('T')[0]}` : ''}
                              {l.status === 'Rejected' && l.rejectionReason ? `Reason: ${l.rejectionReason}` : ''}
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

          {/* 9. ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Factual Business Activity Trail ({linkedActivities.length})
              </h3>
              <p className="text-xs text-slate-500">
                Audit log tracks strictly factual business actions (proposals sent, leads captured, invoices issued, check-ins).
              </p>
              {linkedActivities.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No activity records logged for this employee.
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-4 transition text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {act.action.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{act.action}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                              {act.entityType}
                            </span>
                          </div>
                          {act.details && <p className="text-slate-600 text-[11px] mt-0.5">{act.details}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 10. DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Employee Documents</h3>
                  <p className="text-xs text-slate-500">Official identification, resume, and offer letter copies.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Offer Letter</span>
                      <span className="text-[10px] text-slate-400">PDF • Verified</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    On File
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">ID & Address Proof</span>
                      <span className="text-[10px] text-slate-400">Aadhaar / PAN Copy</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    Verified
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cancelled Cheque</span>
                      <span className="text-[10px] text-slate-400">Bank Verification</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    Linked
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 11. PERMISSIONS TAB */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Assigned Granular Permissions</h3>
                  <p className="text-xs text-slate-500">
                    Derived from role <strong>{currentEmployee.roleName || 'Employee'}</strong> with Data Scope:{' '}
                    <strong>{currentEmployee.dataScope || 'Own Records'}</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.entries(currentEmployee.permissions || {}).map(([key, enabled]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      enabled
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="font-semibold font-mono text-[11px]">{key}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        enabled ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {enabled ? 'Allowed' : 'Denied'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. LOGIN HISTORY TAB */}
          {activeTab === 'loginHistory' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">
                Login Session History ({linkedLoginHistory.length})
              </h3>
              {linkedLoginHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No login session records recorded for this account.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Login Time</th>
                        <th className="p-3">Logout Time</th>
                        <th className="p-3">Session Status</th>
                        <th className="p-3">IP / Platform</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedLoginHistory.map((lh) => (
                        <tr key={lh.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-semibold text-slate-800">
                            {new Date(lh.loginTime).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {lh.logoutTime ? new Date(lh.logoutTime).toLocaleString() : 'Active / Auto-expire'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                lh.sessionStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {lh.sessionStatus}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {lh.ipAddress || 'Authorized Web Client'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Employee Modal */}
      <EmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employeeToEdit={currentEmployee}
      />

      {/* Attendance Correction Modal (Section 18) */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Attendance Correction Audit
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Date: <strong>{correctionTarget.date}</strong> • Employee: <strong>{currentEmployee.firstName} {currentEmployee.lastName}</strong>
            </p>

            {corrError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs mb-4">
                {corrError}
              </div>
            )}

            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600">
                <span className="font-bold text-slate-800 block text-[11px]">Original Timestamps:</span>
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
                  Reason for Correction (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="e.g., Client meeting offsite morning arrival, biometric failure, manual adjustment approved by HR"
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
                  disabled={isCorrecting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isCorrecting ? 'Saving Correction...' : 'Approve & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
