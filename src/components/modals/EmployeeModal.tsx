import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  CheckSquare,
  Square,
  Building,
  Briefcase,
  DollarSign,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  Key,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  EmployeeRecord,
  UserProfile,
  EmployeePermissions,
  EmploymentStatus,
  DataScope,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  ADMIN_PERMISSIONS,
} from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: EmployeeRecord | UserProfile | null;
}

const PERMISSION_LABELS: { key: keyof EmployeePermissions; label: string; desc: string }[] = [
  { key: 'viewCustomers', label: 'View Customers', desc: 'Can view customer directory and records' },
  { key: 'createCustomer', label: 'Create Customer', desc: 'Register and onboard new client accounts' },
  { key: 'editCustomer', label: 'Edit Customer', desc: 'Update customer contact, billing, and details' },
  { key: 'deleteCustomer', label: 'Delete Customer', desc: 'Remove customer records from the system' },
  { key: 'viewLeads', label: 'View Leads', desc: 'Access lead records and pipeline stages' },
  { key: 'createLead', label: 'Create Lead', desc: 'Capture new prospect leads' },
  { key: 'editLead', label: 'Edit Lead', desc: 'Modify lead details and conversion data' },
  { key: 'deleteLead', label: 'Delete Lead', desc: 'Remove lead records from pipeline' },
  { key: 'viewProposals', label: 'View Proposals', desc: 'Access commercial proposals directory' },
  { key: 'createProposal', label: 'Create Proposal', desc: 'Generate commercial proposals & quotes' },
  { key: 'editProposal', label: 'Edit Proposal', desc: 'Modify commercial proposal details' },
  { key: 'sendProposal', label: 'Send Proposal', desc: 'Disseminate proposals to clients' },
  { key: 'viewInvoices', label: 'View Invoices', desc: 'Access customer invoice records' },
  { key: 'createInvoice', label: 'Create Invoice', desc: 'Generate sales invoices' },
  { key: 'editInvoice', label: 'Edit Invoice', desc: 'Modify draft invoices' },
  { key: 'viewPayments', label: 'View Payments', desc: 'Audit customer payment settlements' },
  { key: 'viewProducts', label: 'View Products', desc: 'Access active products and services catalog' },
  { key: 'createProduct', label: 'Create Product', desc: 'Add new items into catalog' },
  { key: 'editProduct', label: 'Edit Product', desc: 'Modify product specifications & pricing' },
  { key: 'viewInventory', label: 'View Inventory', desc: 'Check warehouse stock balances' },
  { key: 'manageInventory', label: 'Manage Inventory', desc: 'Adjust stock quantities and opening stock' },
  { key: 'viewPurchases', label: 'View Purchases', desc: 'Access purchase orders & vendor receipts' },
  { key: 'managePurchases', label: 'Manage Purchases', desc: 'Issue POs and receive goods' },
  { key: 'viewReports', label: 'View Reports', desc: 'Access performance & analytics reports' },
  { key: 'exportReports', label: 'Export Reports', desc: 'Export datasets to CSV and Excel' },
  { key: 'sendEmail', label: 'Send Email', desc: 'Send emails with proposals attached' },
  { key: 'sendWhatsApp', label: 'Send WhatsApp', desc: 'Direct WhatsApp communication with prospects' },
  { key: 'createReminder', label: 'Create Reminder', desc: 'Schedule follow-up and payment alerts' },
  { key: 'manageTickets', label: 'Manage Tickets', desc: 'Handle customer support tickets' },
  { key: 'viewEmployee', label: 'View Employees', desc: 'View employee directory & profiles' },
  { key: 'manageEmployee', label: 'Manage Employees', desc: 'Create, edit and manage team members' },
  { key: 'viewAttendance', label: 'View Attendance', desc: 'Check attendance records and timers' },
  { key: 'manageAttendance', label: 'Manage Attendance', desc: 'Approve and edit attendance corrections' },
  { key: 'approveLeave', label: 'Approve Leave', desc: 'Approve or reject employee leave requests' },
  { key: 'viewPayroll', label: 'View Payroll', desc: 'View monthly salary computation sheets' },
  { key: 'managePayroll', label: 'Manage Payroll', desc: 'Generate and finalize monthly payroll' },
  { key: 'viewAuditLogs', label: 'View Audit Logs', desc: 'Audit system actions and login history' },
  { key: 'manageSettings', label: 'Manage Settings', desc: 'System configuration and branding' },
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, employeeToEdit }) => {
  const {
    departmentRecords,
    designationRecords,
    roleRecords,
    employeeRecords,
    createEmployeeRecord,
    updateEmployeeRecord,
    generateNextEmployeeCode,
    resetEmployeePassword,
  } = useCrmData();

  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'role' | 'address' | 'bankSalary'>('general');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('Sales');
  const [designation, setDesignation] = useState('Sales Executive');
  const [roleName, setRoleName] = useState('Sales Executive');
  const [dataScope, setDataScope] = useState<DataScope>('Own Records');
  const [managerId, setManagerId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('Active');

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Bank Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [branch, setBranch] = useState('');

  // Salary Details
  const [basicSalary, setBasicSalary] = useState<number>(35000);
  const [hra, setHra] = useState<number>(14000);
  const [allowances, setAllowances] = useState<number>(6000);
  const [deductions, setDeductions] = useState<number>(2500);
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer' | 'Cheque' | 'Cash'>('Bank Transfer');

  // Login Account Credentials (Phase 20 / Production Fix)
  const [hasLoginAccess, setHasLoginAccess] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'active' | 'inactive'>('active');
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [resetSentNotice, setResetSentNotice] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Permissions
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employeeToEdit) {
      const e = employeeToEdit as any;
      const parts = (e.name || '').split(' ');
      setFirstName(e.firstName || parts[0] || '');
      setLastName(e.lastName || parts.slice(1).join(' ') || '');
      setEmail(e.email || '');
      setPhone(e.phone || e.mobile || '');
      setEmployeeCode(e.employeeCode || e.employeeId || '');
      setDepartment(e.department || 'Sales');
      setDesignation(e.designation || 'Sales Executive');
      setRoleName(e.roleName || (e.role === 'admin' ? 'Admin' : 'Sales Executive'));
      setDataScope(e.dataScope || (e.role === 'admin' ? 'All Records' : 'Own Records'));
      setManagerId(e.managerId || '');
      setJoiningDate(e.joiningDate || (e.createdAt ? e.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]));
      setEmploymentStatus(e.employmentStatus || (e.status === 'inactive' ? 'Inactive' : 'Active'));

      // Address
      setStreet(e.address?.street || '');
      setCity(e.address?.city || '');
      setState(e.address?.state || '');
      setPincode(e.address?.pincode || '');
      setCountry(e.address?.country || 'India');

      // Emergency
      setEmergencyName(e.emergencyContact?.name || '');
      setEmergencyRelation(e.emergencyContact?.relationship || '');
      setEmergencyPhone(e.emergencyContact?.phone || '');

      // Bank
      setBankName(e.bankAccountDetails?.bankName || '');
      setAccountNumber(e.bankAccountDetails?.accountNumber || '');
      setIfscCode(e.bankAccountDetails?.ifscCode || '');
      setAccountHolderName(e.bankAccountDetails?.accountHolderName || e.name || '');
      setBranch(e.bankAccountDetails?.branch || '');

      // Salary
      setBasicSalary(e.salaryDetails?.basicSalary || 35000);
      setHra(e.salaryDetails?.hra || 14000);
      setAllowances(e.salaryDetails?.allowances || 6000);
      setDeductions(e.salaryDetails?.deductions || 2500);
      setPaymentMode(e.salaryDetails?.paymentMode || 'Bank Transfer');

      setHasLoginAccess(e.hasLoginAccess !== false);
      setPermissions(e.permissions || (e.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS));
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      generateNextEmployeeCode().then(setEmployeeCode).catch(() => setEmployeeCode('EMP-2026-0001'));
      setDepartment('Sales');
      setDesignation('Sales Executive');
      setRoleName('Sales Executive');
      setDataScope('Own Records');
      setManagerId('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setEmploymentStatus('Active');
      setStreet('');
      setCity('');
      setState('');
      setPincode('');
      setCountry('India');
      setEmergencyName('');
      setEmergencyRelation('');
      setEmergencyPhone('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setAccountHolderName('');
      setBranch('');
      setBasicSalary(35000);
      setHra(14000);
      setAllowances(6000);
      setDeductions(2500);
      setPaymentMode('Bank Transfer');
      setHasLoginAccess(true);
      setTempPassword('Employee@2026');
      setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
    }
    setError('');
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleRoleSelection = (selectedRoleName: string) => {
    setRoleName(selectedRoleName);
    const matched = roleRecords.find((r) => r.name === selectedRoleName);
    if (matched) {
      setDataScope(matched.dataScope);
      setPermissions(matched.permissions);
    } else if (selectedRoleName === 'Super Admin' || selectedRoleName === 'Admin') {
      setDataScope('All Records');
      setPermissions(ADMIN_PERMISSIONS);
    }
  };

  const handleTogglePermission = (key: keyof EmployeePermissions) => {
    if (roleName === 'Super Admin' || roleName === 'Admin') return;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (val: boolean) => {
    if (roleName === 'Super Admin' || roleName === 'Admin') return;
    const updated = { ...permissions };
    PERMISSION_LABELS.forEach((p) => {
      (updated as any)[p.key] = val;
    });
    setPermissions(updated);
  };

  const grossSalaryCalc = (Number(basicSalary) || 0) + (Number(hra) || 0) + (Number(allowances) || 0);
  const netSalaryCalc = Math.max(0, grossSalaryCalc - (Number(deductions) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: fullName,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        employeeCode: employeeCode.trim(),
        department: department.trim(),
        designation: designation.trim(),
        roleId: roleRecords.find((r) => r.name === roleName)?.id || roleName,
        roleName,
        dataScope,
        managerId: managerId || undefined,
        managerName: employeeRecords.find((e) => e.id === managerId)?.name || undefined,
        joiningDate,
        employmentStatus,
        hasLoginAccess,
        password: tempPassword,
        permissions: (roleName === 'Super Admin' || roleName === 'Admin') ? ADMIN_PERMISSIONS : permissions,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country.trim(),
        },
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
        bankAccountDetails: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountHolderName: accountHolderName.trim() || fullName,
          branch: branch.trim(),
        },
        salaryDetails: {
          basicSalary: Number(basicSalary) || 0,
          hra: Number(hra) || 0,
          allowances: Number(allowances) || 0,
          deductions: Number(deductions) || 0,
          grossSalary: grossSalaryCalc,
          netSalary: netSalaryCalc,
          paymentMode,
        },
      };

      if (employeeToEdit) {
        await updateEmployeeRecord(employeeToEdit.id, payload);
      } else {
        await createEmployeeRecord(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">
                {employeeToEdit ? `Edit Employee — ${employeeToEdit.name}` : 'Onboard New Employee'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure complete profile, employment status, data scope, salary, and access credentials
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium shrink-0">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> General & Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('role')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'role'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Role & Permissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'address'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Address & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bankSalary')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'bankSalary'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Bank & Salary Details
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh.kumar@sparkgentechnology.com"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    placeholder="EMP-2026-0001"
                    className="w-full text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique counter-generated employee identifier</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                  >
                    {departmentRecords.length > 0 ? (
                      departmentRecords.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Accounts & Finance">Accounts & Finance</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Human Resources">Human Resources</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                  >
                    {designationRecords.length > 0 ? (
                      designationRecords.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.departmentName || 'General'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Sales Manager">Sales Manager</option>
                        <option value="Support Engineer">Support Engineer</option>
                        <option value="Senior Accountant">Senior Accountant</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                  >
                    <option value="Active">Active (Normal Access)</option>
                    <option value="Probation">Probation (Under Review)</option>
                    <option value="On Leave">On Leave (Extended Absence)</option>
                    <option value="Suspended">Suspended (Access Temporarily Revoked)</option>
                    <option value="Inactive">Inactive (Deactivated)</option>
                    <option value="Exited">Exited (Offboarded - History Preserved)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">No Direct Manager (Top Level)</option>
                    {employeeRecords
                      .filter((e) => e.id !== employeeToEdit?.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.designation})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Login Access Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900">Firebase Login Credentials</span>
                      <p className="text-[11px] text-slate-500">
                        Create secure Firebase Authentication account for system access at /login
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasLoginAccess}
                      onChange={(e) => setHasLoginAccess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {hasLoginAccess && !employeeToEdit && (
                  <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Initial Password</label>
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Employee can sign in at /login with their email and this password, or reset password at any time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ROLE & PERMISSIONS */}
          {activeTab === 'role' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={roleName}
                    onChange={(e) => handleRoleSelection(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                  >
                    {roleRecords.length > 0 ? (
                      roleRecords.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name} ({r.dataScope})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Sales Manager">Sales Manager</option>
                        <option value="Accounts & Finance">Accounts & Finance</option>
                        <option value="Support Executive">Support Executive</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Scope *</label>
                  <select
                    value={dataScope}
                    onChange={(e) => setDataScope(e.target.value as DataScope)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                  >
                    <option value="Own Records">Own Records (Only assigned records)</option>
                    <option value="Team Records">Team Records (Department team records)</option>
                    <option value="Department Records">Department Records (All records in department)</option>
                    <option value="All Records">All Records (Organization wide access)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" /> Granular Access Control Matrix
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {roleName === 'Super Admin' || roleName === 'Admin'
                        ? 'Administrators automatically have full privileges across all modules.'
                        : 'Configure specific operational permissions for this employee.'}
                    </p>
                  </div>

                  {roleName !== 'Super Admin' && roleName !== 'Admin' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAll(true)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAll(false)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                  {PERMISSION_LABELS.map((p) => {
                    const isEnabled = roleName === 'Super Admin' || roleName === 'Admin' || !!permissions[p.key];
                    return (
                      <div
                        key={p.key}
                        onClick={() => handleTogglePermission(p.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                          isEnabled ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                        } ${roleName === 'Super Admin' || roleName === 'Admin' ? 'cursor-default opacity-85' : ''}`}
                      >
                        <div className="pt-0.5 text-indigo-600">
                          {isEnabled ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">{p.label}</span>
                          <span className="text-[11px] text-slate-500 leading-tight block">{p.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDRESS & EMERGENCY */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600" /> Residential Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Flat / House No., Street, Landmark"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Karnataka"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 560100"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" /> Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Sunita Kumar"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      placeholder="Spouse, Parent, Sibling"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 98765 00000"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANK & SALARY */}
          {activeTab === 'bankSalary' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" /> Bank Account Coordinates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC Bank, ICICI Bank, SBI"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="50200034891234"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="HDFC0001234"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Full Name as on Bank Account"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="Indiranagar Branch"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Monthly Compensation Structure (INR)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HRA (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={hra}
                      onChange={(e) => setHra(Number(e.target.value))}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Allowances (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={allowances}
                      onChange={(e) => setAllowances(Number(e.target.value))}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Deductions (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={deductions}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono text-rose-600"
                    />
                  </div>
                </div>

                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600">Calculated Gross Salary:</span>{' '}
                    <strong className="text-slate-900 font-bold">₹{grossSalaryCalc.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-800 font-medium">Estimated Net Monthly Payout:</span>{' '}
                    <strong className="text-emerald-900 text-sm font-bold">₹{netSalaryCalc.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-400">
              {employeeToEdit ? `Updating ${employeeToEdit.employeeId || employeeCode}` : 'All business records will be audited'}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                {isSubmitting ? 'Saving...' : employeeToEdit ? 'Save Changes' : 'Onboard Employee'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
