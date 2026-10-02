import React, { useState, useMemo } from 'react';
import {
  Building2,
  Briefcase,
  Shield,
  Layers,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import {
  DepartmentRecord,
  DesignationRecord,
  RoleRecord,
  LeaveTypeRecord,
  HolidayRecord,
  PayrollRecord,
  DataScope,
  EmployeePermissions,
  ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/dateRangeUtils';
import { numberToWords } from '../../utils/financeUtils';

export type HRTab =
  | 'departments'
  | 'designations'
  | 'roles'
  | 'leave-types'
  | 'holidays'
  | 'payroll';

interface HRHubViewProps {
  initialTab?: HRTab;
}

export const HRHubView: React.FC<HRHubViewProps> = ({ initialTab = 'departments' }) => {
  const {
    departmentRecords,
    designationRecords,
    roleRecords,
    leaveTypeRecords,
    holidayRecords,
    payrollRecords,
    employeeRecords,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    addRole,
    updateRole,
    deleteRole,
    addLeaveType,
    updateLeaveType,
    deleteLeaveType,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    generateMonthlyPayroll,
    updatePayrollStatus,
    companySettings,
  } = useCrmData();

  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<HRTab>(initialTab);

  // Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<DepartmentRecord | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptStatus, setDeptStatus] = useState<'Active' | 'Inactive'>('Active');

  // Designation Modal
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [desigToEdit, setDesigToEdit] = useState<DesignationRecord | null>(null);
  const [desigName, setDesigName] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');
  const [desigDesc, setDesigDesc] = useState('');
  const [desigStatus, setDesigStatus] = useState<'Active' | 'Inactive'>('Active');

  // Role Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleRecord | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleScope, setRoleScope] = useState<DataScope>('Own Records');
  const [rolePerms, setRolePerms] = useState<EmployeePermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);

  // Leave Type Modal
  const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
  const [leaveTypeToEdit, setLeaveTypeToEdit] = useState<LeaveTypeRecord | null>(null);
  const [ltName, setLtName] = useState('');
  const [ltCode, setLtCode] = useState('');
  const [ltLimit, setLtLimit] = useState<number>(12);
  const [ltCarryForward, setLtCarryForward] = useState(false);
  const [ltDesc, setLtDesc] = useState('');

  // Holiday Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<HolidayRecord | null>(null);
  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('2026-01-01');
  const [holDesc, setHolDesc] = useState('');

  // Payroll state
  const [payrollMonthYear, setPayrollMonthYear] = useState('2026-09');
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // Filtered payrolls for current month-year
  const currentMonthPayrolls = useMemo(() => {
    return payrollRecords.filter((p) => p.monthYear === payrollMonthYear);
  }, [payrollRecords, payrollMonthYear]);

  // Total payroll figures
  const payrollTotals = useMemo(() => {
    const gross = currentMonthPayrolls.reduce((sum, p) => sum + p.grossSalary, 0);
    const deductions = currentMonthPayrolls.reduce((sum, p) => sum + p.deductions, 0);
    const net = currentMonthPayrolls.reduce((sum, p) => sum + p.netSalary, 0);
    return { gross, deductions, net };
  }, [currentMonthPayrolls]);

  // Handlers for Departments
  const openAddDept = () => {
    setDeptToEdit(null);
    setDeptName('');
    setDeptDesc('');
    setDeptStatus('Active');
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept: DepartmentRecord) => {
    setDeptToEdit(dept);
    setDeptName(dept.name);
    setDeptDesc(dept.description || '');
    setDeptStatus(dept.status);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    try {
      if (deptToEdit) {
        await updateDepartment(deptToEdit.id, {
          name: deptName.trim(),
          description: deptDesc.trim(),
          status: deptStatus,
        });
      } else {
        await addDepartment({
          name: deptName.trim(),
          description: deptDesc.trim(),
          status: deptStatus,
        });
      }
      setIsDeptModalOpen(false);
    } catch (err: any) {
      alert(`Error saving department: ${err.message}`);
    }
  };

  // Handlers for Designations
  const openAddDesig = () => {
    setDesigToEdit(null);
    setDesigName('');
    setDesigDeptId(departmentRecords[0]?.id || '');
    setDesigDesc('');
    setDesigStatus('Active');
    setIsDesigModalOpen(true);
  };

  const openEditDesig = (des: DesignationRecord) => {
    setDesigToEdit(des);
    setDesigName(des.name);
    setDesigDeptId(des.departmentId);
    setDesigDesc(des.description || '');
    setDesigStatus(des.status);
    setIsDesigModalOpen(true);
  };

  const handleSaveDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigName.trim()) return;
    const deptMatch = departmentRecords.find((d) => d.id === desigDeptId);
    try {
      if (desigToEdit) {
        await updateDesignation(desigToEdit.id, {
          name: desigName.trim(),
          departmentId: desigDeptId,
          departmentName: deptMatch?.name || 'General',
          description: desigDesc.trim(),
          status: desigStatus,
        });
      } else {
        await addDesignation({
          name: desigName.trim(),
          departmentId: desigDeptId,
          departmentName: deptMatch?.name || 'General',
          description: desigDesc.trim(),
          status: desigStatus,
        });
      }
      setIsDesigModalOpen(false);
    } catch (err: any) {
      alert(`Error saving designation: ${err.message}`);
    }
  };

  // Handlers for Roles
  const openAddRole = () => {
    setRoleToEdit(null);
    setRoleName('');
    setRoleDesc('');
    setRoleScope('Own Records');
    setRolePerms({ ...DEFAULT_EMPLOYEE_PERMISSIONS });
    setIsRoleModalOpen(true);
  };

  const openEditRole = (role: RoleRecord) => {
    setRoleToEdit(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setRoleScope(role.dataScope || 'Own Records');
    setRolePerms({ ...role.permissions });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    try {
      if (roleToEdit) {
        await updateRole(roleToEdit.id, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          dataScope: roleScope,
          permissions: rolePerms,
        });
      } else {
        await addRole({
          name: roleName.trim(),
          description: roleDesc.trim(),
          dataScope: roleScope,
          permissions: rolePerms,
          status: 'Active',
        });
      }
      setIsRoleModalOpen(false);
    } catch (err: any) {
      alert(`Error saving role: ${err.message}`);
    }
  };

  // Handlers for Leave Types
  const openAddLeaveType = () => {
    setLeaveTypeToEdit(null);
    setLtName('');
    setLtCode('');
    setLtLimit(12);
    setLtCarryForward(false);
    setLtDesc('');
    setIsLeaveTypeModalOpen(true);
  };

  const openEditLeaveType = (lt: LeaveTypeRecord) => {
    setLeaveTypeToEdit(lt);
    setLtName(lt.name);
    setLtCode(lt.code);
    setLtLimit(lt.annualLimit);
    setLtCarryForward(lt.carryForward);
    setLtDesc(lt.description || '');
    setIsLeaveTypeModalOpen(true);
  };

  const handleSaveLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ltName.trim()) return;
    try {
      if (leaveTypeToEdit) {
        await updateLeaveType(leaveTypeToEdit.id, {
          name: ltName.trim(),
          code: ltCode.trim().toUpperCase() || 'LV',
          annualLimit: ltLimit,
          carryForward: ltCarryForward,
          description: ltDesc.trim(),
        });
      } else {
        await addLeaveType({
          name: ltName.trim(),
          code: ltCode.trim().toUpperCase() || 'LV',
          annualLimit: ltLimit,
          carryForward: ltCarryForward,
          description: ltDesc.trim(),
          status: 'Active',
        });
      }
      setIsLeaveTypeModalOpen(false);
    } catch (err: any) {
      alert(`Error saving leave type: ${err.message}`);
    }
  };

  // Handlers for Holidays
  const openAddHoliday = () => {
    setHolidayToEdit(null);
    setHolName('');
    setHolDate('2026-01-01');
    setHolDesc('');
    setIsHolidayModalOpen(true);
  };

  const openEditHoliday = (hol: HolidayRecord) => {
    setHolidayToEdit(hol);
    setHolName(hol.name);
    setHolDate(hol.date);
    setHolDesc(hol.description || '');
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holName.trim()) return;
    try {
      const year = parseInt(holDate.split('-')[0], 10) || 2026;
      if (holidayToEdit) {
        await updateHoliday(holidayToEdit.id, {
          name: holName.trim(),
          date: holDate,
          description: holDesc.trim(),
          year,
        });
      } else {
        await addHoliday({
          name: holName.trim(),
          date: holDate,
          description: holDesc.trim(),
          status: 'Active',
          year,
        });
      }
      setIsHolidayModalOpen(false);
    } catch (err: any) {
      alert(`Error saving holiday: ${err.message}`);
    }
  };

  // Payroll Generation
  const handleGeneratePayroll = async () => {
    setIsGeneratingPayroll(true);
    try {
      await generateMonthlyPayroll(payrollMonthYear);
    } catch (err: any) {
      alert(`Error generating payroll: ${err.message}`);
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  const handleUpdatePayrollStatus = async (
    payId: string,
    status: 'Draft' | 'Approved' | 'Paid'
  ) => {
    try {
      await updatePayrollStatus(payId, status);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const tabs: { id: HRTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" />, count: departmentRecords.length },
    { id: 'designations', label: 'Designations', icon: <Briefcase className="w-4 h-4" />, count: designationRecords.length },
    { id: 'roles', label: 'Roles & Permissions', icon: <Shield className="w-4 h-4" />, count: roleRecords.length },
    { id: 'leave-types', label: 'Leave Types', icon: <Layers className="w-4 h-4" />, count: leaveTypeRecords.length },
    { id: 'holidays', label: 'Holidays (2026)', icon: <Calendar className="w-4 h-4" />, count: holidayRecords.length },
    { id: 'payroll', label: 'Monthly Payroll', icon: <DollarSign className="w-4 h-4" />, count: currentMonthPayrolls.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            HR Administration & Governance Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization hierarchy, granular access scopes, entitlement quotas & automated monthly payroll.
          </p>
        </div>
      </div>

      {/* Tabs */}
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
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
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

        {/* Tab Body */}
        <div className="p-6">
          {/* 1. DEPARTMENTS TAB */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Departments Directory</h3>
                  <p className="text-xs text-slate-500">
                    Define and configure organizational units without hardcoded lock-ins.
                  </p>
                </div>
                <button
                  onClick={openAddDept}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Department
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Department Name</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentRecords.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{d.departmentId}</td>
                        <td className="p-3.5 font-bold text-slate-800">{d.name}</td>
                        <td className="p-3.5 text-slate-500">{d.description || '—'}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              d.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditDept(d)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDepartment(d.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. DESIGNATIONS TAB */}
          {activeTab === 'designations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Designations & Titles</h3>
                  <p className="text-xs text-slate-500">
                    Define formal designations linked to operational departments.
                  </p>
                </div>
                <button
                  onClick={openAddDesig}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Designation
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Designation Title</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {designationRecords.map((des) => (
                      <tr key={des.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{des.designationId}</td>
                        <td className="p-3.5 font-bold text-slate-800">{des.name}</td>
                        <td className="p-3.5 text-slate-600 font-medium">{des.departmentName}</td>
                        <td className="p-3.5 text-slate-500">{des.description || '—'}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              des.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {des.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditDesig(des)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDesignation(des.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ROLES & PERMISSIONS TAB */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Roles & Granular Permissions</h3>
                  <p className="text-xs text-slate-500">
                    Enforced at both UI layer and Firebase database security rules.
                  </p>
                </div>
                <button
                  onClick={openAddRole}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Create Custom Role
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleRecords.map((role) => {
                  const allowedCount = Object.values(role.permissions || {}).filter(Boolean).length;
                  return (
                    <div
                      key={role.id}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-indigo-600">
                              {role.roleId}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                              {role.name}
                              {role.isSystem && (
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                  System
                                </span>
                              )}
                            </h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {role.dataScope || 'Own Records'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">{role.description}</p>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            Permissions enabled: <strong>{allowedCount}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRole(role)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
                        >
                          Configure Permissions
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. LEAVE TYPES TAB */}
          {activeTab === 'leave-types' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Leave Categories & Annual Quotas</h3>
                  <p className="text-xs text-slate-500">
                    Configure statutory leave quotas without hardcoded limits.
                  </p>
                </div>
                <button
                  onClick={openAddLeaveType}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Leave Category
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {leaveTypeRecords.map((lt) => (
                  <div key={lt.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-600">{lt.code}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            lt.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {lt.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-2">{lt.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{lt.description || 'Statutory allowance'}</p>

                      <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-indigo-950 font-mono">{lt.annualLimit}</span>
                        <span className="text-xs font-semibold text-slate-500">Days / Year</span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500">
                        Carry Forward:{' '}
                        <strong>{lt.carryForward ? 'Permitted' : 'Lapses at Year End'}</strong>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditLeaveType(lt)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteLeaveType(lt.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. HOLIDAYS TAB */}
          {activeTab === 'holidays' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Holiday Calendar (2026)</h3>
                  <p className="text-xs text-slate-500">
                    Holidays registered here are recognized in payroll & attendance computations.
                  </p>
                </div>
                <button
                  onClick={openAddHoliday}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Holiday
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Holiday Name</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Day of Week</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5 text-right">Actions</th>
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
                          <td className="p-3.5 text-slate-500">{h.description || '—'}</td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditHoliday(h)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteHoliday(h.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PAYROLL TAB */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              {/* Payroll Control Bar */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
                <div>
                  <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider block">
                    ● Attendance & Leave Linked Engine
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Monthly Salary Computation Sheet
                  </h3>
                  <p className="text-xs text-slate-300">
                    Computes gross, loss-of-pay deductions from attendance records, and net payable.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={payrollMonthYear}
                    onChange={(e) => setPayrollMonthYear(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    onClick={handleGeneratePayroll}
                    disabled={isGeneratingPayroll}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
                  >
                    {isGeneratingPayroll ? 'Computing...' : 'Generate Payroll'}
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross CTC Total</span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    {formatINR(payrollTotals.gross)}
                  </span>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Deductions (LOP + Statutory)</span>
                  <span className="text-2xl font-black text-rose-950 font-mono mt-1 block">
                    - {formatINR(payrollTotals.deductions)}
                  </span>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Disbursement</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                    {formatINR(payrollTotals.net)}
                  </span>
                </div>
              </div>

              {/* Payroll Records Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {currentMonthPayrolls.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No payroll computed for {payrollMonthYear}. Click "Generate Payroll" above to run computation.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Payroll ID</th>
                          <th className="p-3.5">Employee</th>
                          <th className="p-3.5">Working Days</th>
                          <th className="p-3.5">Attended</th>
                          <th className="p-3.5">Basic</th>
                          <th className="p-3.5">Gross CTC</th>
                          <th className="p-3.5">Deductions</th>
                          <th className="p-3.5">Net Salary</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentMonthPayrolls.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="p-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">{p.payrollId}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-800 block">{p.employeeName}</span>
                              <span className="text-[10px] font-mono text-slate-400">{p.employeeCode}</span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">{p.totalWorkingDays}</td>
                            <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">{p.presentDays} days</td>
                            <td className="p-3.5 font-mono text-slate-800 whitespace-nowrap">{formatINR(p.basicSalary)}</td>
                            <td className="p-3.5 font-mono text-slate-800 whitespace-nowrap">{formatINR(p.grossSalary)}</td>
                            <td className="p-3.5 font-mono text-rose-700 whitespace-nowrap">- {formatINR(p.deductions)}</td>
                            <td className="p-3.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {formatINR(p.netSalary)}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  p.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : p.status === 'Approved'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedPayslip(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Payslip
                                </button>
                                {p.status === 'Draft' && (
                                  <button
                                    onClick={() => handleUpdatePayrollStatus(p.id, 'Approved')}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                                  >
                                    Approve
                                  </button>
                                )}
                                {p.status === 'Approved' && (
                                  <button
                                    onClick={() => handleUpdatePayrollStatus(p.id, 'Paid')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </div>
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
        </div>
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {companySettings.companyName || 'SparkGenTechnology'}
                </h2>
                <p className="text-xs text-slate-500">
                  Monthly Employee Compensation & Payslip • {selectedPayslip.monthYear}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedPayslip.payrollId}
                </span>
                <span className="block text-[10px] text-slate-400 mt-1">Generated: {selectedPayslip.generatedAt.split('T')[0]}</span>
              </div>
            </div>

            {/* Employee Particulars */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Employee Name</span>
                <span className="font-bold text-slate-800 text-sm">{selectedPayslip.employeeName}</span>
                <span className="text-slate-500 block">{selectedPayslip.designation} • {selectedPayslip.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Bank Account Settlement</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {selectedPayslip.bankName || 'HDFC Bank'} • {selectedPayslip.accountNumber ? `••••${selectedPayslip.accountNumber.slice(-4)}` : 'A/C linked'}
                </span>
                <span className="text-slate-500 block text-[11px] font-mono">IFSC: {selectedPayslip.ifscCode || 'HDFC0001234'}</span>
              </div>
            </div>

            {/* Attendance & Days */}
            <div className="grid grid-cols-4 gap-2 py-3 bg-slate-50 rounded-xl my-4 text-center text-xs border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block">Total Working Days</span>
                <span className="font-bold text-slate-800">{selectedPayslip.totalWorkingDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Present Days</span>
                <span className="font-bold text-slate-800">{selectedPayslip.presentDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Paid Leaves</span>
                <span className="font-bold text-slate-800">{selectedPayslip.paidLeaveDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">LOP / Absent</span>
                <span className="font-bold text-rose-700">{selectedPayslip.absentDays + selectedPayslip.unpaidLeaveDays}</span>
              </div>
            </div>

            {/* Earnings vs Deductions Table */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Earnings Column */}
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-800 uppercase tracking-wider text-[11px] border-b pb-1">Earnings</h4>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-mono font-semibold">{formatINR(selectedPayslip.basicSalary)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">House Rent Allowance (HRA)</span>
                  <span className="font-mono font-semibold">{formatINR(selectedPayslip.hra)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Special Allowances</span>
                  <span className="font-mono font-semibold">{formatINR(selectedPayslip.allowances)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-300">
                  <span>Gross Earnings</span>
                  <span className="font-mono text-emerald-800">{formatINR(selectedPayslip.grossSalary)}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="space-y-2">
                <h4 className="font-bold text-rose-800 uppercase tracking-wider text-[11px] border-b pb-1">Deductions</h4>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Loss of Pay / Unpaid Absence</span>
                  <span className="font-mono font-semibold text-rose-700">
                    {formatINR(Math.max(0, selectedPayslip.deductions - 2000))}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Statutory Tax & PF Withholding</span>
                  <span className="font-mono font-semibold text-rose-700">{formatINR(2000)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-300">
                  <span>Total Deductions</span>
                  <span className="font-mono text-rose-800">- {formatINR(selectedPayslip.deductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Block */}
            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">NET SALARY PAYABLE</span>
                <span className="text-[11px] text-emerald-700 capitalize">
                  {numberToWords(selectedPayslip.netSalary)}
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-950 font-mono">
                {formatINR(selectedPayslip.netSalary)}
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                This document is a computer-generated payroll advice under SparkGenTechnology Sales CRM.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Payslip
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {deptToEdit ? 'Edit Department' : 'Create Department'}
            </h3>
            <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Status</label>
                <select
                  value={deptStatus}
                  onChange={(e) => setDeptStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designation Modal */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {desigToEdit ? 'Edit Designation' : 'Create Designation'}
            </h3>
            <form onSubmit={handleSaveDesig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Designation Title *</label>
                <input
                  type="text"
                  required
                  value={desigName}
                  onChange={(e) => setDesigName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Department</label>
                <select
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                >
                  {departmentRecords.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={desigDesc}
                  onChange={(e) => setDesigDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDesigModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role & Granular Permissions Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {roleToEdit ? `Configure Role: ${roleToEdit.name}` : 'Create Role'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enforce data scoping and granular capability permissions.
            </p>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data Scope *</label>
                  <select
                    value={roleScope}
                    onChange={(e) => setRoleScope(e.target.value as DataScope)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Own Records">Own Records</option>
                    <option value="Team Records">Team Records</option>
                    <option value="Department Records">Department Records</option>
                    <option value="All Records">All Records</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              {/* Granular Permissions Matrix */}
              <div>
                <label className="block text-slate-700 font-bold mb-2">Granular Permissions</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {Object.keys(DEFAULT_EMPLOYEE_PERMISSIONS).map((permKey) => {
                    const key = permKey as keyof EmployeePermissions;
                    const isChecked = !!rolePerms[key];
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 text-[11px] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setRolePerms((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-mono truncate">{key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Type Modal */}
      {isLeaveTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {leaveTypeToEdit ? 'Edit Leave Category' : 'Create Leave Category'}
            </h3>
            <form onSubmit={handleSaveLeaveType} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={ltName}
                    onChange={(e) => setLtName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={ltCode}
                    onChange={(e) => setLtCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Annual Limit (Days)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={ltLimit}
                    onChange={(e) => setLtLimit(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={ltCarryForward}
                      onChange={(e) => setLtCarryForward(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Carry Forward</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveTypeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {holidayToEdit ? 'Edit Holiday' : 'Create Holiday'}
            </h3>
            <form onSubmit={handleSaveHoliday} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={holName}
                  onChange={(e) => setHolName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={holDate}
                  onChange={(e) => setHolDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={holDesc}
                  onChange={(e) => setHolDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
