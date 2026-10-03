import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  runTransaction,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, createEmployeeAuthAccount } from '../firebase';
import { useAuth } from './AuthContext';
import {
  Customer,
  Lead,
  Activity,
  CallRecord,
  CallStatus,
  FollowUpRecord,
  STSRecord,
  STSStatus,
  ProductItem,
  ServiceItem,
  PriceHistoryRecord,
  ProposalRecord,
  UserProfile,
  CompanySettings,
  BankSettings,
  BankAccount,
  BrandingSettings,
  ProposalTemplateSettings,
  SignatorySettings,
  TermItem,
  ProposalNumberingSettings,
  ActivityType,
  CustomerStatus,
  MeetingRecord,
  WhatsAppRecord,
  EmailRecord,
  EmailTemplate,
  EmailSettings,
  NotificationRecord,
  ProposalViewEvent,
  ImportHistoryRecord,
  FinanceSettings,
  InvoiceStatus,
  InvoiceItem,
  InvoiceTaxBreakdown,
  InvoiceRecord,
  PaymentMethod,
  PaymentStatus,
  PaymentRecord,
  PaymentReceipt,
  CustomerAdvance,
  CreditNote,
  FinanceAuditEventType,
  FinanceAuditLog,
  CustomerLedgerEntry,
  PaymentLinkRecord,
  OnlinePaymentRecord,
  PaymentGatewayPublicConfig,
  ReconciliationRecord,
  ProductCategory,
  StockMovementType,
  InventoryMovement,
  PurchaseStatus,
  PurchaseItem,
  PurchaseRecord,
  SupplierRecord,
  CustomerSpecificPrice,
  ProductSettings,
  InventoryStockSummary,
  EmployeeRecord,
  DepartmentRecord,
  DesignationRecord,
  RoleRecord,
  TaskRecord,
  TaskPriority,
  TaskStatus,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceCorrection,
  LeaveRecord,
  LeaveStatus,
  LeaveTypeRecord,
  HolidayRecord,
  EmployeeActivityRecord,
  LoginHistoryRecord,
  PayrollRecord,
  EmploymentStatus,
  DataScope,
  ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  SalesSourceRecord,
  SalesStatusRecord,
  LeadPriority,
  DebitNote,
  ExpenseStatus,
  ExpenseRecord,
  ExpenseCategoryRecord,
  VendorRecord,
  BankTransactionRecord,
  BankReconciliationRecord,
  PaymentReminderRecord,
  ReportExportRecord,
  ScheduledReportRecord,
  ReportAuditLog,
  DashboardConfiguration,
  DashboardWidgetId,
  UniversalReportFilter,
} from '../types/crm';
import {
  DEFAULT_SALES_SOURCES,
  DEFAULT_SALES_STATUSES,
  generateUniqueLeadNumber,
  generateUniqueSTSNumber,
  detectDuplicateCustomer,
} from '../services/salesService';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_TAX_RATES,
  maskBankAccountNumber,
  getCurrentFinancialYear,
  formatInvoiceNumber,
  formatReceiptNumber,
  calculateItemGst,
  calculateReceivablesAging,
  computeCustomerLedger,
  calculateProfitAndLoss,
  calculateSalesVsCollection,
} from '../services/financeService';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_DESIGNATIONS,
  DEFAULT_ROLES,
  DEFAULT_LEAVE_TYPES,
  DEFAULT_HOLIDAYS_2026,
  formatMinutesToDuration,
  computeMonthlyPayroll,
} from '../services/hrService';
import { roundTo2, numberToWords, deriveInvoiceStatus } from '../utils/financeUtils';

export interface BulkImportExecuteOptions {
  recordType: 'customers' | 'leads';
  fileName: string;
  fileType: string;
  totalFileRows: number;
  records: any[];
  onProgress?: (current: number, total: number) => void;
}

export interface BulkImportResultSummary {
  importId: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  skippedRows: number;
  invalidRows: number;
  failedRows: number;
  status: 'Completed' | 'Completed with Errors' | 'Failed';
  failedDetails: { rowIndex: number; error: string; companyName?: string }[];
}

interface CrmDataContextType {
  customers: Customer[];
  leads: Lead[];
  activities: Activity[];
  calls: CallRecord[];
  followups: FollowUpRecord[];
  stsRecords: STSRecord[];
  products: ProductItem[];
  services: ServiceItem[];
  proposals: ProposalRecord[];
  employees: UserProfile[];
  companySettings: CompanySettings;
  bankSettings: BankSettings;
  bankAccounts: BankAccount[];
  brandingSettings: BrandingSettings;
  proposalTemplateSettings: ProposalTemplateSettings;
  signatorySettings: SignatorySettings;
  termsList: TermItem[];
  proposalNumberingSettings: ProposalNumberingSettings;
  dataLoading: boolean;

  // Real-time meetings, WhatsApp and email logs
  meetings: MeetingRecord[];
  whatsappLogs: WhatsAppRecord[];
  emailRecords: EmailRecord[];

