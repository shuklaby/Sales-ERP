import {
  DepartmentRecord,
  DesignationRecord,
  RoleRecord,
  LeaveTypeRecord,
  HolidayRecord,
  EmployeeRecord,
  AttendanceRecord,
  LeaveRecord,
  PayrollRecord,
  ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '../types/crm';

export const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'dep_sales',
    departmentId: 'DEP-001',
    name: 'Sales',
    description: 'Enterprise business development, lead conversion, and client relationships',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dep_marketing',
    departmentId: 'DEP-002',
    name: 'Marketing',
    description: 'Demand generation, brand awareness, campaigns, and digital channels',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dep_accounts',
    departmentId: 'DEP-003',
    name: 'Accounts & Finance',
    description: 'Billing, invoicing, ledger reconciliation, compliance, and payroll',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dep_support',
    departmentId: 'DEP-004',
    name: 'Technical Support',
    description: 'Customer inquiry handling, issue resolution, and post-sales assistance',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dep_operations',
    departmentId: 'DEP-005',
    name: 'Operations & Procurement',
    description: 'Supply chain, procurement, inventory coordination, and logistics',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dep_hr',
    departmentId: 'DEP-006',
    name: 'Human Resources',
    description: 'Talent onboarding, attendance governance, leave administration, and policy',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dep_mgmt',
    departmentId: 'DEP-007',
    name: 'Executive Management',
    description: 'Strategic leadership, governance, and organizational decision-making',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_DESIGNATIONS: DesignationRecord[] = [
  {
    id: 'des_sales_exec',
    designationId: 'DES-001',
    name: 'Sales Executive',
    departmentId: 'dep_sales',
    departmentName: 'Sales',
    description: 'Manages assigned leads, client calls, proposals, and pipeline follow-ups',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'des_sales_mgr',
    designationId: 'DES-002',
    name: 'Sales Manager',
    departmentId: 'dep_sales',
    departmentName: 'Sales',
    description: 'Leads sales team, reviews deals, oversees revenue targets and pipeline velocity',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'des_mktg_lead',
    designationId: 'DES-003',
    name: 'Lead Generation Specialist',
    departmentId: 'dep_marketing',
    departmentName: 'Marketing',
    description: 'Acquires inbound prospects, manages marketing campaigns, and qualifies leads',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'des_accountant',
    designationId: 'DES-004',
    name: 'Senior Accountant',
    departmentId: 'dep_accounts',
    departmentName: 'Accounts & Finance',
    description: 'Manages invoicing, GST taxation compliance, vendor payments, and payroll',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'des_tech_support',
    designationId: 'DES-005',
    name: 'Support Engineer',
    departmentId: 'dep_support',
    departmentName: 'Technical Support',
    description: 'Resolves technical support tickets, troubleshoots client issues, and escalations',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'des_hr_exec',
    designationId: 'DES-006',
    name: 'HR Operations Executive',
    departmentId: 'dep_hr',
    departmentName: 'Human Resources',
    description: 'Oversees employee records, attendance corrections, and leave applications',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'des_managing_dir',
    designationId: 'DES-007',
    name: 'Managing Director / Super Admin',
    departmentId: 'dep_mgmt',
    departmentName: 'Executive Management',
    description: 'Executive decision maker with unrestricted governance privileges',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_ROLES: RoleRecord[] = [
  {
    id: 'role_super_admin',
    roleId: 'ROLE-001',
    name: 'Super Admin',
    description: 'Full unrestricted governance across all modules, settings, employees, and audit logs',
    dataScope: 'All Records',
    permissions: ADMIN_PERMISSIONS,
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_admin',
    roleId: 'ROLE-002',
    name: 'Admin',
    description: 'Operational administration across customers, sales, products, finance, and team members',
    dataScope: 'All Records',
    permissions: ADMIN_PERMISSIONS,
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_sales_mgr',
    roleId: 'ROLE-003',
    name: 'Sales Manager',
    description: 'Team supervisor with access to team leads, customers, proposals, and pipeline tasks',
    dataScope: 'Team Records',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      viewCustomers: true,
      createCustomer: true,
      editCustomer: true,
      deleteCustomer: false,
      viewLeads: true,
      createLead: true,
      editLead: true,
      deleteLead: false,
      viewProposals: true,
      createProposal: true,
      editProposal: true,
      sendProposal: true,
      viewProducts: true,
      viewReports: true,
      exportReports: true,
      sendEmail: true,
      sendWhatsApp: true,
      createReminder: true,
      manageTickets: true,
      viewEmployee: true,
      manageEmployee: false,
      viewAttendance: true,
      approveLeave: true,
    },
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_sales_exec',
    roleId: 'ROLE-004',
    name: 'Sales Executive',
    description: 'Individual contributor with access to own assigned customers, leads, calls, and follow-ups',
    dataScope: 'Own Records',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      viewCustomers: true,
      createCustomer: true,
      editCustomer: true,
      deleteCustomer: false,
      viewLeads: true,
      createLead: true,
      editLead: true,
      viewProposals: true,
      createProposal: true,
      editProposal: true,
      sendProposal: true,
      viewProducts: true,
      sendEmail: true,
      sendWhatsApp: true,
      createReminder: true,
      viewAttendance: true,
    },
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_accounts',
    roleId: 'ROLE-005',
    name: 'Accounts & Finance',
    description: 'Invoicing, payment recording, ledger audit, and payroll generation access',
    dataScope: 'All Records',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      viewCustomers: true,
      createCustomer: false,
      editCustomer: false,
      viewInvoices: true,
      createInvoice: true,
      editInvoice: true,
      sendInvoice: true,
      recordPayment: true,
      viewPayments: true,
      viewLedger: true,
      viewOutstanding: true,
      viewFinanceReports: true,
      exportFinanceReports: true,
      viewPayroll: true,
      managePayroll: true,
      viewProducts: true,
      viewPurchases: true,
    },
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_support',
    roleId: 'ROLE-006',
    name: 'Support Executive',
    description: 'Customer ticket handling, communication hub, and customer support assistance',
    dataScope: 'Team Records',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      viewCustomers: true,
      createCustomer: false,
      manageTickets: true,
      sendEmail: true,
      sendWhatsApp: true,
      viewProducts: true,
    },
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_hr',
    roleId: 'ROLE-007',
    name: 'Human Resources',
    description: 'Employee lifecycle, attendance governance, leave approvals, and payroll administration',
    dataScope: 'Department Records',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      viewEmployee: true,
      manageEmployee: true,
      viewAttendance: true,
      manageAttendance: true,
      approveLeave: true,
      viewPayroll: true,
      managePayroll: true,
      viewReports: true,
      exportReports: true,
      viewAuditLogs: true,
    },
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_employee',
    roleId: 'ROLE-008',
    name: 'General Employee',
    description: 'Basic employee self-service: check-in, leave application, own assigned tasks',
    dataScope: 'Own Records',
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
    isSystem: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_LEAVE_TYPES: LeaveTypeRecord[] = [
  {
    id: 'lt_casual',
    leaveTypeId: 'LT-001',
    name: 'Casual Leave (CL)',
    code: 'CL',
    annualLimit: 12,
    carryForward: false,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lt_sick',
    leaveTypeId: 'LT-002',
    name: 'Sick Leave (SL)',
    code: 'SL',
    annualLimit: 10,
    carryForward: false,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lt_earned',
    leaveTypeId: 'LT-003',
    name: 'Earned / Privilege Leave (EL)',
    code: 'EL',
    annualLimit: 15,
    carryForward: true,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lt_unpaid',
    leaveTypeId: 'LT-004',
    name: 'Unpaid Leave / Loss of Pay (LOP)',
    code: 'LOP',
    annualLimit: 0,
    carryForward: false,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_HOLIDAYS_2026: HolidayRecord[] = [
  {
    id: 'hol_republic_day',
    holidayId: 'HOL-2026-001',
    name: 'Republic Day',
    date: '2026-01-26',
    description: 'National Holiday — Republic of India',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_holi',
    holidayId: 'HOL-2026-002',
    name: 'Holi Festival',
    date: '2026-03-04',
    description: 'Festival of Colours',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_eid',
    holidayId: 'HOL-2026-003',
    name: 'Eid al-Fitr',
    date: '2026-03-20',
    description: 'Islamic Holiday',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_independence_day',
    holidayId: 'HOL-2026-004',
    name: 'Independence Day',
    date: '2026-08-15',
    description: 'National Holiday — Independence Day',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_gandhi_jayanti',
    holidayId: 'HOL-2026-005',
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    description: 'National Holiday — Birth Anniversary of Mahatma Gandhi',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_dussehra',
    holidayId: 'HOL-2026-006',
    name: 'Vijayadashami / Dussehra',
    date: '2026-10-20',
    description: 'Festival Holiday',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_diwali',
    holidayId: 'HOL-2026-007',
    name: 'Diwali (Deepavali)',
    date: '2026-11-08',
    description: 'Festival of Lights',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hol_christmas',
    holidayId: 'HOL-2026-008',
    name: 'Christmas Day',
    date: '2026-12-25',
    description: 'Christian Festival',
    status: 'Active',
    year: 2026,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to format minutes into human readable duration
export function formatMinutesToDuration(mins: number): string {
  if (!mins || mins <= 0) return '0 mins';
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

// Calculate Leave Balances accurately: Allocated, Used, Pending, Remaining
export function calculateLeaveBalances(
  employeeId: string,
  leaveTypes: LeaveTypeRecord[],
  leaves: LeaveRecord[],
  year: number = new Date().getFullYear()
) {
  return leaveTypes.map((type) => {
    // Only count leaves of this employee and this year
    const matchingLeaves = leaves.filter((l) => {
      const matchEmp = l.employeeId === employeeId;
      const matchType = l.leaveTypeId === type.id || l.leaveType === type.name;
      const leaveYear = l.fromDate ? new Date(l.fromDate).getFullYear() : year;
      return matchEmp && matchType && leaveYear === year;
    });

    const allocated = type.annualLimit || 0;
    const used = matchingLeaves
      .filter((l) => l.status === 'Approved')
      .reduce((acc, curr) => acc + (curr.numberOfDays || 0), 0);
    const pending = matchingLeaves
      .filter((l) => l.status === 'Pending')
      .reduce((acc, curr) => acc + (curr.numberOfDays || 0), 0);
    const remaining = Math.max(0, allocated - used);

    return {
      typeId: type.id,
      typeName: type.name,
      code: type.code,
      allocated,
      used,
      pending,
      remaining,
    };
  });
}

// Calculate factual attendance report metrics
export function calculateAttendanceMetrics(
  attendances: AttendanceRecord[],
  filters?: {
    employeeId?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const filtered = attendances.filter((att) => {
    if (filters?.employeeId && att.employeeId !== filters.employeeId) return false;
    if (filters?.department && att.department !== filters.department) return false;
    if (filters?.startDate && att.date < filters.startDate) return false;
    if (filters?.endDate && att.date > filters.endDate) return false;
    return true;
  });

  const presentDays = filtered.filter((a) => a.status === 'Present').length;
  const lateDays = filtered.filter((a) => a.status === 'Late').length;
  const halfDays = filtered.filter((a) => a.status === 'Half Day').length;
  const absentDays = filtered.filter((a) => a.status === 'Absent').length;
  const leaveDays = filtered.filter((a) => a.status === 'Leave').length;
  const holidayDays = filtered.filter((a) => a.status === 'Holiday').length;

  const totalCompletedWorkMins = filtered.reduce(
    (acc, curr) => acc + (curr.workDuration || 0),
    0
  );
  const daysWithWork = filtered.filter((a) => (a.workDuration || 0) > 0).length;
  const averageWorkDurationMins = daysWithWork > 0 ? Math.round(totalCompletedWorkMins / daysWithWork) : 0;

  return {
    totalRecords: filtered.length,
    presentDays,
    lateDays,
    halfDays,
    absentDays,
    leaveDays,
    holidayDays,
    totalWorkingHours: Math.round((totalCompletedWorkMins / 60) * 10) / 10,
    averageWorkDurationMins,
    averageWorkDurationFormatted: formatMinutesToDuration(averageWorkDurationMins),
    records: filtered,
  };
}

// Compute monthly payroll preview for an employee
export function computeMonthlyPayroll(
  employee: EmployeeRecord,
  monthYear: string, // YYYY-MM
  attendances: AttendanceRecord[],
  leaves: LeaveRecord[]
): PayrollRecord {
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();

  // Count standard working days in month (assuming Monday-Saturday working, Sunday weekly off)
  let totalWorkingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0) {
      totalWorkingDays++;
    }
  }

  // Filter attendance for this month
  const monthAttendances = attendances.filter(
    (a) => a.employeeId === employee.id && a.date.startsWith(monthYear)
  );

  const presentDays = monthAttendances.filter((a) => a.status === 'Present').length;
  const lateDays = monthAttendances.filter((a) => a.status === 'Late').length;
  const halfDays = monthAttendances.filter((a) => a.status === 'Half Day').length;

  // Paid and unpaid leaves in this month
  const monthLeaves = leaves.filter(
    (l) => l.employeeId === employee.id && l.fromDate.startsWith(monthYear) && l.status === 'Approved'
  );

  const paidLeaveDays = monthLeaves
    .filter((l) => !l.leaveType.toLowerCase().includes('unpaid') && !l.leaveType.toLowerCase().includes('lop'))
    .reduce((sum, curr) => sum + (curr.numberOfDays || 0), 0);

  const unpaidLeaveDays = monthLeaves
    .filter((l) => l.leaveType.toLowerCase().includes('unpaid') || l.leaveType.toLowerCase().includes('lop'))
    .reduce((sum, curr) => sum + (curr.numberOfDays || 0), 0);

  // Absent days = max(0, totalWorkingDays - (present + late + half*0.5 + paidLeaveDays + unpaidLeaveDays))
  const attendedUnits = presentDays + lateDays + halfDays * 0.5;
  const absentDays = Math.max(0, totalWorkingDays - (attendedUnits + paidLeaveDays + unpaidLeaveDays));

  // Salary calculations
  const basic = employee.salaryDetails?.basicSalary || 30000;
  const hra = employee.salaryDetails?.hra || 12000;
  const allowances = employee.salaryDetails?.allowances || 8000;
  const configuredDeductions = employee.salaryDetails?.deductions || 2000;

  const grossSalary = basic + hra + allowances;
  const perDaySalary = totalWorkingDays > 0 ? grossSalary / totalWorkingDays : 0;
  const unpaidLossOfPay = (unpaidLeaveDays + absentDays + halfDays * 0.5) * perDaySalary;
  const totalDeductions = Math.round(configuredDeductions + unpaidLossOfPay);
  const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions));

  return {
    id: `pay_${employee.id}_${monthYear}`,
    payrollId: `PAY-${monthYear}-${employee.employeeCode.replace(/[^0-9]/g, '').slice(-4) || '0001'}`,
    monthYear,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.name || `${employee.firstName} ${employee.lastName}`,
    department: employee.department || 'Sales',
    designation: employee.designation || 'Executive',
    bankName: employee.bankAccountDetails?.bankName,
    accountNumber: employee.bankAccountDetails?.accountNumber,
    ifscCode: employee.bankAccountDetails?.ifscCode,
    totalWorkingDays,
    presentDays: presentDays + lateDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    halfDays,
    basicSalary: basic,
    hra,
    allowances,
    grossSalary,
    deductions: totalDeductions,
    netSalary,
    status: 'Draft',
    generatedAt: new Date().toISOString(),
  };
}