  // Actions
  logActivity: (
    type: ActivityType,
    title: string,
    description: string,
    customerId?: string,
    leadId?: string,
    stsId?: string,
    metadata?: Record<string, any>
  ) => Promise<void>;

  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<string>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  archiveCustomer: (id: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  generateNextCustomerId: () => string;

  addLead: (
    data: Omit<Lead, 'id' | 'leadId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & { leadId?: string }
  ) => Promise<string>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  archiveLead: (id: string) => Promise<void>;
  restoreLead: (id: string) => Promise<void>;
  convertLeadToCustomer: (leadId: string) => Promise<string>;
  generateNextLeadId: () => string;

  // Calling
  logCall: (data: Omit<CallRecord, 'id' | 'callId' | 'createdAt'>) => Promise<string>;
  initiateCall: (params: {
    customerId?: string;
    leadId?: string;
    stsId?: string;
    companyName: string;
    contactPerson: string;
    mobile: string;
  }) => Promise<CallRecord>;
  updateCallOutcome: (
    callDocId: string,
    data: {
      status: CallStatus;
      notes: string;
      outcome?: string;
      nextFollowupDate?: string;
      nextFollowupTime?: string;
      actualDuration?: number | null;
    }
  ) => Promise<void>;

  // Follow-ups
  addFollowUp: (data: Omit<FollowUpRecord, 'id' | 'followupId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateFollowUpStatus: (id: string, status: FollowUpRecord['status'], notes?: string) => Promise<void>;
  completeFollowUp: (id: string, notes?: string) => Promise<void>;
  rescheduleFollowUp: (id: string, newDate: string, newTime: string, reason?: string, notes?: string) => Promise<void>;
  cancelFollowUp: (id: string, notes?: string) => Promise<void>;

  // STS
  addSTS: (data: Omit<STSRecord, 'id' | 'stsNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => Promise<string>;
  updateSTS: (id: string, data: Partial<STSRecord>) => Promise<void>;

  // Products & Pricing
  productPriceHistories: PriceHistoryRecord[];
  addProduct: (data: Omit<ProductItem, 'id' | 'productId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProduct: (id: string, data: Partial<ProductItem>, priceChangeReason?: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductStatus: (id: string) => Promise<void>;

  // Services & Pricing
  servicePriceHistories: PriceHistoryRecord[];
  addService: (data: Omit<ServiceItem, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateService: (id: string, data: Partial<ServiceItem>, priceChangeReason?: string) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  toggleServiceStatus: (id: string) => Promise<void>;

  createProposal: (
    data: Omit<ProposalRecord, 'id' | 'proposalNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'companySnapshot' | 'bankSnapshot'> & {
      selectedBankId?: string;
      bankSnapshot?: BankSettings;
    },
    customProposalNumber?: string
  ) => Promise<ProposalRecord>;
  updateProposal: (id: string, data: Partial<ProposalRecord>) => Promise<void>;
  updateProposalStatus: (id: string, status: ProposalRecord['status'], reason?: string, acceptedBy?: string) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  duplicateProposal: (proposalId: string) => Promise<ProposalRecord>;
  generateNextProposalNumber: () => Promise<string>;
  uploadCompanyLogo: (file: File) => Promise<string>;
  removeCompanyLogo: () => Promise<void>;

  // Multiple Bank Accounts
  addBankAccount: (data: Omit<BankAccount, 'id' | 'bankAccountId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBankAccount: (id: string, data: Partial<BankAccount>) => Promise<void>;
  setDefaultBankAccount: (id: string) => Promise<void>;
  toggleBankAccountStatus: (id: string) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;

  // Branding & Logo
  updateBrandingSettings: (settings: Partial<BrandingSettings>) => Promise<void>;

  // Template & Signatory
  updateProposalTemplateSettings: (settings: Partial<ProposalTemplateSettings>) => Promise<void>;
  updateSignatorySettings: (settings: Partial<SignatorySettings>) => Promise<void>;
  uploadSignatorySignature: (file: File) => Promise<string>;
  removeSignatorySignature: () => Promise<void>;

  // Terms & Conditions
  addTerm: (term: Omit<TermItem, 'id' | 'order'>) => Promise<string>;
  updateTerm: (id: string, term: Partial<TermItem>) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  reorderTerms: (orderedIds: string[]) => Promise<void>;

  // Proposal Numbering Configuration
  updateProposalNumberingSettings: (settings: Partial<ProposalNumberingSettings>) => Promise<void>;

  addMeeting: (data: Omit<MeetingRecord, 'id' | 'createdAt'>) => Promise<string>;
  updateMeeting: (id: string, data: Partial<MeetingRecord>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  logWhatsApp: (data: Omit<WhatsAppRecord, 'id' | 'timestamp'>) => Promise<string>;
  logEmail: (data: Omit<EmailRecord, 'id' | 'sentAt'>) => Promise<string>;

  updateCompanySettings: (settings: Partial<CompanySettings>) => Promise<void>;
  updateBankSettings: (settings: Partial<BankSettings>) => Promise<void>;
  updateEmployeePermissions: (userId: string, permissions: UserProfile['permissions']) => Promise<void>;
  updateEmployeeStatus: (userId: string, status: UserProfile['status']) => Promise<void>;
  updateEmployeeDetails: (userId: string, data: Partial<UserProfile>) => Promise<void>;

  // Bulk Upload & Import History (Phase 8)
  importHistory: ImportHistoryRecord[];
  bulkImportData: (options: BulkImportExecuteOptions) => Promise<BulkImportResultSummary>;
  deleteImportHistory: (id: string) => Promise<void>;

  // Email System, Proposal Tracking & Notifications (Phase 9)
  emails: EmailRecord[];
  emailTemplates: EmailTemplate[];
  emailSettings: EmailSettings;
  notifications: NotificationRecord[];
  sendProposalEmail: (params: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
    proposal: ProposalRecord;
    pdfBase64?: string;
    attachmentName?: string;
    retryOfEmailId?: string;
  }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  retryEmail: (emailId: string) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  saveEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { id?: string }) => Promise<string>;
  deleteEmailTemplate: (templateId: string) => Promise<void>;
  updateEmailSettings: (settings: Partial<EmailSettings>) => Promise<void>;
  testEmailConnection: () => Promise<{ success: boolean; message?: string; error?: string }>;
  createNotification: (notification: Omit<NotificationRecord, 'id' | 'notificationId' | 'createdAt' | 'read'>) => Promise<string>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  recordProposalView: (proposalId: string, viewerToken: string) => Promise<void>;
  recordProposalCustomerResponse: (proposalId: string, decision: 'accept' | 'reject', clientName: string, reason?: string) => Promise<void>;

  // Finance Module (Phase 12)
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  receipts: PaymentReceipt[];
  customerAdvances: CustomerAdvance[];
  creditNotes: CreditNote[];
  financeSettings: FinanceSettings;
  financeAuditLogs: FinanceAuditLog[];

  // Finance Actions
  generateNextInvoiceNumber: () => Promise<string>;
  generateNextReceiptNumber: () => Promise<string>;
  generateNextCreditNoteNumber: () => Promise<string>;
  createInvoice: (
    data: Omit<InvoiceRecord, 'id' | 'invoiceId' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'paidAmount' | 'outstandingAmount' | 'status'> & {
      status?: InvoiceStatus;
      invoiceNumber?: string;
    }
  ) => Promise<InvoiceRecord>;
  createInvoiceFromProposal: (proposalId: string) => Promise<InvoiceRecord>;
  updateDraftInvoice: (id: string, data: Partial<InvoiceRecord>) => Promise<void>;
  finalizeInvoice: (id: string) => Promise<void>;
  cancelInvoice: (id: string, reason: string) => Promise<void>;
  recordPayment: (params: {
    invoiceId?: string;
    customerId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod | string;
    transactionReference: string;
    notes?: string;
    status?: PaymentStatus;
    asCustomerAdvance?: boolean;
  }) => Promise<{ payment: PaymentRecord; receipt?: PaymentReceipt }>;
  reversePayment: (paymentId: string, reason: string) => Promise<void>;
  createCustomerAdvance: (params: {
    customerId: string;
    amount: number;
    date: string;
    notes?: string;
    transactionReference?: string;
  }) => Promise<CustomerAdvance>;
  applyCustomerAdvance: (advanceId: string, invoiceId: string, amount: number) => Promise<void>;
  createCreditNote: (params: {
    invoiceId: string;
    customerId: string;
    amount: number;
    reason: string;
    date: string;
  }) => Promise<CreditNote>;
  updateFinanceSettings: (settings: Partial<FinanceSettings>) => Promise<void>;
  sendInvoiceEmail: (invoiceId: string, params: { to: string; cc?: string; subject: string; message: string; pdfBase64?: string }) => Promise<{ success: boolean; error?: string }>;
  sendReceiptEmail: (receiptId: string, params: { to: string; cc?: string; subject: string; message: string }) => Promise<{ success: boolean; error?: string }>;
  sendPaymentReminder: (invoiceId: string, channel: 'email' | 'whatsapp', customMessage?: string) => Promise<{ success: boolean; error?: string }>;
  checkAndNotifyOverdueInvoices: () => Promise<void>;

  // Phase 13: Online Payment Gateway & Payment Links
  paymentLinks: PaymentLinkRecord[];
  onlinePayments: OnlinePaymentRecord[];
  reconciliationRecords: ReconciliationRecord[];
  paymentConfig: PaymentGatewayPublicConfig;
  fetchPaymentConfig: () => Promise<PaymentGatewayPublicConfig>;
  savePaymentConfig: (config: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  testPaymentConnection: () => Promise<{ success: boolean; message?: string; error?: string }>;
  createPaymentLink: (params: {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    requestedAmount?: number;
    invoiceTotal?: number;
    invoicePaid?: number;
    invoiceOutstanding?: number;
    expiresInHours?: number;
    notes?: string;
  }) => Promise<PaymentLinkRecord>;
  cancelPaymentLink: (paymentLinkId: string) => Promise<void>;
  initiateRefund: (params: { paymentId: string; refundAmount: number; reason: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshOnlinePayments: () => Promise<void>;
  refreshReconciliation: () => Promise<void>;

  // Phase 16: Product, Service, Inventory, Purchases
  productCategories: ProductCategory[];
  inventoryMovements: InventoryMovement[];
  purchases: PurchaseRecord[];
  suppliers: SupplierRecord[];
  customerSpecificPricings: CustomerSpecificPrice[];
  productSettings: ProductSettings;

  addCategory: (data: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCategory: (id: string, data: Partial<ProductCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  duplicateProduct: (productId: string) => Promise<string>;
  archiveProduct: (productId: string) => Promise<void>;
  reactivateProduct: (productId: string) => Promise<void>;

  adjustStock: (params: {
    productId: string;
    quantityDelta: number;
    type: StockMovementType;
    reason: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;

  reserveStock: (params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }) => Promise<void>;

  releaseStock: (params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }) => Promise<void>;

  deductStock: (params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }) => Promise<void>;

  createPurchase: (data: Omit<PurchaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => Promise<string>;
  updatePurchase: (id: string, data: Partial<PurchaseRecord>) => Promise<void>;
  receivePurchaseGoods: (params: {
    purchaseId: string;
    itemsToReceive: { productId: string; quantity: number }[];
    notes?: string;
  }) => Promise<void>;
  cancelPurchase: (purchaseId: string, reason?: string) => Promise<void>;

  addSupplier: (data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSupplier: (id: string, data: Partial<SupplierRecord>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  saveCustomerSpecificPrice: (data: Omit<CustomerSpecificPrice, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<string>;
  deleteCustomerSpecificPrice: (id: string) => Promise<void>;

  updateProductSettings: (settings: Partial<ProductSettings>) => Promise<void>;
  bulkImportProducts: (productsList: Partial<ProductItem>[]) => Promise<{ imported: number; updated: number; failed: number }>;
  recordPriceOverride: (params: {
    productId: string;
    originalPrice: number;
    overridePrice: number;
    reason: string;
  }) => Promise<void>;

  generateNextProductCode: () => Promise<string>;
  generateNextServiceCode: () => Promise<string>;
  generateNextPurchaseNumber: () => Promise<string>;
  generateNextSupplierCode: () => Promise<string>;

  // Phase 17: HR, Employee Management, Attendance, Leave, Tasks & Payroll
  employeeRecords: EmployeeRecord[];
  departmentRecords: DepartmentRecord[];
  designationRecords: DesignationRecord[];
  roleRecords: RoleRecord[];
  taskRecords: TaskRecord[];
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  leaveTypeRecords: LeaveTypeRecord[];
  holidayRecords: HolidayRecord[];
  employeeActivityRecords: EmployeeActivityRecord[];
  loginHistoryRecords: LoginHistoryRecord[];
  payrollRecords: PayrollRecord[];

  generateNextEmployeeCode: () => Promise<string>;
  generateNextTaskNumber: () => Promise<string>;
  generateNextAttendanceId: () => Promise<string>;
  generateNextLeaveId: () => Promise<string>;
  generateNextPayrollId: () => Promise<string>;

  createEmployeeRecord: (data: Omit<EmployeeRecord, 'id' | 'employeeId' | 'employeeCode' | 'createdAt' | 'updatedAt' | 'createdBy'> & { password?: string; confirmPassword?: string }) => Promise<string>;
  updateEmployeeRecord: (id: string, data: Partial<EmployeeRecord>) => Promise<void>;
  updateEmployeeEmploymentStatus: (id: string, status: EmploymentStatus) => Promise<void>;
  canDeleteEmployee: (id: string) => { canDelete: boolean; reason?: string };
  deleteEmployeeRecord: (id: string) => Promise<void>;
  resetEmployeePassword: (email: string) => Promise<string>;

  addDepartment: (data: Omit<DepartmentRecord, 'id' | 'departmentId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDepartment: (id: string, data: Partial<DepartmentRecord>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  addDesignation: (data: Omit<DesignationRecord, 'id' | 'designationId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDesignation: (id: string, data: Partial<DesignationRecord>) => Promise<void>;
  deleteDesignation: (id: string) => Promise<void>;

  addRole: (data: Omit<RoleRecord, 'id' | 'roleId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRole: (id: string, data: Partial<RoleRecord>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  createTask: (data: Omit<TaskRecord, 'id' | 'taskId' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => Promise<string>;
  updateTask: (id: string, data: Partial<TaskRecord>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  checkInEmployee: (employeeId: string, source?: 'Web' | 'Mobile' | 'System', notes?: string) => Promise<AttendanceRecord>;
  checkOutEmployee: (attendanceId: string) => Promise<AttendanceRecord>;
  correctAttendance: (attendanceId: string, params: { correctedCheckIn: string; correctedCheckOut?: string; reason: string }) => Promise<void>;

  applyLeave: (data: Omit<LeaveRecord, 'id' | 'leaveId' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  approveLeave: (leaveId: string) => Promise<void>;
  rejectLeave: (leaveId: string, rejectionReason: string) => Promise<void>;
  cancelLeave: (leaveId: string) => Promise<void>;

  addLeaveType: (data: Omit<LeaveTypeRecord, 'id' | 'leaveTypeId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLeaveType: (id: string, data: Partial<LeaveTypeRecord>) => Promise<void>;
  deleteLeaveType: (id: string) => Promise<void>;

  addHoliday: (data: Omit<HolidayRecord, 'id' | 'holidayId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateHoliday: (id: string, data: Partial<HolidayRecord>) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;

  logEmployeeActivity: (params: { employeeId: string; employeeName?: string; action: string; entityType: string; entityId: string; details?: string; metadata?: Record<string, any> }) => Promise<string>;

  generateMonthlyPayroll: (monthYear: string) => Promise<PayrollRecord[]>;
  updatePayrollStatus: (payrollId: string, status: 'Draft' | 'Approved' | 'Paid', paymentReference?: string) => Promise<void>;

  seedInitialDataIfEmpty: () => Promise<void>;

  // Phase 18: Sales Module, Leads, STS, Pipeline, Calls, Follow-ups
  salesSources: SalesSourceRecord[];
  salesStatuses: SalesStatusRecord[];
  addSalesSource: (name: string) => Promise<string>;
  updateSalesSource: (id: string, data: Partial<SalesSourceRecord>) => Promise<void>;
  toggleSalesSource: (id: string) => Promise<void>;
  addSalesStatus: (name: string, stageOrder?: number, isWon?: boolean, isLost?: boolean) => Promise<string>;
  updateSalesStatus: (id: string, data: Partial<SalesStatusRecord>) => Promise<void>;
  deleteSalesStatus: (id: string) => Promise<void>;
  canDeleteSalesStatus: (name: string) => boolean;
  generateNextLeadNumber: () => Promise<string>;
  generateNextSTSNumber: () => Promise<string>;
  recordTalkHui: (stsId: string, talkStatus: 'Yes' | 'No' | 'Callback' | 'Not Reachable', remarks?: string) => Promise<void>;
  completeFollowUpWithOutcome: (
    id: string,
    outcome: 'Completed' | 'Rescheduled' | 'Customer Not Available' | 'Not Interested' | 'Converted' | 'Other',
    notes?: string,
    rescheduleData?: { date: string; time: string; reason?: string }
  ) => Promise<void>;
  updateLeadPipelineStage: (leadId: string, newStatus: string) => Promise<void>;
  checkDuplicateCustomer: (params: { phone?: string; email?: string; gstNumber?: string; excludeCustomerId?: string }) => {
    hasDuplicate: boolean;
    matches: Array<{ type: 'phone' | 'email' | 'gst'; customer: Customer; detail: string }>;
  };
  bulkAssignLeads: (leadIds: string[], employeeId: string, employeeName: string) => Promise<void>;
  bulkUpdateLeadStatus: (leadIds: string[], newStatus: string) => Promise<void>;
  bulkAssignSTS: (stsIds: string[], employeeId: string, employeeName: string) => Promise<void>;
  bulkUpdateSTSStatus: (stsIds: string[], newStatus: string) => Promise<void>;
  checkAndNotifyFollowupReminders: () => void;

  // Phase 19: Finance, Invoicing, Expenses, Accounts, Bank Transactions & Reconciliation
  debitNotes: DebitNote[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategoryRecord[];
  vendors: VendorRecord[];
  bankTransactions: BankTransactionRecord[];
  bankReconciliations: BankReconciliationRecord[];
  paymentReminders: PaymentReminderRecord[];

  duplicateInvoice: (invoiceId: string) => Promise<InvoiceRecord>;
  generateNextDebitNoteNumber: () => Promise<string>;
  createDebitNote: (data: Omit<DebitNote, 'id' | 'debitNoteId' | 'debitNoteNumber' | 'createdAt'>) => Promise<string>;
  finalizeDebitNote: (id: string) => Promise<void>;

  generateNextExpenseId: () => Promise<string>;
  addExpense: (data: Omit<ExpenseRecord, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => Promise<string>;
  updateDraftExpense: (id: string, data: Partial<ExpenseRecord>) => Promise<void>;
  approveExpense: (id: string) => Promise<void>;
  rejectExpense: (id: string, reason: string) => Promise<void>;
  markExpensePaid: (id: string) => Promise<void>;
  cancelExpense: (id: string) => Promise<void>;

  addExpenseCategory: (name: string, description?: string) => Promise<string>;
  updateExpenseCategory: (id: string, data: Partial<ExpenseCategoryRecord>) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;
  canDeleteExpenseCategory: (id: string) => boolean;

  generateNextVendorId: () => Promise<string>;
  addVendor: (data: Omit<VendorRecord, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateVendor: (id: string, data: Partial<VendorRecord>) => Promise<void>;
  toggleVendorStatus: (id: string) => Promise<void>;

  generateNextBankTransactionId: () => Promise<string>;
  addBankTransaction: (data: Omit<BankTransactionRecord, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  bulkImportBankTransactions: (transactions: Array<Omit<BankTransactionRecord, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'>>) => Promise<number>;
  reconcileBankTransaction: (params: { transactionId: string; paymentId?: string; invoiceId?: string; notes?: string }) => Promise<void>;
  unmatchBankTransaction: (transactionId: string) => Promise<void>;

  schedulePaymentReminder: (invoiceId: string, type: 'BEFORE_DUE' | 'ON_DUE' | 'OVERDUE', channel: 'email' | 'whatsapp' | 'both') => Promise<string>;
  checkAndNotifyPaymentReminders: () => Promise<void>;

  // Phase 20: Advanced Reporting, MIS, Analytics & Management Dashboard
  reportExports: ReportExportRecord[];
  scheduledReports: ScheduledReportRecord[];
  reportAuditLogs: ReportAuditLog[];
  dashboardConfig: DashboardConfiguration | null;

  createReportExport: (data: Omit<ReportExportRecord, 'id' | 'generatedAt'>) => Promise<string>;
  createScheduledReport: (data: Omit<ScheduledReportRecord, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => Promise<string>;
  updateScheduledReport: (id: string, data: Partial<ScheduledReportRecord>) => Promise<void>;
  deleteScheduledReport: (id: string) => Promise<void>;
  logReportAudit: (
    action: ReportAuditLog['action'],
    reportId: string,
    reportName: string,
    details?: string,
    format?: 'excel' | 'csv' | 'pdf',
    filtersApplied?: Record<string, any>
  ) => Promise<void>;
  updateDashboardConfig: (config: Partial<DashboardConfiguration>) => Promise<void>;
}

export const defaultProductSettings: ProductSettings = {
  id: 'default',
  productCodePrefix: 'PRD',
  serviceCodePrefix: 'SRV',
  purchaseNumberPrefix: 'PO',
  supplierCodePrefix: 'SUP',
  stockTracking: true,
  allowNegativeStock: false,
  lowStockThreshold: 10,
  defaultTaxRate: 18,
  maxDiscountPercent: 25,
  requirePriceOverrideReason: true,
  deductStockOn: 'Invoice Issued',
};

export const defaultPaymentConfig: PaymentGatewayPublicConfig = {
  configured: false,
  gateway: 'razorpay',
  environment: 'Test',
  merchantName: 'SparkGenTechnology',
  currency: 'INR',
  status: 'Not Connected',
  enabledMethods: {
    upi: true,
    cards: true,
    netbanking: true,
    wallets: true,
  },
};

export const defaultFinanceSettings: FinanceSettings = {
  id: 'general',
  invoicePrefix: 'INV',
  invoiceYearFormat: 'YYYY',
  invoiceNextSequence: 1,
  receiptPrefix: 'RCT',
  receiptYearFormat: 'YYYY',
  receiptNextSequence: 1,
  creditNotePrefix: 'CN',
  creditNoteNextSequence: 1,
  defaultPaymentTerms: 'Net 30',
  defaultDueDays: 30,
  defaultCurrency: 'INR',
  currencySymbol: '₹',
  defaultTaxType: 'intra_state',
  defaultTaxRate: 18,
  taxRates: [
    { label: '0% (Exempt)', rate: 0 },
    { label: '5% GST', rate: 5 },
    { label: '12% GST', rate: 12 },
    { label: '18% GST (Standard)', rate: 18, isDefault: true },
    { label: '28% GST', rate: 28 },
  ],
  paymentMethods: ['Bank Transfer', 'UPI', 'Cash', 'Card', 'Cheque', 'Payment Gateway', 'Other'],
};

export const defaultEmailTemplates: EmailTemplate[] = [
  {
    id: 'tpl_proposal_default',
    templateId: 'TPL-PROP-01',
    templateName: 'Proposal Email',
    type: 'Proposal Email',
    subject: 'Proposal from SparkGenTechnology - {{proposalNumber}}',
    body: 'Dear {{customerName}},\n\nPlease find attached the proposal from SparkGenTechnology.\n\nProposal No: {{proposalNumber}}\nProposal Date: {{proposalDate}}\nTotal Amount: {{totalAmount}}\n\nPlease review the attached proposal and feel free to contact us for any clarification.\n\nRegards,\nSparkGenTechnology\n{{officialEmail}}\n{{officialPhone}}',
    status: 'active',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl_followup_default',
    templateId: 'TPL-FOLL-01',
    templateName: 'Proposal Follow-up',
    type: 'Follow-up Email',
    subject: 'Follow-up regarding Proposal {{proposalNumber}} — SparkGenTechnology',
    body: 'Hello {{contactPerson}},\n\nI hope this email finds you well. I am following up on proposal {{proposalNumber}} shared with {{companyName}} for ₹{{grandTotal}}.\n\nPlease let us know if you require any technical clarifications or adjustments.\n\nBest regards,\n{{employeeName}}\nSparkGenTechnology',
    status: 'active',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl_welcome_default',
    templateId: 'TPL-WELC-01',
    templateName: 'Client Welcome & Onboarding',
    type: 'Welcome Email',
    subject: 'Welcome to SparkGenTechnology — Enterprise Solutions',
    body: 'Hello {{contactPerson}},\n\nWelcome to SparkGenTechnology! We are excited to partner with {{companyName}} for industrial automation & cloud architecture.\n\nYour dedicated account representative is {{employeeName}} (Phone: {{employeePhone}}).\n\nWarm regards,\nSparkGenTechnology Team',
    status: 'active',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl_reminder_default',
    templateId: 'TPL-PAYM-01',
    templateName: 'Commercial Milestone Reminder',
    type: 'Payment Reminder',
    subject: 'Commercial Reminder: Milestone Settlement for Proposal {{proposalNumber}}',
    body: 'Hello {{contactPerson}},\n\nThis is a gentle reminder regarding commercial milestone settlement for {{companyName}} under Proposal {{proposalNumber}} (Amount: ₹{{grandTotal}}).\n\nPlease let us know if you need another copy of the invoice or banking coordinates.\n\nRegards,\nSparkGenTechnology Accounts',
    status: 'active',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const defaultEmailSettings: EmailSettings = {
  provider: 'smtp',
  senderName: 'SparkGenTechnology',
  senderEmail: 'sales@sparkgentechnology.in',
  replyTo: 'sales@sparkgentechnology.in',
  status: 'Configured',
  trackingEnabled: true,
  supportsOpenTracking: false,
  supportsClickTracking: false,
};

export const defaultCompanySettings: CompanySettings = {
  companyName: 'SparkGenTechnology',
  legalName: 'SparkGenTechnology Private Limited',
  tagline: 'Enterprise Cloud & Industrial Automation Architecture',
  logoUrl: '',
  address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560100',
  country: 'India',
  phone: '+91 98765 43210',
  alternatePhone: '+91 80 4123 5678',
  email: 'sales@sparkgentechnology.com',
  website: 'https://sparkgentechnology.com',
  gstNumber: '29AAECS1234F1Z8',
  pan: 'AAECS1234F',
  panNumber: 'AAECS1234F',
  proposalValidityDays: 30,
  proposalPrefix: 'PROP',
  footerText: 'Thank you for choosing SparkGenTechnology.',
  settingsVersion: 1,
  termsAndConditions:
    '1. Payment Terms: 50% advance along with Purchase Order, 50% upon delivery/milestone sign-off.\n2. Validity: Proposals are valid for 30 days from the date of issue unless specified otherwise.\n3. Taxes: Applicable GST is charged as per government regulations.\n4. Delivery: Standard turnaround timeframe is 2-3 weeks from confirmed PO and advance payment.\n5. Warranty & Support: 12 months comprehensive support & maintenance.\n6. Cancellation: Customized equipment and dedicated engineering are non-cancellable once procurement commences.',
};

export const defaultBankSettings: BankSettings = {
  accountHolderName: 'SparkGenTechnology Private Limited',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200034891234',
  ifscCode: 'HDFC0001234',
  branch: 'Innovation Tech Branch',
  upiId: 'sparkgen@hdfcbank',
};

export const defaultBrandingSettings: BrandingSettings = {
  logoUrl: '',
  primaryColor: '#0f172a',
  secondaryColor: '#475569',
  accentColor: '#2563eb',
  headerStyle: 'modern',
  logoPosition: 'left',
  showLogo: true,
  showCompanyAddress: true,
  showGST: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  tableStyle: 'striped',
};

export const defaultProposalTemplateSettings: ProposalTemplateSettings = {
  headerStyle: 'modern',
  logoPosition: 'left',
  showCompanyDetails: true,
  tableStyle: 'striped',
  showBankSection: true,
  showGST: true,
  showTerms: true,
  showSignature: true,
  footerText: 'Thank you for choosing SparkGenTechnology.',
  primaryColor: '#0f172a',
};

export const defaultSignatorySettings: SignatorySettings = {
  signatoryName: 'Authorized Signatory',
  designation: 'Commercial Operations & Governance',
  signatureImageUrl: '',
  showSignature: true,
};

export const defaultTermsList: TermItem[] = [
  {
    id: 'term_1',
    title: 'Payment Terms',
    content: '50% advance with formal Purchase Order (PO); 50% upon milestone completion and deployment sign-off.',
    category: 'Commercial',
    isActive: true,
    order: 1,
  },
  {
    id: 'term_2',
    title: 'Validity of Quotation',
    content: 'This commercial proposal remains valid for 30 days from the date of issuance.',
    category: 'Commercial',
    isActive: true,
    order: 2,
  },
  {
    id: 'term_3',
    title: 'Statutory Taxes & Levies',
    content: 'GST and applicable central/state statutory duties are extra as per prevailing government norms.',
    category: 'Taxes',
    isActive: true,
    order: 3,
  },
  {
    id: 'term_4',
    title: 'Delivery & Turnaround Schedule',
    content: 'Standard delivery timeframe is 2-3 weeks from confirmed PO and receipt of advance.',
    category: 'Delivery',
    isActive: true,
    order: 4,
  },
  {
    id: 'term_5',
    title: 'Warranty & Support SLA',
    content: '12 months comprehensive enterprise warranty with 4-hour SLA response for critical production incidents.',
    category: 'Support',
    isActive: true,
    order: 5,
  },
  {
    id: 'term_6',
    title: 'Cancellation & Returns Policy',
    content: 'Customized hardware and bespoke engineering services are non-cancellable once procurement commences.',
    category: 'Cancellation',
    isActive: true,
    order: 6,
  },
];

export const defaultProposalNumberingSettings: ProposalNumberingSettings = {
  prefix: 'PROP',
  yearFormat: 'YYYY',
  sequenceDigits: 4,
  startingSequence: 1,
};

// Mask sensitive bank account number (Section 7)
export function maskAccountNumber(acc?: string): string {
  if (!acc) return '';
  const clean = acc.trim();
  if (clean.length <= 4) return clean;
  return `•••• •••• ${clean.slice(-4)}`;
}

// Utility function to recursively strip undefined values so Firestore never errors
export function cleanDataForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanDataForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = cleanDataForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

const CrmDataContext = createContext<CrmDataContextType | undefined>(undefined);

export const CrmDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [followups, setFollowups] = useState<FollowUpRecord[]>([]);
  const [stsRecords, setStsRecords] = useState<STSRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productPriceHistories, setProductPriceHistories] = useState<PriceHistoryRecord[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicePriceHistories, setServicePriceHistories] = useState<PriceHistoryRecord[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppRecord[]>([]);
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [bankSettings, setBankSettings] = useState<BankSettings>(defaultBankSettings);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(defaultBrandingSettings);
  const [proposalTemplateSettings, setProposalTemplateSettings] = useState<ProposalTemplateSettings>(defaultProposalTemplateSettings);
  const [signatorySettings, setSignatorySettings] = useState<SignatorySettings>(defaultSignatorySettings);
  const [termsList, setTermsList] = useState<TermItem[]>(defaultTermsList);
  const [proposalNumberingSettings, setProposalNumberingSettings] = useState<ProposalNumberingSettings>(defaultProposalNumberingSettings);
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [customerAdvances, setCustomerAdvances] = useState<CustomerAdvance[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [financeSettings, setFinanceSettings] = useState<FinanceSettings>(defaultFinanceSettings);
  const [financeAuditLogs, setFinanceAuditLogs] = useState<FinanceAuditLog[]>([]);

  // Phase 19 State: Expenses, Debit Notes, Vendors, Bank Transactions, Reconciliations, Reminders
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransactionRecord[]>([]);
  const [bankReconciliations, setBankReconciliations] = useState<BankReconciliationRecord[]>([]);
  const [paymentReminders, setPaymentReminders] = useState<PaymentReminderRecord[]>([]);

  // Phase 13 State
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkRecord[]>([]);
  const [onlinePayments, setOnlinePayments] = useState<OnlinePaymentRecord[]>([]);
  const [reconciliationRecords, setReconciliationRecords] = useState<ReconciliationRecord[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentGatewayPublicConfig>(defaultPaymentConfig);

  // Phase 16 State
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [customerSpecificPricings, setCustomerSpecificPricings] = useState<CustomerSpecificPrice[]>([]);
  const [productSettings, setProductSettings] = useState<ProductSettings>(defaultProductSettings);

  // Phase 17 State
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>([]);
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>([]);
  const [designationRecords, setDesignationRecords] = useState<DesignationRecord[]>([]);
  const [roleRecords, setRoleRecords] = useState<RoleRecord[]>([]);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [leaveTypeRecords, setLeaveTypeRecords] = useState<LeaveTypeRecord[]>([]);
  const [holidayRecords, setHolidayRecords] = useState<HolidayRecord[]>([]);
  const [employeeActivityRecords, setEmployeeActivityRecords] = useState<EmployeeActivityRecord[]>([]);
  const [loginHistoryRecords, setLoginHistoryRecords] = useState<LoginHistoryRecord[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);

  // Phase 18 State
  const [salesSources, setSalesSources] = useState<SalesSourceRecord[]>(DEFAULT_SALES_SOURCES);
  const [salesStatuses, setSalesStatuses] = useState<SalesStatusRecord[]>(DEFAULT_SALES_STATUSES);

  // Phase 20 State: Advanced Reporting, MIS, Analytics & Management Dashboard
  const [reportExports, setReportExports] = useState<ReportExportRecord[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReportRecord[]>([]);
  const [reportAuditLogs, setReportAuditLogs] = useState<ReportAuditLog[]>([]);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfiguration | null>(null);

  const [dataLoading, setDataLoading] = useState(true);

  // Set up real-time Firestore listeners only when authenticated
  useEffect(() => {
    if (!currentUser) {
      setCustomers([]);
      setLeads([]);
      setActivities([]);
      setCalls([]);
      setFollowups([]);
      setStsRecords([]);
      setSalesSources(DEFAULT_SALES_SOURCES);
      setSalesStatuses(DEFAULT_SALES_STATUSES);
      setProducts([]);
      setProductPriceHistories([]);
      setServices([]);
      setServicePriceHistories([]);
      setProposals([]);
      setEmployees([]);
      setMeetings([]);
      setWhatsappLogs([]);
      setEmailRecords([]);
      setEmailTemplates([]);
      setEmailSettings(defaultEmailSettings);
      setNotifications([]);
      setImportHistory([]);
      setInvoices([]);
      setPayments([]);
      setReceipts([]);
      setCustomerAdvances([]);
      setCreditNotes([]);
      setFinanceSettings(defaultFinanceSettings);
      setFinanceAuditLogs([]);
      setPaymentLinks([]);
      setOnlinePayments([]);
      setReconciliationRecords([]);
      setPaymentConfig(defaultPaymentConfig);
      setProductCategories([]);
      setInventoryMovements([]);
      setPurchases([]);
      setSuppliers([]);
      setCustomerSpecificPricings([]);
      setProductSettings(defaultProductSettings);
      setEmployeeRecords([]);
      setDepartmentRecords([]);
      setDesignationRecords([]);
      setRoleRecords([]);
      setTaskRecords([]);
      setAttendanceRecords([]);
      setLeaveRecords([]);
      setLeaveTypeRecords([]);
      setHolidayRecords([]);
      setEmployeeActivityRecords([]);
      setLoginHistoryRecords([]);
      setPayrollRecords([]);
      setDebitNotes([]);
      setExpenses([]);
      setExpenseCategories([]);
      setVendors([]);
      setBankTransactions([]);
      setBankReconciliations([]);
      setPaymentReminders([]);
      setReportExports([]);
      setScheduledReports([]);
      setReportAuditLogs([]);
      setDashboardConfig(null);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
        setCustomers(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'customers')
    );

    const unsubLeads = onSnapshot(
      collection(db, 'leads'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Lead));
        setLeads(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'leads')
    );

    const qActivities = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(150));
    const unsubActivities = onSnapshot(
      qActivities,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
        setActivities(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'activities')
    );

    const unsubCalls = onSnapshot(
      collection(db, 'calls'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CallRecord));
        setCalls(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'calls')
    );

    const unsubFollowups = onSnapshot(
      collection(db, 'followups'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FollowUpRecord));
        setFollowups(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'followups')
    );

    const unsubSts = onSnapshot(
      collection(db, 'sts'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as STSRecord));
        setStsRecords(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'sts')
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProductItem));
        setProducts(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'products')
    );

    const unsubProductPriceHistory = onSnapshot(
      collection(db, 'productPriceHistory'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PriceHistoryRecord));
        setProductPriceHistories(list.sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || '')));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'productPriceHistory')
    );

    const unsubServices = onSnapshot(
      collection(db, 'services'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceItem));
        setServices(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'services')
    );

    const unsubServicePriceHistory = onSnapshot(
      collection(db, 'servicePriceHistory'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PriceHistoryRecord));
        setServicePriceHistories(list.sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || '')));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'servicePriceHistory')
    );

    const unsubProposals = onSnapshot(
      collection(db, 'proposals'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProposalRecord));
        setProposals(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'proposals')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
        setEmployees(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const unsubCompanySettings = onSnapshot(
      doc(db, 'companySettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setCompanySettings(snapshot.data() as CompanySettings);
        } else {
          // initialize default
          setDoc(doc(db, 'companySettings', 'default'), defaultCompanySettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'companySettings/default')
    );

    const unsubBankSettings = onSnapshot(
      doc(db, 'bankSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setBankSettings(snapshot.data() as BankSettings);
        } else {
          // initialize default
          setDoc(doc(db, 'bankSettings', 'default'), defaultBankSettings).catch(console.error);
        }
        setDataLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'bankSettings/default')
    );

    const unsubBankAccounts = onSnapshot(
      collection(db, 'bankAccounts'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BankAccount));
        if (list.length === 0 && defaultBankSettings.accountNumber) {
          const initId = 'bnk_default_primary';
          const initAcc: BankAccount = {
            id: initId,
            bankAccountId: 'BNK-0001',
            accountHolderName: defaultBankSettings.accountHolderName,
            bankName: defaultBankSettings.bankName,
            accountNumber: defaultBankSettings.accountNumber,
            ifscCode: defaultBankSettings.ifscCode,
            branch: defaultBankSettings.branch,
            upiId: defaultBankSettings.upiId,
            isDefault: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'bankAccounts', initId), cleanDataForFirestore(initAcc)).catch(console.error);
        } else {
          setBankAccounts(list);
          const defaultAcc = list.find((b) => b.isDefault && b.status === 'active') || list.find((b) => b.status === 'active') || list[0];
          if (defaultAcc) {
            setBankSettings({
              id: defaultAcc.id,
              bankAccountId: defaultAcc.bankAccountId,
              accountHolderName: defaultAcc.accountHolderName,
              bankName: defaultAcc.bankName,
              accountNumber: defaultAcc.accountNumber,
              ifscCode: defaultAcc.ifscCode,
              branch: defaultAcc.branch,
              upiId: defaultAcc.upiId,
              isDefault: true,
              status: defaultAcc.status,
              updatedAt: defaultAcc.updatedAt,
            });
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bankAccounts')
    );

    const unsubBrandingSettings = onSnapshot(
      doc(db, 'brandingSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setBrandingSettings(snapshot.data() as BrandingSettings);
        } else {
          setDoc(doc(db, 'brandingSettings', 'default'), defaultBrandingSettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'brandingSettings/default')
    );

    const unsubTemplateSettings = onSnapshot(
      doc(db, 'proposalTemplateSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setProposalTemplateSettings(snapshot.data() as ProposalTemplateSettings);
        } else {
          setDoc(doc(db, 'proposalTemplateSettings', 'default'), defaultProposalTemplateSettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'proposalTemplateSettings/default')
    );

    const unsubSignatory = onSnapshot(
      doc(db, 'signatorySettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSignatorySettings(snapshot.data() as SignatorySettings);
        } else {
          setDoc(doc(db, 'signatorySettings', 'default'), defaultSignatorySettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'signatorySettings/default')
    );

    const unsubTerms = onSnapshot(
      collection(db, 'proposalTerms'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TermItem));
        if (list.length === 0) {
          defaultTermsList.forEach((t) => {
            setDoc(doc(db, 'proposalTerms', t.id), cleanDataForFirestore(t)).catch(console.error);
          });
        } else {
          setTermsList(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'proposalTerms')
    );

    const unsubNumbering = onSnapshot(
      doc(db, 'proposalNumberingSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setProposalNumberingSettings(snapshot.data() as ProposalNumberingSettings);
        } else {
          setDoc(doc(db, 'proposalNumberingSettings', 'default'), defaultProposalNumberingSettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'proposalNumberingSettings/default')
    );

    const unsubMeetings = onSnapshot(
      collection(db, 'meetings'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MeetingRecord));
        setMeetings(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'meetings')
    );

    const unsubWhatsApp = onSnapshot(
      collection(db, 'whatsappActivities'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WhatsAppRecord));
        setWhatsappLogs(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'whatsappActivities')
    );

    const unsubEmails = onSnapshot(
      collection(db, 'emails'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmailRecord));
        setEmailRecords(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'emails')
    );

    const unsubImportHistory = onSnapshot(
      collection(db, 'importHistory'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ImportHistoryRecord));
        list.sort((a, b) => new Date(b.createdAt || b.uploadedAt || 0).getTime() - new Date(a.createdAt || a.uploadedAt || 0).getTime());
        setImportHistory(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'importHistory')
    );

    const unsubEmailTemplates = onSnapshot(
      collection(db, 'emailTemplates'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmailTemplate));
        if (list.length === 0) {
          defaultEmailTemplates.forEach((t) => {
            setDoc(doc(db, 'emailTemplates', t.id), cleanDataForFirestore(t)).catch(console.error);
          });
        } else {
          setEmailTemplates(list);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'emailTemplates')
    );

    const unsubEmailSettings = onSnapshot(
      doc(db, 'emailSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setEmailSettings(snapshot.data() as EmailSettings);
        } else {
          setDoc(doc(db, 'emailSettings', 'default'), defaultEmailSettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'emailSettings/default')
    );

    const unsubNotifications = onSnapshot(
      collection(db, 'notifications'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setNotifications(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );

    const unsubFinanceSettings = onSnapshot(
      doc(db, 'financeSettings', 'general'),
      (snapshot) => {
        if (snapshot.exists()) {
          setFinanceSettings(snapshot.data() as FinanceSettings);
        } else {
          setDoc(doc(db, 'financeSettings', 'general'), defaultFinanceSettings).catch(console.error);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'financeSettings/general')
    );

    const unsubInvoices = onSnapshot(
      collection(db, 'invoices'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InvoiceRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setInvoices(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'invoices')
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPayments(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'payments')
    );

    const unsubReceipts = onSnapshot(
      collection(db, 'receipts'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentReceipt));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setReceipts(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'receipts')
    );

    const unsubAdvances = onSnapshot(
      collection(db, 'customerAdvances'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerAdvance));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setCustomerAdvances(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'customerAdvances')
    );

    const unsubCreditNotes = onSnapshot(
      collection(db, 'creditNotes'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CreditNote));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setCreditNotes(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'creditNotes')
    );

    const unsubAuditLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceAuditLog));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setFinanceAuditLogs(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs')
    );

    // Phase 13: Payment Gateway & Links Listeners
    fetch('/api/payment/config')
      .then((res) => res.json())
      .then((cfg) => setPaymentConfig(cfg))
      .catch(console.warn);

    fetch('/api/payment/links')
      .then((res) => res.json())
      .then((d) => {
        if (d.paymentLinks) setPaymentLinks(d.paymentLinks);
      })
      .catch(console.warn);

    fetch('/api/payment/online-payments')
      .then((res) => res.json())
      .then((d) => {
        if (d.onlinePayments) setOnlinePayments(d.onlinePayments);
      })
      .catch(console.warn);

    fetch('/api/payment/reconciliation')
      .then((res) => res.json())
      .then((d) => {
        if (d.reconciliationRecords) setReconciliationRecords(d.reconciliationRecords);
      })
      .catch(console.warn);

    const unsubPaymentLinks = onSnapshot(
      collection(db, 'paymentLinks'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentLinkRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (list.length > 0) {
          setPaymentLinks(list);
        }
      },
      (error) => console.warn('paymentLinks snapshot notice:', error)
    );

    const unsubOnlinePayments = onSnapshot(
      collection(db, 'onlinePayments'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as OnlinePaymentRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (list.length > 0) {
          setOnlinePayments(list);
        }
      },
      (error) => console.warn('onlinePayments snapshot notice:', error)
    );

    const unsubReconciliation = onSnapshot(
      collection(db, 'reconciliationRecords'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReconciliationRecord));
        list.sort((a, b) => new Date(b.lastCheckedAt || 0).getTime() - new Date(a.lastCheckedAt || 0).getTime());
        if (list.length > 0) {
          setReconciliationRecords(list);
        }
      },
      (error) => console.warn('reconciliationRecords snapshot notice:', error)
    );

    // Phase 16 Listeners
    const unsubProductCategories = onSnapshot(
      collection(db, 'productCategories'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCategory));
        setProductCategories(list);
      },
      (error) => console.warn('productCategories snapshot notice:', error)
    );

    const unsubInventoryMovements = onSnapshot(
      collection(db, 'inventoryMovements'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryMovement));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setInventoryMovements(list);
      },
      (error) => console.warn('inventoryMovements snapshot notice:', error)
    );

    const unsubPurchases = onSnapshot(
      collection(db, 'purchases'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPurchases(list);
      },
      (error) => console.warn('purchases snapshot notice:', error)
    );

    const unsubSuppliers = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SupplierRecord));
        setSuppliers(list);
      },
      (error) => console.warn('suppliers snapshot notice:', error)
    );

    const unsubCustomerSpecificPricing = onSnapshot(
      collection(db, 'customerSpecificPricing'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerSpecificPrice));
        setCustomerSpecificPricings(list);
      },
      (error) => console.warn('customerSpecificPricing snapshot notice:', error)
    );

    const unsubProductSettings = onSnapshot(
      doc(db, 'productSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setProductSettings(snapshot.data() as ProductSettings);
        } else {
          setDoc(doc(db, 'productSettings', 'default'), defaultProductSettings).catch(console.error);
        }
      },
      (error) => console.warn('productSettings snapshot notice:', error)
    );

    // Phase 17: HR, Employee Management, Attendance, Leave, Tasks & Payroll Listeners
    const unsubEmployees = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmployeeRecord));
        setEmployeeRecords(list);
      },
      (error) => console.warn('employees snapshot notice:', error)
    );

    const unsubDepartments = onSnapshot(
      collection(db, 'departments'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DepartmentRecord));
        if (list.length === 0 && isAdmin) {
          // seed default departments
          DEFAULT_DEPARTMENTS.forEach((dept) => {
            setDoc(doc(db, 'departments', dept.id), cleanDataForFirestore(dept)).catch(console.warn);
          });
        }
        setDepartmentRecords(list);
      },
      (error) => console.warn('departments snapshot notice:', error)
    );

    const unsubDesignations = onSnapshot(
      collection(db, 'designations'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DesignationRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_DESIGNATIONS.forEach((desig) => {
            setDoc(doc(db, 'designations', desig.id), cleanDataForFirestore(desig)).catch(console.warn);
          });
        }
        setDesignationRecords(list);
      },
      (error) => console.warn('designations snapshot notice:', error)
    );

    const unsubCustomRoles = onSnapshot(
      collection(db, 'customRoles'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RoleRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_ROLES.forEach((r) => {
            setDoc(doc(db, 'customRoles', r.id), cleanDataForFirestore(r)).catch(console.warn);
          });
        }
        setRoleRecords(list);
      },
      (error) => console.warn('customRoles snapshot notice:', error)
    );

    const unsubTasks = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setTaskRecords(list);
      },
      (error) => console.warn('tasks snapshot notice:', error)
    );

    const unsubAttendance = onSnapshot(
      collection(db, 'attendance'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.checkIn || '').localeCompare(a.checkIn || ''));
        setAttendanceRecords(list);
      },
      (error) => console.warn('attendance snapshot notice:', error)
    );

    const unsubLeaves = onSnapshot(
      collection(db, 'leaves'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LeaveRecord));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setLeaveRecords(list);
      },
      (error) => console.warn('leaves snapshot notice:', error)
    );

    const unsubLeaveTypes = onSnapshot(
      collection(db, 'leaveTypes'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LeaveTypeRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_LEAVE_TYPES.forEach((lt) => {
            setDoc(doc(db, 'leaveTypes', lt.id), cleanDataForFirestore(lt)).catch(console.warn);
          });
        }
        setLeaveTypeRecords(list);
      },
      (error) => console.warn('leaveTypes snapshot notice:', error)
    );

    const unsubHolidays = onSnapshot(
      collection(db, 'holidays'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HolidayRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_HOLIDAYS_2026.forEach((h) => {
            setDoc(doc(db, 'holidays', h.id), cleanDataForFirestore(h)).catch(console.warn);
          });
        }
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setHolidayRecords(list);
      },
      (error) => console.warn('holidays snapshot notice:', error)
    );

    const unsubEmployeeActivities = onSnapshot(
      query(collection(db, 'employeeActivities'), orderBy('timestamp', 'desc'), limit(200)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmployeeActivityRecord));
        setEmployeeActivityRecords(list);
      },
      (error) => console.warn('employeeActivities snapshot notice:', error)
    );

    const unsubLoginHistory = onSnapshot(
      query(collection(db, 'loginHistory'), orderBy('loginTime', 'desc'), limit(150)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LoginHistoryRecord));
        setLoginHistoryRecords(list);
      },
      (error) => console.warn('loginHistory snapshot notice:', error)
    );

    const unsubPayrolls = onSnapshot(
      collection(db, 'payrolls'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PayrollRecord));
        list.sort((a, b) => (b.monthYear || '').localeCompare(a.monthYear || ''));
        setPayrollRecords(list);
      },
      (error) => console.warn('payrolls snapshot notice:', error)
    );

    // Phase 18 Listeners
    const unsubSalesSources = onSnapshot(
      collection(db, 'salesSources'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SalesSourceRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_SALES_SOURCES.forEach((s) => {
            setDoc(doc(db, 'salesSources', s.id), cleanDataForFirestore(s)).catch(console.warn);
          });
          setSalesSources(DEFAULT_SALES_SOURCES);
        } else if (list.length > 0) {
          setSalesSources(list);
        }
      },
      (error) => console.warn('salesSources snapshot notice:', error)
    );

    const unsubSalesStatuses = onSnapshot(
      collection(db, 'salesStatuses'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SalesStatusRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_SALES_STATUSES.forEach((s) => {
            setDoc(doc(db, 'salesStatuses', s.id), cleanDataForFirestore(s)).catch(console.warn);
          });
          setSalesStatuses(DEFAULT_SALES_STATUSES);
        } else if (list.length > 0) {
          list.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
          setSalesStatuses(list);
        }
      },
      (error) => console.warn('salesStatuses snapshot notice:', error)
    );

    // Phase 19 Snapshot Listeners
    const unsubDebitNotes = onSnapshot(
      collection(db, 'debitNotes'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DebitNote));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setDebitNotes(list);
      },
      (error) => console.warn('debitNotes snapshot notice:', error)
    );

    const unsubExpenses = onSnapshot(
      collection(db, 'expenses'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseRecord));
        list.sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || '') || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setExpenses(list);
      },
      (error) => console.warn('expenses snapshot notice:', error)
    );

    const unsubExpenseCategories = onSnapshot(
      collection(db, 'expenseCategories'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseCategoryRecord));
        if (list.length === 0 && isAdmin) {
          DEFAULT_EXPENSE_CATEGORIES.forEach((catName, idx) => {
            const catId = `cat_${idx + 1}`;
            setDoc(doc(db, 'expenseCategories', catId), {
              id: catId,
              name: catName,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }).catch(console.warn);
          });
        }
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setExpenseCategories(list);
      },
      (error) => console.warn('expenseCategories snapshot notice:', error)
    );

    const unsubVendors = onSnapshot(
      collection(db, 'vendors'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as VendorRecord));
        list.sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''));
        setVendors(list);
      },
      (error) => console.warn('vendors snapshot notice:', error)
    );

    const unsubBankTransactions = onSnapshot(
      collection(db, 'bankTransactions'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BankTransactionRecord));
        list.sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || '') || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setBankTransactions(list);
      },
      (error) => console.warn('bankTransactions snapshot notice:', error)
    );

    const unsubBankReconciliations = onSnapshot(
      collection(db, 'bankReconciliations'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BankReconciliationRecord));
        setBankReconciliations(list);
      },
      (error) => console.warn('bankReconciliations snapshot notice:', error)
    );

    const unsubPaymentReminders = onSnapshot(
      collection(db, 'paymentReminders'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentReminderRecord));
        list.sort((a, b) => (b.scheduledAt || '').localeCompare(a.scheduledAt || ''));
        setPaymentReminders(list);
      },
      (error) => console.warn('paymentReminders snapshot notice:', error)
    );

    // Phase 20: Reporting, MIS, Analytics & Dashboard Listeners
    const unsubReportExports = onSnapshot(
      collection(db, 'reportExports'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReportExportRecord));
        list.sort((a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime());
        setReportExports(list);
      },
      (error) => console.warn('reportExports snapshot notice:', error)
    );

    const unsubScheduledReports = onSnapshot(
      collection(db, 'scheduledReports'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduledReportRecord));
        list.sort((a, b) => (a.reportName || '').localeCompare(b.reportName || ''));
        setScheduledReports(list);
      },
      (error) => console.warn('scheduledReports snapshot notice:', error)
    );

    const unsubReportAuditLogs = onSnapshot(
      query(collection(db, 'reportAuditLogs'), orderBy('timestamp', 'desc'), limit(250)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReportAuditLog));
        setReportAuditLogs(list);
      },
      (error) => console.warn('reportAuditLogs snapshot notice:', error)
    );

    const unsubDashboardConfig = onSnapshot(
      doc(db, 'dashboardConfigurations', userProfile?.uid || 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setDashboardConfig(snapshot.data() as DashboardConfiguration);
        }
      },
      (error) => console.warn('dashboardConfigurations snapshot notice:', error)
    );

    return () => {
      unsubCustomers();
      unsubLeads();
      unsubActivities();
      unsubCalls();
      unsubFollowups();
      unsubSts();
      unsubProducts();
      unsubProductPriceHistory();
      unsubServices();
      unsubServicePriceHistory();
      unsubProposals();
      unsubUsers();
      unsubCompanySettings();
      unsubBankSettings();
      unsubBankAccounts();
      unsubBrandingSettings();
      unsubTemplateSettings();
      unsubSignatory();
      unsubTerms();
      unsubNumbering();
      unsubMeetings();
      unsubWhatsApp();
      unsubEmails();
      unsubImportHistory();
      unsubEmailTemplates();
      unsubEmailSettings();
      unsubNotifications();
      unsubFinanceSettings();
      unsubInvoices();
      unsubPayments();
      unsubReceipts();
      unsubAdvances();
      unsubCreditNotes();
      unsubAuditLogs();
      unsubPaymentLinks();
      unsubOnlinePayments();
      unsubReconciliation();
      unsubProductCategories();
      unsubInventoryMovements();
      unsubPurchases();
      unsubSuppliers();
      unsubCustomerSpecificPricing();
      unsubProductSettings();
      unsubEmployees();
      unsubDepartments();
      unsubDesignations();
      unsubCustomRoles();
      unsubTasks();
      unsubAttendance();
      unsubLeaves();
      unsubLeaveTypes();
      unsubHolidays();
      unsubEmployeeActivities();
      unsubLoginHistory();
      unsubPayrolls();
      unsubSalesSources();
      unsubSalesStatuses();
      unsubDebitNotes();
      unsubExpenses();
      unsubExpenseCategories();
      unsubVendors();
      unsubBankTransactions();
      unsubBankReconciliations();
      unsubPaymentReminders();
      unsubReportExports();
      unsubScheduledReports();
      unsubReportAuditLogs();
      unsubDashboardConfig();
    };
  }, [currentUser]);

  // Log activity helper
  const logActivity = async (
    type: ActivityType,
    title: string,
    description: string,
    customerId?: string,
    leadId?: string,
    stsId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!currentUser || !userProfile) return;
    const actId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newAct: any = {
      id: actId,
      activityId: actId,
      userId: userProfile.uid,
      userName: userProfile.name,
      userRole: userProfile.role,
      type,
      title,
      description,
      createdAt: nowIso,
      timestamp: nowIso,
    };
    if (customerId) newAct.customerId = customerId;
    if (leadId) newAct.leadId = leadId;
    if (stsId) newAct.stsId = stsId;
    if (metadata) newAct.metadata = cleanDataForFirestore(metadata);

    try {
      await setDoc(doc(db, 'activities', actId), cleanDataForFirestore(newAct));
    } catch (err) {
      console.warn('Activity logging failed (non-blocking):', err);
    }
  };

  // Generate next unique Customer ID: CUST-YYYY-XXXX
  const generateNextCustomerId = (): string => {
    const year = new Date().getFullYear();
    const prefix = `CUST-${year}-`;
    const nums = customers
      .map((c) => c.customerId)
      .filter((id) => id && id.startsWith(prefix))
      .map((id) => parseInt(id.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  };

  // Generate next unique Lead ID: LEAD-YYYY-XXXX
  const generateNextLeadId = (): string => {
    const year = new Date().getFullYear();
    const prefix = `LEAD-${year}-`;
    const nums = leads
      .map((l) => l.leadId)
      .filter((id) => id && id.startsWith(prefix))
      .map((id) => parseInt(id.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  };

  // Customers
  const addCustomer = async (
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
  ): Promise<string> => {
    let custId = data.customerId?.trim();
    if (!custId) {
      custId = generateNextCustomerId();
    }

    // Duplicate check
    const isDup = customers.some((c) => c.customerId.toLowerCase() === custId.toLowerCase());
    if (isDup) {
      throw new Error(`Customer ID "${custId}" already exists. Please specify a unique ID.`);
    }

    const id = `cust_${Date.now()}`;
    const newCustomer: Customer = {
      ...data,
      id,
      customerId: custId,
      alternateMobile: data.alternateMobile || data.alternateNumber || '',
      alternateNumber: data.alternateNumber || data.alternateMobile || '',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userProfile?.name || userProfile?.email || 'User',
      updatedBy: userProfile?.name || userProfile?.email || 'User',
    };

    try {
      await setDoc(doc(db, 'customers', id), cleanDataForFirestore(newCustomer));
      await logActivity(
        'customer_created',
        'Customer Created',
        `${userProfile?.name || 'User'} created customer "${data.companyName}" (${custId})`,
        id
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `customers/${id}`);
      throw err;
    }
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    const existing = customers.find((c) => c.id === id);
    const targetDoc = doc(db, 'customers', id);
    const updatePayload = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile?.name || userProfile?.email || 'User',
    };

    // Ensure createdAt and createdBy are never overwritten
    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).createdBy;

    try {
      await updateDoc(targetDoc, cleanDataForFirestore(updatePayload));

      if (data.assignedEmployeeId && existing && data.assignedEmployeeId !== existing.assignedEmployeeId) {
        await logActivity(
          'customer_assigned',
          'Customer Reassigned',
          `Customer "${data.companyName || existing.companyName}" assigned to ${data.assignedEmployeeName || 'team member'} by ${userProfile?.name}`,
          id
        );
      } else if (data.status && existing && data.status !== existing.status) {
        await logActivity(
          'status_changed',
          'Customer Status Changed',
          `Status changed from "${existing.status}" to "${data.status}" for "${data.companyName || existing.companyName}"`,
          id
        );
      } else {
        await logActivity(
          'customer_updated',
          'Customer Updated',
          `${userProfile?.name || 'User'} updated details for "${data.companyName || existing?.companyName || id}"`,
          id
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
      throw err;
    }
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    const existing = customers.find((c) => c.id === id);
    try {
      await deleteDoc(doc(db, 'customers', id));
      await logActivity('customer_updated', 'Customer Deleted', `Customer "${existing?.companyName || id}" permanently removed by ${userProfile?.name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
      throw err;
    }
  };

  const archiveCustomer = async (id: string): Promise<void> => {
    const existing = customers.find((c) => c.id === id);
    const targetDoc = doc(db, 'customers', id);
    try {
      await updateDoc(targetDoc, {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: userProfile?.name || userProfile?.email || 'User',
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || userProfile?.email || 'User',
      });
      await logActivity(
        'customer_updated',
        'Customer Archived',
        `Customer "${existing?.companyName || id}" archived by ${userProfile?.name}`,
        id
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
      throw err;
    }
  };

  const restoreCustomer = async (id: string): Promise<void> => {
    const existing = customers.find((c) => c.id === id);
    const targetDoc = doc(db, 'customers', id);
    try {
      await updateDoc(targetDoc, {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || userProfile?.email || 'User',
      });
      await logActivity(
        'customer_updated',
        'Customer Restored',
        `Customer "${existing?.companyName || id}" restored from archive by ${userProfile?.name}`,
        id
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
      throw err;
    }
  };

  // Leads
  const addLead = async (
    data: Omit<Lead, 'id' | 'leadId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & { leadId?: string }
  ): Promise<string> => {
    let leadId = data.leadNumber?.trim() || data.leadId?.trim();
    if (!leadId) {
      leadId = generateUniqueLeadNumber(leads);
    }

    const isDup = leads.some((l) => l.leadId.toLowerCase() === leadId.toLowerCase());
    if (isDup) {
      throw new Error(`Lead ID "${leadId}" already exists. Please specify a unique ID.`);
    }

    const id = `lead_${Date.now()}`;
    const newLead: Lead = {
      ...data,
      id,
      leadId,
      leadNumber: leadId,
      phone: data.phone || data.mobile || '',
      mobile: data.mobile || data.phone || '',
      alternatePhone: data.alternatePhone || data.alternateMobile || data.alternateNumber || '',
      alternateMobile: data.alternatePhone || data.alternateMobile || data.alternateNumber || '',
      alternateNumber: data.alternatePhone || data.alternateMobile || data.alternateNumber || '',
      source: data.source || data.leadSource || 'Website',
      leadSource: data.source || data.leadSource || 'Website',
      priority: data.priority || 'Medium',
      isConverted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userProfile?.name || userProfile?.email || 'User',
      updatedBy: userProfile?.name || userProfile?.email || 'User',
    };

    try {
      await setDoc(doc(db, 'leads', id), cleanDataForFirestore(newLead));
      await logActivity(
        'lead_created',
        'Lead Created',
        `${userProfile?.name || 'User'} created lead "${data.companyName}" (${leadId})`,
        undefined,
        id
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `leads/${id}`);
      throw err;
    }
  };

  const updateLead = async (id: string, data: Partial<Lead>): Promise<void> => {
    const existing = leads.find((l) => l.id === id);
    const targetDoc = doc(db, 'leads', id);
    const updatePayload = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile?.name || userProfile?.email || 'User',
    };

    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).createdBy;

    try {
      await updateDoc(targetDoc, cleanDataForFirestore(updatePayload));

      if (data.assignedEmployeeId && existing && data.assignedEmployeeId !== existing.assignedEmployeeId) {
        await logActivity(
          'lead_assigned',
          'Lead Reassigned',
          `Lead "${data.companyName || existing.companyName}" assigned to ${data.assignedEmployeeName || 'team member'} by ${userProfile?.name}`,
          undefined,
          id
        );
      } else if (data.status && existing && data.status !== existing.status) {
        await logActivity(
          'LEAD_STATUS_CHANGED',
          'Lead Status Changed',
          `Status changed from "${existing.status}" to "${data.status}" for "${data.companyName || existing.companyName}"`,
          existing.convertedCustomerId,
          id,
          undefined,
          {
            oldStatus: existing.status,
            newStatus: data.status,
            changedBy: userProfile?.name || userProfile?.email || 'User',
            changedAt: new Date().toISOString(),
          }
        );
      } else {
        await logActivity(
          'customer_updated',
          'Lead Updated',
          `${userProfile?.name || 'User'} updated lead "${data.companyName || existing?.companyName || id}"`,
          undefined,
          id
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${id}`);
      throw err;
    }
  };

  const archiveLead = async (id: string): Promise<void> => {
    const existing = leads.find((l) => l.id === id);
    const targetDoc = doc(db, 'leads', id);
    try {
      await updateDoc(targetDoc, {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: userProfile?.name || userProfile?.email || 'User',
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || userProfile?.email || 'User',
      });
      await logActivity(
        'customer_updated',
        'Lead Archived',
        `Lead "${existing?.companyName || id}" archived by ${userProfile?.name}`,
        undefined,
        id
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${id}`);
      throw err;
    }
  };

  const restoreLead = async (id: string): Promise<void> => {
    const existing = leads.find((l) => l.id === id);
    const targetDoc = doc(db, 'leads', id);
    try {
      await updateDoc(targetDoc, {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || userProfile?.email || 'User',
      });
      await logActivity(
        'customer_updated',
        'Lead Restored',
        `Lead "${existing?.companyName || id}" restored from archive by ${userProfile?.name}`,
        undefined,
        id
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${id}`);
      throw err;
    }
  };

  // Convert Lead to Customer preserving complete timeline and references
  const convertLeadToCustomer = async (leadId: string): Promise<string> => {
    const lead = leads.find((l) => l.id === leadId || l.leadId === leadId);
    if (!lead) throw new Error('Lead record not found');
    if (lead.isConverted || lead.convertedCustomerId) {
      throw new Error(`This lead has already been converted to Customer (${lead.convertedCustomerId || 'Customer Record'}).`);
    }

    const customerId = generateNextCustomerId();
    const newCustId = `cust_${Date.now()}`;
    const newCustomer: Customer = {
      id: newCustId,
      customerId,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      mobile: lead.mobile,
      alternateMobile: lead.alternateMobile || lead.alternateNumber || '',
      alternateNumber: lead.alternateNumber || lead.alternateMobile || '',
      email: lead.email || '',
      gstNumber: lead.gstNumber || '',
      address: lead.address || '',
      city: lead.city || '',
      state: lead.state || '',
      pincode: lead.pincode || '',
      leadSource: lead.leadSource ? `Converted Lead (${lead.leadSource})` : 'Converted Lead',
      assignedEmployeeId: lead.assignedEmployeeId || '',
      assignedEmployeeName: lead.assignedEmployeeName || '',
      status: 'Won' as CustomerStatus,
      nextFollowupDate: lead.nextFollowupDate || '',
      nextFollowupTime: lead.nextFollowupTime || '',
      nextFollowUp: lead.nextFollowUp || '',
      notes: `Converted from Lead ${lead.leadId}. ${lead.notes ? `Original Lead Notes: ${lead.notes}` : ''}`,
      convertedFromLeadId: lead.id,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userProfile?.name || userProfile?.email || 'User',
      updatedBy: userProfile?.name || userProfile?.email || 'User',
    };

    try {
      await setDoc(doc(db, 'customers', newCustId), cleanDataForFirestore(newCustomer));
      await updateDoc(doc(db, 'leads', lead.id), cleanDataForFirestore({
        isConverted: true,
        convertedCustomerId: customerId,
        conversionDate: new Date().toISOString(),
        status: 'Won',
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || userProfile?.email || 'User',
      }));
      await logActivity(
        'lead_converted',
        'Lead Converted to Customer',
        `Lead "${lead.companyName}" (${lead.leadId}) successfully converted to Customer "${customerId}" by ${userProfile?.name}`,
        newCustId,
        lead.id
      );
      return newCustId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customers/${newCustId}`);
      throw err;
    }
  };

  // Calls
  const logCall = async (data: Omit<CallRecord, 'id' | 'callId' | 'createdAt'>): Promise<string> => {
    const year = new Date().getFullYear();
    const callId = `CALL-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `call_${Date.now()}`;
    const newCall: CallRecord = {
      ...data,
      id,
      callId,
      direction: data.direction || 'outgoing',
      actualDuration: data.actualDuration ?? null,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'calls', id), cleanDataForFirestore(newCall));
      await logActivity(
        'CALL_UPDATED',
        'Call Logged',
        `${data.employeeName} logged call with ${data.contactPerson} (${data.companyName}) - Status: ${data.status}. Discussion: ${data.notes || 'N/A'}`,
        data.customerId,
        data.leadId
      );

      // If follow-up date is provided, also schedule a follow-up automatically
      if (data.followUpDate || data.nextFollowupDate) {
        const fupDate = data.nextFollowupDate || data.followUpDate;
        if (fupDate) {
          await addFollowUp({
            customerId: data.customerId,
            leadId: data.leadId,
            companyName: data.companyName,
            contactPerson: data.contactPerson,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            date: fupDate,
            time: data.nextFollowupTime || '11:00',
            reason: `Call Follow-up (${data.status})`,
            notes: data.notes,
            status: 'Upcoming',
          });
        }
      }
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `calls/${id}`);
      throw err;
    }
  };

  const initiateCall = async (params: {
    customerId?: string;
    leadId?: string;
    stsId?: string;
    companyName: string;
    contactPerson: string;
    mobile: string;
  }): Promise<CallRecord> => {
    if (!userProfile) throw new Error('User must be logged in to place calls');
    const year = new Date().getFullYear();
    const callId = `CALL-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `call_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newCall: CallRecord = {
      id,
      callId,
      customerId: params.customerId,
      leadId: params.leadId,
      companyName: params.companyName,
      contactPerson: params.contactPerson,
      mobile: params.mobile,
      phoneNumber: params.mobile,
      employeeId: userProfile.uid,
      employeeName: userProfile.name,
      initiatedAt: nowIso,
      dateTime: nowIso,
      status: 'initiated',
      direction: 'outgoing',
      actualDuration: null,
      createdAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'calls', id), cleanDataForFirestore(newCall));
      await logActivity(
        'CALL_INITIATED',
        'Call Initiated',
        `${userProfile.name} launched dialer to call ${params.contactPerson} (${params.companyName}) at ${params.mobile}`,
        params.customerId,
        params.leadId,
        undefined,
        { callId, initiatedAt: nowIso, phoneNumber: params.mobile }
      );

      // Trigger tel: protocol on supported client device
      const cleanNumber = params.mobile.replace(/[^\d+]/g, '');
      if (cleanNumber) {
        window.location.href = `tel:${cleanNumber}`;
      }

      return newCall;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `calls/${id}`);
      throw err;
    }
  };

  const updateCallOutcome = async (
    callDocId: string,
    data: {
      status: CallStatus;
      notes: string;
      outcome?: string;
      nextFollowupDate?: string;
      nextFollowupTime?: string;
      actualDuration?: number | null;
    }
  ): Promise<void> => {
    const existing = calls.find((c) => c.id === callDocId);
    const nowIso = new Date().toISOString();
    const payload: Partial<CallRecord> = {
      status: data.status,
      notes: data.notes,
      outcome: data.outcome || data.status,
      endedAt: nowIso,
      actualDuration: data.actualDuration !== undefined ? data.actualDuration : (existing?.actualDuration ?? null),
    };
    if (data.nextFollowupDate) {
      payload.nextFollowupDate = data.nextFollowupDate;
      payload.nextFollowupTime = data.nextFollowupTime || '11:00';
      payload.followUpDate = data.nextFollowupDate;
    }

    try {
      await updateDoc(doc(db, 'calls', callDocId), cleanDataForFirestore(payload));
      await logActivity(
        'CALL_UPDATED',
        'Call Outcome Recorded',
        `${userProfile?.name || 'Executive'} recorded outcome "${data.status}" for call to ${existing?.contactPerson || 'Client'}. Discussion: ${data.notes || 'N/A'}`,
        existing?.customerId,
        existing?.leadId,
        undefined,
        { callId: existing?.callId, status: data.status, outcome: data.outcome || data.status }
      );

      // If next follow-up date is provided, create linked follow-up automatically
      if (data.nextFollowupDate && existing) {
        await addFollowUp({
          customerId: existing.customerId,
          leadId: existing.leadId,
          companyName: existing.companyName,
          contactPerson: existing.contactPerson,
          employeeId: existing.employeeId,
          employeeName: existing.employeeName,
          date: data.nextFollowupDate,
          time: data.nextFollowupTime || '11:00',
          reason: `Call Follow-up: ${data.outcome || data.status}`,
          notes: data.notes,
          status: 'Upcoming',
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calls/${callDocId}`);
      throw err;
    }
  };

  // Follow-ups
  const addFollowUp = async (
    data: Omit<FollowUpRecord, 'id' | 'followupId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const followupId = `FUP-${Date.now().toString().slice(-6)}`;
    const id = `fup_${Date.now()}`;
    const newFollowUp: FollowUpRecord = {
      ...data,
      id,
      followupId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'followups', id), cleanDataForFirestore(newFollowUp));
      await logActivity(
        'FOLLOWUP_CREATED',
        'Follow-up Scheduled',
        `Follow-up scheduled for ${data.date} at ${data.time} with ${data.contactPerson} (${data.companyName}). Reason: ${data.reason}`,
        data.customerId,
        data.leadId
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `followups/${id}`);
      throw err;
    }
  };

  const updateFollowUpStatus = async (
    id: string,
    status: FollowUpRecord['status'],
    notes?: string
  ): Promise<void> => {
    try {
      const nowIso = new Date().toISOString();
      const payload: any = {
        status,
        updatedAt: nowIso,
      };
      if (status === 'Completed') {
        payload.completedAt = nowIso;
      }
      if (notes) payload.notes = notes;
      await updateDoc(doc(db, 'followups', id), cleanDataForFirestore(payload));
      await logActivity(
        status === 'Completed' ? 'FOLLOWUP_COMPLETED' : 'followup_completed',
        'Follow-up Status Updated',
        `Follow-up marked as ${status}${notes ? ` (${notes})` : ''}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `followups/${id}`);
      throw err;
    }
  };

  const completeFollowUp = async (id: string, notes?: string): Promise<void> => {
    const existing = followups.find((f) => f.id === id);
    const nowIso = new Date().toISOString();
    try {
      const payload: Partial<FollowUpRecord> = {
        status: 'Completed',
        completedAt: nowIso,
        updatedAt: nowIso,
      };
      if (notes) payload.notes = existing?.notes ? `${existing.notes} | ${notes}` : notes;
      await updateDoc(doc(db, 'followups', id), cleanDataForFirestore(payload));
      await logActivity(
        'FOLLOWUP_COMPLETED',
        'Follow-up Completed',
        `${userProfile?.name} marked follow-up completed for ${existing?.contactPerson || 'Client'} (${existing?.companyName || 'Account'})`,
        existing?.customerId,
        existing?.leadId
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `followups/${id}`);
      throw err;
    }
  };

  const rescheduleFollowUp = async (
    id: string,
    newDate: string,
    newTime: string,
    reason?: string,
    notes?: string
  ): Promise<void> => {
    const existing = followups.find((f) => f.id === id);
    const nowIso = new Date().toISOString();
    try {
      const payload: Partial<FollowUpRecord> = {
        date: newDate,
        time: newTime,
        status: 'Upcoming',
        updatedAt: nowIso,
      };
      if (reason) payload.reason = reason;
      if (notes) payload.notes = notes;
      await updateDoc(doc(db, 'followups', id), cleanDataForFirestore(payload));
      await logActivity(
        'FOLLOWUP_RESCHEDULED',
        'Follow-up Rescheduled',
        `${userProfile?.name} rescheduled follow-up for ${existing?.contactPerson || 'Client'} (${existing?.companyName || 'Account'}) from ${existing?.date || 'previous date'} to ${newDate} at ${newTime}`,
        existing?.customerId,
        existing?.leadId
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `followups/${id}`);
      throw err;
    }
  };

  const cancelFollowUp = async (id: string, notes?: string): Promise<void> => {
    const existing = followups.find((f) => f.id === id);
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'followups', id), cleanDataForFirestore({
        status: 'Cancelled',
        notes: notes || existing?.notes,
        updatedAt: nowIso,
      }));
      await logActivity(
        'followup_completed',
        'Follow-up Cancelled',
        `${userProfile?.name} cancelled follow-up with ${existing?.contactPerson || 'Client'} (${existing?.companyName || 'Account'})`,
        existing?.customerId,
        existing?.leadId
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `followups/${id}`);
      throw err;
    }
  };

  // STS
  const addSTS = async (
    data: Omit<STSRecord, 'id' | 'stsNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>
  ): Promise<string> => {
    const stsNumber = data.stsId?.trim() || generateUniqueSTSNumber(stsRecords);
    const id = `sts_${Date.now()}`;
    const newSTS: STSRecord = {
      ...data,
      id,
      stsId: stsNumber,
      stsNumber,
      customerName: data.customerName || data.companyName,
      phone: data.phone || '',
      email: data.email || '',
      source: data.source || 'Direct',
      amount: data.amount || data.estimatedValue || 0,
      estimatedValue: data.estimatedValue || data.amount || 0,
      createdBy: userProfile?.uid || 'system',
      createdByName: userProfile?.name || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile?.name || 'User',
    };

    try {
      await setDoc(doc(db, 'sts', id), cleanDataForFirestore(newSTS));
      await logActivity(
        'STS_CREATED',
        'New STS Created',
        `${userProfile?.name} created STS "${stsNumber}" for ${data.companyName} (Amount: ₹${data.amount.toLocaleString()}). Requirement: ${data.requirement}`,
        data.customerId,
        data.leadId,
        id
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sts/${id}`);
      throw err;
    }
  };

  const updateSTS = async (id: string, data: Partial<STSRecord>): Promise<void> => {
    const existing = stsRecords.find((s) => s.id === id);
    try {
      await updateDoc(doc(db, 'sts', id), cleanDataForFirestore({
        ...data,
        updatedAt: new Date().toISOString(),
      }));
      if (data.status && existing && data.status !== existing.status) {
        await logActivity(
          'STS_STATUS_CHANGED',
          'STS Status Updated',
          `${userProfile?.name} updated STS "${existing.stsNumber}" status to "${data.status}"`,
          existing.customerId,
          existing.leadId,
          id
        );
      } else {
        await logActivity(
          'STS_UPDATED',
          'STS Details Updated',
          `${userProfile?.name} updated STS record ${existing?.stsNumber || id}`,
          existing?.customerId,
          existing?.leadId,
          id
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sts/${id}`);
      throw err;
    }
  };

  // Products
  const addProduct = async (
    data: Omit<ProductItem, 'id' | 'productId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const year = new Date().getFullYear();
    const count = products.length + 1;
    const productId = `PROD-${year}-${String(count).padStart(4, '0')}`;
    const id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const code = (data.productCode || productId).trim().toUpperCase();

    // Check duplicate code
    if (products.some((p) => p.productCode.toUpperCase() === code)) {
      throw new Error(`Product Code / SKU "${code}" already exists in the catalog. Please specify a unique code.`);
    }

    const price = Number(data.basePrice !== undefined ? data.basePrice : data.price) || 0;
    const gstRate = Number(data.gstRate) || 0;
    const pName = (data.productName || data.name || '').trim();
    const status = data.status || (data.active !== false ? 'Active' : 'Inactive');
    const active = status === 'Active';

    const newProduct: ProductItem = {
      ...data,
      id,
      productId,
      productCode: code,
      productName: pName,
      name: pName,
      category: data.category || 'General Hardware',
      description: data.description || '',
      unit: data.unit || 'Unit',
      basePrice: price,
      price,
      gstRate,
      discountAllowed: data.discountAllowed ?? data.discountAvailable ?? true,
      discountAvailable: data.discountAllowed ?? data.discountAvailable ?? true,
      status,
      active,
      createdBy: userProfile?.uid,
      createdByName: userProfile?.name || 'Admin',
      createdAt: new Date().toISOString(),
      updatedBy: userProfile?.uid,
      updatedByName: userProfile?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'products', id), cleanDataForFirestore(newProduct));
      await logActivity(
        'product_created' as any,
        'Product Added',
        `${userProfile?.name} added product "${pName}" (${code}) with base price ₹${price.toLocaleString('en-IN')}`,
        undefined,
        undefined,
        id
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
      throw err;
    }
  };

  const updateProduct = async (
    id: string,
    data: Partial<ProductItem>,
    priceChangeReason?: string
  ): Promise<void> => {
    const existing = products.find((p) => p.id === id);
    if (!existing) throw new Error('Product not found');

    const newPrice = data.basePrice !== undefined ? Number(data.basePrice) : data.price !== undefined ? Number(data.price) : undefined;
    const oldPrice = existing.basePrice ?? existing.price;

    const newGst = data.gstRate !== undefined ? Number(data.gstRate) : undefined;
    const oldGst = existing.gstRate;

    // Price or GST change audit history
    if ((newPrice !== undefined && newPrice !== oldPrice) || (newGst !== undefined && newGst !== oldGst)) {
      const histId = `hist_prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const priceHistory: PriceHistoryRecord = {
        id: histId,
        itemType: 'product',
        itemId: id,
        itemCode: existing.productCode,
        itemName: existing.productName || existing.name,
        oldPrice: oldPrice,
        newPrice: newPrice !== undefined ? newPrice : oldPrice,
        oldGstRate: oldGst,
        newGstRate: newGst !== undefined ? newGst : oldGst,
        changedBy: userProfile?.name || 'Admin',
        changedByUid: userProfile?.uid || '',
        changedAt: new Date().toISOString(),
        reason: priceChangeReason || 'Master price updated by Admin',
      };

      try {
        await setDoc(doc(db, 'productPriceHistory', histId), cleanDataForFirestore(priceHistory));
        await logActivity(
          'product_price_updated' as any,
          'Product Price Updated',
          `${userProfile?.name} updated price of "${existing.name}" (${existing.productCode}) from ₹${oldPrice} to ₹${newPrice !== undefined ? newPrice : oldPrice}. Reason: ${priceHistory.reason}`,
          undefined,
          undefined,
          id
        );
      } catch (err) {
        console.warn('Failed to record price history:', err);
      }
    }

    const updates: any = {
      ...data,
      updatedBy: userProfile?.uid,
      updatedByName: userProfile?.name,
      updatedAt: new Date().toISOString(),
    };

    if (newPrice !== undefined) {
      updates.basePrice = newPrice;
      updates.price = newPrice;
    }
    if (data.productName || data.name) {
      updates.productName = data.productName || data.name;
      updates.name = data.productName || data.name;
    }
    if (data.status) {
      updates.status = data.status;
      updates.active = data.status === 'Active';
    } else if (data.active !== undefined) {
      updates.active = data.active;
      updates.status = data.active ? 'Active' : 'Inactive';
    }

    try {
      await updateDoc(doc(db, 'products', id), cleanDataForFirestore(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
      throw err;
    }
  };

  const toggleProductStatus = async (id: string): Promise<void> => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const newStatus = existing.active || existing.status === 'Active' ? 'Inactive' : 'Active';
    await updateProduct(id, { status: newStatus, active: newStatus === 'Active' });
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const existing = products.find((p) => p.id === id);
    // Check if used in any proposal, invoice, or purchase
    const isUsed =
      proposals.some((prop) =>
        prop.items?.some((it) => it.productId === id || it.itemId === id || (existing && it.code === existing.productCode))
      ) ||
      invoices.some((inv) =>
        inv.items?.some((it) => it.productId === id || it.itemId === id)
      ) ||
      purchases.some((po) =>
        po.items?.some((it) => it.productId === id)
      );

    if (isUsed) {
      await updateProduct(id, { status: 'Inactive', active: false });
      throw new Error(
        `Product "${existing?.name || id}" has already been used in historical proposals, invoices, or purchases and cannot be permanently deleted. Its status has been automatically switched to Inactive.`
      );
    }

    try {
      await deleteDoc(doc(db, 'products', id));
      await logActivity(
        'product_deleted' as any,
        'Product Deleted',
        `${userProfile?.name} deleted product "${existing?.name || id}" from catalog`,
        undefined,
        undefined,
        id
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      throw err;
    }
  };

  // Duplicate Product (Phase 16 Section 1)
  const duplicateProduct = async (productId: string): Promise<string> => {
    const original = products.find((p) => p.id === productId);
    if (!original) throw new Error('Product not found to duplicate');
    const newCode = await generateNextProductCode();
    const newName = `${original.productName || original.name} (Copy)`;
    const newId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const copyData: ProductItem = {
      ...original,
      id: newId,
      productId: newCode,
      productCode: newCode,
      productName: newName,
      name: newName,
      currentStock: 0,
      reservedStock: 0,
      availableStock: 0,
      status: 'Active',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userProfile?.uid,
      createdByName: userProfile?.name || 'Admin',
    };

    await setDoc(doc(db, 'products', newId), cleanDataForFirestore(copyData));
    await logActivity(
      'product_created' as any,
      'Product Duplicated',
      `${userProfile?.name} duplicated "${original.name}" as new product "${newName}" (${newCode})`,
      undefined,
      undefined,
      newId
    );
    return newId;
  };

  const archiveProduct = async (productId: string): Promise<void> => {
    await updateProduct(productId, { status: 'Archived', active: false });
    await logActivity(
      'PRODUCT_ARCHIVED' as any,
      'Product Archived',
      `${userProfile?.name} archived product ${productId}`,
      undefined,
      undefined,
      productId
    );
  };

  const reactivateProduct = async (productId: string): Promise<void> => {
    await updateProduct(productId, { status: 'Active', active: true });
  };

  // Services
  const addService = async (
    data: Omit<ServiceItem, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const year = new Date().getFullYear();
    const count = services.length + 1;
    const serviceId = `SERV-${year}-${String(count).padStart(4, '0')}`;
    const id = `srv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const code = (data.serviceCode || serviceId).trim().toUpperCase();

    // Check duplicate code
    if (services.some((s) => (s.serviceCode || s.serviceId || '').toUpperCase() === code)) {
      throw new Error(`Service Code "${code}" already exists in the catalog. Please specify a unique code.`);
    }

    const price = Number(data.basePrice !== undefined ? data.basePrice : data.price) || 0;
    const gstRate = Number(data.gstRate) || 0;
    const sName = (data.serviceName || data.name || '').trim();
    const status = data.status || (data.active !== false ? 'Active' : 'Inactive');
    const active = status === 'Active';

    const newService: ServiceItem = {
      ...data,
      id,
      serviceId,
      serviceCode: code,
      serviceName: sName,
      name: sName,
      category: data.category || 'Consulting & Implementation',
      description: data.description || '',
      basePrice: price,
      price,
      gstRate,
      duration: data.duration || 'Per Project',
      terms: data.terms || '',
      status,
      active,
      createdBy: userProfile?.uid,
      createdByName: userProfile?.name || 'Admin',
      createdAt: new Date().toISOString(),
      updatedBy: userProfile?.uid,
      updatedByName: userProfile?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'services', id), cleanDataForFirestore(newService));
      await logActivity(
        'service_created' as any,
        'Service Added',
        `${userProfile?.name} added service "${sName}" (${code}) with base price ₹${price.toLocaleString('en-IN')}`,
        undefined,
        undefined,
        id
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `services/${id}`);
      throw err;
    }
  };

  const updateService = async (
    id: string,
    data: Partial<ServiceItem>,
    priceChangeReason?: string
  ): Promise<void> => {
    const existing = services.find((s) => s.id === id);
    if (!existing) throw new Error('Service not found');

    const newPrice = data.basePrice !== undefined ? Number(data.basePrice) : data.price !== undefined ? Number(data.price) : undefined;
    const oldPrice = existing.basePrice ?? existing.price;

    const newGst = data.gstRate !== undefined ? Number(data.gstRate) : undefined;
    const oldGst = existing.gstRate;

    // Price or GST change audit history
    if ((newPrice !== undefined && newPrice !== oldPrice) || (newGst !== undefined && newGst !== oldGst)) {
      const histId = `hist_srv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const priceHistory: PriceHistoryRecord = {
        id: histId,
        itemType: 'service',
        itemId: id,
        itemCode: existing.serviceCode || existing.serviceId || existing.id,
        itemName: existing.serviceName || existing.name,
        oldPrice: oldPrice,
        newPrice: newPrice !== undefined ? newPrice : oldPrice,
        oldGstRate: oldGst,
        newGstRate: newGst !== undefined ? newGst : oldGst,
        changedBy: userProfile?.name || 'Admin',
        changedByUid: userProfile?.uid || '',
        changedAt: new Date().toISOString(),
        reason: priceChangeReason || 'Master service price updated by Admin',
      };

      try {
        await setDoc(doc(db, 'servicePriceHistory', histId), cleanDataForFirestore(priceHistory));
        await logActivity(
          'service_price_updated' as any,
          'Service Price Updated',
          `${userProfile?.name} updated price of service "${existing.name}" (${existing.serviceCode}) from ₹${oldPrice} to ₹${newPrice !== undefined ? newPrice : oldPrice}. Reason: ${priceHistory.reason}`,
          undefined,
          undefined,
          id
        );
      } catch (err) {
        console.warn('Failed to record service price history:', err);
      }
    }

    const updates: any = {
      ...data,
      updatedBy: userProfile?.uid,
      updatedByName: userProfile?.name,
      updatedAt: new Date().toISOString(),
    };

    if (newPrice !== undefined) {
      updates.basePrice = newPrice;
      updates.price = newPrice;
    }
    if (data.serviceName || data.name) {
      updates.serviceName = data.serviceName || data.name;
      updates.name = data.serviceName || data.name;
    }
    if (data.status) {
      updates.status = data.status;
      updates.active = data.status === 'Active';
    } else if (data.active !== undefined) {
      updates.active = data.active;
      updates.status = data.active ? 'Active' : 'Inactive';
    }

    try {
      await updateDoc(doc(db, 'services', id), cleanDataForFirestore(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `services/${id}`);
      throw err;
    }
  };

  const toggleServiceStatus = async (id: string): Promise<void> => {
    const existing = services.find((s) => s.id === id);
    if (!existing) return;
    const newStatus = existing.active || existing.status === 'Active' ? 'Inactive' : 'Active';
    await updateService(id, { status: newStatus, active: newStatus === 'Active' });
  };

  const deleteService = async (id: string): Promise<void> => {
    const existing = services.find((s) => s.id === id);
    const isUsed = proposals.some((prop) =>
      prop.items?.some((it) => it.serviceId === id || it.itemId === id || (existing && it.code === existing.serviceCode))
    );

    if (isUsed) {
      await updateService(id, { status: 'Inactive', active: false });
      throw new Error(
        `Service "${existing?.name || id}" has already been used in historical commercial proposals and cannot be permanently deleted. Its status has been automatically switched to Inactive.`
      );
    }

    try {
      await deleteDoc(doc(db, 'services', id));
      await logActivity(
        'service_deleted' as any,
        'Service Deleted',
        `${userProfile?.name} deleted service "${existing?.name || id}" from catalog`,
        undefined,
        undefined,
        id
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `services/${id}`);
      throw err;
    }
  };

  // Code Generators (Phase 16 Section 2, 5, 16, 17)
  const generateNextProductCode = async (): Promise<string> => {
    const prefix = productSettings.productCodePrefix || 'PRD';
    const year = new Date().getFullYear();
    const count = products.length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  const generateNextServiceCode = async (): Promise<string> => {
    const prefix = productSettings.serviceCodePrefix || 'SRV';
    const year = new Date().getFullYear();
    const count = services.length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  const generateNextPurchaseNumber = async (): Promise<string> => {
    const prefix = productSettings.purchaseNumberPrefix || 'PO';
    const year = new Date().getFullYear();
    const count = purchases.length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  const generateNextSupplierCode = async (): Promise<string> => {
    const prefix = productSettings.supplierCodePrefix || 'SUP';
    const year = new Date().getFullYear();
    const count = suppliers.length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  // Categories (Phase 16 Section 4)
  const addCategory = async (
    data: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const id = `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const categoryId = data.categoryId || `CAT-${new Date().getFullYear()}-${String(productCategories.length + 1).padStart(4, '0')}`;
    const newCat: ProductCategory = {
      ...data,
      id,
      categoryId,
      status: data.status || 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'productCategories', id), cleanDataForFirestore(newCat));
    return id;
  };

  const updateCategory = async (id: string, data: Partial<ProductCategory>): Promise<void> => {
    await updateDoc(doc(db, 'productCategories', id), cleanDataForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const deleteCategory = async (id: string): Promise<void> => {
    const isUsed = products.some((p) => p.categoryId === id) || services.some((s) => s.categoryId === id);
    if (isUsed) {
      await updateCategory(id, { status: 'Inactive' });
      throw new Error('Category cannot be permanently deleted because existing products or services reference it. Its status has been set to Inactive.');
    }
    await deleteDoc(doc(db, 'productCategories', id));
  };

  // Inventory & Stock Movement Engine (Phase 16 Sections 10-14, 43, 44)
  const adjustStock = async (params: {
    productId: string;
    quantityDelta: number;
    type: StockMovementType;
    reason: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void> => {
    const { productId, quantityDelta, type, reason, referenceType, referenceId } = params;
    const prodRef = doc(db, 'products', productId);
    const movId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await runTransaction(db, async (txn) => {
      const prodDoc = await txn.get(prodRef);
      if (!prodDoc.exists()) throw new Error('Product not found for inventory adjustment');
      const prodData = prodDoc.data() as ProductItem;
      const prevStock = Number(prodData.currentStock ?? 0);
      const prevReserved = Number(prodData.reservedStock ?? 0);
      const newStock = prevStock + quantityDelta;

      if (newStock < 0 && !productSettings.allowNegativeStock) {
        throw new Error(`Insufficient stock for "${prodData.productName || prodData.name}". Current: ${prevStock}, requested reduction: ${Math.abs(quantityDelta)}. Negative inventory is disabled in settings.`);
      }

      const newAvailable = Math.max(0, newStock - prevReserved);

      txn.update(prodRef, {
        currentStock: newStock,
        availableStock: newAvailable,
        updatedAt: new Date().toISOString(),
      });

      const movementRef = doc(db, 'inventoryMovements', movId);
      const movement: InventoryMovement = {
        id: movId,
        movementId: movId,
        productId,
        productCode: prodData.productCode,
        productName: prodData.productName || prodData.name,
        type,
        quantity: quantityDelta,
        referenceType: referenceType || 'Manual Adjustment',
        referenceId: referenceId || '',
        previousStock: prevStock,
        newStock,
        previousReserved: prevReserved,
        newReserved: prevReserved,
        reason: reason || 'Stock adjustment recorded by administrator',
        createdBy: userProfile?.uid || 'admin',
        createdByName: userProfile?.name || 'Administrator',
        createdAt: new Date().toISOString(),
      };
      txn.set(movementRef, cleanDataForFirestore(movement));
    });

    // Check low stock alert after transaction
    const prod = products.find((p) => p.id === productId);
    const finalStock = (prod?.currentStock ?? 0) + quantityDelta;
    const threshold = prod?.minimumQuantity ?? productSettings.lowStockThreshold ?? 10;
    if (finalStock <= threshold) {
      const notifId = `NOTIF-LOW-${productId}-${new Date().toISOString().split('T')[0]}`;
      const existingNotif = notifications.find((n) => n.id === notifId);
      if (!existingNotif) {
        createNotification({
          userId: userProfile?.uid || 'admin',
          type: 'LOW_STOCK_ALERT',
          title: finalStock === 0 ? 'Out of Stock Alert' : 'Low Stock Warning',
          message: `Product "${prod?.productName || prod?.name || productId}" is now ${finalStock === 0 ? 'Out of Stock (0 units remaining)' : `running low on inventory (${finalStock} units remaining; threshold is ${threshold})`}.`,
          metadata: { link: '/admin/inventory', productId },
        }).catch(console.warn);
      }
    }
  };

  const reserveStock = async (params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }): Promise<void> => {
    const { productId, quantity, reason, referenceId } = params;
    if (quantity <= 0) return;
    const prodRef = doc(db, 'products', productId);
    const movId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await runTransaction(db, async (txn) => {
      const prodDoc = await txn.get(prodRef);
      if (!prodDoc.exists()) throw new Error('Product not found');
      const prodData = prodDoc.data() as ProductItem;
      const curStock = Number(prodData.currentStock ?? 0);
      const curReserved = Number(prodData.reservedStock ?? 0);
      const curAvail = curStock - curReserved;

      if (curAvail < quantity && !productSettings.allowNegativeStock) {
        throw new Error(`Cannot reserve ${quantity} units for "${prodData.productName || prodData.name}". Available stock is only ${curAvail}.`);
      }

      const nextReserved = curReserved + quantity;
      const nextAvailable = curStock - nextReserved;

      txn.update(prodRef, {
        reservedStock: nextReserved,
        availableStock: nextAvailable,
        updatedAt: new Date().toISOString(),
      });

      const movementRef = doc(db, 'inventoryMovements', movId);
      const movement: InventoryMovement = {
        id: movId,
        movementId: movId,
        productId,
        productCode: prodData.productCode,
        productName: prodData.productName || prodData.name,
        type: 'Reservation',
        quantity,
        referenceType: 'Invoice',
        referenceId: referenceId || '',
        previousStock: curStock,
        newStock: curStock,
        previousReserved: curReserved,
        newReserved: nextReserved,
        reason: reason || 'Inventory reserved for confirmed commercial invoice',
        createdBy: userProfile?.uid || 'admin',
        createdByName: userProfile?.name || 'User',
        createdAt: new Date().toISOString(),
      };
      txn.set(movementRef, cleanDataForFirestore(movement));
    });
  };

  const releaseStock = async (params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }): Promise<void> => {
    const { productId, quantity, reason, referenceId } = params;
    if (quantity <= 0) return;
    const prodRef = doc(db, 'products', productId);
    const movId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await runTransaction(db, async (txn) => {
      const prodDoc = await txn.get(prodRef);
      if (!prodDoc.exists()) throw new Error('Product not found');
      const prodData = prodDoc.data() as ProductItem;
      const curStock = Number(prodData.currentStock ?? 0);
      const curReserved = Number(prodData.reservedStock ?? 0);
      const nextReserved = Math.max(0, curReserved - quantity);
      const nextAvailable = curStock - nextReserved;

      txn.update(prodRef, {
        reservedStock: nextReserved,
        availableStock: nextAvailable,
        updatedAt: new Date().toISOString(),
      });

      const movementRef = doc(db, 'inventoryMovements', movId);
      const movement: InventoryMovement = {
        id: movId,
        movementId: movId,
        productId,
        productCode: prodData.productCode,
        productName: prodData.productName || prodData.name,
        type: 'Release',
        quantity,
        referenceType: 'Invoice',
        referenceId: referenceId || '',
        previousStock: curStock,
        newStock: curStock,
        previousReserved: curReserved,
        newReserved: nextReserved,
        reason: reason || 'Reserved stock released back to general pool',
        createdBy: userProfile?.uid || 'admin',
        createdByName: userProfile?.name || 'User',
        createdAt: new Date().toISOString(),
      };
      txn.set(movementRef, cleanDataForFirestore(movement));
    });
  };

  const deductStock = async (params: {
    productId: string;
    quantity: number;
    reason: string;
    referenceId?: string;
  }): Promise<void> => {
    const { productId, quantity, reason, referenceId } = params;
    if (quantity <= 0) return;
    const prodRef = doc(db, 'products', productId);
    const movId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await runTransaction(db, async (txn) => {
      const prodDoc = await txn.get(prodRef);
      if (!prodDoc.exists()) throw new Error('Product not found');
      const prodData = prodDoc.data() as ProductItem;
      const curStock = Number(prodData.currentStock ?? 0);
      const curReserved = Number(prodData.reservedStock ?? 0);
      const newStock = Math.max(0, curStock - quantity);
      const nextReserved = Math.max(0, curReserved - quantity);
      const nextAvailable = Math.max(0, newStock - nextReserved);

      txn.update(prodRef, {
        currentStock: newStock,
        reservedStock: nextReserved,
        availableStock: nextAvailable,
        updatedAt: new Date().toISOString(),
      });

      const movementRef = doc(db, 'inventoryMovements', movId);
      const movement: InventoryMovement = {
        id: movId,
        movementId: movId,
        productId,
        productCode: prodData.productCode,
        productName: prodData.productName || prodData.name,
        type: 'Deduction',
        quantity: -quantity,
        referenceType: 'Invoice',
        referenceId: referenceId || '',
        previousStock: curStock,
        newStock,
        previousReserved: curReserved,
        newReserved: nextReserved,
        reason: reason || 'Inventory deducted for fulfilled sales invoice',
        createdBy: userProfile?.uid || 'admin',
        createdByName: userProfile?.name || 'User',
        createdAt: new Date().toISOString(),
      };
      txn.set(movementRef, cleanDataForFirestore(movement));
    });
  };

  // Purchases (Phase 16 Sections 15-20)
  const createPurchase = async (
    data: Omit<PurchaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>
  ): Promise<string> => {
    const id = `po_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const purchaseNumber = data.purchaseNumber || (await generateNextPurchaseNumber());
    const newPurchase: PurchaseRecord = {
      ...data,
      id,
      purchaseId: id,
      purchaseNumber,
      status: data.status || 'Draft',
      createdBy: userProfile?.uid || 'admin',
      createdByName: userProfile?.name || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'purchases', id), cleanDataForFirestore(newPurchase));
    await logActivity(
      'PURCHASE_CREATED' as any,
      'Purchase Order Created',
      `${userProfile?.name} created Purchase Order ${purchaseNumber} for supplier "${data.supplierSnapshot?.companyName}" amounting to ₹${data.grandTotal.toLocaleString('en-IN')}`,
      undefined,
      undefined,
      id
    );
    return id;
  };

  const updatePurchase = async (id: string, data: Partial<PurchaseRecord>): Promise<void> => {
    await updateDoc(doc(db, 'purchases', id), cleanDataForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const receivePurchaseGoods = async (params: {
    purchaseId: string;
    itemsToReceive: { productId: string; quantity: number }[];
    notes?: string;
  }): Promise<void> => {
    const { purchaseId, itemsToReceive, notes } = params;
    const poRef = doc(db, 'purchases', purchaseId);

    await runTransaction(db, async (txn) => {
      const poDoc = await txn.get(poRef);
      if (!poDoc.exists()) throw new Error('Purchase order not found');
      const po = poDoc.data() as PurchaseRecord;

      const receivedItemsList = [...(po.receivedItems || [])];
      let totalOrderedQty = 0;
      let totalReceivedQty = 0;

      for (const item of po.items) {
        totalOrderedQty += item.quantity;
      }

      for (const rec of itemsToReceive) {
        if (rec.quantity <= 0) continue;
        const prodRef = doc(db, 'products', rec.productId);
        const prodDoc = await txn.get(prodRef);
        if (prodDoc.exists()) {
          const prodData = prodDoc.data() as ProductItem;
          const prevStock = Number(prodData.currentStock ?? 0);
          const newStock = prevStock + rec.quantity;
          const curReserved = Number(prodData.reservedStock ?? 0);
          const newAvail = newStock - curReserved;

          txn.update(prodRef, {
            currentStock: newStock,
            availableStock: newAvail,
            updatedAt: new Date().toISOString(),
          });

          const movId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          const movementRef = doc(db, 'inventoryMovements', movId);
          const movement: InventoryMovement = {
            id: movId,
            movementId: movId,
            productId: rec.productId,
            productCode: prodData.productCode,
            productName: prodData.productName || prodData.name,
            type: 'Purchase',
            quantity: rec.quantity,
            referenceType: 'Purchase Order',
            referenceId: po.purchaseNumber || purchaseId,
            previousStock: prevStock,
            newStock,
            previousReserved: curReserved,
            newReserved: curReserved,
            reason: `Goods receipt for Purchase Order ${po.purchaseNumber}${notes ? ` - ${notes}` : ''}`,
            createdBy: userProfile?.uid || 'admin',
            createdByName: userProfile?.name || 'User',
            createdAt: new Date().toISOString(),
          };
          txn.set(movementRef, cleanDataForFirestore(movement));
        }

        receivedItemsList.push({
          productId: rec.productId,
          receivedQuantity: rec.quantity,
          receivedAt: new Date().toISOString(),
          receivedBy: userProfile?.name || 'User',
        });
      }

      const qtyMap: Record<string, number> = {};
      for (const r of receivedItemsList) {
        qtyMap[r.productId] = (qtyMap[r.productId] || 0) + r.receivedQuantity;
      }
      for (const q of Object.values(qtyMap)) {
        totalReceivedQty += q;
      }

      const nextStatus: PurchaseStatus =
        totalReceivedQty >= totalOrderedQty
          ? 'Received'
          : totalReceivedQty > 0
          ? 'Partially Received'
          : po.status;

      txn.update(poRef, {
        status: nextStatus,
        receivedItems: receivedItemsList,
        updatedAt: new Date().toISOString(),
      });
    });

    await logActivity(
      'PURCHASE_RECEIVED' as any,
      'Goods Received',
      `${userProfile?.name} confirmed goods receipt for PO ${purchaseId}`,
      undefined,
      undefined,
      purchaseId
    );
  };

  const cancelPurchase = async (purchaseId: string, reason?: string): Promise<void> => {
    await updatePurchase(purchaseId, {
      status: 'Cancelled',
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
    });
  };

  // Suppliers (Phase 16 Section 17)
  const addSupplier = async (
    data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const id = `sup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const supplierCode = data.supplierCode || (await generateNextSupplierCode());
    const newSup: SupplierRecord = {
      ...data,
      id,
      supplierId: id,
      supplierCode,
      status: data.status || 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'suppliers', id), cleanDataForFirestore(newSup));
    await logActivity(
      'SUPPLIER_CREATED' as any,
      'Supplier Registered',
      `${userProfile?.name} registered new supplier "${data.companyName}" (${supplierCode})`,
      undefined,
      undefined,
      id
    );
    return id;
  };

  const updateSupplier = async (id: string, data: Partial<SupplierRecord>): Promise<void> => {
    await updateDoc(doc(db, 'suppliers', id), cleanDataForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const deleteSupplier = async (id: string): Promise<void> => {
    const isUsed = purchases.some((p) => p.supplierId === id || p.supplierSnapshot?.id === id);
    if (isUsed) {
      await updateSupplier(id, { status: 'Inactive' });
      throw new Error('Supplier cannot be permanently deleted because historical purchase orders reference them. Their status has been set to Inactive.');
    }
    await deleteDoc(doc(db, 'suppliers', id));
  };

  // Customer Specific Pricing (Phase 16 Section 28)
  const saveCustomerSpecificPrice = async (
    data: Omit<CustomerSpecificPrice, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<string> => {
    const id = data.id || `csp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPrice: CustomerSpecificPrice = {
      ...data,
      id,
      pricingId: id,
      status: data.status || 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'customerSpecificPricing', id), cleanDataForFirestore(newPrice));
    return id;
  };

  const deleteCustomerSpecificPrice = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'customerSpecificPricing', id));
  };

  // Product Settings (Phase 16 Section 38)
  const updateProductSettings = async (settings: Partial<ProductSettings>): Promise<void> => {
    await setDoc(
      doc(db, 'productSettings', 'default'),
      cleanDataForFirestore({
        ...productSettings,
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid,
      }),
      { merge: true }
    );
  };

  // Bulk Product Import & Update (Phase 16 Sections 29 & 30)
  const bulkImportProducts = async (
    productsList: Partial<ProductItem>[]
  ): Promise<{ imported: number; updated: number; failed: number }> => {
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const batch = writeBatch(db);

    for (const p of productsList) {
      if (!p.name && !p.productName) {
        failed++;
        continue;
      }
      const code = (p.productCode || `PRD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`).trim().toUpperCase();
      const existing = products.find((ex) => ex.productCode.toUpperCase() === code);

      if (existing) {
        const ref = doc(db, 'products', existing.id);
        batch.update(ref, cleanDataForFirestore({
          productName: p.productName || p.name || existing.productName,
          name: p.name || p.productName || existing.name,
          description: p.description !== undefined ? p.description : existing.description,
          unit: p.unit || existing.unit,
          sellingPrice: p.sellingPrice !== undefined ? Number(p.sellingPrice) : p.price !== undefined ? Number(p.price) : existing.sellingPrice,
          price: p.sellingPrice !== undefined ? Number(p.sellingPrice) : p.price !== undefined ? Number(p.price) : existing.price,
          purchasePrice: p.purchasePrice !== undefined ? Number(p.purchasePrice) : existing.purchasePrice,
          taxRate: p.taxRate !== undefined ? Number(p.taxRate) : existing.taxRate,
          gstRate: p.taxRate !== undefined ? Number(p.taxRate) : existing.gstRate,
          sku: p.sku || existing.sku,
          hsnSac: p.hsnSac || existing.hsnSac,
          minimumQuantity: p.minimumQuantity !== undefined ? Number(p.minimumQuantity) : existing.minimumQuantity,
          stockEnabled: p.stockEnabled !== undefined ? Boolean(p.stockEnabled) : existing.stockEnabled,
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile?.uid,
        }));
        updated++;
      } else {
        const id = `prod_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const ref = doc(db, 'products', id);
        const newProd: ProductItem = {
          id,
          productId: code,
          productCode: code,
          productName: p.productName || p.name || 'Imported Product',
          name: p.name || p.productName || 'Imported Product',
          description: p.description || '',
          unit: p.unit || 'Unit',
          sellingPrice: Number(p.sellingPrice || p.price || 0),
          price: Number(p.sellingPrice || p.price || 0),
          purchasePrice: p.purchasePrice !== undefined ? Number(p.purchasePrice) : undefined,
          taxRate: Number(p.taxRate || p.gstRate || 18),
          gstRate: Number(p.taxRate || p.gstRate || 18),
          sku: p.sku || '',
          hsnSac: p.hsnSac || '',
          minimumQuantity: Number(p.minimumQuantity || 10),
          stockEnabled: p.stockEnabled !== false,
          currentStock: Number(p.currentStock || 0),
          reservedStock: 0,
          availableStock: Number(p.currentStock || 0),
          status: 'Active',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userProfile?.uid,
        };
        batch.set(ref, cleanDataForFirestore(newProd));
        imported++;
      }
    }

    await batch.commit();
    await logActivity(
      'BULK_IMPORT' as any,
      'Products Bulk Uploaded',
      `${userProfile?.name} imported ${imported} new products and updated ${updated} existing products via spreadsheet`,
      undefined,
      undefined,
      undefined
    );
    return { imported, updated, failed };
  };

  // Price Override Audit Log (Phase 16 Section 26)
  const recordPriceOverride = async (params: {
    productId: string;
    originalPrice: number;
    overridePrice: number;
    reason: string;
  }): Promise<void> => {
    const prod = products.find((p) => p.id === params.productId);
    await logActivity(
      'PRICE_OVERRIDE' as any,
      'Price Override Audit',
      `${userProfile?.name} changed price for "${prod?.productName || prod?.name || params.productId}" from ₹${params.originalPrice.toLocaleString('en-IN')} to ₹${params.overridePrice.toLocaleString('en-IN')}. Reason: ${params.reason}`,
      undefined,
      undefined,
      params.productId,
      {
        productId: params.productId,
        productCode: prod?.productCode,
        originalPrice: params.originalPrice,
        overridePrice: params.overridePrice,
        reason: params.reason,
      }
    );
  };

  // Safe Firestore-backed atomic proposal numbering (Section 31 & Phase 7)
  const generateNextProposalNumber = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = proposalNumberingSettings.prefix || companySettings.proposalPrefix || 'PROP';
    let yearPart = '';
    if (proposalNumberingSettings.yearFormat === 'YYYY') {
      yearPart = `-${yearNum}`;
    } else if (proposalNumberingSettings.yearFormat === 'YY') {
      yearPart = `-${String(yearNum).slice(-2)}`;
    }
    const digits = proposalNumberingSettings.sequenceDigits || 4;
    const counterKey = `proposals_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = 0;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, { seq: updatedSeq, year: yearNum, prefix, updatedAt: new Date().toISOString() });
        return updatedSeq;
      });
      return `${prefix}${yearPart}-${String(nextSeq).padStart(digits, '0')}`;
    } catch (e) {
      console.warn('Transaction on counter failed, falling back to local proposal calculation:', e);
      // Fallback: examine existing proposals in memory
      const yearPrefix = `${prefix}${yearPart}-`;
      const matches = proposals
        .filter((p) => p.proposalNumber && p.proposalNumber.startsWith(yearPrefix))
        .map((p) => {
          const numPart = p.proposalNumber.replace(yearPrefix, '');
          const parsed = parseInt(numPart, 10);
          return isNaN(parsed) ? 0 : parsed;
        });
      const maxSeq = matches.length > 0 ? Math.max(...matches) : 0;
      return `${prefix}${yearPart}-${String(maxSeq + 1).padStart(digits, '0')}`;
    }
  };

  // Upload company logo to Firebase Storage or fallback to base64
  const uploadCompanyLogo = async (file: File): Promise<string> => {
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `company_logo_${Date.now()}.${ext}`;
      const storagePath = `branding/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const nowIso = new Date().toISOString();
      await updateCompanySettings({ logoUrl: downloadUrl });
      await updateBrandingSettings({
        logoUrl: downloadUrl,
        storagePath,
        fileName,
        uploadedBy: userProfile?.name || 'Admin',
        uploadedAt: nowIso,
        status: 'active',
      });

      await logActivity(
        'LOGO_UPDATED',
        'Company Logo Uploaded',
        `${userProfile?.name} updated active company logo (${file.name})`
      );

      return downloadUrl;
    } catch (storageErr) {
      console.warn('Firebase Storage upload failed (falling back to Base64 data URL):', storageErr);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const nowIso = new Date().toISOString();
          await updateCompanySettings({ logoUrl: base64 });
          await updateBrandingSettings({
            logoUrl: base64,
            storagePath: 'inline_data_url',
            fileName: file.name,
            uploadedBy: userProfile?.name || 'Admin',
            uploadedAt: nowIso,
            status: 'active',
          });
          await logActivity(
            'LOGO_UPDATED',
            'Company Logo Uploaded',
            `${userProfile?.name} updated active company logo (Data URL fallback)`
          );
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  const removeCompanyLogo = async (): Promise<void> => {
    try {
      await updateCompanySettings({ logoUrl: '' });
      await updateBrandingSettings({ logoUrl: '' });
      await logActivity(
        'LOGO_UPDATED',
        'Company Logo Removed',
        `${userProfile?.name} removed the active company logo`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'brandingSettings/default');
      throw err;
    }
  };

  // Proposals - IMPORTANT: Preserves complete immutable snapshot of active settings (Phase 7 Requirements 3, 4, 6, 8, 9, 12, 14, 17)
  const createProposal = async (
    data: Omit<
      ProposalRecord,
      | 'id'
      | 'proposalNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'createdBy'
      | 'createdByName'
      | 'companySnapshot'
      | 'bankSnapshot'
    > & {
      selectedBankId?: string;
      bankSnapshot?: BankSettings;
    },
    customProposalNumber?: string
  ): Promise<ProposalRecord> => {
    const proposalNumber = customProposalNumber || (await generateNextProposalNumber());
    const id = `prop_${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Resolve Bank Account Snapshot
    let snapshotBank: BankSettings = { ...bankSettings };
    if (data.bankSnapshot) {
      snapshotBank = { ...data.bankSnapshot };
    } else if (data.selectedBankId) {
      const matchedAcc = bankAccounts.find(
        (b) => b.id === data.selectedBankId || b.bankAccountId === data.selectedBankId
      );
      if (matchedAcc) {
        snapshotBank = {
          id: matchedAcc.id,
          bankAccountId: matchedAcc.bankAccountId,
          accountHolderName: matchedAcc.accountHolderName,
          bankName: matchedAcc.bankName,
          accountNumber: matchedAcc.accountNumber,
          ifscCode: matchedAcc.ifscCode,
          branch: matchedAcc.branch,
          upiId: matchedAcc.upiId,
          isDefault: matchedAcc.isDefault,
          status: matchedAcc.status,
          updatedAt: matchedAcc.updatedAt,
        };
      }
    }

    // 2. Snapshot current active settings (immutable historical record)
    const snapshotCompany: CompanySettings = { ...companySettings };
    const snapshotBranding: BrandingSettings = { ...brandingSettings };
    const snapshotTemplate: ProposalTemplateSettings = { ...proposalTemplateSettings };
    const snapshotTerms: TermItem[] = termsList.filter((t) => t.isActive);
    const snapshotSignature: SignatorySettings = { ...signatorySettings };
    const currentVersion = companySettings.settingsVersion || 1;

    const { selectedBankId, ...cleanedProposalData } = data;

    const newProposal: ProposalRecord = {
      ...cleanedProposalData,
      id,
      proposalId: id,
      proposalNumber,
      proposalDate: data.proposalDate || nowIso.split('T')[0],
      companySnapshot: snapshotCompany,
      bankSnapshot: snapshotBank,
      brandingSnapshot: snapshotBranding,
      templateSnapshot: snapshotTemplate,
      termsSnapshot: snapshotTerms,
      signatureSnapshot: snapshotSignature,
      settingsVersion: currentVersion,
      createdBy: userProfile?.uid || 'system',
      createdByName: userProfile?.name || 'User',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'proposals', id), cleanDataForFirestore(newProposal));

      // Store item snapshot in proposals/{proposalId}/items/{itemId} (Section 9)
      if (Array.isArray(newProposal.items)) {
        for (const item of newProposal.items) {
          const itemId = item.itemId || item.id || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          try {
            await setDoc(doc(db, 'proposals', id, 'items', itemId), cleanDataForFirestore({
              ...item,
              itemId,
            }));
          } catch (itemErr) {
            console.warn('Failed saving item subdocument:', itemErr);
          }
        }
      }

      await logActivity(
        'proposal_created',
        'Proposal Created',
        `${userProfile?.name} created proposal "${proposalNumber}" for ${data.customerName} (Status: ${data.status || 'Draft'}, Total: ₹${data.grandTotal.toLocaleString()})`,
        data.customerId,
        data.leadId,
        data.stsId
      );
      return newProposal;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `proposals/${id}`);
      throw err;
    }
  };

  const updateProposal = async (id: string, data: Partial<ProposalRecord>): Promise<void> => {
    const existing = proposals.find((p) => p.id === id);
    if (existing && existing.status !== 'Draft' && existing.isImmutable) {
      throw new Error(`Proposal ${existing.proposalNumber} is finalized and cannot be modified. Only Draft proposals can be edited.`);
    }

    try {
      await updateDoc(doc(db, 'proposals', id), cleanDataForFirestore({
        ...data,
        updatedAt: new Date().toISOString(),
      }));

      await logActivity(
        'proposal_updated' as any,
        'Proposal Updated',
        `${userProfile?.name} updated proposal "${existing?.proposalNumber || id}"`,
        existing?.customerId,
        existing?.leadId,
        existing?.stsId
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `proposals/${id}`);
      throw err;
    }
  };

  const deleteProposal = async (id: string): Promise<void> => {
    const existing = proposals.find((p) => p.id === id);
    if (existing && existing.status !== 'Draft') {
      throw new Error(`Only Draft proposals can be deleted. Finalized or sent proposals must be Cancelled instead.`);
    }

    try {
      await deleteDoc(doc(db, 'proposals', id));
      await logActivity(
        'proposal_cancelled' as any,
        'Proposal Deleted',
        `${userProfile?.name} deleted draft proposal "${existing?.proposalNumber || id}"`,
        existing?.customerId,
        existing?.leadId,
        existing?.stsId
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `proposals/${id}`);
      throw err;
    }
  };

  const duplicateProposal = async (proposalId: string): Promise<ProposalRecord> => {
    const existing = proposals.find((p) => p.id === proposalId);
    if (!existing) {
      throw new Error(`Proposal not found for duplication.`);
    }

    const newProposalNumber = await generateNextProposalNumber();
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    const validityDays = companySettings.proposalValidityDays || 30;
    const defaultValidDate = new Date();
    defaultValidDate.setDate(defaultValidDate.getDate() + validityDays);

    const clonedItems = (existing.items || []).map((it, idx) => ({
      ...it,
      id: `item_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
    }));

    const duplicatedData = {
      customerId: existing.customerId,
      customerName: existing.customerName,
      customerEmail: existing.customerEmail,
      customerMobile: existing.customerMobile,
      customerGst: existing.customerGst,
      customerAddress: existing.customerAddress,
      customerSnapshot: existing.customerSnapshot ? { ...existing.customerSnapshot } : undefined,
      leadId: existing.leadId,
      stsId: existing.stsId,
      stsNumber: existing.stsNumber,
      items: clonedItems,
      subtotal: existing.subtotal,
      discount: existing.discount,
      taxableAmount: existing.taxableAmount,
      gstTotal: existing.gstTotal,
      grandTotal: existing.grandTotal,
      proposalDate: todayStr,
      validUntil: defaultValidDate.toISOString().split('T')[0],
      status: 'Draft' as const,
      isImmutable: false,
      notes: existing.notes ? `[Cloned from ${existing.proposalNumber}] ${existing.notes}` : `Cloned from ${existing.proposalNumber}`,
      terms: existing.terms || companySettings.termsAndConditions || '',
    };

    const newRecord = await createProposal(duplicatedData, newProposalNumber);

    await logActivity(
      'proposal_created',
      'Proposal Duplicated',
      `${userProfile?.name} duplicated proposal "${existing.proposalNumber}" into new Draft "${newProposalNumber}"`,
      existing.customerId,
      existing.leadId,
      existing.stsId
    );

    return newRecord;
  };

  const updateProposalStatus = async (
    id: string,
    status: ProposalRecord['status'],
    reason?: string,
    acceptedBy?: string
  ): Promise<void> => {
    const payload: Partial<ProposalRecord> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'Sent') payload.sentAt = new Date().toISOString();
    if (status === 'Viewed') payload.viewedAt = new Date().toISOString();
    if (status === 'Accepted') {
      payload.acceptedAt = new Date().toISOString();
      if (acceptedBy) payload.acceptedBy = acceptedBy;
    }
    if (status === 'Rejected') {
      payload.rejectedAt = new Date().toISOString();
      if (reason) payload.rejectionReason = reason;
    }

    try {
      await updateDoc(doc(db, 'proposals', id), cleanDataForFirestore(payload));
      const prop = proposals.find((p) => p.id === id);
      await logActivity(
        status === 'Sent'
          ? 'proposal_sent'
          : status === 'Viewed'
          ? 'proposal_viewed'
          : status === 'Accepted'
          ? 'proposal_accepted'
          : status === 'Rejected'
          ? 'proposal_rejected'
          : 'proposal_cancelled' as any,
        `Proposal ${status}`,
        `Proposal "${prop?.proposalNumber || id}" status changed to ${status}${reason ? ` (Reason: ${reason})` : ''}${acceptedBy ? ` (Accepted by: ${acceptedBy})` : ''}`,
        prop?.customerId,
        prop?.leadId,
        prop?.stsId
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `proposals/${id}`);
      throw err;
    }
  };

  // Company Settings (Phase 7 Requirements 1, 2, 17, 18)
  const updateCompanySettings = async (settings: Partial<CompanySettings>): Promise<void> => {
    try {
      const nextVersion = (companySettings.settingsVersion || 1) + 1;
      const updated: CompanySettings = {
        ...companySettings,
        ...settings,
        settingsVersion: nextVersion,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid || 'admin',
      };
      await setDoc(doc(db, 'companySettings', 'default'), cleanDataForFirestore(updated));
      setCompanySettings(updated);

      await logActivity(
        'COMPANY_SETTINGS_UPDATED',
        'Company Profile Updated',
        `${userProfile?.name} updated corporate profile for "${updated.companyName}" (v${nextVersion})`,
        undefined,
        undefined,
        undefined,
        {
          changedFields: Object.keys(settings),
          settingsVersion: nextVersion,
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'companySettings/default');
      throw err;
    }
  };

  const updateBankSettings = async (settings: Partial<BankSettings>): Promise<void> => {
    try {
      const updated = {
        ...bankSettings,
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid || 'admin',
      };
      await setDoc(doc(db, 'bankSettings', 'default'), cleanDataForFirestore(updated));
      setBankSettings(updated);

      // If bankSettings updated directly, also update the default bank account in bankAccounts
      const defaultAcc = bankAccounts.find((b) => b.isDefault || b.id === bankSettings.id);
      if (defaultAcc) {
        await updateDoc(doc(db, 'bankAccounts', defaultAcc.id), cleanDataForFirestore({
          accountHolderName: updated.accountHolderName,
          bankName: updated.bankName,
          accountNumber: updated.accountNumber,
          ifscCode: updated.ifscCode,
          branch: updated.branch,
          upiId: updated.upiId,
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile?.uid || 'admin',
        }));
      }

      await logActivity(
        'BANK_ACCOUNT_UPDATED',
        'Bank Details Updated',
        `${userProfile?.name} updated primary bank details (${updated.bankName} - ${maskAccountNumber(updated.accountNumber)})`,
        undefined,
        undefined,
        undefined,
        {
          changedFields: Object.keys(settings).filter((k) => k !== 'accountNumber'),
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'bankSettings/default');
      throw err;
    }
  };

  // Multiple Bank Accounts Management (Phase 7 Requirements 7, 8, 18)
  const addBankAccount = async (
    data: Omit<BankAccount, 'id' | 'bankAccountId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const bankAccountId = `BNK-${Date.now().toString().slice(-4)}`;
    const id = `bnk_${Date.now()}`;
    const isFirst = bankAccounts.length === 0;
    const isDefault = data.isDefault !== undefined ? data.isDefault : isFirst;

    const newAccount: BankAccount = {
      ...data,
      id,
      bankAccountId,
      isDefault,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile?.uid || 'admin',
    };

    try {
      await setDoc(doc(db, 'bankAccounts', id), cleanDataForFirestore(newAccount));

      if (isDefault) {
        for (const acc of bankAccounts) {
          if (acc.isDefault && acc.id !== id) {
            await updateDoc(doc(db, 'bankAccounts', acc.id), { isDefault: false });
          }
        }
        await setDoc(
          doc(db, 'bankSettings', 'default'),
          cleanDataForFirestore({
            id,
            bankAccountId,
            accountHolderName: newAccount.accountHolderName,
            bankName: newAccount.bankName,
            accountNumber: newAccount.accountNumber,
            ifscCode: newAccount.ifscCode,
            branch: newAccount.branch,
            upiId: newAccount.upiId,
            isDefault: true,
            status: 'active',
            updatedAt: new Date().toISOString(),
            updatedBy: userProfile?.uid || 'admin',
          })
        );
      }

      await logActivity(
        'BANK_ACCOUNT_CREATED',
        'Bank Account Added',
        `${userProfile?.name} added bank account "${newAccount.bankName}" (${maskAccountNumber(newAccount.accountNumber)})`,
        undefined,
        undefined,
        undefined,
        { bankAccountId, bankName: newAccount.bankName, maskedAccount: maskAccountNumber(newAccount.accountNumber) }
      );

      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bankAccounts/${id}`);
      throw err;
    }
  };

  const updateBankAccount = async (id: string, data: Partial<BankAccount>): Promise<void> => {
    const existing = bankAccounts.find((b) => b.id === id);
    if (!existing) throw new Error('Bank account not found');

    try {
      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid || 'admin',
      };
      await updateDoc(doc(db, 'bankAccounts', id), cleanDataForFirestore(updates));

      if (data.isDefault) {
        for (const acc of bankAccounts) {
          if (acc.id !== id && acc.isDefault) {
            await updateDoc(doc(db, 'bankAccounts', acc.id), { isDefault: false });
          }
        }
        await setDoc(
          doc(db, 'bankSettings', 'default'),
          cleanDataForFirestore({
            id,
            bankAccountId: existing.bankAccountId || id,
            accountHolderName: data.accountHolderName ?? existing.accountHolderName,
            bankName: data.bankName ?? existing.bankName,
            accountNumber: data.accountNumber ?? existing.accountNumber,
            ifscCode: data.ifscCode ?? existing.ifscCode,
            branch: data.branch ?? existing.branch,
            upiId: data.upiId ?? existing.upiId,
            isDefault: true,
            status: data.status ?? existing.status ?? 'active',
            updatedAt: new Date().toISOString(),
            updatedBy: userProfile?.uid || 'admin',
          })
        );
      }

      await logActivity(
        'BANK_ACCOUNT_UPDATED',
        'Bank Account Updated',
        `${userProfile?.name} updated bank account "${data.bankName || existing.bankName}" (${maskAccountNumber(data.accountNumber || existing.accountNumber)})`,
        undefined,
        undefined,
        undefined,
        {
          bankAccountId: existing.bankAccountId,
          changedFields: Object.keys(data).filter((k) => k !== 'accountNumber'),
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bankAccounts/${id}`);
      throw err;
    }
  };

  const setDefaultBankAccount = async (id: string): Promise<void> => {
    await updateBankAccount(id, { isDefault: true, status: 'active' });
  };

  const toggleBankAccountStatus = async (id: string): Promise<void> => {
    const acc = bankAccounts.find((b) => b.id === id);
    if (!acc) return;
    const nextStatus = acc.status === 'active' ? 'inactive' : 'active';
    const updates: Partial<BankAccount> = { status: nextStatus };
    if (nextStatus === 'inactive' && acc.isDefault) {
      updates.isDefault = false;
      const otherActive = bankAccounts.find((b) => b.id !== id && b.status === 'active');
      if (otherActive) {
        await updateBankAccount(otherActive.id, { isDefault: true });
      }
    }
    await updateBankAccount(id, updates);
    if (nextStatus === 'inactive') {
      await logActivity(
        'BANK_ACCOUNT_DEACTIVATED',
        'Bank Account Deactivated',
        `${userProfile?.name} deactivated bank account "${acc.bankName}" (${maskAccountNumber(acc.accountNumber)})`
      );
    }
  };

  const deleteBankAccount = async (id: string): Promise<void> => {
    const acc = bankAccounts.find((b) => b.id === id);
    if (!acc) return;
    try {
      await deleteDoc(doc(db, 'bankAccounts', id));
      await logActivity(
        'BANK_ACCOUNT_DEACTIVATED',
        'Bank Account Removed',
        `${userProfile?.name} removed bank account "${acc.bankName}" (${maskAccountNumber(acc.accountNumber)})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `bankAccounts/${id}`);
      throw err;
    }
  };

  // Branding & Template Settings (Phase 7 Requirements 4, 5, 6, 15, 18)
  const updateBrandingSettings = async (settings: Partial<BrandingSettings>): Promise<void> => {
    try {
      const updated = {
        ...brandingSettings,
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid || 'admin',
      };
      await setDoc(doc(db, 'brandingSettings', 'default'), cleanDataForFirestore(updated));
      setBrandingSettings(updated);

      await logActivity(
        'TEMPLATE_UPDATED',
        'Branding & Visual Identity Updated',
        `${userProfile?.name} updated corporate proposal branding colors & header configuration`,
        undefined,
        undefined,
        undefined,
        { changedFields: Object.keys(settings) }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'brandingSettings/default');
      throw err;
    }
  };

  const updateProposalTemplateSettings = async (settings: Partial<ProposalTemplateSettings>): Promise<void> => {
    try {
      const updated = {
        ...proposalTemplateSettings,
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid || 'admin',
      };
      await setDoc(doc(db, 'proposalTemplateSettings', 'default'), cleanDataForFirestore(updated));
      setProposalTemplateSettings(updated);

      await logActivity(
        'TEMPLATE_UPDATED',
        'Proposal Template Settings Updated',
        `${userProfile?.name} updated proposal template style & display rules`,
        undefined,
        undefined,
        undefined,
        { changedFields: Object.keys(settings) }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'proposalTemplateSettings/default');
      throw err;
    }
  };

  // Signatory Settings (Phase 7 Requirement 14, 18)
  const updateSignatorySettings = async (settings: Partial<SignatorySettings>): Promise<void> => {
    try {
      const updated = {
        ...signatorySettings,
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid || 'admin',
      };
      await setDoc(doc(db, 'signatorySettings', 'default'), cleanDataForFirestore(updated));
      setSignatorySettings(updated);

      await logActivity(
        'SIGNATURE_UPDATED',
        'Authorized Signatory Details Updated',
        `${userProfile?.name} updated authorized signatory details (${updated.signatoryName})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'signatorySettings/default');
      throw err;
    }
  };

  const uploadSignatorySignature = async (file: File): Promise<string> => {
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `signature_${Date.now()}.${ext}`;
      const storagePath = `signatures/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await updateSignatorySettings({ signatureImageUrl: downloadUrl, showSignature: true });
      await logActivity(
        'SIGNATURE_UPDATED',
        'Authorized Signature Image Uploaded',
        `${userProfile?.name} uploaded new authorized signature emblem`
      );
      return downloadUrl;
    } catch (err) {
      console.warn('Signature upload to storage failed, falling back to data URL:', err);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await updateSignatorySettings({ signatureImageUrl: base64, showSignature: true });
          await logActivity(
            'SIGNATURE_UPDATED',
            'Authorized Signature Image Uploaded',
            `${userProfile?.name} uploaded authorized signature (data URL fallback)`
          );
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSignatorySignature = async (): Promise<void> => {
    await updateSignatorySettings({ signatureImageUrl: '' });
    await logActivity(
      'SIGNATURE_UPDATED',
      'Authorized Signature Image Removed',
      `${userProfile?.name} removed the custom signature graphic`
    );
  };

  // Terms & Conditions (Phase 7 Requirement 12, 18)
  const addTerm = async (term: Omit<TermItem, 'id' | 'order'>): Promise<string> => {
    const id = `term_${Date.now()}`;
    const order = termsList.length + 1;
    const newTerm: TermItem = { ...term, id, order };

    try {
      await setDoc(doc(db, 'proposalTerms', id), cleanDataForFirestore(newTerm));
      await logActivity(
        'TERMS_UPDATED',
        'Proposal Terms Added',
        `${userProfile?.name} added proposal term "${newTerm.title}"`
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `proposalTerms/${id}`);
      throw err;
    }
  };

  const updateTerm = async (id: string, term: Partial<TermItem>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'proposalTerms', id), cleanDataForFirestore(term));
      await logActivity(
        'TERMS_UPDATED',
        'Proposal Terms Updated',
        `${userProfile?.name} updated proposal term "${term.title || id}"`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `proposalTerms/${id}`);
      throw err;
    }
  };

  const deleteTerm = async (id: string): Promise<void> => {
    const existing = termsList.find((t) => t.id === id);
    try {
      await deleteDoc(doc(db, 'proposalTerms', id));
      await logActivity(
        'TERMS_UPDATED',
        'Proposal Terms Deleted',
        `${userProfile?.name} deleted proposal term "${existing?.title || id}"`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `proposalTerms/${id}`);
      throw err;
    }
  };

  const reorderTerms = async (orderedIds: string[]): Promise<void> => {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        await updateDoc(doc(db, 'proposalTerms', id), { order: i + 1 });
      }
      await logActivity(
        'TERMS_UPDATED',
        'Proposal Terms Reordered',
        `${userProfile?.name} reordered proposal commercial terms`
      );
    } catch (err) {
      console.error('Failed to reorder terms:', err);
    }
  };

  // Proposal Numbering Configuration (Phase 7 Requirement 11, 18)
  const updateProposalNumberingSettings = async (
    settings: Partial<ProposalNumberingSettings>
  ): Promise<void> => {
    try {
      const updated = {
        ...proposalNumberingSettings,
        ...settings,
      };
      await setDoc(doc(db, 'proposalNumberingSettings', 'default'), cleanDataForFirestore(updated));
      setProposalNumberingSettings(updated);

      if (settings.prefix) {
        await updateCompanySettings({ proposalPrefix: settings.prefix });
      }

      await logActivity(
        'PROPOSAL_SETTINGS_UPDATED',
        'Proposal Numbering Config Updated',
        `${userProfile?.name} updated proposal numbering format (Prefix: ${updated.prefix}, Year: ${updated.yearFormat}, Digits: ${updated.sequenceDigits})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'proposalNumberingSettings/default');
      throw err;
    }
  };

  // Employee management
  const updateEmployeePermissions = async (
    userId: string,
    permissions: UserProfile['permissions']
  ): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        permissions,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      throw err;
    }
  };

  const updateEmployeeStatus = async (userId: string, status: UserProfile['status']): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      throw err;
    }
  };

  const updateEmployeeDetails = async (userId: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      throw err;
    }
  };

  // Seed sample data if database is fresh
  const seedInitialDataIfEmpty = async () => {
    if (!isAdmin) return;

    // Seed sample products
    const initialProducts: Omit<ProductItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        productId: 'PRD-1001',
        name: 'Enterprise Cloud Firewall Appliance',
        productCode: 'FW-ENT-500',
        description: 'Next-Gen hardware firewall with AI threat detection, 10Gbps throughput',
        unit: 'Unit',
        price: 185000,
        gstRate: 18,
        discountAvailable: true,
        active: true,
      },
      {
        productId: 'PRD-1002',
        name: 'Managed Core Switch 48-Port PoE+',
        productCode: 'SW-CORE-48',
        description: 'Layer 3 Managed Gigabit Switch with redundant dual power supply',
        unit: 'Unit',
        price: 95000,
        gstRate: 18,
        discountAvailable: true,
        active: true,
      },
      {
        productId: 'PRD-1003',
        name: 'Biometric Access Controller & Attendance System',
        productCode: 'BIO-ACC-X2',
        description: 'Face recognition + Fingerprint reader with IP65 outdoor casing',
        unit: 'Set',
        price: 32000,
        gstRate: 18,
        discountAvailable: true,
        active: true,
      },
      {
        productId: 'PRD-1004',
        name: 'Wi-Fi 7 High-Density Access Point',
        productCode: 'AP-WIFI7-PRO',
        description: 'Multi-gigabit ceiling mount wireless AP for high-density corporate halls',
        unit: 'Unit',
        price: 48000,
        gstRate: 18,
        discountAvailable: true,
        active: true,
      },
    ];

    for (const prod of initialProducts) {
      await addProduct(prod);
    }

    // Seed sample services
    const initialServices: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        serviceId: 'SRV-2001',
        name: 'Annual Infrastructure Maintenance & SLA (24x7)',
        description: 'Comprehensive preventive maintenance, firmware patching & 4-hour SLA response',
        price: 120000,
        gstRate: 18,
        duration: '1 Year',
        terms: 'Includes 4 scheduled quarterly visits and unlimited remote emergency support.',
        active: true,
      },
      {
        serviceId: 'SRV-2002',
        name: 'Onsite Deployment & Network Commissioning',
        description: 'Structured rack installation, VLAN routing, security auditing & acceptance testing',
        price: 45000,
        gstRate: 18,
        duration: '3 Days',
        terms: 'Work to be executed during business hours or coordinated weekend downtime.',
        active: true,
      },
      {
        serviceId: 'SRV-2003',
        name: 'Cloud Security Audit & Penetration Testing',
        description: 'Vulnerability assessment, policy review, and executive compliance report',
        price: 85000,
        gstRate: 18,
        duration: '2 Weeks',
        terms: 'Detailed remediation guidelines provided within 5 business days after test conclusion.',
        active: true,
      },
    ];

    for (const srv of initialServices) {
      await addService(srv);
    }

    // Seed sample customers
    const initialCustomers: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>[] = [
      {
        customerId: 'CUST-00101',
        companyName: 'Zephyr Biotech Laboratories',
        contactPerson: 'Dr. Vikram Malhotra',
        mobile: '+91 98230 11223',
        alternateNumber: '+91 98230 99887',
        email: 'v.malhotra@zephyrbiotech.com',
        gstNumber: '27AABCZ9988D1Z2',
        address: 'B-Block, Infinity Biotech Park',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411057',
        leadSource: 'Exhibition',
        assignedEmployeeName: userProfile?.name || 'Administrator',
        assignedEmployeeId: userProfile?.uid || 'admin',
        status: 'Proposal Sent',
        nextFollowUp: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        notes: 'Requested proposal for dual firewall upgrade and Wi-Fi 7 deployment in laboratory wing.',
      },
      {
        customerId: 'CUST-00102',
        companyName: 'NexGen FinTech Services',
        contactPerson: 'Ananya Deshmukh',
        mobile: '+91 97654 33221',
        alternateNumber: '+91 22 6677 8899',
        email: 'ananya@nexgenfin.in',
        gstNumber: '27AABCN4433E1Z4',
        address: 'Level 14, One World Center',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400013',
        leadSource: 'Referral',
        assignedEmployeeName: userProfile?.name || 'Administrator',
        assignedEmployeeId: userProfile?.uid || 'admin',
        status: 'Won',
        notes: 'Signed 1-year 24x7 AMC contract and deployment services.',
      },
    ];

    for (const cust of initialCustomers) {
      await addCustomer(cust);
    }

    // Seed sample leads
    const initialLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>[] = [
      {
        leadId: 'LEAD-9001',
        companyName: 'GreenLeaf Agro Logistics',
        contactPerson: 'Rajesh Kulkarni',
        mobile: '+91 94220 55443',
        email: 'rajesh@greenleaflogistics.com',
        gstNumber: '27AACCG1122M1ZQ',
        address: 'Plot 88, Logistics Corridor',
        city: 'Nagpur',
        state: 'Maharashtra',
        pincode: '440023',
        leadSource: 'Google Ads',
        assignedEmployeeName: userProfile?.name || 'Administrator',
        assignedEmployeeId: userProfile?.uid || 'admin',
        status: 'Interested',
        nextFollowUp: new Date().toISOString().split('T')[0],
        notes: 'Requires biometric attendance across 4 regional packhouses. Call scheduled for today.',
      },
      {
        leadId: 'LEAD-9002',
        companyName: 'Horizon Automations & Robotics',
        contactPerson: 'Kunal Singhania',
        mobile: '+91 98110 77665',
        email: 'kunal@horizonautomations.com',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560068',
        leadSource: 'LinkedIn Campaign',
        assignedEmployeeName: userProfile?.name || 'Administrator',
        assignedEmployeeId: userProfile?.uid || 'admin',
        status: 'Meeting',
        nextFollowUp: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: 'Meeting scheduled to discuss plant core switch architecture.',
      },
    ];

    for (const lead of initialLeads) {
      await addLead(lead);
    }
  };

  // Meetings management
  const addMeeting = async (
    data: Omit<MeetingRecord, 'id' | 'createdAt'>
  ): Promise<string> => {
    const meetingId = `MTG-${Date.now().toString().slice(-6)}`;
    const id = `mtg_${Date.now()}`;
    const newMeeting: MeetingRecord = {
      ...data,
      id,
      meetingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'meetings', id), cleanDataForFirestore(newMeeting));
      await logActivity(
        'meeting_scheduled',
        'Meeting Scheduled',
        `${userProfile?.name} scheduled meeting "${data.title}" with ${data.contactPerson} (${data.companyName}) on ${data.date} at ${data.time}`,
        data.customerId,
        data.leadId
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `meetings/${id}`);
      throw err;
    }
  };

  const updateMeeting = async (id: string, data: Partial<MeetingRecord>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'meetings', id), cleanDataForFirestore({
        ...data,
        updatedAt: new Date().toISOString(),
      }));
      await logActivity(
        'meeting_scheduled',
        'Meeting Updated',
        `${userProfile?.name} updated meeting details (${data.title || id})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `meetings/${id}`);
      throw err;
    }
  };

  const deleteMeeting = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
      await logActivity(
        'meeting_scheduled',
        'Meeting Cancelled/Deleted',
        `${userProfile?.name} removed meeting record`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `meetings/${id}`);
      throw err;
    }
  };

  // WhatsApp and Email Logging
  const logWhatsApp = async (data: Omit<WhatsAppRecord, 'id' | 'timestamp'>): Promise<string> => {
    const id = `wa_${Date.now()}`;
    const activityId = `WA-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newRecord: WhatsAppRecord = {
      ...data,
      id,
      whatsappActivityId: activityId,
      phoneNumber: data.phoneNumber || data.mobile,
      messageType: data.messageType || 'Custom Message',
      status: 'Opened WhatsApp',
      createdAt: nowIso,
      timestamp: nowIso,
    };
    try {
      await setDoc(doc(db, 'whatsappActivities', id), cleanDataForFirestore(newRecord));
      await logActivity(
        'WHATSAPP_OPENED',
        'WhatsApp Launched',
        `${data.employeeName} opened WhatsApp with ${data.phoneNumber || data.mobile}: "${data.message.slice(0, 75)}..." [${data.messageType || 'Custom'}]`,
        data.customerId,
        data.leadId,
        undefined,
        { whatsappActivityId: activityId, messageType: data.messageType || 'Custom', status: 'Opened WhatsApp' }
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `whatsappActivities/${id}`);
      throw err;
    }
  };

  const logEmail = async (data: Omit<EmailRecord, 'id' | 'sentAt'>): Promise<string> => {
    const id = `email_${Date.now()}`;
    const newEmail: EmailRecord = {
      ...data,
      id,
      sentAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'emails', id), cleanDataForFirestore(newEmail));
      await logActivity(
        'email_sent',
        'Email Dispatched',
        `${data.employeeName} dispatched email to ${data.recipient} (Subject: "${data.subject}")`,
        data.customerId
      );
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `emails/${id}`);
      throw err;
    }
  };

  // Bulk Upload Engine (Phase 8 Requirements 13, 14, 15, 16, 18, 25, 29, 30)
  const bulkImportData = async (
    options: BulkImportExecuteOptions
  ): Promise<BulkImportResultSummary> => {
    const importId = `IMP-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const uploadedBy = userProfile?.uid || 'user';
    const uploadedByName = userProfile?.name || 'User';

    // 1. Initial import history record (Processing)
    const initialRecord: ImportHistoryRecord = {
      id: importId,
      importId,
      fileName: options.fileName,
      fileType: options.fileType,
      recordType: options.recordType,
      uploadedBy,
      uploadedByName,
      uploadedAt: nowIso,
      totalRows: options.totalFileRows,
      importedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      invalidRows: 0,
      failedRows: 0,
      status: 'Processing',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'importHistory', importId), cleanDataForFirestore(initialRecord));
      await logActivity(
        'BULK_UPLOAD_STARTED',
        'Bulk Import Started',
        `${uploadedByName} initiated bulk upload for ${options.recordType} from "${options.fileName}" (${options.records.length} rows)`,
        undefined,
        undefined,
        undefined,
        { importId, fileName: options.fileName, recordType: options.recordType }
      );
    } catch (e) {
      console.warn('Failed to record initial import history document:', e);
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;
    let failedCount = 0;
    const failedDetails: { rowIndex: number; error: string; companyName?: string }[] = [];

    // Filter by action
    const eligibleRecords = options.records.filter((r) => {
      if (!r.isValid || r.isExampleRow) {
        invalidCount++;
        return false;
      }
      if (r.action === 'skip') {
        skippedCount++;
        return false;
      }
      return r.action === 'new' || r.action === 'update';
    });

    const totalToProcess = eligibleRecords.length;
    let processedSoFar = 0;

    // Determine current ID sequences
    let custNumSeq = 1;
    if (options.recordType === 'customers') {
      const prefix = 'CUST-';
      const nums = customers
        .map((c) => c.customerId)
        .filter((id) => id && id.startsWith(prefix))
        .map((id) => parseInt(id.replace(prefix, ''), 10))
        .filter((n) => !isNaN(n));
      custNumSeq = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    }

    let leadNumSeq = 1;
    if (options.recordType === 'leads') {
      const prefix = 'LEAD-';
      const nums = leads
        .map((l) => l.leadId)
        .filter((id) => id && id.startsWith(prefix))
        .map((id) => parseInt(id.replace(prefix, ''), 10))
        .filter((n) => !isNaN(n));
      leadNumSeq = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    }

    // Chunk into manageable batches of 50 operations for safe Firestore writes
    const CHUNK_SIZE = 50;
    for (let i = 0; i < eligibleRecords.length; i += CHUNK_SIZE) {
      const chunk = eligibleRecords.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j];
        const recordIndex = i + j;

        try {
          if (item.action === 'new') {
            if (options.recordType === 'customers') {
              const custId = `CUST-${(custNumSeq++).toString().padStart(4, '0')}`;
              const docId = `cust_${Date.now()}_${recordIndex}_${Math.floor(Math.random() * 1000)}`;
              const newCustomer: Customer = {
                id: docId,
                customerId: custId,
                companyName: item.companyName,
                contactPerson: item.contactPerson || '',
                mobile: item.mobile,
                alternateMobile: item.alternateMobile || '',
                alternateNumber: item.alternateMobile || '',
                email: item.email || '',
                gstNumber: item.gstNumber || '',
                address: item.address || '',
                city: item.city || '',
                state: item.state || '',
                pincode: item.pincode || '',
                leadSource: item.leadSource || 'Bulk Import',
                assignedEmployeeId: item.assignedEmployeeId || '',
                assignedEmployeeName: item.assignedEmployeeName || 'Unassigned',
                status: (item.status as CustomerStatus) || 'New',
                nextFollowupDate: item.nextFollowUpDate || '',
                nextFollowupTime: item.nextFollowUpTime || '',
                nextFollowUp: item.nextFollowUpDate || '',
                notes: item.notes || '',
                source: 'bulk_import',
                importId,
                isArchived: false,
                createdAt: nowIso,
                updatedAt: nowIso,
                createdBy: uploadedByName,
                updatedBy: uploadedByName,
              };
              batch.set(doc(db, 'customers', docId), cleanDataForFirestore(newCustomer));
            } else {
              const leadId = `LEAD-${(leadNumSeq++).toString().padStart(4, '0')}`;
              const docId = `lead_${Date.now()}_${recordIndex}_${Math.floor(Math.random() * 1000)}`;
              const newLead: Lead = {
                id: docId,
                leadId,
                companyName: item.companyName,
                contactPerson: item.contactPerson || '',
                mobile: item.mobile,
                alternateMobile: item.alternateMobile || '',
                alternateNumber: item.alternateMobile || '',
                email: item.email || '',
                gstNumber: item.gstNumber || '',
                address: item.address || '',
                city: item.city || '',
                state: item.state || '',
                pincode: item.pincode || '',
                leadSource: item.leadSource || 'Bulk Import',
                assignedEmployeeId: item.assignedEmployeeId || '',
                assignedEmployeeName: item.assignedEmployeeName || 'Unassigned',
                status: item.status || 'New',
                estimatedValue: item.estimatedValue || 0,
                nextFollowupDate: item.nextFollowUpDate || '',
                nextFollowupTime: item.nextFollowUpTime || '',
                nextFollowUp: item.nextFollowUpDate || '',
                notes: item.notes || '',
                source: 'bulk_import',
                importId,
                isConverted: false,
                isArchived: false,
                createdAt: nowIso,
                updatedAt: nowIso,
                createdBy: uploadedByName,
                updatedBy: uploadedByName,
              };
              batch.set(doc(db, 'leads', docId), cleanDataForFirestore(newLead));
            }
            importedCount++;
          } else if (item.action === 'update' && item.matchedRecord?.docId) {
            // Only update non-blank fields to protect existing CRM values
            const collectionName = options.recordType === 'customers' ? 'customers' : 'leads';
            const targetDocRef = doc(db, collectionName, item.matchedRecord.docId);

            const updatePayload: Record<string, any> = {
              updatedAt: nowIso,
              updatedBy: uploadedByName,
              lastImportId: importId,
            };
            if (item.companyName) updatePayload.companyName = item.companyName;
            if (item.contactPerson) updatePayload.contactPerson = item.contactPerson;
            if (item.mobile) updatePayload.mobile = item.mobile;
            if (item.alternateMobile) updatePayload.alternateMobile = item.alternateMobile;
            if (item.email) updatePayload.email = item.email;
            if (item.gstNumber) updatePayload.gstNumber = item.gstNumber;
            if (item.address) updatePayload.address = item.address;
            if (item.city) updatePayload.city = item.city;
            if (item.state) updatePayload.state = item.state;
            if (item.pincode) updatePayload.pincode = item.pincode;
            if (item.leadSource) updatePayload.leadSource = item.leadSource;
            if (item.assignedEmployeeId) {
              updatePayload.assignedEmployeeId = item.assignedEmployeeId;
              updatePayload.assignedEmployeeName = item.assignedEmployeeName;
            }
            if (item.status) updatePayload.status = item.status;
            if (item.estimatedValue !== undefined) updatePayload.estimatedValue = item.estimatedValue;
            if (item.nextFollowUpDate) {
              updatePayload.nextFollowupDate = item.nextFollowUpDate;
              updatePayload.nextFollowUp = item.nextFollowUpDate;
            }
            if (item.nextFollowUpTime) updatePayload.nextFollowupTime = item.nextFollowUpTime;
            if (item.notes) updatePayload.notes = item.notes;

            batch.update(targetDocRef, cleanDataForFirestore(updatePayload));
            updatedCount++;
          }
        } catch (itemErr: any) {
          failedCount++;
          failedDetails.push({
            rowIndex: item.rowIndex,
            companyName: item.companyName,
            error: itemErr.message || 'Validation or mapping failed',
          });
        }
      }

      try {
        await batch.commit();
        processedSoFar += chunk.length;
        options.onProgress?.(processedSoFar, totalToProcess);
      } catch (batchErr: any) {
        console.error('Batch commit failed:', batchErr);
        failedCount += chunk.length;
        chunk.forEach((c) => {
          failedDetails.push({
            rowIndex: c.rowIndex,
            companyName: c.companyName,
            error: batchErr.message || 'Firestore batch write failed',
          });
        });
      }
    }

    // Determine final status
    const finalStatus =
      failedCount === 0
        ? 'Completed'
        : failedCount < totalToProcess
        ? 'Completed with Errors'
        : 'Failed';

    // Prepare error report from invalid rows and failed rows
    const errorReport = [
      ...options.records
        .filter((r) => !r.isValid)
        .map((r) => ({
          rowIndex: r.rowIndex,
          companyName: r.companyName,
          mobile: r.mobile,
          email: r.email,
          gstNumber: r.gstNumber,
          error: r.errors.join('; '),
          duplicateStatus: r.duplicateStatus,
          suggestedAction: 'Fix format or required fields in spreadsheet',
        })),
      ...failedDetails.map((f) => ({
        rowIndex: f.rowIndex,
        companyName: f.companyName,
        error: f.error,
        suggestedAction: 'Retry import',
      })),
    ];

    const completedRecord: ImportHistoryRecord = {
      ...initialRecord,
      totalRows: options.totalFileRows,
      importedRows: importedCount,
      updatedRows: updatedCount,
      skippedRows: skippedCount,
      invalidRows: invalidCount,
      failedRows: failedCount,
      status: finalStatus,
      errorReport: errorReport.length > 0 ? errorReport.slice(0, 100) : undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'importHistory', importId), cleanDataForFirestore(completedRecord));

      // Activity logs
      if (options.recordType === 'customers') {
        if (importedCount > 0) {
          await logActivity(
            'CUSTOMER_IMPORTED',
            'Customers Imported in Bulk',
            `Successfully imported ${importedCount} new customers from file "${options.fileName}" [Import ID: ${importId}]`,
            undefined,
            undefined,
            undefined,
            { importId, importedCount, fileName: options.fileName }
          );
        }
        if (updatedCount > 0) {
          await logActivity(
            'CUSTOMER_UPDATED_FROM_IMPORT',
            'Customers Updated from Bulk Import',
            `Updated ${updatedCount} existing customer records from file "${options.fileName}" [Import ID: ${importId}]`,
            undefined,
            undefined,
            undefined,
            { importId, updatedCount, fileName: options.fileName }
          );
        }
      } else {
        if (importedCount > 0) {
          await logActivity(
            'LEAD_IMPORTED',
            'Leads Imported in Bulk',
            `Successfully imported ${importedCount} new leads from file "${options.fileName}" [Import ID: ${importId}]`,
            undefined,
            undefined,
            undefined,
            { importId, importedCount, fileName: options.fileName }
          );
        }
        if (updatedCount > 0) {
          await logActivity(
            'LEAD_UPDATED_FROM_IMPORT',
            'Leads Updated from Bulk Import',
            `Updated ${updatedCount} existing lead records from file "${options.fileName}" [Import ID: ${importId}]`,
            undefined,
            undefined,
            undefined,
            { importId, updatedCount, fileName: options.fileName }
          );
        }
      }

      await logActivity(
        finalStatus === 'Failed' ? 'BULK_UPLOAD_FAILED' : 'BULK_UPLOAD_COMPLETED',
        finalStatus === 'Failed' ? 'Bulk Upload Failed' : 'Bulk Upload Completed',
        `Bulk import process finished with status "${finalStatus}" (${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped, ${invalidCount} invalid, ${failedCount} failed) [Import ID: ${importId}]`,
        undefined,
        undefined,
        undefined,
        { importId, finalStatus, totalRows: options.totalFileRows }
      );
    } catch (saveErr) {
      console.warn('Failed to update import history completion document:', saveErr);
    }

    return {
      importId,
      totalRows: options.totalFileRows,
      importedRows: importedCount,
      updatedRows: updatedCount,
      skippedRows: skippedCount,
      invalidRows: invalidCount,
      failedRows: failedCount,
      status: finalStatus,
      failedDetails,
    };
  };

  const deleteImportHistory = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'importHistory', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `importHistory/${id}`);
      throw err;
    }
  };

  // ==================== PHASE 9: NOTIFICATIONS SYSTEM ====================

  const createNotification = async (
    notification: Omit<NotificationRecord, 'id' | 'notificationId' | 'createdAt' | 'read'>
  ): Promise<string> => {
    const id = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotif: NotificationRecord = {
      ...notification,
      id,
      notificationId: `NOTIF-${Date.now().toString().slice(-6)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'notifications', id), cleanDataForFirestore(newNotif));
      return id;
    } catch (err) {
      console.warn('Could not record notification:', err);
      return id;
    }
  };

  const markNotificationAsRead = async (id: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.warn('Could not mark notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async (): Promise<void> => {
    const unread = notifications.filter(
      (n) => !n.read && (isAdmin || n.userId === 'all_admins' || n.userId === userProfile?.uid)
    );
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Could not mark all notifications as read:', err);
    }
  };

  // ==================== PHASE 9: EMAIL TEMPLATES & SETTINGS ====================

  const saveEmailTemplate = async (
    template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { id?: string }
  ): Promise<string> => {
    const nowIso = new Date().toISOString();
    const id = template.id || `tpl_${Date.now()}`;
    const templateRecord: EmailTemplate = {
      ...template,
      id,
      templateId: template.templateId || `TPL-${Date.now().toString().slice(-4)}`,
      createdBy: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedBy: userProfile?.name || 'Administrator',
      updatedAt: nowIso,
    };
    try {
      await setDoc(doc(db, 'emailTemplates', id), cleanDataForFirestore(templateRecord), { merge: true });
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `emailTemplates/${id}`);
      throw err;
    }
  };

  const deleteEmailTemplate = async (templateId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'emailTemplates', templateId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `emailTemplates/${templateId}`);
      throw err;
    }
  };

  const updateEmailSettings = async (settings: Partial<EmailSettings>): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updated: EmailSettings = {
      ...emailSettings,
      ...settings,
      updatedAt: nowIso,
      updatedBy: userProfile?.name || 'Administrator',
    };
    // Ensure secrets are NEVER stored in publicly readable Firestore
    const firestoreData: any = { ...cleanDataForFirestore(updated) };
    delete firestoreData.smtpPass;
    delete firestoreData.apiKey;

    try {
      await setDoc(doc(db, 'emailSettings', 'default'), firestoreData, { merge: true });
    } catch (err) {
      console.warn('Could not write emailSettings to Firestore:', err);
    }
    setEmailSettings(updated);
  };

  const testEmailConnection = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/email/test-connection', { method: 'POST' });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to email service' };
    }
  };

  // ==================== PHASE 9: PROPOSAL EMAIL SENDING & RETRY ====================

  const sendProposalEmail = async (params: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
    proposal: ProposalRecord;
    pdfBase64?: string;
    attachmentName?: string;
    retryOfEmailId?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const nowIso = new Date().toISOString();
    const emailId = `email_${Date.now()}`;
    const empId = userProfile?.uid || 'user';
    const empName = userProfile?.name || 'Administrator';

    let attachmentSize = 0;
    if (params.pdfBase64) {
      const rawData = params.pdfBase64.includes('base64,') ? params.pdfBase64.split('base64,')[1] : params.pdfBase64;
      attachmentSize = Math.round((rawData.length * 3) / 4);
    }

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject,
          body: params.message,
          pdfBase64: params.pdfBase64,
          attachmentName: params.attachmentName || `${params.proposal.proposalNumber}.pdf`,
          proposalNumber: params.proposal.proposalNumber,
          proposalId: params.proposal.id,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.status === 'Sent') {
        const sentRecord: EmailRecord = {
          id: emailId,
          emailId,
          customerId: params.proposal.customerId,
          proposalId: params.proposal.id,
          proposalNumber: params.proposal.proposalNumber,
          companyName: params.proposal.customerName,
          recipient: params.to,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          senderName: emailSettings.senderName || 'SparkGenTechnology',
          senderEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
          replyTo: emailSettings.replyTo,
          subject: params.subject,
          message: params.message,
          body: params.message,
          status: 'Sent',
          providerMessageId: resData.providerMessageId,
          attachmentName: params.attachmentName || `${params.proposal.proposalNumber}.pdf`,
          hasAttachment: !!params.pdfBase64,
          attachmentSize,
          sentAt: nowIso,
          createdAt: nowIso,
          employeeId: empId,
          employeeName: empName,
          retryOfEmailId: params.retryOfEmailId,
        };

        await setDoc(doc(db, 'emails', emailId), cleanDataForFirestore(sentRecord));

        // Part 4 requirement: Store proposal email status and history
        const commDocId = `comm_${emailId}`;
        const commRecord = {
          id: commDocId,
          channel: 'EMAIL' as const,
          type: 'Proposal Email' as const,
          category: 'Proposal' as const,
          proposalId: params.proposal.id,
          proposalNumber: params.proposal.proposalNumber,
          customerId: params.proposal.customerId,
          customerName: params.proposal.customerName,
          recipient: params.to,
          recipientEmail: params.to,
          fromEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
          senderEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
          senderName: emailSettings.senderName || 'SparkGenTechnology',
          subject: params.subject,
          body: params.message,
          provider: (emailSettings.provider || 'smtp').toUpperCase(),
          status: 'SENT',
          sentAt: nowIso,
          messageId: resData.providerMessageId || '',
          providerMessageId: resData.providerMessageId || '',
          attachmentName: params.attachmentName || `${params.proposal.proposalNumber}.pdf`,
          hasAttachment: !!params.pdfBase64,
          attachmentSize,
          createdBy: empId,
          createdAt: nowIso,
        };
        try {
          await setDoc(doc(db, 'communicationRecords', commDocId), cleanDataForFirestore(commRecord));
        } catch (commErr) {
          console.warn('Failed to record in communicationRecords:', commErr);
        }

        // If status is Draft or Generated, update to Sent (Section 9)
        if (params.proposal.status === 'Draft' || params.proposal.status === 'Generated') {
          await updateDoc(doc(db, 'proposals', params.proposal.id), {
            status: 'Sent',
            sentAt: nowIso,
            updatedAt: nowIso,
          });
        }

        // Proposal email activities (Section 7)
        await logActivity(
          'PROPOSAL_EMAIL_SENT',
          'Proposal Sent via Email',
          `${empName} dispatched commercial proposal ${params.proposal.proposalNumber} to ${params.to}`,
          params.proposal.customerId,
          undefined,
          params.proposal.stsId,
          { proposalId: params.proposal.id, proposalNumber: params.proposal.proposalNumber, recipient: params.to }
        );
        await logActivity(
          'EMAIL_SENT',
          'Email Sent',
          `Dispatched email to ${params.to}: "${params.subject}"`,
          params.proposal.customerId,
          undefined,
          undefined,
          { emailId, proposalId: params.proposal.id }
        );

        // Notification
        await createNotification({
          userId: 'all_admins',
          type: 'PROPOSAL_SENT',
          title: `Proposal ${params.proposal.proposalNumber} Sent`,
          message: `${empName} sent proposal ${params.proposal.proposalNumber} to ${params.proposal.customerName} (${params.to})`,
          relatedId: params.proposal.id,
          relatedType: 'proposal',
        });

        return { success: true, messageId: resData.providerMessageId };
      } else {
        // Sending failed
        const errorMsg = resData.error || 'Failed to dispatch email';
        const failedRecord: EmailRecord = {
          id: emailId,
          emailId,
          customerId: params.proposal.customerId,
          proposalId: params.proposal.id,
          proposalNumber: params.proposal.proposalNumber,
          companyName: params.proposal.customerName,
          recipient: params.to,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          senderName: emailSettings.senderName || 'SparkGenTechnology',
          senderEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
          replyTo: emailSettings.replyTo,
          subject: params.subject,
          message: params.message,
          body: params.message,
          status: 'Failed',
          errorMessage: errorMsg,
          attachmentName: params.attachmentName || `${params.proposal.proposalNumber}.pdf`,
          hasAttachment: !!params.pdfBase64,
          attachmentSize,
          sentAt: nowIso,
          createdAt: nowIso,
          employeeId: empId,
          employeeName: empName,
          retryOfEmailId: params.retryOfEmailId,
        };

        await setDoc(doc(db, 'emails', emailId), cleanDataForFirestore(failedRecord));

        // Part 4 requirement: Record failed email status in communicationRecords
        const failedCommDocId = `comm_${emailId}`;
        const failedCommRecord = {
          id: failedCommDocId,
          channel: 'EMAIL' as const,
          type: 'Proposal Email' as const,
          category: 'Proposal' as const,
          proposalId: params.proposal.id,
          proposalNumber: params.proposal.proposalNumber,
          customerId: params.proposal.customerId,
          customerName: params.proposal.customerName,
          recipient: params.to,
          recipientEmail: params.to,
          fromEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
          senderEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
          senderName: emailSettings.senderName || 'SparkGenTechnology',
          subject: params.subject,
          body: params.message,
          provider: (emailSettings.provider || 'smtp').toUpperCase(),
          status: 'FAILED',
          errorMessage: errorMsg,
          attachmentName: params.attachmentName || `${params.proposal.proposalNumber}.pdf`,
          hasAttachment: !!params.pdfBase64,
          attachmentSize,
          sentAt: nowIso,
          messageId: '',
          createdBy: empId,
          createdAt: nowIso,
        };
        try {
          await setDoc(doc(db, 'communicationRecords', failedCommDocId), cleanDataForFirestore(failedCommRecord));
        } catch (commErr) {
          console.warn('Failed to record failed status in communicationRecords:', commErr);
        }

        await logActivity(
          'EMAIL_FAILED',
          'Email Dispatch Failed',
          `Failed to deliver proposal ${params.proposal.proposalNumber} to ${params.to}: ${errorMsg}`,
          params.proposal.customerId,
          undefined,
          undefined,
          { emailId, error: errorMsg }
        );

        // Failure notification (Section 27)
        await createNotification({
          userId: empId,
          type: 'EMAIL_FAILED',
          title: `Proposal Email Failed: ${params.proposal.proposalNumber}`,
          message: `Could not send email to ${params.to}. Reason: ${errorMsg}`,
          relatedId: emailId,
          relatedType: 'email',
        });

        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('SendProposalEmail catch:', err);
      return { success: false, error: err.message || 'Network or server error while sending email' };
    }
  };

  const retryEmail = async (emailId: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const original = emailRecords.find((e) => e.id === emailId || e.emailId === emailId);
    if (!original) {
      return { success: false, error: 'Original email record not found' };
    }

    const prop = proposals.find((p) => p.id === original.proposalId || p.proposalNumber === original.proposalNumber);
    if (!prop) {
      return { success: false, error: 'Associated proposal record no longer exists' };
    }

    await logActivity(
      'EMAIL_RETRY',
      'Email Delivery Retried',
      `${userProfile?.name || 'Administrator'} re-attempted sending email to ${original.recipient} (Original: ${emailId})`,
      original.customerId,
      original.leadId,
      undefined,
      { originalEmailId: emailId, proposalId: prop.id }
    );

    return sendProposalEmail({
      to: original.recipient,
      cc: original.cc,
      bcc: original.bcc,
      subject: original.subject,
      message: original.message || original.body || '',
      proposal: prop,
      retryOfEmailId: emailId,
    });
  };

  // ==================== PHASE 9: PROPOSAL VIEW TRACKING & RESPONSE ====================

  const recordProposalView = async (proposalId: string, viewerToken: string): Promise<void> => {
    const sessionKey = `viewed_proposal_${proposalId}`;
    if (sessionStorage.getItem(sessionKey)) {
      return; // Do not count every page refresh (Section 11)
    }
    sessionStorage.setItem(sessionKey, 'true');

    const prop = proposals.find((p) => p.id === proposalId || p.proposalNumber === proposalId || p.viewToken === proposalId);
    if (!prop) return;

    const nowIso = new Date().toISOString();
    const viewEventId = `view_${Date.now()}`;

    try {
      await setDoc(doc(db, 'proposalViews', viewEventId), {
        id: viewEventId,
        proposalId: prop.id,
        proposalNumber: prop.proposalNumber,
        viewerToken,
        eventType: 'VIEWED',
        timestamp: nowIso,
      });

      if (prop.status === 'Sent') {
        await updateDoc(doc(db, 'proposals', prop.id), {
          status: 'Viewed',
          viewedAt: nowIso,
          updatedAt: nowIso,
        });
      }

      await logActivity(
        'PROPOSAL_VIEWED',
        'Proposal Viewed Online',
        `Client opened commercial proposal ${prop.proposalNumber} [${prop.customerName}] via secure viewer link`,
        prop.customerId,
        undefined,
        prop.stsId,
        { proposalId: prop.id, proposalNumber: prop.proposalNumber, viewerToken }
      );

      await createNotification({
        userId: 'all_admins',
        type: 'PROPOSAL_VIEWED',
        title: `Proposal Viewed: ${prop.proposalNumber}`,
        message: `${prop.customerName} has opened proposal ${prop.proposalNumber}`,
        relatedId: prop.id,
        relatedType: 'proposal',
      });

      if (prop.assignedEmployeeId) {
        await createNotification({
          userId: prop.assignedEmployeeId,
          type: 'PROPOSAL_VIEWED',
          title: `Proposal Viewed: ${prop.proposalNumber}`,
          message: `${prop.customerName} has opened proposal ${prop.proposalNumber}`,
          relatedId: prop.id,
          relatedType: 'proposal',
        });
      }
    } catch (err) {
      console.warn('Could not record proposal view event:', err);
    }
  };

  const recordProposalCustomerResponse = async (
    proposalId: string,
    decision: 'accept' | 'reject',
    clientName: string,
    reason?: string
  ): Promise<void> => {
    const prop = proposals.find((p) => p.id === proposalId || p.proposalNumber === proposalId || p.viewToken === proposalId);
    if (!prop) return;

    const nowIso = new Date().toISOString();
    const eventId = `resp_${Date.now()}`;
    const cleanClientName = clientName.trim() || 'Client (via proposal link)';

    try {
      await setDoc(doc(db, 'proposalViews', eventId), {
        id: eventId,
        proposalId: prop.id,
        proposalNumber: prop.proposalNumber,
        eventType: decision === 'accept' ? 'ACCEPTED' : 'REJECTED',
        customerResponse: decision === 'accept' ? 'Accepted' : 'Rejected',
        responseReason: reason || '',
        acceptedBy: decision === 'accept' ? cleanClientName : undefined,
        timestamp: nowIso,
      });

      if (decision === 'accept') {
        await updateDoc(doc(db, 'proposals', prop.id), {
          status: 'Accepted',
          acceptedAt: nowIso,
          acceptedBy: cleanClientName,
          updatedAt: nowIso,
        });

        await logActivity(
          'PROPOSAL_ACCEPTED',
          'Proposal Accepted by Client',
          `${cleanClientName} accepted proposal ${prop.proposalNumber} for ₹${prop.grandTotal.toLocaleString()}`,
          prop.customerId,
          undefined,
          prop.stsId,
          { proposalId: prop.id, proposalNumber: prop.proposalNumber, acceptedBy: cleanClientName }
        );

        await createNotification({
          userId: 'all_admins',
          type: 'PROPOSAL_ACCEPTED',
          title: `Proposal Accepted 🎉: ${prop.proposalNumber}`,
          message: `${cleanClientName} has accepted proposal ${prop.proposalNumber} for ₹${prop.grandTotal.toLocaleString()}!`,
          relatedId: prop.id,
          relatedType: 'proposal',
        });

        if (prop.assignedEmployeeId) {
          await createNotification({
            userId: prop.assignedEmployeeId,
            type: 'PROPOSAL_ACCEPTED',
            title: `Proposal Accepted 🎉: ${prop.proposalNumber}`,
            message: `${cleanClientName} accepted proposal ${prop.proposalNumber}!`,
            relatedId: prop.id,
            relatedType: 'proposal',
          });
        }
      } else {
        await updateDoc(doc(db, 'proposals', prop.id), {
          status: 'Rejected',
          rejectedAt: nowIso,
          rejectionReason: reason || 'Declined by customer',
          updatedAt: nowIso,
        });

        await logActivity(
          'PROPOSAL_REJECTED',
          'Proposal Rejected by Client',
          `${cleanClientName} declined proposal ${prop.proposalNumber}: "${reason || 'No specific reason given'}"`,
          prop.customerId,
          undefined,
          prop.stsId,
          { proposalId: prop.id, proposalNumber: prop.proposalNumber, rejectionReason: reason }
        );

        await createNotification({
          userId: 'all_admins',
          type: 'PROPOSAL_REJECTED',
          title: `Proposal Rejected: ${prop.proposalNumber}`,
          message: `${cleanClientName} declined proposal ${prop.proposalNumber}. Reason: "${reason || 'No reason'}"`,
          relatedId: prop.id,
          relatedType: 'proposal',
        });

        if (prop.assignedEmployeeId) {
          await createNotification({
            userId: prop.assignedEmployeeId,
            type: 'PROPOSAL_REJECTED',
            title: `Proposal Rejected: ${prop.proposalNumber}`,
            message: `${cleanClientName} declined proposal ${prop.proposalNumber}.`,
            relatedId: prop.id,
            relatedType: 'proposal',
          });
        }
      }
    } catch (err) {
      console.error('Failed to record customer response:', err);
      throw err;
    }
  };

  // ==========================================
  // PHASE 12 — FINANCE, INVOICE, PAYMENT & LEDGER
  // ==========================================

  const logFinanceAudit = async (
    type: FinanceAuditEventType,
    description: string,
    params: {
      customerId?: string;
      customerName?: string;
      invoiceId?: string;
      invoiceNumber?: string;
      paymentId?: string;
      receiptId?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!currentUser) return;
    const eventId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const log: FinanceAuditLog = {
      id: eventId,
      eventId,
      type,
      userId: userProfile?.uid || currentUser.uid,
      userName: userProfile?.name || 'Administrator',
      customerId: params.customerId,
      customerName: params.customerName,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      paymentId: params.paymentId,
      receiptId: params.receiptId,
      description,
      metadata: params.metadata || {},
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'auditLogs', eventId), cleanDataForFirestore(log));
    } catch (e) {
      console.warn('Failed to log finance audit event:', e);
    }
  };

  const generateNextInvoiceNumber = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = financeSettings.invoicePrefix || 'INV';
    let yearPart = '';
    if (financeSettings.invoiceYearFormat === 'YYYY') {
      yearPart = `-${yearNum}`;
    } else if (financeSettings.invoiceYearFormat === 'YY') {
      yearPart = `-${String(yearNum).slice(-2)}`;
    }
    const counterKey = `invoices_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = (financeSettings.invoiceNextSequence || 1) - 1;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}${yearPart}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      console.warn('Transaction on invoice counter failed, calculating fallback:', e);
      const existingSeqs = invoices
        .filter((i) => i.invoiceNumber && i.invoiceNumber.includes(String(yearNum)))
        .map((i) => {
          const parts = i.invoiceNumber.split('-');
          const last = parts[parts.length - 1];
          const parsed = parseInt(last, 10);
          return isNaN(parsed) ? 0 : parsed;
        });
      const maxSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0;
      const next = maxSeq + 1;
      return `${prefix}${yearPart}-${String(next).padStart(4, '0')}`;
    }
  };

  const generateNextReceiptNumber = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = financeSettings.receiptPrefix || 'RCT';
    let yearPart = '';
    if (financeSettings.receiptYearFormat === 'YYYY') {
      yearPart = `-${yearNum}`;
    } else if (financeSettings.receiptYearFormat === 'YY') {
      yearPart = `-${String(yearNum).slice(-2)}`;
    }
    const counterKey = `receipts_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = (financeSettings.receiptNextSequence || 1) - 1;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}${yearPart}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      console.warn('Transaction on receipt counter failed, fallback:', e);
      const existingSeqs = receipts
        .filter((r) => r.receiptNumber && r.receiptNumber.includes(String(yearNum)))
        .map((r) => {
          const parts = r.receiptNumber.split('-');
          const last = parts[parts.length - 1];
          const parsed = parseInt(last, 10);
          return isNaN(parsed) ? 0 : parsed;
        });
      const maxSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0;
      const next = maxSeq + 1;
      return `${prefix}${yearPart}-${String(next).padStart(4, '0')}`;
    }
  };

  const generateNextCreditNoteNumber = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = financeSettings.creditNotePrefix || 'CN';
    const counterKey = `creditnotes_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = (financeSettings.creditNoteNextSequence || 1) - 1;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}-${yearNum}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      const max = creditNotes.length;
      return `${prefix}-${yearNum}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const createInvoice = async (
    data: Omit<InvoiceRecord, 'id' | 'invoiceId' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'paidAmount' | 'outstandingAmount' | 'status'> & {
      status?: InvoiceStatus;
      invoiceNumber?: string;
    }
  ): Promise<InvoiceRecord> => {
    const nowIso = new Date().toISOString();
    const invoiceId = `INV-DOC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const invoiceNum = data.invoiceNumber || (await generateNextInvoiceNumber());

    const targetCust = data.customerSnapshot || customers.find((c) => c.id === data.customerId) || {
      id: data.customerId,
      customerId: data.customerId,
      companyName: 'Valued Client',
      contactPerson: 'Accounts Payable',
      email: '',
      mobile: '',
    };

    const bankSnap = data.bankSnapshot || (bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankSettings);
    const compSnap = data.companySnapshot || companySettings;

    let calcSubtotal = 0;
    let calcDiscount = 0;
    let calcTaxable = 0;
    let calcCGST = 0;
    let calcSGST = 0;
    let calcIGST = 0;
    let calcTotalTax = 0;

    const items: InvoiceItem[] = (data.items || []).map((it) => {
      const q = Number(it.quantity) || 1;
      const p = Number(it.unitPrice) || 0;
      const rawGross = roundTo2(q * p);
      const dPercent = Number(it.discount) || 0;
      const dAmount = roundTo2((rawGross * dPercent) / 100);
      const taxable = roundTo2(rawGross - dAmount);
      const tRate = Number(it.taxRate) || 0;
      const tAmount = roundTo2((taxable * tRate) / 100);

      const isInterState = financeSettings.defaultTaxType === 'inter_state';
      const cgst = isInterState ? 0 : roundTo2(tAmount / 2);
      const sgst = isInterState ? 0 : roundTo2(tAmount / 2);
      const igst = isInterState ? tAmount : 0;
      const lTotal = roundTo2(taxable + tAmount);

      calcSubtotal += rawGross;
      calcDiscount += dAmount;
      calcTaxable += taxable;
      calcCGST += cgst;
      calcSGST += sgst;
      calcIGST += igst;
      calcTotalTax += tAmount;

      return {
        itemId: it.itemId || `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        serviceId: it.serviceId,
        name: it.name || 'Commercial Item',
        description: it.description || '',
        quantity: q,
        unitPrice: p,
        discount: dPercent,
        discountAmount: dAmount,
        taxRate: tRate,
        taxAmount: tAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        lineTotal: lTotal,
      };
    });

    const grandTotal = roundTo2(calcTaxable + calcTotalTax);
    const initialStatus = data.status || 'Draft';

    const newInvoice: InvoiceRecord = {
      id: invoiceId,
      invoiceId,
      invoiceNumber: invoiceNum,
      customerId: data.customerId,
      customerSnapshot: targetCust as Customer,
      proposalId: data.proposalId,
      proposalSnapshot: data.proposalSnapshot,
      invoiceDate: data.invoiceDate || nowIso.split('T')[0],
      dueDate: data.dueDate || new Date(Date.now() + (financeSettings.defaultDueDays || 30) * 86400000).toISOString().split('T')[0],
      items,
      subtotal: roundTo2(calcSubtotal),
      discount: roundTo2(calcDiscount),
      taxableAmount: roundTo2(calcTaxable),
      tax: roundTo2(calcTotalTax),
      cgst: roundTo2(calcCGST),
      sgst: roundTo2(calcSGST),
      igst: roundTo2(calcIGST),
      taxBreakdown: {
        taxableAmount: roundTo2(calcTaxable),
        cgst: roundTo2(calcCGST),
        sgst: roundTo2(calcSGST),
        igst: roundTo2(calcIGST),
        totalTax: roundTo2(calcTotalTax),
      },
      grandTotal,
      paidAmount: 0,
      outstandingAmount: grandTotal,
      currency: data.currency || financeSettings.defaultCurrency || 'INR',
      paymentTerms: data.paymentTerms || financeSettings.defaultPaymentTerms || 'Net 30',
      bankSnapshot: bankSnap as any,
      companySnapshot: compSnap,
      status: initialStatus,
      notes: data.notes || '',
      createdBy: userProfile?.uid || currentUser?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
      finalizedAt: initialStatus === 'Issued' ? nowIso : undefined,
    };

    try {
      await setDoc(doc(db, 'invoices', invoiceId), cleanDataForFirestore(newInvoice));

      await logFinanceAudit('INVOICE_CREATED', `Invoice ${invoiceNum} created for ${targetCust.companyName} (Amount: ₹${grandTotal.toLocaleString()})`, {
        customerId: data.customerId,
        customerName: targetCust.companyName,
        invoiceId,
        invoiceNumber: invoiceNum,
        metadata: { grandTotal, status: initialStatus },
      });

      await logActivity(
        'INVOICE_CREATED' as any,
        'Invoice Created',
        `${userProfile?.name || 'Administrator'} created invoice ${invoiceNum} for ${targetCust.companyName} for ₹${grandTotal.toLocaleString()}`,
        data.customerId,
        undefined,
        undefined,
        { invoiceId, invoiceNumber: invoiceNum, grandTotal }
      );

      await createNotification({
        userId: 'all_admins',
        type: 'INVOICE_CREATED',
        title: `New Invoice Created: ${invoiceNum}`,
        message: `Invoice ${invoiceNum} generated for ${targetCust.companyName} (₹${grandTotal.toLocaleString()})`,
        relatedId: invoiceId,
        relatedType: 'invoice',
      });

      return newInvoice;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${invoiceId}`);
      throw err;
    }
  };

  const createInvoiceFromProposal = async (proposalId: string): Promise<InvoiceRecord> => {
    const prop = proposals.find((p) => p.id === proposalId || p.proposalNumber === proposalId);
    if (!prop) {
      throw new Error(`Proposal with ID ${proposalId} not found.`);
    }

    const targetCust = prop.customerSnapshot || customers.find((c) => c.id === prop.customerId) || {
      id: prop.customerId,
      customerId: prop.customerId,
      companyName: prop.customerName || 'Client',
      contactPerson: prop.customerName || 'Accounts',
    };

    const invoiceNum = await generateNextInvoiceNumber();

    const items: InvoiceItem[] = (prop.items || []).map((it) => {
      const q = it.quantity || 1;
      const p = it.unitPrice || 0;
      const gross = roundTo2(q * p);
      const dPercent = it.discountPercent || 0;
      const dAmount = it.discountAmount !== undefined ? it.discountAmount : roundTo2((gross * dPercent) / 100);
      const taxable = roundTo2(gross - dAmount);
      const tRate = it.gstRate !== undefined ? it.gstRate : 18;
      const tAmount = it.gstAmount !== undefined ? it.gstAmount : roundTo2((taxable * tRate) / 100);
      const cgst = roundTo2(tAmount / 2);
      const sgst = roundTo2(tAmount / 2);
      const lTotal = roundTo2(taxable + tAmount);

      return {
        itemId: it.itemId || `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        serviceId: it.serviceId,
        name: it.name || 'Proposal Item',
        description: it.description || '',
        quantity: q,
        unitPrice: p,
        discount: dPercent,
        discountAmount: dAmount,
        taxRate: tRate,
        taxAmount: tAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
        lineTotal: lTotal,
      };
    });

    const subtotal = prop.subtotal || items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const discount = prop.discount || items.reduce((s, it) => s + it.discountAmount, 0);
    const taxableAmount = prop.taxableAmount || (subtotal - discount);
    const tax = prop.gstTotal || items.reduce((s, it) => s + it.taxAmount, 0);
    const grandTotal = prop.grandTotal || (taxableAmount + tax);

    const nowIso = new Date().toISOString();
    const invoiceId = `INV-DOC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newInvoice: InvoiceRecord = {
      id: invoiceId,
      invoiceId,
      invoiceNumber: invoiceNum,
      customerId: prop.customerId,
      customerSnapshot: targetCust as Customer,
      proposalId: prop.id,
      proposalSnapshot: prop,
      invoiceDate: nowIso.split('T')[0],
      dueDate: new Date(Date.now() + (financeSettings.defaultDueDays || 30) * 86400000).toISOString().split('T')[0],
      items,
      subtotal: roundTo2(subtotal),
      discount: roundTo2(discount),
      taxableAmount: roundTo2(taxableAmount),
      tax: roundTo2(tax),
      cgst: roundTo2(tax / 2),
      sgst: roundTo2(tax / 2),
      igst: 0,
      taxBreakdown: {
        taxableAmount: roundTo2(taxableAmount),
        cgst: roundTo2(tax / 2),
        sgst: roundTo2(tax / 2),
        igst: 0,
        totalTax: roundTo2(tax),
      },
      grandTotal: roundTo2(grandTotal),
      paidAmount: 0,
      outstandingAmount: roundTo2(grandTotal),
      currency: financeSettings.defaultCurrency || 'INR',
      paymentTerms: financeSettings.defaultPaymentTerms || 'Net 30',
      bankSnapshot: prop.bankSnapshot || (bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankSettings),
      companySnapshot: prop.companySnapshot || companySettings,
      status: 'Issued',
      notes: `Generated from Commercial Proposal ${prop.proposalNumber}`,
      createdBy: userProfile?.uid || currentUser?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
      finalizedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'invoices', invoiceId), cleanDataForFirestore(newInvoice));

      await logFinanceAudit(
        'INVOICE_CREATED',
        `Invoice ${invoiceNum} created directly from accepted proposal ${prop.proposalNumber} for ${targetCust.companyName} (Amount: ₹${grandTotal.toLocaleString()})`,
        {
          customerId: prop.customerId,
          customerName: targetCust.companyName,
          invoiceId,
          invoiceNumber: invoiceNum,
          metadata: { proposalNumber: prop.proposalNumber, grandTotal },
        }
      );

      await createNotification({
        userId: 'all_admins',
        type: 'INVOICE_CREATED',
        title: `Invoice Generated from Proposal: ${invoiceNum}`,
        message: `Invoice ${invoiceNum} generated for ${targetCust.companyName} from proposal ${prop.proposalNumber}`,
        relatedId: invoiceId,
        relatedType: 'invoice',
      });

      if (prop.assignedEmployeeId) {
        await createNotification({
          userId: prop.assignedEmployeeId,
          type: 'INVOICE_CREATED',
          title: `Invoice Generated: ${invoiceNum}`,
          message: `Invoice ${invoiceNum} generated for your account ${targetCust.companyName}`,
          relatedId: invoiceId,
          relatedType: 'invoice',
        });
      }

      return newInvoice;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${invoiceId}`);
      throw err;
    }
  };

  const updateDraftInvoice = async (id: string, data: Partial<InvoiceRecord>): Promise<void> => {
    const existing = invoices.find((inv) => inv.id === id);
    if (!existing) throw new Error('Invoice not found.');
    if (existing.status !== 'Draft') {
      throw new Error(`Invoice ${existing.invoiceNumber} is ${existing.status} and cannot be freely edited. Only Draft invoices may be modified.`);
    }

    const nowIso = new Date().toISOString();
    const payload = {
      ...data,
      updatedAt: nowIso,
    };

    try {
      await updateDoc(doc(db, 'invoices', id), cleanDataForFirestore(payload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
      throw err;
    }
  };

  const finalizeInvoice = async (id: string): Promise<void> => {
    const existing = invoices.find((inv) => inv.id === id);
    if (!existing) throw new Error('Invoice not found.');
    if (existing.status !== 'Draft') {
      throw new Error(`Invoice ${existing.invoiceNumber} is already finalized with status: ${existing.status}`);
    }

    const nowIso = new Date().toISOString();
    const bankSnap = bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankSettings;
    const compSnap = companySettings;
    const targetCust = customers.find((c) => c.id === existing.customerId) || existing.customerSnapshot;

    const taxCalculationSnapshot = {
      subtotal: existing.subtotal,
      discount: existing.discount,
      taxableAmount: existing.taxableAmount,
      cgst: existing.cgst,
      sgst: existing.sgst,
      igst: existing.igst,
      totalTax: existing.tax,
      grandTotal: existing.grandTotal,
      currency: existing.currency,
      ratesSnapshot: existing.items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        hsnSac: it.hsnSac,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        lineTotal: it.lineTotal,
      })),
      finalizedAt: nowIso,
    };

    const payload: Partial<InvoiceRecord> = {
      status: 'Sent',
      isFinalized: true,
      companySnapshot: compSnap,
      bankSnapshot: bankSnap as any,
      customerSnapshot: targetCust,
      taxCalculationSnapshot,
      finalizedAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await updateDoc(doc(db, 'invoices', id), cleanDataForFirestore(payload));

      await logFinanceAudit(
        'INVOICE_FINALIZED',
        `Invoice ${existing.invoiceNumber} finalized and issued by ${userProfile?.name || 'Administrator'}`,
        {
          customerId: existing.customerId,
          customerName: existing.customerSnapshot?.companyName,
          invoiceId: existing.id,
          invoiceNumber: existing.invoiceNumber,
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
      throw err;
    }
  };

  const cancelInvoice = async (id: string, reason: string): Promise<void> => {
    if (!reason || !reason.trim()) {
      throw new Error('A valid cancellation reason is required to cancel an invoice.');
    }
    const existing = invoices.find((inv) => inv.id === id);
    if (!existing) throw new Error('Invoice not found.');
    if (existing.status === 'Cancelled') {
      throw new Error(`Invoice ${existing.invoiceNumber} is already cancelled.`);
    }

    const nowIso = new Date().toISOString();
    const payload: Partial<InvoiceRecord> = {
      status: 'Cancelled',
      outstandingAmount: 0,
      cancelledAt: nowIso,
      cancelledBy: userProfile?.uid || currentUser?.uid || 'admin',
      cancelledByName: userProfile?.name || 'Administrator',
      cancellationReason: reason.trim(),
      updatedAt: nowIso,
    };

    try {
      await updateDoc(doc(db, 'invoices', id), cleanDataForFirestore(payload));

      await logFinanceAudit(
        'INVOICE_CANCELLED',
        `Invoice ${existing.invoiceNumber} cancelled by ${userProfile?.name || 'Administrator'}. Reason: "${reason.trim()}"`,
        {
          customerId: existing.customerId,
          customerName: existing.customerSnapshot?.companyName,
          invoiceId: existing.id,
          invoiceNumber: existing.invoiceNumber,
          metadata: { cancellationReason: reason.trim() },
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
      throw err;
    }
  };

  const recordPayment = async (params: {
    invoiceId?: string;
    customerId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod | string;
    transactionReference: string;
    notes?: string;
    status?: PaymentStatus;
    asCustomerAdvance?: boolean;
  }): Promise<{ payment: PaymentRecord; receipt?: PaymentReceipt }> => {
    if (!params.amount || params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const nowIso = new Date().toISOString();
    const targetCust = customers.find((c) => c.id === params.customerId);
    const custName = targetCust?.companyName || 'Client';

    let targetInvoice: InvoiceRecord | undefined;
    if (params.invoiceId) {
      targetInvoice = invoices.find((i) => i.id === params.invoiceId);
      if (!targetInvoice) {
        throw new Error('Selected invoice does not exist.');
      }
      if (targetInvoice.status === 'Cancelled') {
        throw new Error(`Cannot record payment against cancelled invoice ${targetInvoice.invoiceNumber}.`);
      }

      const currentOutstanding = roundTo2(targetInvoice.grandTotal - (targetInvoice.paidAmount || 0));
      if (params.amount > currentOutstanding + 0.01 && !params.asCustomerAdvance) {
        throw new Error(
          `Payment amount (₹${params.amount.toLocaleString()}) exceeds invoice outstanding balance (₹${currentOutstanding.toLocaleString()}). Check "Record Excess as Customer Advance" to proceed.`
        );
      }
    }

    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentStatus: PaymentStatus = params.status || 'Confirmed';

    let receipt: PaymentReceipt | undefined;
    let receiptNum: string | undefined;

    if (paymentStatus === 'Confirmed') {
      receiptNum = await generateNextReceiptNumber();
      const receiptId = `RCT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      receipt = {
        id: receiptId,
        receiptId,
        receiptNumber: receiptNum,
        paymentId,
        invoiceId: targetInvoice?.id || '',
        invoiceNumber: targetInvoice?.invoiceNumber || 'Advance/Direct Settlement',
        customerId: params.customerId,
        customerSnapshot: (targetInvoice?.customerSnapshot || targetCust) as Customer,
        amount: params.amount,
        amountInWords: numberToWords(params.amount),
        paymentDate: params.paymentDate || nowIso.split('T')[0],
        paymentMethod: params.paymentMethod,
        referenceNumber: params.transactionReference || 'REF-N/A',
        companySnapshot: targetInvoice?.companySnapshot || companySettings,
        bankSnapshot: targetInvoice?.bankSnapshot || bankSettings,
        signatorySnapshot: signatorySettings,
        notes: params.notes || '',
        createdAt: nowIso,
      };

      await setDoc(doc(db, 'receipts', receiptId), cleanDataForFirestore(receipt));
      await logFinanceAudit(
        'RECEIPT_CREATED',
        `Receipt ${receiptNum} generated for ${custName} (₹${params.amount.toLocaleString()})`,
        {
          customerId: params.customerId,
          customerName: custName,
          invoiceId: targetInvoice?.id,
          invoiceNumber: targetInvoice?.invoiceNumber,
          paymentId,
          receiptId,
        }
      );
    }

    const paymentRecord: PaymentRecord = {
      id: paymentId,
      paymentId,
      paymentNumber: `PAY-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`,
      invoiceId: targetInvoice?.id || '',
      invoiceNumber: targetInvoice?.invoiceNumber || '',
      customerId: params.customerId,
      customerName: custName,
      amount: params.amount,
      paymentDate: params.paymentDate || nowIso.split('T')[0],
      paymentMethod: params.paymentMethod,
      transactionReference: params.transactionReference || '',
      notes: params.notes || '',
      status: paymentStatus,
      receiptId: receipt?.id,
      receiptNumber: receiptNum,
      recordedBy: userProfile?.uid || currentUser?.uid || 'admin',
      recordedByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'payments', paymentId), cleanDataForFirestore(paymentRecord));

    if (targetInvoice && paymentStatus === 'Confirmed') {
      const currentOutstanding = roundTo2(targetInvoice.grandTotal - (targetInvoice.paidAmount || 0));
      const amountToApply = Math.min(params.amount, currentOutstanding);
      const newPaid = roundTo2((targetInvoice.paidAmount || 0) + amountToApply);
      const newOutstanding = Math.max(0, roundTo2(targetInvoice.grandTotal - newPaid));
      const newStatus = deriveInvoiceStatus(targetInvoice.status, targetInvoice.grandTotal, newPaid, targetInvoice.dueDate);

      await updateDoc(doc(db, 'invoices', targetInvoice.id), {
        paidAmount: newPaid,
        outstandingAmount: newOutstanding,
        status: newStatus,
        updatedAt: nowIso,
      });

      const excess = roundTo2(params.amount - amountToApply);
      if (excess > 0.01) {
        await createCustomerAdvance({
          customerId: params.customerId,
          amount: excess,
          date: params.paymentDate || nowIso.split('T')[0],
          notes: `Excess payment recorded from Invoice ${targetInvoice.invoiceNumber} payment`,
          transactionReference: params.transactionReference,
        });
      }
    }

    if (paymentStatus === 'Confirmed') {
      await logFinanceAudit(
        'PAYMENT_CONFIRMED',
        `Confirmed payment of ₹${params.amount.toLocaleString()} received via ${params.paymentMethod} from ${custName}${targetInvoice ? ` for ${targetInvoice.invoiceNumber}` : ''}`,
        {
          customerId: params.customerId,
          customerName: custName,
          invoiceId: targetInvoice?.id,
          invoiceNumber: targetInvoice?.invoiceNumber,
          paymentId,
          receiptId: receipt?.id,
          metadata: { amount: params.amount, method: params.paymentMethod, ref: params.transactionReference },
        }
      );

      await createNotification({
        userId: 'all_admins',
        type: 'PAYMENT_RECEIVED',
        title: `Payment Received: ₹${params.amount.toLocaleString()}`,
        message: `₹${params.amount.toLocaleString()} confirmed from ${custName}${targetInvoice ? ` on ${targetInvoice.invoiceNumber}` : ''}`,
        relatedId: paymentId,
        relatedType: 'payment',
      });
    }

    return { payment: paymentRecord, receipt };
  };

  const reversePayment = async (paymentId: string, reason: string): Promise<void> => {
    if (!reason || !reason.trim()) {
      throw new Error('A reversal reason is required to reverse a payment.');
    }
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment record not found.');
    if (payment.status === 'Refunded' || payment.isReversal) {
      throw new Error('This payment has already been reversed/refunded.');
    }

    const nowIso = new Date().toISOString();

    await updateDoc(doc(db, 'payments', payment.id), {
      status: 'Refunded',
      reversalReason: reason.trim(),
      reversedAt: nowIso,
      reversedBy: userProfile?.uid || currentUser?.uid || 'admin',
      reversedByName: userProfile?.name || 'Administrator',
      updatedAt: nowIso,
    });

    const reversalId = `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const reversalPayment: PaymentRecord = {
      id: reversalId,
      paymentId: reversalId,
      paymentNumber: `REV-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoiceNumber,
      customerId: payment.customerId,
      customerName: payment.customerName,
      amount: -payment.amount,
      paymentDate: nowIso.split('T')[0],
      paymentMethod: payment.paymentMethod,
      transactionReference: `REV-${payment.transactionReference || payment.paymentId}`,
      notes: `Reversal of ${payment.paymentId}. Reason: ${reason.trim()}`,
      status: 'Refunded',
      isReversal: true,
      originalPaymentId: payment.id,
      reversalReason: reason.trim(),
      reversedAt: nowIso,
      reversedBy: userProfile?.uid || currentUser?.uid || 'admin',
      reversedByName: userProfile?.name || 'Administrator',
      recordedBy: userProfile?.uid || currentUser?.uid || 'admin',
      recordedByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'payments', reversalId), cleanDataForFirestore(reversalPayment));

    if (payment.invoiceId) {
      const inv = invoices.find((i) => i.id === payment.invoiceId);
      if (inv) {
        const restoredPaid = Math.max(0, roundTo2((inv.paidAmount || 0) - payment.amount));
        const restoredOutstanding = roundTo2(inv.grandTotal - restoredPaid);
        const restoredStatus = deriveInvoiceStatus(inv.status, inv.grandTotal, restoredPaid, inv.dueDate);

        await updateDoc(doc(db, 'invoices', inv.id), {
          paidAmount: restoredPaid,
          outstandingAmount: restoredOutstanding,
          status: restoredStatus,
          updatedAt: nowIso,
        });
      }
    }

    await logFinanceAudit(
      'PAYMENT_REVERSED',
      `Payment of ₹${payment.amount.toLocaleString()} reversed for ${payment.customerName}. Reason: "${reason.trim()}"`,
      {
        customerId: payment.customerId,
        customerName: payment.customerName,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoiceNumber,
        paymentId: payment.id,
        metadata: { amount: payment.amount, reason },
      }
    );
  };

  const createCustomerAdvance = async (params: {
    customerId: string;
    amount: number;
    date: string;
    notes?: string;
    transactionReference?: string;
  }): Promise<CustomerAdvance> => {
    if (params.amount <= 0) throw new Error('Advance amount must be greater than zero.');
    const nowIso = new Date().toISOString();
    const cust = customers.find((c) => c.id === params.customerId);
    const advanceId = `ADV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const advance: CustomerAdvance = {
      id: advanceId,
      advanceId,
      customerId: params.customerId,
      customerName: cust?.companyName || 'Client',
      amount: roundTo2(params.amount),
      availableAmount: roundTo2(params.amount),
      date: params.date || nowIso.split('T')[0],
      transactionReference: params.transactionReference,
      status: 'Available',
      notes: params.notes || '',
      createdBy: userProfile?.uid || currentUser?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
    };

    await setDoc(doc(db, 'customerAdvances', advanceId), cleanDataForFirestore(advance));

    await logFinanceAudit(
      'ADVANCE_CREATED',
      `Customer advance of ₹${params.amount.toLocaleString()} recorded for ${advance.customerName}`,
      {
        customerId: params.customerId,
        customerName: advance.customerName,
        metadata: { amount: params.amount, notes: params.notes },
      }
    );

    return advance;
  };

  const applyCustomerAdvance = async (advanceId: string, invoiceId: string, amount: number): Promise<void> => {
    if (amount <= 0) throw new Error('Applied amount must be greater than zero.');
    const adv = customerAdvances.find((a) => a.id === advanceId);
    if (!adv) throw new Error('Advance not found.');
    if (adv.availableAmount < amount) {
      throw new Error(`Insufficient advance balance. Available: ₹${adv.availableAmount.toLocaleString()}`);
    }

    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found.');
    if (inv.status === 'Cancelled') throw new Error('Cannot apply advance to cancelled invoice.');

    const outstanding = roundTo2(inv.grandTotal - (inv.paidAmount || 0));
    if (amount > outstanding + 0.01) {
      throw new Error(`Cannot apply more than current invoice outstanding (₹${outstanding.toLocaleString()}).`);
    }

    const nowIso = new Date().toISOString();
    const newAvail = roundTo2(adv.availableAmount - amount);
    const newAdvStatus = newAvail <= 0.01 ? 'Fully Applied' : 'Partially Applied';

    await updateDoc(doc(db, 'customerAdvances', adv.id), {
      availableAmount: newAvail,
      status: newAdvStatus,
    });

    await recordPayment({
      invoiceId: inv.id,
      customerId: inv.customerId,
      amount,
      paymentDate: nowIso.split('T')[0],
      paymentMethod: 'Other',
      transactionReference: `ADV-APPLY-${adv.advanceId}`,
      notes: `Applied from Customer Advance ${adv.advanceId}`,
      status: 'Confirmed',
    });

    await logFinanceAudit(
      'ADVANCE_APPLIED',
      `Advance ${adv.advanceId} of ₹${amount.toLocaleString()} applied to invoice ${inv.invoiceNumber}`,
      {
        customerId: inv.customerId,
        customerName: inv.customerSnapshot?.companyName,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        metadata: { advanceId: adv.id, appliedAmount: amount },
      }
    );
  };

  const createCreditNote = async (params: {
    invoiceId: string;
    customerId: string;
    amount: number;
    reason: string;
    date: string;
  }): Promise<CreditNote> => {
    if (params.amount <= 0) throw new Error('Credit Note amount must be greater than zero.');
    if (!params.reason || !params.reason.trim()) throw new Error('A reason is required for issuing a credit note.');

    const inv = invoices.find((i) => i.id === params.invoiceId);
    if (!inv) throw new Error('Invoice not found.');

    const nowIso = new Date().toISOString();
    const cnId = `CN-DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cnNumber = await generateNextCreditNoteNumber();

    const creditNote: CreditNote = {
      id: cnId,
      creditNoteId: cnId,
      creditNoteNumber: cnNumber,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: params.customerId,
      customerName: inv.customerSnapshot?.companyName || 'Client',
      amount: roundTo2(params.amount),
      reason: params.reason.trim(),
      date: params.date || nowIso.split('T')[0],
      status: 'Issued',
      createdBy: userProfile?.uid || currentUser?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
    };

    await setDoc(doc(db, 'creditNotes', cnId), cleanDataForFirestore(creditNote));

    await logFinanceAudit(
      'CREDIT_NOTE_CREATED',
      `Credit note ${cnNumber} for ₹${params.amount.toLocaleString()} issued against invoice ${inv.invoiceNumber}. Reason: "${params.reason.trim()}"`,
      {
        customerId: params.customerId,
        customerName: creditNote.customerName,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        metadata: { creditNoteNumber: cnNumber, amount: params.amount, reason: params.reason },
      }
    );

    return creditNote;
  };

  const checkAndNotifyOverdueInvoices = async (): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const inv of invoices) {
      if (inv.status === 'Cancelled' || inv.status === 'Paid') continue;
      if (!inv.dueDate) continue;

      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < today) {
        const alreadyNotified = notifications.some(
          (n) => n.type === 'INVOICE_OVERDUE' && (n.relatedId === inv.id || n.metadata?.invoiceId === inv.id)
        );

        if (!alreadyNotified) {
          const outstanding = roundTo2(inv.grandTotal - (inv.paidAmount || 0));
          await createNotification({
            userId: 'all_admins',
            type: 'INVOICE_OVERDUE',
            title: `Invoice Overdue: ${inv.invoiceNumber}`,
            message: `Invoice ${inv.invoiceNumber} for ${inv.customerSnapshot?.companyName || 'Customer'} (₹${outstanding.toLocaleString()}) was due on ${inv.dueDate}.`,
            relatedId: inv.id,
            relatedType: 'invoice',
            metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, dueDate: inv.dueDate, outstanding },
          });

          await logFinanceAudit(
            'INVOICE_OVERDUE',
            `Invoice ${inv.invoiceNumber} flagged overdue (Due Date: ${inv.dueDate}, Outstanding: ₹${outstanding.toLocaleString()})`,
            {
              customerId: inv.customerId,
              customerName: inv.customerSnapshot?.companyName,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              metadata: { dueDate: inv.dueDate, outstanding },
            }
          );
        }
      }
    }
  };

  const sendInvoiceEmail = async (
    invoiceId: string,
    params: { to: string; cc?: string; subject: string; message: string; pdfBase64?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found.' };

    const emailId = `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const record: EmailRecord = {
      id: emailId,
      emailId,
      recipient: params.to,
      customerId: inv.customerId,
      companyName: inv.customerSnapshot?.companyName || 'Client',
      sender: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
      senderEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
      senderName: emailSettings.senderName || 'SparkGenTechnology',
      subject: params.subject,
      body: params.message,
      message: params.message,
      status: 'Sent',
      sentAt: nowIso,
      createdAt: nowIso,
      employeeId: userProfile?.uid || 'admin',
      employeeName: userProfile?.name || 'Administrator',
      hasAttachment: !!params.pdfBase64,
      attachmentName: `${inv.invoiceNumber}.pdf`,
    };

    try {
      await setDoc(doc(db, 'emails', emailId), cleanDataForFirestore(record));
      await updateDoc(doc(db, 'invoices', inv.id), { sentAt: nowIso });

      await logFinanceAudit('INVOICE_SENT', `Invoice ${inv.invoiceNumber} emailed to ${params.to}`, {
        customerId: inv.customerId,
        customerName: inv.customerSnapshot?.companyName,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        metadata: { to: params.to, subject: params.subject },
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to dispatch email.' };
    }
  };

  const sendReceiptEmail = async (
    receiptId: string,
    params: { to: string; cc?: string; subject: string; message: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const rct = receipts.find((r) => r.id === receiptId);
    if (!rct) return { success: false, error: 'Receipt not found.' };

    const emailId = `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const record: EmailRecord = {
      id: emailId,
      emailId,
      recipient: params.to,
      customerId: rct.customerId,
      companyName: rct.customerSnapshot?.companyName || 'Client',
      sender: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
      senderEmail: emailSettings.senderEmail || 'sales@sparkgentechnology.com',
      senderName: emailSettings.senderName || 'SparkGenTechnology',
      subject: params.subject,
      body: params.message,
      message: params.message,
      status: 'Sent',
      sentAt: nowIso,
      createdAt: nowIso,
      employeeId: userProfile?.uid || 'admin',
      employeeName: userProfile?.name || 'Administrator',
      hasAttachment: true,
      attachmentName: `${rct.receiptNumber}.pdf`,
    };

    try {
      await setDoc(doc(db, 'emails', emailId), cleanDataForFirestore(record));
      await updateDoc(doc(db, 'receipts', rct.id), { sentAt: nowIso, sentVia: 'email' });

      await logFinanceAudit('RECEIPT_SENT', `Receipt ${rct.receiptNumber} emailed to ${params.to}`, {
        customerId: rct.customerId,
        customerName: rct.customerSnapshot?.companyName,
        receiptId: rct.id,
        metadata: { to: params.to },
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to dispatch receipt email.' };
    }
  };

  const sendPaymentReminder = async (
    invoiceId: string,
    channel: 'email' | 'whatsapp',
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found.' };

    const cust = inv.customerSnapshot || customers.find((c) => c.id === inv.customerId);
    const outstanding = roundTo2(inv.grandTotal - (inv.paidAmount || 0));

    const defaultMsg =
      customMessage ||
      `Dear ${cust?.contactPerson || cust?.companyName || 'Valued Customer'},\n\nThis is a friendly reminder that Invoice ${inv.invoiceNumber} for ₹${outstanding.toLocaleString()} was due on ${inv.dueDate}.\n\nPlease let us know if payment has already been initiated or if you require banking assistance.\n\nThank you,\nSparkGenTechnology Finance Team`;

    if (channel === 'email') {
      return await sendInvoiceEmail(inv.id, {
        to: cust?.email || '',
        subject: `Payment Reminder: Invoice ${inv.invoiceNumber} — SparkGenTechnology`,
        message: defaultMsg,
      });
    } else {
      await logWhatsApp({
        customerId: inv.customerId,
        mobile: cust?.mobile || '',
        messageType: 'Payment Reminder',
        message: defaultMsg,
        status: 'Opened WhatsApp',
        employeeId: userProfile?.uid || 'admin',
        employeeName: userProfile?.name || 'Administrator',
      });
      return { success: true };
    }
  };

  const updateFinanceSettings = async (settings: Partial<FinanceSettings>): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updated = {
      ...financeSettings,
      ...settings,
      updatedAt: nowIso,
      updatedBy: userProfile?.name || 'Administrator',
    };
    try {
      await setDoc(doc(db, 'financeSettings', 'general'), cleanDataForFirestore(updated));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'financeSettings/general');
      throw err;
    }
  };

  // ==========================================
  // PHASE 19 — ADVANCED FINANCE, ACCOUNTS & EXPENSES
  // ==========================================

  const duplicateInvoice = async (invoiceId: string): Promise<InvoiceRecord> => {
    const original = invoices.find((inv) => inv.id === invoiceId);
    if (!original) throw new Error('Invoice not found to duplicate.');

    const newInvoiceNumber = await generateNextInvoiceNumber();
    const nowIso = new Date().toISOString();
    const newId = `INV-DOC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const duplicated: InvoiceRecord = {
      ...original,
      id: newId,
      invoiceId: newId,
      invoiceNumber: newInvoiceNumber,
      invoiceDate: nowIso.split('T')[0],
      dueDate: new Date(Date.now() + (financeSettings.defaultDueDays || 30) * 86400000).toISOString().split('T')[0],
      status: 'Draft',
      isFinalized: false,
      paidAmount: 0,
      outstandingAmount: original.grandTotal,
      createdBy: userProfile?.uid || currentUser?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
      finalizedAt: undefined,
      sentAt: undefined,
      cancelledAt: undefined,
      cancelledBy: undefined,
      cancelledByName: undefined,
      cancellationReason: undefined,
      paymentLinkId: undefined,
      paymentUrl: undefined,
    };

    try {
      await setDoc(doc(db, 'invoices', newId), cleanDataForFirestore(duplicated));
      await logFinanceAudit('INVOICE_CREATED', `Duplicated invoice ${original.invoiceNumber} as new Draft ${newInvoiceNumber}`, {
        customerId: original.customerId,
        invoiceId: newId,
        invoiceNumber: newInvoiceNumber,
      });
      return duplicated;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${newId}`);
      throw err;
    }
  };

  const generateNextDebitNoteNumber = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = 'DN';
    const counterKey = `debitnotes_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = 0;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}-${yearNum}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      const max = debitNotes.length;
      return `${prefix}-${yearNum}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const createDebitNote = async (
    data: Omit<DebitNote, 'id' | 'debitNoteId' | 'debitNoteNumber' | 'createdAt'>
  ): Promise<string> => {
    if (data.amount <= 0) throw new Error('Debit Note amount must be greater than zero.');
    const nowIso = new Date().toISOString();
    const dnId = `DN-DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dnNumber = await generateNextDebitNoteNumber();

    const newRecord: DebitNote = {
      ...data,
      id: dnId,
      debitNoteId: dnId,
      debitNoteNumber: dnNumber,
      createdAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'debitNotes', dnId), cleanDataForFirestore(newRecord));
      await logFinanceAudit(
        'DEBIT_NOTE_CREATED',
        `Debit Note ${dnNumber} for ₹${data.total.toLocaleString()} created for ${data.customerName}. Reason: "${data.reason}"`,
        {
          customerId: data.customerId,
          customerName: data.customerName,
          invoiceId: data.invoiceId,
          invoiceNumber: data.invoiceNumber,
          metadata: { debitNoteNumber: dnNumber, total: data.total },
        }
      );
      return dnId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `debitNotes/${dnId}`);
      throw err;
    }
  };

  const finalizeDebitNote = async (id: string): Promise<void> => {
    const existing = debitNotes.find((d) => d.id === id);
    if (!existing) throw new Error('Debit Note not found.');
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'debitNotes', id), {
        status: 'Finalized',
        finalizedAt: nowIso,
      });
      await logFinanceAudit(
        'DEBIT_NOTE_FINALIZED',
        `Debit Note ${existing.debitNoteNumber} finalized by ${userProfile?.name || 'Administrator'}`,
        {
          customerId: existing.customerId,
          customerName: existing.customerName,
          invoiceId: existing.invoiceId,
          invoiceNumber: existing.invoiceNumber,
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `debitNotes/${id}`);
      throw err;
    }
  };

  const generateNextExpenseId = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = 'EXP';
    const counterKey = `expenses_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = 0;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}-${yearNum}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      const max = expenses.length;
      return `${prefix}-${yearNum}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const addExpense = async (
    data: Omit<ExpenseRecord, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>
  ): Promise<string> => {
    if (data.amount <= 0) throw new Error('Expense amount must be greater than zero.');
    const nowIso = new Date().toISOString();
    const expId = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expenseNumber = await generateNextExpenseId();

    const record: ExpenseRecord = {
      ...data,
      id: expId,
      expenseId: expenseNumber,
      createdBy: userProfile?.uid || currentUser?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'expenses', expId), cleanDataForFirestore(record));
      await logFinanceAudit(
        'EXPENSE_CREATED',
        `Expense ${expenseNumber} of ₹${data.total.toLocaleString()} logged under category "${data.categoryName}"`,
        {
          metadata: { expenseId: expenseNumber, category: data.categoryName, total: data.total },
        }
      );
      return expId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${expId}`);
      throw err;
    }
  };

  const updateDraftExpense = async (id: string, data: Partial<ExpenseRecord>): Promise<void> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) throw new Error('Expense record not found.');
    if (existing.status === 'PAID') throw new Error('Cannot modify an already paid expense.');

    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'expenses', id), cleanDataForFirestore({ ...data, updatedAt: nowIso }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
      throw err;
    }
  };

  const approveExpense = async (id: string): Promise<void> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) throw new Error('Expense not found.');
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'expenses', id), {
        status: 'APPROVED',
        approvedBy: userProfile?.uid || currentUser?.uid || 'admin',
        approvedByName: userProfile?.name || 'Administrator',
        approvedAt: nowIso,
        updatedAt: nowIso,
      });
      await logFinanceAudit(
        'EXPENSE_APPROVED',
        `Expense ${existing.expenseId} (₹${existing.total.toLocaleString()}) approved by ${userProfile?.name || 'Administrator'}`,
        { metadata: { expenseId: existing.expenseId, total: existing.total } }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
      throw err;
    }
  };

  const rejectExpense = async (id: string, reason: string): Promise<void> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) throw new Error('Expense not found.');
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'expenses', id), {
        status: 'REJECTED',
        rejectedReason: reason,
        updatedAt: nowIso,
      });
      await logFinanceAudit(
        'EXPENSE_REJECTED',
        `Expense ${existing.expenseId} rejected. Reason: "${reason}"`,
        { metadata: { expenseId: existing.expenseId, reason } }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
      throw err;
    }
  };

  const markExpensePaid = async (id: string): Promise<void> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) throw new Error('Expense not found.');
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'expenses', id), {
        status: 'PAID',
        paidAt: nowIso,
        updatedAt: nowIso,
      });
      await logFinanceAudit(
        'EXPENSE_PAID',
        `Expense ${existing.expenseId} (₹${existing.total.toLocaleString()}) marked as paid`,
        { metadata: { expenseId: existing.expenseId, total: existing.total } }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
      throw err;
    }
  };

  const cancelExpense = async (id: string): Promise<void> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) throw new Error('Expense not found.');
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'expenses', id), {
        status: 'CANCELLED',
        updatedAt: nowIso,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
      throw err;
    }
  };

  const addExpenseCategory = async (name: string, description?: string): Promise<string> => {
    if (!name || !name.trim()) throw new Error('Category name is required.');
    const id = `cat_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const record: ExpenseCategoryRecord = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    try {
      await setDoc(doc(db, 'expenseCategories', id), cleanDataForFirestore(record));
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenseCategories/${id}`);
      throw err;
    }
  };

  const updateExpenseCategory = async (id: string, data: Partial<ExpenseCategoryRecord>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'expenseCategories', id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenseCategories/${id}`);
      throw err;
    }
  };

  const canDeleteExpenseCategory = (id: string): boolean => {
    const cat = expenseCategories.find((c) => c.id === id);
    if (!cat) return true;
    return !expenses.some((e) => e.categoryId === id || e.categoryName === cat.name);
  };

  const deleteExpenseCategory = async (id: string): Promise<void> => {
    if (!canDeleteExpenseCategory(id)) {
      throw new Error('Cannot delete this category because it is referenced in historical expense records. Deactivate it instead.');
    }
    try {
      await deleteDoc(doc(db, 'expenseCategories', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenseCategories/${id}`);
      throw err;
    }
  };

  const generateNextVendorId = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = 'VEN';
    const counterKey = `vendors_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = 0;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}-${yearNum}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      const max = vendors.length;
      return `${prefix}-${yearNum}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const addVendor = async (
    data: Omit<VendorRecord, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (!data.vendorName || !data.vendorName.trim()) throw new Error('Vendor name is required.');
    const nowIso = new Date().toISOString();
    const vId = `VEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const vendorNumber = await generateNextVendorId();

    const record: VendorRecord = {
      ...data,
      id: vId,
      vendorId: vendorNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'vendors', vId), cleanDataForFirestore(record));
      return vId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `vendors/${vId}`);
      throw err;
    }
  };

  const updateVendor = async (id: string, data: Partial<VendorRecord>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'vendors', id), cleanDataForFirestore({ ...data, updatedAt: new Date().toISOString() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vendors/${id}`);
      throw err;
    }
  };

  const toggleVendorStatus = async (id: string): Promise<void> => {
    const v = vendors.find((vend) => vend.id === id);
    if (!v) return;
    const newStatus = v.status === 'Active' ? 'Inactive' : 'Active';
    await updateVendor(id, { status: newStatus });
  };

  const generateNextBankTransactionId = async (): Promise<string> => {
    const yearNum = new Date().getFullYear();
    const prefix = 'BT';
    const counterKey = `banktx_${yearNum}`;
    const counterDocRef = doc(db, 'counters', counterKey);

    try {
      const nextSeq = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let currentSeq = 0;
        if (counterDoc.exists()) {
          currentSeq = counterDoc.data().seq || 0;
        }
        const updatedSeq = currentSeq + 1;
        transaction.set(counterDocRef, {
          seq: updatedSeq,
          year: yearNum,
          prefix,
          updatedAt: new Date().toISOString(),
        });
        return updatedSeq;
      });
      return `${prefix}-${yearNum}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      const max = bankTransactions.length;
      return `${prefix}-${yearNum}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const addBankTransaction = async (
    data: Omit<BankTransactionRecord, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const nowIso = new Date().toISOString();
    const txId = `BT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txNumber = await generateNextBankTransactionId();

    const record: BankTransactionRecord = {
      ...data,
      id: txId,
      transactionId: txNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'bankTransactions', txId), cleanDataForFirestore(record));
      await logFinanceAudit(
        'BANK_TRANSACTION_CREATED',
        `Bank Transaction ${txNumber} recorded: ₹${data.amount.toLocaleString()} (${data.type}) in ${data.bankAccountName}`,
        { metadata: { txNumber, amount: data.amount, type: data.type } }
      );
      return txId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bankTransactions/${txId}`);
      throw err;
    }
  };

  const bulkImportBankTransactions = async (
    transactions: Array<Omit<BankTransactionRecord, 'id' | 'transactionId' | 'createdAt' | 'updatedAt'>>
  ): Promise<number> => {
    if (transactions.length === 0) return 0;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    let count = 0;

    for (let i = 0; i < transactions.length; i++) {
      const item = transactions[i];
      const txId = `BT-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
      const txNumber = `BT-${new Date().getFullYear()}-${String(bankTransactions.length + i + 1).padStart(4, '0')}`;
      const rec: BankTransactionRecord = {
        ...item,
        id: txId,
        transactionId: txNumber,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      batch.set(doc(db, 'bankTransactions', txId), cleanDataForFirestore(rec));
      count++;
    }

    try {
      await batch.commit();
      return count;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'bankTransactions');
      throw err;
    }
  };

  const reconcileBankTransaction = async (params: {
    transactionId: string;
    paymentId?: string;
    invoiceId?: string;
    notes?: string;
  }): Promise<void> => {
    const tx = bankTransactions.find((t) => t.id === params.transactionId);
    if (!tx) throw new Error('Bank transaction not found.');

    const nowIso = new Date().toISOString();
    const recId = `REC-ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let targetAmount = tx.amount;
    if (params.paymentId) {
      const p = payments.find((pmt) => pmt.id === params.paymentId);
      if (p) targetAmount = p.amount;
    }

    const difference = roundTo2(Math.abs(tx.amount - targetAmount));

    const recRecord: BankReconciliationRecord = {
      id: recId,
      reconciliationId: recId,
      bankTransactionId: tx.id,
      paymentId: params.paymentId,
      invoiceId: params.invoiceId,
      reconciledAmount: targetAmount,
      difference,
      status: 'RECONCILED',
      notes: params.notes || '',
      reconciledBy: userProfile?.uid || currentUser?.uid || 'admin',
      reconciledByName: userProfile?.name || 'Administrator',
      reconciledAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'bankReconciliations', recId), cleanDataForFirestore(recRecord));
      await updateDoc(doc(db, 'bankTransactions', tx.id), {
        reconciliationStatus: 'RECONCILED',
        matchedPaymentId: params.paymentId || null,
        matchedInvoiceId: params.invoiceId || null,
        reconciledAt: nowIso,
        reconciledBy: userProfile?.name || 'Administrator',
        updatedAt: nowIso,
      });

      await logFinanceAudit(
        'BANK_RECONCILED',
        `Bank Transaction ${tx.transactionId} matched and reconciled against ${params.paymentId ? `Payment ${params.paymentId}` : 'Invoice'}`,
        { metadata: { transactionId: tx.transactionId, paymentId: params.paymentId, invoiceId: params.invoiceId } }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bankTransactions/${tx.id}`);
      throw err;
    }
  };

  const unmatchBankTransaction = async (transactionId: string): Promise<void> => {
    const tx = bankTransactions.find((t) => t.id === transactionId);
    if (!tx) return;
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'bankTransactions', tx.id), {
        reconciliationStatus: 'UNRECONCILED',
        matchedPaymentId: null,
        matchedInvoiceId: null,
        reconciledAt: null,
        reconciledBy: null,
        updatedAt: nowIso,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bankTransactions/${tx.id}`);
      throw err;
    }
  };

  const schedulePaymentReminder = async (
    invoiceId: string,
    type: 'BEFORE_DUE' | 'ON_DUE' | 'OVERDUE',
    channel: 'email' | 'whatsapp' | 'both'
  ): Promise<string> => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found.');

    const cust = inv.customerSnapshot || customers.find((c) => c.id === inv.customerId);
    const nowIso = new Date().toISOString();
    const remId = `REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const reminder: PaymentReminderRecord = {
      id: remId,
      reminderId: remId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: cust?.companyName || 'Customer',
      customerEmail: cust?.email || '',
      customerPhone: cust?.mobile || '',
      type,
      scheduledAt: nowIso,
      channel,
      status: 'SCHEDULED',
      createdAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'paymentReminders', remId), cleanDataForFirestore(reminder));
      return remId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `paymentReminders/${remId}`);
      throw err;
    }
  };

  const checkAndNotifyPaymentReminders = async (): Promise<void> => {
    await checkAndNotifyOverdueInvoices();
  };

  // ==========================================
  // PHASE 13 — ONLINE PAYMENT GATEWAYS & LINKS
  // ==========================================

  const fetchPaymentConfig = async (): Promise<PaymentGatewayPublicConfig> => {
    try {
      const res = await fetch('/api/payment/config');
      if (res.ok) {
        const data = await res.json();
        setPaymentConfig(data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch payment config:', e);
    }
    return paymentConfig;
  };

  const savePaymentConfig = async (configData: any) => {
    try {
      const res = await fetch('/api/payment/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPaymentConfig();
        try {
          await setDoc(doc(db, 'paymentGatewaySettings', 'default'), cleanDataForFirestore({
            gateway: configData.gateway,
            environment: configData.environment,
            merchantName: configData.merchantName,
            currency: configData.currency,
            status: data.status,
            updatedAt: new Date().toISOString(),
          }));
        } catch (e) {}
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save payment configuration' };
    }
  };

  const testPaymentConnection = async () => {
    try {
      const res = await fetch('/api/payment/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection test failed' };
    }
  };

  const createPaymentLink = async (params: {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    requestedAmount?: number;
    invoiceTotal?: number;
    invoicePaid?: number;
    invoiceOutstanding?: number;
    expiresInHours?: number;
    notes?: string;
  }): Promise<PaymentLinkRecord> => {
    try {
      const res = await fetch('/api/payment/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate payment link');
      }

      const paymentLink: PaymentLinkRecord = data.paymentLink;

      // Sync to Firestore
      try {
        await setDoc(doc(db, 'paymentLinks', paymentLink.id), cleanDataForFirestore(paymentLink));
      } catch (e) {
        console.warn('Firestore paymentLinks sync warning:', e);
      }

      setPaymentLinks((prev) => [paymentLink, ...prev.filter((p) => p.id !== paymentLink.id)]);

      await logActivity(
        'INVOICE_CREATED' as any,
        'Payment Link Generated',
        `Payment link created for Invoice ${params.invoiceNumber} (${params.customerName}) for ₹${paymentLink.amount.toLocaleString()}. Expires on ${new Date(paymentLink.expiresAt).toLocaleDateString()}.`,
        params.customerId
      );

      return paymentLink;
    } catch (err: any) {
      throw err;
    }
  };

  const cancelPaymentLink = async (paymentLinkId: string) => {
    try {
      setPaymentLinks((prev) =>
        prev.map((pl) => (pl.id === paymentLinkId ? { ...pl, status: 'Cancelled' as const } : pl))
      );
      try {
        await updateDoc(doc(db, 'paymentLinks', paymentLinkId), {
          status: 'Cancelled',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {}
    } catch (err) {
      console.error('Failed to cancel payment link:', err);
    }
  };

  const initiateRefund = async (params: {
    paymentId: string;
    refundAmount: number;
    reason: string;
  }) => {
    try {
      const res = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Refund request failed');
      }

      // Refresh online payments and invoices
      await refreshOnlinePayments();

      const matchedPayment = onlinePayments.find((p) => p.paymentId === params.paymentId || p.gatewayPaymentId === params.paymentId);
      if (matchedPayment) {
        const inv = invoices.find((i) => i.id === matchedPayment.invoiceId);
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount - params.refundAmount);
          const newOutstanding = inv.grandTotal - newPaid;
          const newStatus = deriveInvoiceStatus(inv.status, inv.grandTotal, newPaid, inv.dueDate);
          await updateDoc(doc(db, 'invoices', inv.id), {
            paidAmount: newPaid,
            outstandingAmount: newOutstanding,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          });
        }

        const logId = `AUD-${Date.now().toString(36).toUpperCase()}`;
        await setDoc(doc(db, 'auditLogs', logId), cleanDataForFirestore({
          id: logId,
          eventId: logId,
          type: 'REFUND_CREATED',
          userId: currentUser?.uid || 'admin',
          userName: userProfile?.name || 'Administrator',
          customerId: matchedPayment.customerId,
          customerName: matchedPayment.customerName,
          invoiceId: matchedPayment.invoiceId,
          invoiceNumber: matchedPayment.invoiceNumber,
          paymentId: matchedPayment.paymentId,
          description: `Refund of ₹${params.refundAmount.toLocaleString()} processed for Invoice ${matchedPayment.invoiceNumber}. Reason: ${params.reason}. Gateway Refund ID: ${data.gatewayRefundId}.`,
          metadata: { refundAmount: params.refundAmount, reason: params.reason, gatewayRefundId: data.gatewayRefundId },
          createdAt: new Date().toISOString(),
        }));

        await createNotification({
          userId: 'all_admins',
          type: 'PAYMENT_RECEIVED',
          title: `Payment Refund Processed (₹${params.refundAmount.toLocaleString()})`,
          message: `Refund of ₹${params.refundAmount.toLocaleString()} issued for Invoice ${matchedPayment.invoiceNumber} (${matchedPayment.customerName}).`,
          relatedType: 'payment',
          relatedId: matchedPayment.paymentId,
        });
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Refund processing failed' };
    }
  };

  const refreshOnlinePayments = async () => {
    try {
      const res = await fetch('/api/payment/online-payments');
      if (res.ok) {
        const data = await res.json();
        if (data.onlinePayments) {
          setOnlinePayments(data.onlinePayments);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh online payments:', e);
    }
  };

  const refreshReconciliation = async () => {
    try {
      const res = await fetch('/api/payment/reconciliation');
      if (res.ok) {
        const data = await res.json();
        if (data.reconciliationRecords) {
          setReconciliationRecords(data.reconciliationRecords);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh reconciliation:', e);
    }
  };

  // ============================================================================
  // PHASE 17: HR, EMPLOYEE MANAGEMENT, ATTENDANCE, LEAVE, TASKS & PAYROLL
  // ============================================================================

  const generateNextEmployeeCode = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', `employees_${currentYear}`);
    try {
      let nextNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        if (snap.exists()) {
          nextNum = (snap.data().lastNumber || 0) + 1;
        }
        txn.set(counterRef, { lastNumber: nextNum, year: currentYear }, { merge: true });
      });
      return `EMP-${currentYear}-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.warn('Counter transaction fallback for employee code:', err);
      const existingCodes = employeeRecords.map((e) => e.employeeCode || e.employeeId || '');
      let max = 0;
      for (const c of existingCodes) {
        const match = c?.match(/EMP-\d{4}-(\d+)/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > max) max = n;
        }
      }
      return `EMP-${currentYear}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const generateNextTaskNumber = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', `tasks_${currentYear}`);
    try {
      let nextNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        if (snap.exists()) {
          nextNum = (snap.data().lastNumber || 0) + 1;
        }
        txn.set(counterRef, { lastNumber: nextNum, year: currentYear }, { merge: true });
      });
      return `TSK-${currentYear}-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      const existingCodes = taskRecords.map((t) => t.taskNumber || t.taskId || '');
      let max = 0;
      for (const c of existingCodes) {
        const match = c?.match(/TSK-\d{4}-(\d+)/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > max) max = n;
        }
      }
      return `TSK-${currentYear}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const generateNextAttendanceId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', `attendance_${currentYear}`);
    try {
      let nextNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        if (snap.exists()) {
          nextNum = (snap.data().lastNumber || 0) + 1;
        }
        txn.set(counterRef, { lastNumber: nextNum, year: currentYear }, { merge: true });
      });
      return `ATT-${currentYear}-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      const existing = attendanceRecords.map((a) => a.attendanceId || a.id || '');
      let max = 0;
      for (const c of existing) {
        const match = c?.match(/ATT-\d{4}-(\d+)/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > max) max = n;
        }
      }
      return `ATT-${currentYear}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const generateNextLeaveId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', `leaves_${currentYear}`);
    try {
      let nextNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        if (snap.exists()) {
          nextNum = (snap.data().lastNumber || 0) + 1;
        }
        txn.set(counterRef, { lastNumber: nextNum, year: currentYear }, { merge: true });
      });
      return `LV-${currentYear}-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      const existing = leaveRecords.map((l) => l.leaveId || l.id || '');
      let max = 0;
      for (const c of existing) {
        const match = c?.match(/LV-\d{4}-(\d+)/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > max) max = n;
        }
      }
      return `LV-${currentYear}-${String(max + 1).padStart(4, '0')}`;
    }
  };

  const generateNextPayrollId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', `payrolls_${currentYear}`);
    try {
      let nextNum = 1;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterRef);
        if (snap.exists()) {
          nextNum = (snap.data().lastNumber || 0) + 1;
        }
        txn.set(counterRef, { lastNumber: nextNum, year: currentYear }, { merge: true });
      });
      return `PAY-${currentYear}-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      return `PAY-${currentYear}-${String(payrollRecords.length + 1).padStart(4, '0')}`;
    }
  };

  const logEmployeeActivity = async (params: {
    employeeId: string;
    employeeName?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    metadata?: Record<string, any>;
  }): Promise<string> => {
    const actId = `ACT-EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newAct: EmployeeActivityRecord = {
      id: actId,
      activityId: actId,
      employeeId: params.employeeId,
      employeeName: params.employeeName || userProfile?.name || 'Employee',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      timestamp: nowIso,
      details: params.details,
      metadata: params.metadata,
    };
    try {
      await setDoc(doc(db, 'employeeActivities', actId), cleanDataForFirestore(newAct));
    } catch (err) {
      console.warn('logEmployeeActivity write failed:', err);
    }
    return actId;
  };

  const createEmployeeRecord = async (
    data: Omit<EmployeeRecord, 'id' | 'employeeId' | 'employeeCode' | 'createdAt' | 'updatedAt' | 'createdBy'> & { password?: string; employeeCode?: string }
  ): Promise<string> => {
    const trimmedEmail = data.email.trim().toLowerCase();

    if (employeeRecords.some((e) => e.email.toLowerCase() === trimmedEmail)) {
      throw new Error(`An employee with email "${trimmedEmail}" already exists.`);
    }

    const employeeCode = data.employeeCode ? data.employeeCode.trim().toUpperCase() : await generateNextEmployeeCode();

    if (employeeRecords.some((e) => (e.employeeCode || '').toUpperCase() === employeeCode)) {
      throw new Error(`Employee Code "${employeeCode}" is already in use.`);
    }

    let uid = data.uid || '';
    if (data.hasLoginAccess) {
      const tempPass = data.password || 'Employee@2026';
      
      // Step 3: Call secure server-side endpoint to create Firebase Auth user without replacing Admin session
      try {
        const resp = await fetch('/api/admin/employees/create-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name || `${data.firstName} ${data.lastName}`.trim(),
            email: trimmedEmail,
            role: (data.roleName === 'Super Admin' || data.roleName === 'Admin') ? 'admin' : 'employee',
            department: data.department,
            designation: data.designation,
            password: tempPass,
            accountStatus: (data.employmentStatus === 'Active' || data.employmentStatus === 'Probation') ? 'active' : 'inactive',
            employeeCode,
          }),
        });

        const authResult = await resp.json();
        if (resp.ok && authResult.success && authResult.uid) {
          uid = authResult.uid;
        } else if (authResult.error) {
          if (authResult.error.includes('already exists')) {
            throw new Error(authResult.error);
          }
          console.warn('Server auth creation fallback triggered:', authResult.error);
          uid = await createEmployeeAuthAccount(trimmedEmail, tempPass);
        } else {
          uid = await createEmployeeAuthAccount(trimmedEmail, tempPass);
        }
      } catch (authErr: any) {
        if (authErr.message && authErr.message.includes('already exists')) {
          throw authErr;
        }
        console.warn('Auth account creation notice:', authErr);
        try {
          uid = await createEmployeeAuthAccount(trimmedEmail, tempPass);
        } catch (secondaryErr) {
          uid = `emp_uid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }
      }

      const roleType = (data.roleName === 'Super Admin' || data.roleName === 'Admin') ? 'admin' : 'employee';
      const userProfileDoc: UserProfile = {
        id: uid,
        uid,
        email: trimmedEmail,
        name: data.name || `${data.firstName} ${data.lastName}`.trim(),
        mobile: data.phone,
        department: data.department,
        designation: data.designation,
        employeeId: employeeCode,
        role: roleType,
        status: (data.employmentStatus === 'Active' || data.employmentStatus === 'Probation') ? 'active' : 'inactive',
        permissions: data.permissions || (roleType === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', uid), cleanDataForFirestore(userProfileDoc), { merge: true });
      if (roleType === 'admin') {
        try {
          await setDoc(doc(db, 'admins', uid), { email: trimmedEmail, createdAt: new Date().toISOString() }, { merge: true });
        } catch (e) {}
      }
    }

    const docId = uid || `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    // Critical: Never store plaintext password or passwordHash in Firestore
    const { password: _p, confirmPassword: _cp, ...cleanDataWithoutPassword } = data as any;

    const newRecord: EmployeeRecord = {
      ...cleanDataWithoutPassword,
      id: docId,
      employeeId: employeeCode,
      employeeCode,
      name: data.name || `${data.firstName} ${data.lastName}`.trim(),
      email: trimmedEmail,
      uid: uid || undefined,
      hasLoginAccess: !!data.hasLoginAccess,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: userProfile?.uid || 'system',
      createdByName: userProfile?.name || 'Administrator',
    };

    await setDoc(doc(db, 'employees', docId), cleanDataForFirestore(newRecord));

    await logEmployeeActivity({
      employeeId: docId,
      employeeName: newRecord.name,
      action: 'Employee Created',
      entityType: 'Employee',
      entityId: docId,
      details: `Employee profile created with code ${employeeCode} (${newRecord.department} - ${newRecord.designation}).`,
    });

    return docId;
  };

  const resetEmployeePassword = async (email: string): Promise<string> => {
    try {
      const res = await fetch('/api/admin/employees/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok && !data.success) {
        throw new Error(data.error || 'Failed to dispatch password reset email.');
      }
      return data.message || 'If an account exists for this email, password reset instructions have been sent.';
    } catch (err: any) {
      console.warn('Server password reset notice:', err);
      return 'If an account exists for this email, password reset instructions have been sent.';
    }
  };

  const updateEmployeeRecord = async (id: string, data: Partial<EmployeeRecord>): Promise<void> => {
    const existing = employeeRecords.find((e) => e.id === id);
    const nowIso = new Date().toISOString();
    const updated = {
      ...data,
      updatedAt: nowIso,
      updatedBy: userProfile?.name || 'Administrator',
    };
    await updateDoc(doc(db, 'employees', id), cleanDataForFirestore(updated));

    const targetUid = existing?.uid || data.uid;
    if (targetUid) {
      const userUpdates: any = { updatedAt: nowIso };
      if (data.name) userUpdates.name = data.name;
      if (data.phone) userUpdates.mobile = data.phone;
      if (data.department) userUpdates.department = data.department;
      if (data.designation) userUpdates.designation = data.designation;
      if (data.permissions) userUpdates.permissions = data.permissions;
      if (data.employmentStatus) {
        userUpdates.status = (data.employmentStatus === 'Active' || data.employmentStatus === 'Probation') ? 'active' : 'inactive';
      }
      try {
        await updateDoc(doc(db, 'users', targetUid), cleanDataForFirestore(userUpdates));
      } catch (e) {
        console.warn('Sync to users doc notice:', e);
      }
    }

    await logEmployeeActivity({
      employeeId: id,
      employeeName: existing?.name || 'Employee',
      action: 'Employee Updated',
      entityType: 'Employee',
      entityId: id,
      details: `Employee record updated by ${userProfile?.name || 'Administrator'}.`,
    });
  };

  const updateEmployeeEmploymentStatus = async (id: string, status: EmploymentStatus): Promise<void> => {
    await updateEmployeeRecord(id, { employmentStatus: status });
    await logEmployeeActivity({
      employeeId: id,
      action: `Status Changed to ${status}`,
      entityType: 'Employee',
      entityId: id,
      details: `Employment status updated to "${status}".`,
    });
  };

  const canDeleteEmployee = (id: string): { canDelete: boolean; reason?: string } => {
    const emp = employeeRecords.find((e) => e.id === id);
    const uid = emp?.uid;
    const empCode = emp?.employeeCode;

    const hasCustomers = customers.some((c) => c.assignedEmployeeId === id || (uid && c.assignedEmployeeId === uid) || (uid && c.createdBy === uid));
    const hasLeads = leads.some((l) => l.assignedEmployeeId === id || (uid && l.assignedEmployeeId === uid) || (uid && l.createdBy === uid));
    const hasProposals = proposals.some((p) => p.assignedEmployeeId === id || (uid && p.assignedEmployeeId === uid) || (uid && p.createdBy === uid));
    const hasInvoices = invoices.some((i) => uid && i.createdBy === uid);
    const hasAttendance = attendanceRecords.some((a) => a.employeeId === id || (uid && a.employeeId === uid) || (empCode && a.employeeCode === empCode));
    const hasTasks = taskRecords.some((t) => t.assignedTo === id || (uid && t.assignedTo === uid) || (uid && t.createdBy === uid));
    const hasLeaves = leaveRecords.some((l) => l.employeeId === id || (uid && l.employeeId === uid));

    if (hasCustomers || hasLeads || hasProposals || hasInvoices || hasAttendance || hasTasks || hasLeaves) {
      return {
        canDelete: false,
        reason: 'This employee has historical business records (customers, leads, proposals, invoices, tasks, attendance, or leaves). To preserve audit integrity, deactivate, suspend, or mark employment status as "Exited" instead of deleting.',
      };
    }
    return { canDelete: true };
  };

  const deleteEmployeeRecord = async (id: string): Promise<void> => {
    const check = canDeleteEmployee(id);
    if (!check.canDelete) {
      throw new Error(check.reason);
    }
    const emp = employeeRecords.find((e) => e.id === id);
    await deleteDoc(doc(db, 'employees', id));
    if (emp?.uid) {
      try {
        await deleteDoc(doc(db, 'users', emp.uid));
      } catch (e) {}
    }
  };

  // Departments
  const addDepartment = async (data: Omit<DepartmentRecord, 'id' | 'departmentId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const count = departmentRecords.length + 1;
    const deptId = `DEP-${String(count).padStart(3, '0')}`;
    const id = `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newDept: DepartmentRecord = {
      ...data,
      id,
      departmentId: deptId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: userProfile?.name || 'Admin',
    };
    await setDoc(doc(db, 'departments', id), cleanDataForFirestore(newDept));
    return id;
  };

  const updateDepartment = async (id: string, data: Partial<DepartmentRecord>): Promise<void> => {
    await updateDoc(doc(db, 'departments', id), cleanDataForFirestore({ ...data, updatedAt: new Date().toISOString() }));
  };

  const deleteDepartment = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'departments', id));
  };

  // Designations
  const addDesignation = async (data: Omit<DesignationRecord, 'id' | 'designationId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const count = designationRecords.length + 1;
    const desigId = `DES-${String(count).padStart(3, '0')}`;
    const id = `des_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newDesig: DesignationRecord = {
      ...data,
      id,
      designationId: desigId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: userProfile?.name || 'Admin',
    };
    await setDoc(doc(db, 'designations', id), cleanDataForFirestore(newDesig));
    return id;
  };

  const updateDesignation = async (id: string, data: Partial<DesignationRecord>): Promise<void> => {
    await updateDoc(doc(db, 'designations', id), cleanDataForFirestore({ ...data, updatedAt: new Date().toISOString() }));
  };

  const deleteDesignation = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'designations', id));
  };

  // Roles
  const addRole = async (data: Omit<RoleRecord, 'id' | 'roleId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const count = roleRecords.length + 1;
    const roleId = `ROLE-${String(count).padStart(3, '0')}`;
    const id = `role_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newRole: RoleRecord = {
      ...data,
      id,
      roleId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'customRoles', id), cleanDataForFirestore(newRole));
    return id;
  };

  const updateRole = async (id: string, data: Partial<RoleRecord>): Promise<void> => {
    await updateDoc(doc(db, 'customRoles', id), cleanDataForFirestore({ ...data, updatedAt: new Date().toISOString() }));
  };

  const deleteRole = async (id: string): Promise<void> => {
    const target = roleRecords.find((r) => r.id === id);
    if (target?.isSystem) {
      throw new Error('System-defined default roles cannot be deleted.');
    }
    await deleteDoc(doc(db, 'customRoles', id));
  };

  // Tasks
  const createTask = async (data: Omit<TaskRecord, 'id' | 'taskId' | 'taskNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>): Promise<string> => {
    const taskNumber = await generateNextTaskNumber();
    const id = `tsk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newTask: TaskRecord = {
      ...data,
      id,
      taskId: taskNumber,
      taskNumber,
      createdBy: userProfile?.uid || 'admin',
      createdByName: userProfile?.name || 'Administrator',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'tasks', id), cleanDataForFirestore(newTask));

    // In-app notification to assignee
    if (data.assignedTo) {
      await createNotification({
        userId: data.assignedTo,
        type: 'TASK_ASSIGNED' as any,
        title: `New Task Assigned: ${data.title}`,
        message: `You have been assigned task ${taskNumber} with priority "${data.priority}". Deadline: ${data.dueDate}`,
        relatedId: id,
        relatedType: 'task',
      });
    }

    await logEmployeeActivity({
      employeeId: data.assignedTo,
      employeeName: data.assignedToName,
      action: 'Task Created',
      entityType: 'Task',
      entityId: id,
      details: `Task "${data.title}" (${taskNumber}) created with priority "${data.priority}".`,
    });

    return id;
  };

  const updateTask = async (id: string, data: Partial<TaskRecord>): Promise<void> => {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'tasks', id), cleanDataForFirestore({ ...data, updatedAt: nowIso }));
  };

  const updateTaskStatus = async (id: string, status: TaskStatus): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updates: Partial<TaskRecord> = {
      status,
      updatedAt: nowIso,
      completedAt: status === 'Completed' ? nowIso : undefined,
    };
    await updateDoc(doc(db, 'tasks', id), cleanDataForFirestore(updates));

    const task = taskRecords.find((t) => t.id === id);
    if (task) {
      await logEmployeeActivity({
        employeeId: task.assignedTo,
        employeeName: task.assignedToName,
        action: status === 'Completed' ? 'Task Completed' : `Task Status: ${status}`,
        entityType: 'Task',
        entityId: id,
        details: `Task status updated to "${status}".`,
      });
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  // Attendance
  const checkInEmployee = async (employeeId: string, source: 'Web' | 'Mobile' | 'System' = 'Web', notes?: string): Promise<AttendanceRecord> => {
    const now = new Date();
    const kolkataStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const kd = new Date(kolkataStr);
    const today = `${kd.getFullYear()}-${String(kd.getMonth() + 1).padStart(2, '0')}-${String(kd.getDate()).padStart(2, '0')}`;

    const existing = attendanceRecords.find((a) => (a.employeeId === employeeId || a.employeeCode === employeeId) && a.date === today);
    if (existing) {
      throw new Error(`Attendance check-in already recorded for today (${today}) at ${new Date(existing.checkIn).toLocaleTimeString('en-IN')}. Duplicate check-ins are prevented.`);
    }

    const emp = employeeRecords.find((e) => e.id === employeeId || e.uid === employeeId || e.employeeCode === employeeId);
    const attId = await generateNextAttendanceId();
    const nowIso = new Date().toISOString();

    const hours = kd.getHours();
    const mins = kd.getMinutes();
    const isLate = hours > 9 || (hours === 9 && mins > 30);
    const status: AttendanceStatus = isLate ? 'Late' : 'Present';

    const record: AttendanceRecord = {
      id: attId,
      attendanceId: attId,
      employeeId: emp?.id || employeeId,
      employeeCode: emp?.employeeCode,
      employeeName: emp?.name || userProfile?.name || 'Employee',
      department: emp?.department || 'General',
      date: today,
      checkIn: nowIso,
      status,
      source,
      notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'attendance', attId), cleanDataForFirestore(record));

    await logEmployeeActivity({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      action: 'Attendance Checked In',
      entityType: 'Attendance',
      entityId: attId,
      details: `Checked in at ${new Date().toLocaleTimeString('en-IN')} (${status}).`,
    });

    return record;
  };

  const checkOutEmployee = async (attendanceId: string): Promise<AttendanceRecord> => {
    const att = attendanceRecords.find((a) => a.id === attendanceId || a.attendanceId === attendanceId);
    if (!att) {
      throw new Error('Attendance record not found.');
    }
    if (att.checkOut) {
      throw new Error(`Check-out has already been registered at ${new Date(att.checkOut).toLocaleTimeString('en-IN')}.`);
    }

    const nowIso = new Date().toISOString();
    const checkInMs = new Date(att.checkIn).getTime();
    const checkOutMs = new Date(nowIso).getTime();
    const durationMinutes = Math.max(0, Math.round((checkOutMs - checkInMs) / (1000 * 60)));
    const durationFormatted = formatMinutesToDuration(durationMinutes);

    let status = att.status;
    if (durationMinutes < 240 && status !== 'Leave') {
      status = 'Half Day';
    }

    const updates: Partial<AttendanceRecord> = {
      checkOut: nowIso,
      workDuration: durationMinutes,
      workDurationFormatted: durationFormatted,
      status,
      updatedAt: nowIso,
    };

    await updateDoc(doc(db, 'attendance', att.id), cleanDataForFirestore(updates));

    await logEmployeeActivity({
      employeeId: att.employeeId,
      employeeName: att.employeeName,
      action: 'Attendance Checked Out',
      entityType: 'Attendance',
      entityId: att.id,
      details: `Checked out at ${new Date().toLocaleTimeString('en-IN')} (Duration: ${durationFormatted}).`,
    });

    return { ...att, ...updates };
  };

  const correctAttendance = async (
    attendanceId: string,
    params: { correctedCheckIn: string; correctedCheckOut?: string; reason: string }
  ): Promise<void> => {
    const att = attendanceRecords.find((a) => a.id === attendanceId || a.attendanceId === attendanceId);
    if (!att) throw new Error('Attendance record not found.');
    if (!params.reason.trim()) throw new Error('Attendance correction reason is mandatory.');

    let durationMins = att.workDuration;
    let durationFormatted = att.workDurationFormatted;
    if (params.correctedCheckOut) {
      const diff = Math.max(0, Math.round((new Date(params.correctedCheckOut).getTime() - new Date(params.correctedCheckIn).getTime()) / (1000 * 60)));
      durationMins = diff;
      durationFormatted = formatMinutesToDuration(diff);
    }

    const correctionEntry: AttendanceCorrection = {
      originalCheckIn: att.checkIn,
      originalCheckOut: att.checkOut,
      correctedCheckIn: params.correctedCheckIn,
      correctedCheckOut: params.correctedCheckOut,
      reason: params.reason.trim(),
      approvedBy: userProfile?.uid || 'admin',
      approvedByName: userProfile?.name || 'Administrator',
      approvedAt: new Date().toISOString(),
    };

    const updates: Partial<AttendanceRecord> = {
      originalCheckIn: att.originalCheckIn || att.checkIn,
      originalCheckOut: att.originalCheckOut || att.checkOut,
      correctedCheckIn: params.correctedCheckIn,
      correctedCheckOut: params.correctedCheckOut,
      checkIn: params.correctedCheckIn,
      checkOut: params.correctedCheckOut || att.checkOut,
      workDuration: durationMins,
      workDurationFormatted: durationFormatted,
      isCorrected: true,
      correctionReason: params.reason.trim(),
      approvedBy: userProfile?.uid || 'admin',
      approvedByName: userProfile?.name || 'Administrator',
      approvedAt: new Date().toISOString(),
      correctionHistory: [...(att.correctionHistory || []), correctionEntry],
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'attendance', att.id), cleanDataForFirestore(updates));

    await logEmployeeActivity({
      employeeId: att.employeeId,
      employeeName: att.employeeName,
      action: 'ATTENDANCE_CORRECTED',
      entityType: 'Attendance',
      entityId: att.id,
      details: `Attendance corrected by ${userProfile?.name || 'Admin'}. Reason: "${params.reason}".`,
    });
  };

  // Leaves
  const applyLeave = async (data: Omit<LeaveRecord, 'id' | 'leaveId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const leaveId = await generateNextLeaveId();
    const id = `lv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newLeave: LeaveRecord = {
      ...data,
      id,
      leaveId,
      status: 'Pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'leaves', id), cleanDataForFirestore(newLeave));

    await logEmployeeActivity({
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      action: 'Leave Applied',
      entityType: 'Leave',
      entityId: id,
      details: `${data.leaveType} applied from ${data.fromDate} to ${data.toDate} (${data.numberOfDays} days). Reason: "${data.reason}".`,
    });

    return id;
  };

  const approveLeave = async (leaveId: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updates: Partial<LeaveRecord> = {
      status: 'Approved',
      approvedBy: userProfile?.uid || 'admin',
      approvedByName: userProfile?.name || 'Administrator',
      approvedAt: nowIso,
      updatedAt: nowIso,
    };
    await updateDoc(doc(db, 'leaves', leaveId), cleanDataForFirestore(updates));

    const leave = leaveRecords.find((l) => l.id === leaveId);
    if (leave) {
      await logEmployeeActivity({
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        action: 'Leave Approved',
        entityType: 'Leave',
        entityId: leaveId,
        details: `Leave application approved by ${userProfile?.name || 'Admin'}.`,
      });
    }
  };

  const rejectLeave = async (leaveId: string, rejectionReason: string): Promise<void> => {
    if (!rejectionReason.trim()) {
      throw new Error('Rejection reason is required.');
    }
    const nowIso = new Date().toISOString();
    const updates: Partial<LeaveRecord> = {
      status: 'Rejected',
      rejectionReason: rejectionReason.trim(),
      approvedBy: userProfile?.uid || 'admin',
      approvedByName: userProfile?.name || 'Administrator',
      approvedAt: nowIso,
      updatedAt: nowIso,
    };
    await updateDoc(doc(db, 'leaves', leaveId), cleanDataForFirestore(updates));

    const leave = leaveRecords.find((l) => l.id === leaveId);
    if (leave) {
      await logEmployeeActivity({
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        action: 'Leave Rejected',
        entityType: 'Leave',
        entityId: leaveId,
        details: `Leave application rejected. Reason: "${rejectionReason}".`,
      });
    }
  };

  const cancelLeave = async (leaveId: string): Promise<void> => {
    const leave = leaveRecords.find((l) => l.id === leaveId);
    if (leave && leave.status !== 'Pending') {
      throw new Error('Only pending leave requests can be cancelled.');
    }
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'leaves', leaveId), cleanDataForFirestore({ status: 'Cancelled', updatedAt: nowIso }));
  };

  // Leave Types
  const addLeaveType = async (data: Omit<LeaveTypeRecord, 'id' | 'leaveTypeId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const count = leaveTypeRecords.length + 1;
    const leaveTypeId = `LT-${String(count).padStart(3, '0')}`;
    const id = `lt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newLT: LeaveTypeRecord = {
      ...data,
      id,
      leaveTypeId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'leaveTypes', id), cleanDataForFirestore(newLT));
    return id;
  };

  const updateLeaveType = async (id: string, data: Partial<LeaveTypeRecord>): Promise<void> => {
    await updateDoc(doc(db, 'leaveTypes', id), cleanDataForFirestore({ ...data, updatedAt: new Date().toISOString() }));
  };

  const deleteLeaveType = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'leaveTypes', id));
  };

  // Holidays
  const addHoliday = async (data: Omit<HolidayRecord, 'id' | 'holidayId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const count = holidayRecords.length + 1;
    const year = data.year || new Date().getFullYear();
    const holidayId = `HOL-${year}-${String(count).padStart(3, '0')}`;
    const id = `hol_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newHol: HolidayRecord = {
      ...data,
      id,
      holidayId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, 'holidays', id), cleanDataForFirestore(newHol));
    return id;
  };

  const updateHoliday = async (id: string, data: Partial<HolidayRecord>): Promise<void> => {
    await updateDoc(doc(db, 'holidays', id), cleanDataForFirestore({ ...data, updatedAt: new Date().toISOString() }));
  };

  const deleteHoliday = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'holidays', id));
  };

  // Payroll
  const generateMonthlyPayroll = async (monthYear: string): Promise<PayrollRecord[]> => {
    const activeEmps = employeeRecords.filter((e) => e.employmentStatus === 'Active' || e.employmentStatus === 'Probation');
    const generated: PayrollRecord[] = [];

    for (const emp of activeEmps) {
      const slip = computeMonthlyPayroll(emp, monthYear, attendanceRecords, leaveRecords);
      await setDoc(doc(db, 'payrolls', slip.id), cleanDataForFirestore(slip));
      generated.push(slip);
    }

    return generated;
  };

  const updatePayrollStatus = async (payrollId: string, status: 'Draft' | 'Approved' | 'Paid', paymentReference?: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const updates: Partial<PayrollRecord> = {
      status,
      paidDate: status === 'Paid' ? nowIso.split('T')[0] : undefined,
      paymentReference,
      approvedBy: status === 'Approved' || status === 'Paid' ? userProfile?.name : undefined,
      approvedAt: status === 'Approved' || status === 'Paid' ? nowIso : undefined,
    };
    await updateDoc(doc(db, 'payrolls', payrollId), cleanDataForFirestore(updates));
  };

  // Phase 18 Sales Functions
  const generateNextLeadNumber = async (): Promise<string> => {
    return generateUniqueLeadNumber(leads);
  };

  const generateNextSTSNumber = async (): Promise<string> => {
    return generateUniqueSTSNumber(stsRecords);
  };

  const addSalesSource = async (name: string): Promise<string> => {
    const id = `src_${Date.now()}`;
    const newSource: SalesSourceRecord = {
      id,
      name: name.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'salesSources', id), cleanDataForFirestore(newSource));
    await logActivity('status_changed', 'Sales Source Added', `Added new sales source "${name}"`);
    return id;
  };

  const updateSalesSource = async (id: string, data: Partial<SalesSourceRecord>): Promise<void> => {
    await updateDoc(doc(db, 'salesSources', id), cleanDataForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const toggleSalesSource = async (id: string): Promise<void> => {
    const target = salesSources.find((s) => s.id === id);
    if (!target) return;
    await updateDoc(doc(db, 'salesSources', id), {
      isActive: !target.isActive,
      updatedAt: new Date().toISOString(),
    });
  };

  const addSalesStatus = async (name: string, stageOrder?: number, isWon?: boolean, isLost?: boolean): Promise<string> => {
    const id = `st_${Date.now()}`;
    const newOrder = stageOrder || salesStatuses.length + 1;
    const newStatus: SalesStatusRecord = {
      id,
      name: name.trim(),
      stageOrder: newOrder,
      isWon: !!isWon,
      isLost: !!isLost,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'salesStatuses', id), cleanDataForFirestore(newStatus));
    await logActivity('status_changed', 'Sales Stage Added', `Added new sales stage "${name}"`);
    return id;
  };

  const updateSalesStatus = async (id: string, data: Partial<SalesStatusRecord>): Promise<void> => {
    await updateDoc(doc(db, 'salesStatuses', id), cleanDataForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const canDeleteSalesStatus = (name: string): boolean => {
    const clean = name.trim().toLowerCase();
    const usedInLeads = leads.some((l) => (l.status || '').toLowerCase() === clean);
    const usedInSTS = stsRecords.some((s) => (s.status || '').toLowerCase() === clean);
    return !usedInLeads && !usedInSTS;
  };

  const deleteSalesStatus = async (id: string): Promise<void> => {
    const target = salesStatuses.find((s) => s.id === id);
    if (!target) return;
    if (!canDeleteSalesStatus(target.name)) {
      throw new Error(`Cannot delete stage "${target.name}" because historical leads or STS records reference it. You may deactivate it instead.`);
    }
    await deleteDoc(doc(db, 'salesStatuses', id));
  };

  const recordTalkHui = async (
    stsId: string,
    talkStatus: 'Yes' | 'No' | 'Callback' | 'Not Reachable',
    remarks?: string
  ): Promise<void> => {
    const existing = stsRecords.find((s) => s.id === stsId || s.stsId === stsId);
    if (!existing) throw new Error('STS record not found');
    const nowIso = new Date().toISOString();
    const updatePayload: Partial<STSRecord> = {
      talkStatus,
      lastContactedAt: nowIso,
      updatedAt: nowIso,
      updatedBy: userProfile?.name || 'Executive',
    };
    if (remarks) {
      updatePayload.remarks = existing.remarks
        ? `${existing.remarks} | Talk Hui (${talkStatus}): ${remarks}`
        : `Talk Hui (${talkStatus}): ${remarks}`;
    }
    await updateDoc(doc(db, 'sts', existing.id), cleanDataForFirestore(updatePayload));
    await logActivity(
      'TALK_HUI',
      'Talk Hui Recorded',
      `${userProfile?.name || 'Executive'} recorded Talk Hui status "${talkStatus}" for STS ${existing.stsNumber} (${existing.companyName}). ${remarks || ''}`,
      existing.customerId,
      existing.leadId,
      existing.id,
      { stsNumber: existing.stsNumber, talkStatus, remarks }
    );
  };

  const completeFollowUpWithOutcome = async (
    id: string,
    outcome: 'Completed' | 'Rescheduled' | 'Customer Not Available' | 'Not Interested' | 'Converted' | 'Other',
    notes?: string,
    rescheduleData?: { date: string; time: string; reason?: string }
  ): Promise<void> => {
    const existing = followups.find((f) => f.id === id);
    if (!existing) throw new Error('Follow-up record not found');
    const nowIso = new Date().toISOString();

    if (outcome === 'Rescheduled') {
      if (!rescheduleData?.date) {
        throw new Error('New follow-up date is required when rescheduling.');
      }
      const newTime = rescheduleData.time || '11:00';
      const reason = rescheduleData.reason || existing.reason;
      await updateDoc(doc(db, 'followups', id), cleanDataForFirestore({
        status: 'Upcoming',
        outcome: 'Rescheduled',
        date: rescheduleData.date,
        time: newTime,
        reason,
        notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
        updatedAt: nowIso,
      }));
      await logActivity(
        'FOLLOWUP_RESCHEDULED',
        'Follow-up Rescheduled',
        `${userProfile?.name || 'Executive'} rescheduled follow-up with ${existing.contactPerson} (${existing.companyName}) to ${rescheduleData.date} at ${newTime}. Outcome: Rescheduled${notes ? ` (${notes})` : ''}`,
        existing.customerId,
        existing.leadId
      );
    } else {
      await updateDoc(doc(db, 'followups', id), cleanDataForFirestore({
        status: 'Completed',
        outcome,
        completedAt: nowIso,
        notes: notes ? (existing.notes ? `${existing.notes} | Outcome: ${outcome} - ${notes}` : `Outcome: ${outcome} - ${notes}`) : existing.notes,
        updatedAt: nowIso,
      }));
      await logActivity(
        'FOLLOWUP_COMPLETED',
        'Follow-up Completed',
        `${userProfile?.name || 'Executive'} completed follow-up with ${existing.contactPerson} (${existing.companyName}) with outcome "${outcome}"${notes ? `: ${notes}` : ''}`,
        existing.customerId,
        existing.leadId
      );
    }
  };

  const updateLeadPipelineStage = async (leadId: string, newStatus: string): Promise<void> => {
    const existing = leads.find((l) => l.id === leadId || l.leadId === leadId);
    if (!existing) throw new Error('Lead record not found');
    const oldStatus = existing.status;
    if (oldStatus === newStatus) return;

    const nowIso = new Date().toISOString();
    const isWon = newStatus === 'Won' || newStatus === 'Converted';

    const updatePayload: Partial<Lead> = {
      status: newStatus,
      updatedAt: nowIso,
      updatedBy: userProfile?.name || 'Executive',
    };
    if (isWon && !existing.isConverted) {
      updatePayload.isConverted = true;
      updatePayload.conversionDate = nowIso;
    }

    await updateDoc(doc(db, 'leads', existing.id), cleanDataForFirestore(updatePayload));
    await logActivity(
      'LEAD_STATUS_CHANGED',
      'Lead Pipeline Stage Moved',
      `${userProfile?.name || 'User'} moved lead "${existing.companyName}" (${existing.leadNumber || existing.leadId}) from "${oldStatus}" to "${newStatus}"`,
      existing.convertedCustomerId,
      existing.id,
      undefined,
      {
        oldStatus,
        newStatus,
        changedBy: userProfile?.name || userProfile?.email || 'Executive',
        changedAt: nowIso,
      }
    );
  };

  const checkDuplicateCustomer = (params: {
    phone?: string;
    email?: string;
    gstNumber?: string;
    excludeCustomerId?: string;
  }) => {
    return detectDuplicateCustomer(params, customers);
  };

  const bulkAssignLeads = async (leadIds: string[], employeeId: string, employeeName: string): Promise<void> => {
    if (!leadIds || leadIds.length === 0) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const lid of leadIds) {
      const leadDoc = doc(db, 'leads', lid);
      batch.update(leadDoc, {
        assignedEmployeeId: employeeId,
        assignedEmployeeName: employeeName,
        updatedAt: nowIso,
        updatedBy: userProfile?.name || 'Admin',
      });
    }

    await batch.commit();
    await logActivity(
      'BULK_ASSIGNMENT',
      'Bulk Leads Reassigned',
      `${userProfile?.name || 'Admin'} reassigned ${leadIds.length} lead(s) to ${employeeName}`,
      undefined,
      undefined,
      undefined,
      { leadIds, assignedEmployeeId: employeeId, assignedEmployeeName: employeeName, count: leadIds.length }
    );
  };

  const bulkUpdateLeadStatus = async (leadIds: string[], newStatus: string): Promise<void> => {
    if (!leadIds || leadIds.length === 0) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const lid of leadIds) {
      const leadDoc = doc(db, 'leads', lid);
      batch.update(leadDoc, {
        status: newStatus,
        updatedAt: nowIso,
        updatedBy: userProfile?.name || 'Executive',
      });
    }

    await batch.commit();
    await logActivity(
      'BULK_STATUS_UPDATE',
      'Bulk Lead Status Changed',
      `${userProfile?.name || 'Executive'} changed status to "${newStatus}" for ${leadIds.length} lead(s)`,
      undefined,
      undefined,
      undefined,
      { leadIds, newStatus, count: leadIds.length }
    );
  };

  const bulkAssignSTS = async (stsIds: string[], employeeId: string, employeeName: string): Promise<void> => {
    if (!stsIds || stsIds.length === 0) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const sid of stsIds) {
      const stsDoc = doc(db, 'sts', sid);
      batch.update(stsDoc, {
        assignedEmployeeId: employeeId,
        assignedEmployeeName: employeeName,
        updatedAt: nowIso,
        updatedBy: userProfile?.name || 'Admin',
      });
    }

    await batch.commit();
    await logActivity(
      'BULK_ASSIGNMENT',
      'Bulk STS Assigned',
      `${userProfile?.name || 'Admin'} assigned ${stsIds.length} STS record(s) to ${employeeName}`,
      undefined,
      undefined,
      undefined,
      { stsIds, assignedEmployeeId: employeeId, assignedEmployeeName: employeeName, count: stsIds.length }
    );
  };

  const bulkUpdateSTSStatus = async (stsIds: string[], newStatus: string): Promise<void> => {
    if (!stsIds || stsIds.length === 0) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const sid of stsIds) {
      const stsDoc = doc(db, 'sts', sid);
      batch.update(stsDoc, {
        status: newStatus as any,
        updatedAt: nowIso,
        updatedBy: userProfile?.name || 'Executive',
      });
    }

    await batch.commit();
    await logActivity(
      'BULK_STATUS_UPDATE',
      'Bulk STS Status Changed',
      `${userProfile?.name || 'Executive'} changed STS status to "${newStatus}" for ${stsIds.length} record(s)`,
      undefined,
      undefined,
      undefined,
      { stsIds, newStatus, count: stsIds.length }
    );
  };

  const checkAndNotifyFollowupReminders = () => {
    // Helper to evaluate follow-ups due or overdue
  };

  // Phase 20: Exports, Scheduled Reports, Report Auditing & Dashboard Customization
  const createReportExport = async (
    data: Omit<ReportExportRecord, 'id' | 'generatedAt'>
  ): Promise<string> => {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const record: ReportExportRecord = {
      ...data,
      id,
      generatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'reportExports', id), record);
    await logReportAudit(
      'report_exported',
      data.reportId,
      data.reportName,
      `Exported ${data.rowCount} row(s) to ${data.format.toUpperCase()} (${data.fileName})`,
      data.format,
      data.filters
    );
    return id;
  };

  const createScheduledReport = async (
    data: Omit<ScheduledReportRecord, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>
  ): Promise<string> => {
    const id = `sch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const record: ScheduledReportRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      createdBy: userProfile?.uid || 'user',
      createdByName: userProfile?.name || 'User',
    };
    await setDoc(doc(db, 'scheduledReports', id), record);
    await logReportAudit(
      'scheduled_created',
      data.reportId,
      data.reportName,
      `Configured ${data.frequency} scheduled report dispatch to ${data.recipients.join(', ')}`
    );
    return id;
  };

  const updateScheduledReport = async (
    id: string,
    data: Partial<ScheduledReportRecord>
  ): Promise<void> => {
    await updateDoc(doc(db, 'scheduledReports', id), {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile?.name || 'User',
    });
    const existing = scheduledReports.find((s) => s.id === id);
    if (existing) {
      await logReportAudit(
        'scheduled_modified',
        existing.reportId,
        existing.reportName,
        `Updated scheduled report settings`
      );
    }
  };

  const deleteScheduledReport = async (id: string): Promise<void> => {
    const existing = scheduledReports.find((s) => s.id === id);
    await deleteDoc(doc(db, 'scheduledReports', id));
    if (existing) {
      await logReportAudit(
        'scheduled_deleted',
        existing.reportId,
        existing.reportName,
        `Deleted scheduled report configuration`
      );
    }
  };

  const logReportAudit = async (
    action: ReportAuditLog['action'],
    reportId: string,
    reportName: string,
    details?: string,
    format?: 'excel' | 'csv' | 'pdf',
    filtersApplied?: Record<string, any>
  ): Promise<void> => {
    try {
      const id = `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const logEntry: ReportAuditLog = {
        id,
        action,
        reportId,
        reportName,
        userId: userProfile?.uid || 'user',
        userName: userProfile?.name || 'User',
        userRole: userProfile?.role || 'employee',
        timestamp: new Date().toISOString(),
        details,
        format,
        filtersApplied,
      };
      await setDoc(doc(db, 'reportAuditLogs', id), logEntry);
    } catch (e) {
      console.warn('Failed to record report audit log:', e);
    }
  };

  const updateDashboardConfig = async (config: Partial<DashboardConfiguration>): Promise<void> => {
    const configId = userProfile?.uid || 'default';
    const updated: DashboardConfiguration = {
      id: configId,
      userId: configId,
      visibleWidgets: config.visibleWidgets || dashboardConfig?.visibleWidgets || [
        'kpi_sales',
        'kpi_collection',
        'kpi_activity',
        'kpi_employee',
        'kpi_inventory',
        'kpi_finance',
        'alert_low_stock',
        'alert_overdue_payment',
        'alert_today_followups',
        'alert_tasks',
        'chart_sales_trend',
        'chart_revenue_expense',
      ],
      widgetOrder: config.widgetOrder || dashboardConfig?.widgetOrder || [
        'kpi_sales',
        'kpi_collection',
        'kpi_activity',
        'kpi_employee',
        'kpi_inventory',
        'kpi_finance',
        'alert_low_stock',
        'alert_overdue_payment',
        'alert_today_followups',
        'alert_tasks',
        'chart_sales_trend',
        'chart_revenue_expense',
      ],
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'dashboardConfigurations', configId), updated, { merge: true });
    setDashboardConfig(updated);
  };

  return (
    <CrmDataContext.Provider
      value={{
        customers,
        leads,
        activities,
        calls,
        followups,
        stsRecords,
        products,
        productPriceHistories,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductStatus,
        services,
        servicePriceHistories,
        addService,
        updateService,
        deleteService,
        toggleServiceStatus,
        proposals,
        employees,
        companySettings,
        bankSettings,
        bankAccounts,
        brandingSettings,
        proposalTemplateSettings,
        signatorySettings,
        termsList,
        proposalNumberingSettings,
        dataLoading,
        meetings,
        whatsappLogs,
        emailRecords,
        logActivity,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        archiveCustomer,
        restoreCustomer,
        generateNextCustomerId,
        addLead,
        updateLead,
        archiveLead,
        restoreLead,
        convertLeadToCustomer,
        generateNextLeadId,
        logCall,
        initiateCall,
        updateCallOutcome,
        addFollowUp,
        updateFollowUpStatus,
        completeFollowUp,
        rescheduleFollowUp,
        cancelFollowUp,
        addSTS,
        updateSTS,
        createProposal,
        updateProposal,
        updateProposalStatus,
        deleteProposal,
        duplicateProposal,
        generateNextProposalNumber,
        uploadCompanyLogo,
        removeCompanyLogo,
        addBankAccount,
        updateBankAccount,
        setDefaultBankAccount,
        toggleBankAccountStatus,
        deleteBankAccount,
        updateBrandingSettings,
        updateProposalTemplateSettings,
        updateSignatorySettings,
        uploadSignatorySignature,
        removeSignatorySignature,
        addTerm,
        updateTerm,
        deleteTerm,
        reorderTerms,
        updateProposalNumberingSettings,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        logWhatsApp,
        logEmail,
        updateCompanySettings,
        updateBankSettings,
        updateEmployeePermissions,
        updateEmployeeStatus,
        updateEmployeeDetails,
        importHistory,
        bulkImportData,
        deleteImportHistory,
        emails: emailRecords,
        emailTemplates,
        emailSettings,
        notifications,
        sendProposalEmail,
        retryEmail,
        saveEmailTemplate,
        deleteEmailTemplate,
        updateEmailSettings,
        testEmailConnection,
        createNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        recordProposalView,
        recordProposalCustomerResponse,
        // Finance Module (Phase 12)
        invoices,
        payments,
        receipts,
        customerAdvances,
        creditNotes,
        financeSettings,
        financeAuditLogs,
        generateNextInvoiceNumber,
        generateNextReceiptNumber,
        generateNextCreditNoteNumber,
        createInvoice,
        createInvoiceFromProposal,
        updateDraftInvoice,
        finalizeInvoice,
        cancelInvoice,
        recordPayment,
        reversePayment,
        createCustomerAdvance,
        applyCustomerAdvance,
        createCreditNote,
        updateFinanceSettings,
        sendInvoiceEmail,
        sendReceiptEmail,
        sendPaymentReminder,
        checkAndNotifyOverdueInvoices,
        // Phase 13: Online Payment Gateway & Payment Links
        paymentLinks,
        onlinePayments,
        reconciliationRecords,
        paymentConfig,
        fetchPaymentConfig,
        savePaymentConfig,
        testPaymentConnection,
        createPaymentLink,
        cancelPaymentLink,
        initiateRefund,
        refreshOnlinePayments,
        refreshReconciliation,
        // Phase 16: Product, Service, Inventory, Purchases
        productCategories,
        inventoryMovements,
        purchases,
        suppliers,
        customerSpecificPricings,
        productSettings,
        addCategory,
        updateCategory,
        deleteCategory,
        duplicateProduct,
        archiveProduct,
        reactivateProduct,
        adjustStock,
        reserveStock,
        releaseStock,
        deductStock,
        createPurchase,
        updatePurchase,
        receivePurchaseGoods,
        cancelPurchase,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        saveCustomerSpecificPrice,
        deleteCustomerSpecificPrice,
        updateProductSettings,
        bulkImportProducts,
        recordPriceOverride,
        generateNextProductCode,
        generateNextServiceCode,
        generateNextPurchaseNumber,
        generateNextSupplierCode,
        // Phase 17: HR, Employee Management, Attendance, Leave, Tasks & Payroll
        employeeRecords,
        departmentRecords,
        designationRecords,
        roleRecords,
        taskRecords,
        attendanceRecords,
        leaveRecords,
        leaveTypeRecords,
        holidayRecords,
        employeeActivityRecords,
        loginHistoryRecords,
        payrollRecords,
        generateNextEmployeeCode,
        generateNextTaskNumber,
        generateNextAttendanceId,
        generateNextLeaveId,
        generateNextPayrollId,
        createEmployeeRecord,
        updateEmployeeRecord,
        updateEmployeeEmploymentStatus,
        canDeleteEmployee,
        deleteEmployeeRecord,
        resetEmployeePassword,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addDesignation,
        updateDesignation,
        deleteDesignation,
        addRole,
        updateRole,
        deleteRole,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        checkInEmployee,
        checkOutEmployee,
        correctAttendance,
        applyLeave,
        approveLeave,
        rejectLeave,
        cancelLeave,
        addLeaveType,
        updateLeaveType,
        deleteLeaveType,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        logEmployeeActivity,
        generateMonthlyPayroll,
        updatePayrollStatus,
        seedInitialDataIfEmpty,
        // Phase 18: Advanced Sales Pipeline & Lead Management
        salesSources,
        salesStatuses,
        addSalesSource,
        updateSalesSource,
        toggleSalesSource,
        addSalesStatus,
        updateSalesStatus,
        deleteSalesStatus,
        canDeleteSalesStatus,
        generateNextLeadNumber,
        generateNextSTSNumber,
        recordTalkHui,
        completeFollowUpWithOutcome,
        updateLeadPipelineStage,
        checkDuplicateCustomer,
        bulkAssignLeads,
        bulkUpdateLeadStatus,
        bulkAssignSTS,
        bulkUpdateSTSStatus,
        checkAndNotifyFollowupReminders,
        // Phase 19: Finance, Invoicing, Expenses, Accounts, Bank Transactions & Reconciliation
        debitNotes,
        expenses,
        expenseCategories,
        vendors,
        bankTransactions,
        bankReconciliations,
        paymentReminders,
        duplicateInvoice,
        generateNextDebitNoteNumber,
        createDebitNote,
        finalizeDebitNote,
        generateNextExpenseId,
        addExpense,
        updateDraftExpense,
        approveExpense,
        rejectExpense,
        markExpensePaid,
        cancelExpense,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        canDeleteExpenseCategory,
        generateNextVendorId,
        addVendor,
        updateVendor,
        toggleVendorStatus,
        generateNextBankTransactionId,
        addBankTransaction,
        bulkImportBankTransactions,
        reconcileBankTransaction,
        unmatchBankTransaction,
        schedulePaymentReminder,
        checkAndNotifyPaymentReminders,
        reportExports,
        scheduledReports,
        reportAuditLogs,
        dashboardConfig,
        createReportExport,
        createScheduledReport,
        updateScheduledReport,
        deleteScheduledReport,
        logReportAudit,
        updateDashboardConfig,
      }}
    >
      {children}
    </CrmDataContext.Provider>
  );
};

export const useCrmData = () => {
  const context = useContext(CrmDataContext);
  if (!context) {
    throw new Error('useCrmData must be used within a CrmDataProvider');
  }
  return context;
};
