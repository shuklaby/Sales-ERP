export type UserRole = 'admin' | 'employee';
export type UserStatus = 'active' | 'inactive';

export interface EmployeePermissions {
  viewCustomers: boolean;
  createCustomer: boolean;
  editCustomer: boolean;
  deleteCustomer: boolean;
  viewLeads: boolean;
  createLead: boolean;
  editLead: boolean;
  makeCalls: boolean;
  createFollowup: boolean;
  createSTS: boolean;
  viewProposals?: boolean;
  createProposal: boolean;
  editProposal?: boolean;
  deleteDraftProposal?: boolean;
  generateProposal?: boolean;
  sendProposal: boolean;
  sendWhatsApp: boolean;
  sendEmail: boolean;
  viewProducts: boolean;
  applyDiscount: boolean;
  overridePrice: boolean;
  overrideGST: boolean;
  manageProducts: boolean;
  viewAllProposals?: boolean;
  exportProposal?: boolean;
  exportData: boolean;
  viewReports: boolean;
  bulkUpload?: boolean;

  // Finance permissions (Phase 12)
  viewInvoices?: boolean;
  createInvoice?: boolean;
  sendInvoice?: boolean;
  recordPayment?: boolean;
  viewPayments?: boolean;
  viewLedger?: boolean;
  viewOutstanding?: boolean;
  viewFinanceReports?: boolean;
  exportFinanceReports?: boolean;
  manageFinanceSettings?: boolean;

  // Phase 16: Product, Service, Inventory, Purchase Permissions
  createProduct?: boolean;
  editProduct?: boolean;
  deleteProduct?: boolean;
  archiveProduct?: boolean;
  manageCategories?: boolean;
  viewServices?: boolean;
  createService?: boolean;
  editService?: boolean;
  manageInventory?: boolean;
  adjustStock?: boolean;
  managePurchases?: boolean;
  manageSuppliers?: boolean;
  viewPurchaseReports?: boolean;
  viewInventoryReports?: boolean;
  importProducts?: boolean;
  exportProducts?: boolean;
  overrideProductPrice?: boolean;
  viewPurchaseCost?: boolean;

  // Phase 17: HR, Employee Management, Attendance, Leave, Tasks, Activity, Payroll
  deleteLead?: boolean;
  editInvoice?: boolean;
  viewInventory?: boolean;
  viewPurchases?: boolean;
  exportReports?: boolean;
  createReminder?: boolean;
  manageTickets?: boolean;
  viewEmployee?: boolean;
  manageEmployee?: boolean;
  viewAttendance?: boolean;
  manageAttendance?: boolean;
  approveLeave?: boolean;
  viewPayroll?: boolean;
  managePayroll?: boolean;
  viewAuditLogs?: boolean;
  manageSettings?: boolean;

  // Backward-compatible alias helpers
  canViewAllCustomers?: boolean;
  canAddCustomer?: boolean;
  canEditCustomer?: boolean;
  canDeleteCustomer?: boolean;
  canCreateLead?: boolean;
  canConvertLead?: boolean;
  canMakeCalls?: boolean;
  canAddCallNotes?: boolean;
  canCreateFollowUp?: boolean;
  canCreateSTS?: boolean;
  canCreateProposal?: boolean;
  canSendProposal?: boolean;
  canSendProposals?: boolean;
  canConfigureEmail?: boolean;
  canViewAllEmails?: boolean;
  canViewOwnEmails?: boolean;
  canViewProducts?: boolean;
  canViewServices?: boolean;
  canApplyDiscount?: boolean;
  canOverridePrice?: boolean;
  canOverrideGST?: boolean;
  canManageProducts?: boolean;
  canSendWhatsApp?: boolean;
  canSendEmail?: boolean;
  canCreateMeetings?: boolean;
  canExportData?: boolean;
  canViewReports?: boolean;
}

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  viewCustomers: true,
  createCustomer: true,
  editCustomer: true,
  deleteCustomer: false,
  viewLeads: true,
  createLead: true,
  editLead: true,
  makeCalls: true,
  createFollowup: true,
  createSTS: true,
  viewProposals: true,
  createProposal: true,
  editProposal: true,
  deleteDraftProposal: true,
  generateProposal: true,
  sendProposal: true,
  sendWhatsApp: true,
  sendEmail: true,
  viewProducts: true,
  applyDiscount: false,
  overridePrice: false,
  overrideGST: false,
  manageProducts: false,
  viewAllProposals: false,
  exportProposal: true,
  exportData: false,
  viewReports: false,
  bulkUpload: false,
  viewInvoices: false,
  createInvoice: false,
  sendInvoice: false,
  recordPayment: false,
  viewPayments: false,
  viewLedger: false,
  viewOutstanding: false,
  viewFinanceReports: false,
  exportFinanceReports: false,
  manageFinanceSettings: false,

  // Phase 16
  createProduct: false,
  editProduct: false,
  deleteProduct: false,
  archiveProduct: false,
  manageCategories: false,
  viewServices: true,
  createService: false,
  editService: false,
  manageInventory: false,
  adjustStock: false,
  managePurchases: false,
  manageSuppliers: false,
  viewPurchaseReports: false,
  viewInventoryReports: false,
  importProducts: false,
  exportProducts: false,
  overrideProductPrice: false,
  viewPurchaseCost: false,

  // Phase 17
  deleteLead: false,
  editInvoice: false,
  viewInventory: false,
  viewPurchases: false,
  exportReports: false,
  createReminder: true,
  manageTickets: false,
  viewEmployee: false,
  manageEmployee: false,
  viewAttendance: true,
  manageAttendance: false,
  approveLeave: false,
  viewPayroll: false,
  managePayroll: false,
  viewAuditLogs: false,
  manageSettings: false,

  // Aliases
  canViewAllCustomers: false,
  canAddCustomer: true,
  canEditCustomer: true,
  canDeleteCustomer: false,
  canCreateLead: true,
  canConvertLead: true,
  canMakeCalls: true,
  canAddCallNotes: true,
  canCreateFollowUp: true,
  canCreateSTS: true,
  canCreateProposal: true,
  canSendProposal: true,
  canSendProposals: true,
  canConfigureEmail: false,
  canViewAllEmails: false,
  canViewOwnEmails: true,
  canViewProducts: true,
  canViewServices: true,
  canApplyDiscount: false,
  canOverridePrice: false,
  canOverrideGST: false,
  canManageProducts: false,
  canSendWhatsApp: true,
  canSendEmail: true,
  canCreateMeetings: true,
  canExportData: false,
  canViewReports: false,
};

export const ADMIN_PERMISSIONS: EmployeePermissions = {
  viewCustomers: true,
  createCustomer: true,
  editCustomer: true,
  deleteCustomer: true,
  viewLeads: true,
  createLead: true,
  editLead: true,
  makeCalls: true,
  createFollowup: true,
  createSTS: true,
  viewProposals: true,
  createProposal: true,
  editProposal: true,
  deleteDraftProposal: true,
  generateProposal: true,
  sendProposal: true,
  sendWhatsApp: true,
  sendEmail: true,
  viewProducts: true,
  applyDiscount: true,
  overridePrice: true,
  overrideGST: true,
  manageProducts: true,
  viewAllProposals: true,
  exportProposal: true,
  exportData: true,
  viewReports: true,
  bulkUpload: true,
  viewInvoices: true,
  createInvoice: true,
  sendInvoice: true,
  recordPayment: true,
  viewPayments: true,
  viewLedger: true,
  viewOutstanding: true,
  viewFinanceReports: true,
  exportFinanceReports: true,
  manageFinanceSettings: true,

  // Phase 16
  createProduct: true,
  editProduct: true,
  deleteProduct: true,
  archiveProduct: true,
  manageCategories: true,
  viewServices: true,
  createService: true,
  editService: true,
  manageInventory: true,
  adjustStock: true,
  managePurchases: true,
  manageSuppliers: true,
  viewPurchaseReports: true,
  viewInventoryReports: true,
  importProducts: true,
  exportProducts: true,
  overrideProductPrice: true,
  viewPurchaseCost: true,

  // Phase 17
  deleteLead: true,
  editInvoice: true,
  viewInventory: true,
  viewPurchases: true,
  exportReports: true,
  createReminder: true,
  manageTickets: true,
  viewEmployee: true,
  manageEmployee: true,
  viewAttendance: true,
  manageAttendance: true,
  approveLeave: true,
  viewPayroll: true,
  managePayroll: true,
  viewAuditLogs: true,
  manageSettings: true,

  // Aliases
  canViewAllCustomers: true,
  canAddCustomer: true,
  canEditCustomer: true,
  canDeleteCustomer: true,
  canCreateLead: true,
  canConvertLead: true,
  canMakeCalls: true,
  canAddCallNotes: true,
  canCreateFollowUp: true,
  canCreateSTS: true,
  canCreateProposal: true,
  canSendProposal: true,
  canSendProposals: true,
  canConfigureEmail: true,
  canViewAllEmails: true,
  canViewOwnEmails: true,
  canViewProducts: true,
  canViewServices: true,
  canApplyDiscount: true,
  canOverridePrice: true,
  canOverrideGST: true,
  canManageProducts: true,
  canSendWhatsApp: true,
  canSendEmail: true,
  canCreateMeetings: true,
  canExportData: true,
  canViewReports: true,
};

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  mobile?: string;
  department?: string;
  designation?: string;
  employeeId?: string;
  status: UserStatus;
  permissions: EmployeePermissions;
  createdAt: string;
  updatedAt: string;
}

export type CustomerStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Meeting'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'Inactive'
  | 'Follow-up';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'Junk';

export interface Customer {
  id: string;
  customerId: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  phone?: string;
  alternateMobile?: string;
  alternateNumber?: string;
  email?: string;
  gstNumber?: string;
  website?: string;
  address?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  leadSource?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: CustomerStatus;
  nextFollowupDate?: string;
  nextFollowupTime?: string;
  nextFollowUp?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  convertedFromLeadId?: string;
  source?: string;
  importId?: string;
}

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Lead {
  id: string;
  leadId: string;
  leadNumber?: string;
  customerName?: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  phone?: string;
  alternateMobile?: string;
  alternateNumber?: string;
  alternatePhone?: string;
  email?: string;
  gstNumber?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  leadSource?: string;
  source?: string;
  industry?: string;
  requirement?: string;
  estimatedValue?: number;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: LeadStatus | CustomerStatus | string;
  priority?: LeadPriority;
  nextFollowupDate?: string;
  nextFollowupTime?: string;
  nextFollowUp?: string;
  notes?: string;
  isConverted?: boolean;
  convertedCustomerId?: string;
  conversionDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  importId?: string;
}

export interface MeetingRecord {
  id: string;
  meetingId?: string;
  customerId?: string;
  leadId?: string;
  companyName: string;
  contactPerson: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  meetingLink?: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  employeeId: string;
  hostEmployeeId?: string; // alias
  meetingDate?: string; // alias
  employeeName: string;
  createdAt: string;
  updatedAt?: string;
}

export type ActivityType =
  | 'lead_created'
  | 'lead_converted'
  | 'customer_created'
  | 'customer_updated'
  | 'call_made'
  | 'call_initiated'
  | 'call_note_added'
  | 'followup_scheduled'
  | 'followup_completed'
  | 'followup_rescheduled'
  | 'sts_created'
  | 'sts_updated'
  | 'sts_status_changed'
  | 'proposal_created'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'whatsapp_sent'
  | 'whatsapp_opened'
  | 'email_sent'
  | 'meeting_scheduled'
  | 'bulk_imported'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_deactivated'
  | 'customer_assigned'
  | 'lead_assigned'
  | 'login'
  | 'logout'
  | 'status_changed'
  | 'CALL_INITIATED'
  | 'CALL_UPDATED'
  | 'WHATSAPP_OPENED'
  | 'FOLLOWUP_CREATED'
  | 'FOLLOWUP_COMPLETED'
  | 'FOLLOWUP_RESCHEDULED'
  | 'STS_CREATED'
  | 'STS_UPDATED'
  | 'STS_STATUS_CHANGED'
  | 'CUSTOMER_STATUS_CHANGED'
  | 'LEAD_STATUS_CHANGED'
  | 'COMPANY_SETTINGS_UPDATED'
  | 'LOGO_UPDATED'
  | 'BANK_ACCOUNT_CREATED'
  | 'BANK_ACCOUNT_UPDATED'
  | 'BANK_ACCOUNT_DEACTIVATED'
  | 'PROPOSAL_SETTINGS_UPDATED'
  | 'TERMS_UPDATED'
  | 'SIGNATURE_UPDATED'
  | 'TEMPLATE_UPDATED'
  | 'BULK_UPLOAD_STARTED'
  | 'BULK_UPLOAD_COMPLETED'
  | 'BULK_UPLOAD_FAILED'
  | 'CUSTOMER_IMPORTED'
  | 'LEAD_IMPORTED'
  | 'CUSTOMER_UPDATED_FROM_IMPORT'
  | 'LEAD_UPDATED_FROM_IMPORT'
  | 'PROPOSAL_EMAIL_SENT'
  | 'PROPOSAL_VIEWED'
  | 'PROPOSAL_DOWNLOADED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'EMAIL_RETRY'
  | 'NOTIFICATION_CREATED'
  | 'TALK_HUI'
  | 'STS_TALK_HUI'
  | 'BULK_ASSIGNMENT'
  | 'BULK_STATUS_UPDATE'
  | 'CALL_CONNECTED'
  | 'CALL_COMPLETED'
  | 'CALL_FAILED'
  | 'CALL_NO_ANSWER';

export interface SalesSourceRecord {
  id: string;
  name: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesStatusRecord {
  id: string;
  name: string;
  color?: string;
  stageOrder: number;
  isWon?: boolean;
  isLost?: boolean;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportHistoryRecord {
  id: string;
  importId: string;
  fileName: string;
  fileType: string;
  recordType: 'customers' | 'leads';
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  skippedRows: number;
  invalidRows: number;
  failedRows: number;
  status: 'Processing' | 'Completed' | 'Completed with Errors' | 'Failed';
  errorReport?: {
    rowIndex: number;
    companyName?: string;
    mobile?: string;
    email?: string;
    gstNumber?: string;
    error: string;
    duplicateStatus?: string;
    suggestedAction?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  activityId?: string;
  customerId?: string;
  leadId?: string;
  stsId?: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  type: ActivityType;
  title: string;
  description: string;
  relatedId?: string;
  createdAt?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type CallStatus =
  | 'initiated'
  | 'Connected'
  | 'Not Connected'
  | 'Busy'
  | 'No Answer'
  | 'Switched Off'
  | 'Wrong Number'
  | 'Callback Requested'
  | 'Follow-up Required'
  | 'Invalid Number';

export interface CallRecord {
  id: string;
  callId: string;
  customerId?: string;
  leadId?: string;
  stsId?: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  phone?: string;
  phoneNumber?: string;
  employeeId: string;
  employeeName: string;
  initiatedAt?: string;
  startedAt?: string;
  endedAt?: string;
  dateTime: string;
  status: CallStatus | string;
  notes?: string;
  outcome?: string;
  nextFollowupDate?: string;
  nextFollowupTime?: string;
  followUpDate?: string;
  duration?: number | null;
  // Future-proof Telephony Architecture
  actualDuration?: number | null; // In seconds, null or undefined if no actual telephony provider
  direction?: 'outgoing' | 'incoming' | 'Outgoing' | 'Incoming';
  recordingUrl?: string;
  providerCallId?: string;
  telephonyStatus?: string;
  type?: string; // alias
  callType?: string; // alias
  callDate?: string; // alias
  createdAt: string;
}

export type FollowUpStatus = 'Upcoming' | 'Due Today' | 'Completed' | 'Overdue' | 'Cancelled' | 'Pending' | 'Scheduled';

export interface FollowUpRecord {
  id: string;
  followupId?: string;
  followUpId?: string;
  customerId?: string;
  leadId?: string;
  stsId?: string;
  companyName: string;
  contactPerson: string;
  employeeId: string;
  employeeName: string;
  title?: string;
  date: string;
  followupDate?: string; // alias
  time: string;
  dueAt?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  reason: string;
  notes?: string;
  summary?: string; // alias
  outcome?: string;
  status: FollowUpStatus;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

export type STSStatus =
  | 'New'
  | 'In Progress'
  | 'Follow-up'
  | 'Proposal Required'
  | 'Won'
  | 'Lost'
  | 'Closed'
  | 'Draft'
  | 'Pending Review'
  | 'Approved'
  | 'Sent to Customer';

export interface STSRecord {
  id: string;
  stsId?: string;
  stsNumber: string;
  customerId?: string;
  leadId?: string;
  customerName?: string;
  companyName: string;
  contactPerson: string;
  phone?: string;
  mobile?: string;
  email?: string;
  employeeId?: string;
  employeeName?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  date: string;
  requirement: string;
  source?: string;
  status: STSStatus | string;
  talkStatus?: 'Yes' | 'No' | 'Callback' | 'Not Reachable';
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  amount: number;
  estimatedValue?: number;
  followupDate?: string;
  followupTime?: string;
  followUpDate?: string;
  remarks?: string;
  attachments?: string[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ProductItem {
  id: string;
  productId: string; // e.g. PRD-2026-0001
  productCode: string;
  productName?: string;
  name: string; // alias
  categoryId?: string;
  category?: string; // category name alias
  subcategoryId?: string;
  description: string;
  shortDescription?: string;
  unit: string;
  sellingPrice?: number;
  price: number; // alias
  basePrice?: number; // alias
  purchasePrice?: number;
  taxRate?: number; // GST %
  gstRate: number; // alias
  sku?: string;
  hsnSac?: string;
  minimumQuantity?: number;
  minStockLevel?: number; // alias
  reorderLevel?: number; // alias
  stockQuantity?: number; // alias
  itemCode?: string; // alias
  stockEnabled?: boolean;
  currentStock?: number;
  reservedStock?: number;
  availableStock?: number;
  status?: 'Active' | 'Inactive' | 'Archived';
  active: boolean; // alias
  imageUrl?: string;
  storagePath?: string;
  discountAllowed?: boolean;
  discountAvailable?: boolean; // alias
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export type ServiceBillingType = 'One Time' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';

export interface ServiceItem {
  id: string;
  serviceId: string; // e.g. SRV-2026-0001
  serviceCode?: string;
  serviceName?: string;
  name: string; // alias
  categoryId?: string;
  category?: string; // category name alias
  description: string;
  price: number;
  basePrice?: number; // alias
  billingType?: ServiceBillingType;
  taxRate?: number;
  gstRate: number; // alias
  duration?: string;
  terms?: string;
  status?: 'Active' | 'Inactive' | 'Archived';
  active: boolean; // alias
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: string;
}

export interface PriceHistoryRecord {
  id: string;
  priceHistoryId?: string; // alias
  productId?: string;
  serviceId?: string;
  itemType: 'product' | 'service';
  itemId: string;
  itemCode: string;
  itemName: string;
  oldPrice: number;
  newPrice: number;
  oldPurchasePrice?: number;
  newPurchasePrice?: number;
  oldGstRate?: number;
  newGstRate?: number;
  changedBy: string;
  changedByUid?: string;
  changedAt: string;
  reason: string;
}

export interface ProposalLineItem {
  id: string;
  itemId?: string; // identifier in proposals/{proposalId}/items/{itemId}
  type: 'product' | 'service';
  productId?: string;
  serviceId?: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grossAmount?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountPercent: number; // alias
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  lineTotal?: number;
  totalAmount: number; // alias
  total?: number; // alias
  discount?: number; // alias

  // Customer-Specific / Custom Price Override Tracking (Section 10)
  isPriceOverridden?: boolean;
  originalMasterPrice?: number;
  customPrice?: number;
  priceOverrideBy?: string;
  priceOverrideAt?: string;
  priceOverrideReason?: string;

  // GST Override Tracking (Section 6)
  isGstOverridden?: boolean;
  originalGstRate?: number;
  gstOverrideReason?: string;
  gstOverriddenBy?: string;

  // Phase 16 Historical Snapshot (Section 8)
  nameSnapshot?: string;
  descriptionSnapshot?: string;
  unitPriceSnapshot?: number;
  taxRateSnapshot?: number;
  skuSnapshot?: string;
  hsnSacSnapshot?: string;
}

export type ProposalStatus =
  | 'Draft'
  | 'Generated'
  | 'Sent'
  | 'Viewed'
  | 'Under Discussion'
  | 'Accepted'
  | 'Approved'
  | 'Rejected'
  | 'Expired'
  | 'Pending Approval'
  | 'Cancelled';

export interface CompanySettings {
  companyName: string;
  legalName?: string;
  tagline?: string;
  logoUrl?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  website?: string;
  gstNumber?: string;
  pan?: string;
  panNumber?: string;
  termsAndConditions?: string;
  proposalValidityDays?: number;
  proposalPrefix?: string;
  footerText?: string;
  settingsVersion?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BankSettings {
  id?: string;
  bankAccountId?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId?: string;
  isDefault?: boolean;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BankAccount {
  id: string;
  bankAccountId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  ifsc?: string; // alias
  branch: string;
  upiId?: string;
  accountType?: 'Current' | 'Savings' | 'OD' | 'Other';
  displayName?: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
  active?: boolean; // alias
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface BrandingSettings {
  logoUrl?: string;
  storagePath?: string;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  status?: 'active' | 'archived';
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headerStyle?: 'modern' | 'classic' | 'minimal' | 'bold' | 'executive';
  logoPosition?: 'left' | 'center' | 'right';
  showLogo?: boolean;
  showCompanyAddress?: boolean;
  showGST?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWebsite?: boolean;
  tableStyle?: 'striped' | 'bordered' | 'clean';
  updatedAt?: string;
  updatedBy?: string;
}

export interface ProposalTemplateSettings {
  headerStyle: 'modern' | 'classic' | 'minimal' | 'bold' | 'executive';
  logoPosition: 'left' | 'center' | 'right';
  showCompanyDetails: boolean;
  tableStyle: 'striped' | 'bordered' | 'clean';
  showBankSection: boolean;
  showGST: boolean;
  showTerms: boolean;
  showSignature: boolean;
  footerText: string;
  primaryColor: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SignatorySettings {
  signatoryName: string;
  designation: string;
  signatureImageUrl?: string;
  showSignature: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TermItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  isActive: boolean;
  order: number;
}

export interface ProposalNumberingSettings {
  prefix: string;
  yearFormat: 'YYYY' | 'YY' | 'NONE' | 'None';
  sequenceDigits: number;
  startingSequence?: number;
}

export interface ProposalCustomerSnapshot {
  companyName: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface ProposalRecord {
  id: string;
  proposalId?: string; // alias
  proposalNumber: string;
  title?: string;
  customerId: string;
  customerName: string;
  clientName?: string; // alias
  companyName?: string; // alias
  customerEmail?: string;
  customerMobile?: string;
  customerGst?: string;
  customerAddress?: string;
  leadId?: string;
  stsId?: string;
  stsNumber?: string;
  requirement?: string;
  scopeOfWork?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  createdBy: string;
  createdByName: string;
  status: ProposalStatus;
  items: ProposalLineItem[];
  lineItems?: ProposalLineItem[]; // alias
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gstTotal: number;
  grandTotal: number;
  totalAmount?: number; // alias
  validUntil: string;
  proposalDate?: string;
  terms: string;
  termsAndConditions?: string; // alias
  notes?: string;
  isImmutable?: boolean;
  settingsVersion?: number;
  customerSnapshot?: ProposalCustomerSnapshot;
  companySnapshot: CompanySettings;
  bankSnapshot: BankSettings;
  brandingSnapshot?: BrandingSettings;
  templateSnapshot?: ProposalTemplateSettings;
  termsSnapshot?: TermItem[];
  signatureSnapshot?: SignatorySettings;
  pdfDataUrl?: string;
  storagePath?: string;
  viewToken?: string;
  sentAt?: string;
  sentBy?: string;
  viewedAt?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paymentStatus?: 'Not Required' | 'Pending' | 'Paid' | 'Failed' | 'Cancelled';
  paidAmount?: number;
  paymentDate?: string;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  cashfreePaymentMethod?: string;
  paymentGatewayUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailStatus =
  | 'Draft'
  | 'Queued'
  | 'Sending'
  | 'Sent'
  | 'Failed'
  | 'Bounced'
  | 'Opened'
  | 'Clicked';

export interface EmailRecord {
  id: string;
  emailId?: string;
  customerId?: string;
  leadId?: string;
  companyName?: string;
  proposalId?: string;
  proposalNumber?: string;
  recipient: string;
  to?: string;
  cc?: string;
  bcc?: string;
  sender?: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  subject: string;
  message?: string;
  body?: string;
  status?: EmailStatus;
  errorMessage?: string;
  providerMessageId?: string;
  attachmentName?: string;
  hasAttachment?: boolean;
  attachmentSize?: number;
  openedAt?: string;
  clickedAt?: string;
  sentAt?: string;
  createdAt?: string;
  employeeId: string;
  employeeName: string;
  retryOfEmailId?: string;
  retryCount?: number;
}

export type EmailTemplateType =
  | 'Proposal Email'
  | 'Follow-up Email'
  | 'Welcome Email'
  | 'Payment Reminder'
  | 'Custom';

export interface EmailTemplate {
  id: string;
  templateId: string;
  templateName: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface EmailSettings {
  id?: string;
  provider: 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'mailgun' | 'none';
  senderName: string;
  senderEmail: string;
  fromName?: string;
  fromEmail?: string;
  officialEmail?: string;
  smtpUsername?: string;
  replyTo?: string;
  status: 'Configured' | 'Not Configured' | 'Connection Error' | 'Authentication Failed';
  trackingEnabled?: boolean;
  supportsOpenTracking?: boolean;
  supportsClickTracking?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type NotificationType =
  | 'NEW_LEAD'
  | 'NEW_CUSTOMER'
  | 'FOLLOWUP_DUE'
  | 'FOLLOWUP_OVERDUE'
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_VIEWED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'EMAIL_FAILED'
  | 'STS_UPDATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'RECEIPT_GENERATED'
  | 'LOW_STOCK_ALERT'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'LEAVE_REQUEST'
  | 'ATTENDANCE_ALERT';

export interface NotificationRecord {
  id: string;
  notificationId: string;
  userId: string; // 'all_admins' or specific employee uid
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: 'proposal' | 'customer' | 'lead' | 'sts' | 'email' | 'followup' | 'invoice' | 'payment' | 'receipt' | 'task' | 'employee' | 'leave' | 'attendance';
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ProposalViewEvent {
  id: string;
  proposalId: string;
  proposalNumber?: string;
  viewerToken: string;
  eventType: 'VIEWED' | 'DOWNLOADED' | 'ACCEPTED' | 'REJECTED';
  customerResponse?: 'Accepted' | 'Rejected';
  responseReason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface WhatsAppRecord {
  id: string;
  whatsappActivityId?: string;
  customerId?: string;
  leadId?: string;
  phoneNumber?: string;
  mobile: string;
  messageType?: 'Initial Contact' | 'Follow-up' | 'Proposal Message' | 'Custom Message' | string;
  message: string;
  status: 'Opened WhatsApp' | string;
  createdAt?: string;
  timestamp: string;
  employeeId: string;
  employeeName: string;
}

// ==========================================
// PHASE 12 — FINANCE, INVOICE, PAYMENT & LEDGER
// ==========================================

export interface FinanceSettings {
  id: string;
  invoicePrefix: string;
  invoiceYearFormat: 'YYYY' | 'YY';
  invoiceNextSequence: number;
  receiptPrefix: string;
  receiptYearFormat: 'YYYY' | 'YY';
  receiptNextSequence: number;
  creditNotePrefix: string;
  creditNoteNextSequence: number;
  defaultPaymentTerms: string;
  defaultDueDays: number;
  defaultCurrency: string;
  currencySymbol: string;
  defaultTaxType: 'intra_state' | 'inter_state' | 'exempt';
  defaultTaxRate: number;
  taxRates: { label: string; rate: number; isDefault?: boolean }[];
  paymentMethods: string[];
  bankIdForInvoicing?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type InvoiceStatus =
  | 'Draft'
  | 'Issued'
  | 'Sent'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'DRAFT'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface InvoiceItem {
  itemId: string;
  productId?: string;
  serviceId?: string;
  name: string;
  description: string;
  hsnSac?: string; // alias
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
  discountAmount: number;
  taxRate: number; // percentage (e.g. 18 for 18% GST)
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  lineTotal: number;
  total?: number; // alias

  // Phase 16 Historical Snapshot (Section 8)
  nameSnapshot?: string;
  descriptionSnapshot?: string;
  unitPriceSnapshot?: number;
  taxRateSnapshot?: number;
  skuSnapshot?: string;
  hsnSacSnapshot?: string;
  originalProductPrice?: number; // for price override tracking
}

export interface InvoiceTaxBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerSnapshot: Customer;
  proposalId?: string;
  proposalSnapshot?: ProposalRecord;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  subTotal?: number; // alias
  discount: number;
  taxableAmount: number;
  tax: number;
  taxAmount?: number; // alias
  cgst: number;
  sgst: number;
  igst: number;
  utgst?: number;
  placeOfSupply?: string;
  billingState?: string;
  shippingState?: string;
  isTaxInclusive?: boolean;
  taxBreakdown: InvoiceTaxBreakdown;
  taxCalculationSnapshot?: Record<string, any>;
  grandTotal: number;
  totalAmount?: number; // alias
  paidAmount: number;
  outstandingAmount: number;
  balanceDue?: number; // alias
  balanceAmount?: number; // alias
  assignedEmployeeId?: string; // alias
  customerName?: string; // alias
  currency: string;
  paymentTerms: string;
  termsAndConditions?: string;
  bankSnapshot: BankAccount | BankSettings;
  companySnapshot: CompanySettings;
  status: InvoiceStatus;
  paymentStatus?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
  isFinalized?: boolean;
  notes?: string;
  paymentLinkId?: string;
  paymentUrl?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  sentAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancellationReason?: string;
}

export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'UPI'
  | 'Card'
  | 'Cheque'
  | 'Payment Gateway'
  | 'Other';

export type PaymentStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Failed'
  | 'Cancelled'
  | 'Refunded'
  | 'Completed'
  | 'COMPLETED';

export interface PaymentRecord {
  id: string;
  paymentId: string;
  paymentNumber?: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod | string;
  transactionReference: string;
  notes?: string;
  status: PaymentStatus;
  receiptId?: string;
  receiptNumber?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
  isReversal?: boolean;
  originalPaymentId?: string;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  reversedByName?: string;
}

export interface PaymentReceipt {
  id: string;
  receiptId: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerSnapshot: Customer;
  amount: number;
  amountInWords: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  transactionReference?: string;
  companySnapshot: CompanySettings;
  bankSnapshot?: BankAccount | BankSettings;
  signatorySnapshot?: SignatorySettings;
  notes?: string;
  createdAt: string;
  sentAt?: string;
  sentVia?: 'email' | 'whatsapp' | 'both';
}

export interface CustomerAdvance {
  id: string;
  advanceId: string;
  customerId: string;
  customerName: string;
  amount: number;
  availableAmount: number;
  date: string;
  paymentId?: string;
  transactionReference?: string;
  status: 'Available' | 'Partially Applied' | 'Fully Applied' | 'Refunded';
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteId: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  date: string;
  status: 'Issued' | 'Applied' | 'Cancelled';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  finalizedAt?: string;
}

export interface DebitNote {
  id: string;
  debitNoteId: string;
  debitNoteNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId: string;
  customerName: string;
  amount: number;
  tax: number;
  total: number;
  reason: string;
  date: string;
  status: 'Draft' | 'Finalized' | 'Cancelled';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  finalizedAt?: string;
}

export type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

export interface ExpenseRecord {
  id: string;
  expenseId: string;
  expenseDate: string; // YYYY-MM-DD
  date?: string; // alias
  categoryId: string;
  categoryName: string;
  category?: string; // alias
  vendorId?: string;
  vendorName?: string;
  vendor?: string; // alias
  amount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  bankAccountId?: string;
  bankAccountName?: string;
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: ExpenseStatus;
  createdBy: string;
  recordedBy?: string; // alias
  employeeId?: string; // alias
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryRecord {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  company: string;
  gstin?: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch?: string;
    upiId?: string;
  };
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionRecord {
  id: string;
  transactionId: string;
  transactionDate: string; // YYYY-MM-DD
  bankAccountId: string;
  bankAccountName: string;
  description: string;
  amount: number;
  type: 'Deposit' | 'Withdrawal' | 'Transfer' | 'Payment' | 'Refund' | 'Other';
  referenceNumber: string;
  source: 'Manual' | 'CSV_Import' | 'Gateway';
  reconciliationStatus: 'UNRECONCILED' | 'RECONCILED' | 'IGNORED';
  matchedPaymentId?: string;
  matchedInvoiceId?: string;
  reconciledAt?: string;
  reconciledBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankReconciliationRecord {
  id: string;
  reconciliationId: string;
  bankTransactionId: string;
  paymentId?: string;
  invoiceId?: string;
  reconciledAmount: number;
  difference: number;
  status: 'RECONCILED' | 'UNRECONCILED';
  notes?: string;
  reconciledBy: string;
  reconciledByName: string;
  reconciledAt: string;
}

export interface PaymentReminderRecord {
  id: string;
  reminderId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  type: 'BEFORE_DUE' | 'ON_DUE' | 'OVERDUE';
  scheduledAt: string;
  sentAt?: string;
  channel: 'email' | 'whatsapp' | 'both';
  status: 'SCHEDULED' | 'SENT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
}

export type FinanceAuditEventType =
  | 'INVOICE_CREATED'
  | 'INVOICE_FINALIZED'
  | 'INVOICE_SENT'
  | 'INVOICE_CANCELLED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REVERSED'
  | 'REFUND_CREATED'
  | 'RECEIPT_CREATED'
  | 'RECEIPT_SENT'
  | 'CREDIT_NOTE_CREATED'
  | 'DEBIT_NOTE_CREATED'
  | 'DEBIT_NOTE_FINALIZED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'EXPENSE_PAID'
  | 'BANK_ACCOUNT_CREATED'
  | 'BANK_ACCOUNT_UPDATED'
  | 'BANK_TRANSACTION_CREATED'
  | 'BANK_RECONCILED'
  | 'ADVANCE_CREATED'
  | 'ADVANCE_APPLIED'
  | 'INVOICE_OVERDUE';

export interface FinanceAuditLog {
  id: string;
  eventId: string;
  type: FinanceAuditEventType;
  userId: string;
  userName: string;
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  receiptId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment' | 'Credit Note' | 'Advance' | 'Refund' | 'Opening Balance';
  reference: string;
  description: string;
  debit: number; // increases receivables
  credit: number; // decreases receivables
  balance: number; // running balance
  rawRecordId?: string;
}

// ==========================================
// PHASE 13 — ONLINE PAYMENT GATEWAYS & LINKS
// ==========================================

export type SupportedGateway = 'razorpay' | 'cashfree' | 'stripe' | 'other';
export type GatewayEnvironment = 'Test' | 'Live';
export type GatewayStatus =
  | 'Connected'
  | 'Not Connected'
  | 'Configuration Error'
  | 'Test Mode'
  | 'Live Mode';

export interface PaymentGatewayPublicConfig {
  configured: boolean;
  gateway: SupportedGateway;
  environment: GatewayEnvironment;
  merchantName: string;
  currency: string;
  status: GatewayStatus;
  publicKey?: string;
  publicKeyMasked?: string;
  cashfreeAppIdMasked?: string;
  cashfreeEnvironment?: 'Sandbox' | 'Production' | 'Test' | 'Live';
  hasCashfreeSecret?: boolean;
  webhookUrl?: string;
  enabledMethods?: {
    upi: boolean;
    cards: boolean;
    netbanking: boolean;
    wallets: boolean;
  };
  lastTestedAt?: string;
  errorMessage?: string;
}

export type OnlinePaymentStatus =
  | 'Created'
  | 'Pending'
  | 'Processing'
  | 'Success'
  | 'Confirmed'
  | 'Failed'
  | 'Cancelled'
  | 'Refunded'
  | 'Partially Refunded'
  | 'Expired';

export interface PaymentLinkRecord {
  id: string;
  paymentLinkId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  gateway: SupportedGateway;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: OnlinePaymentStatus;
  token: string;
  paymentUrl: string;
  notes?: string;
  isPartialPayment?: boolean;
  expiresAt: string; // ISO String
  createdAt: string; // ISO String
  updatedAt?: string;
  paidAt?: string;
  createdByName?: string;
}

export interface OnlinePaymentRecord {
  id: string;
  paymentId: string; // Our internal payment ID
  paymentLinkId?: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  gateway: SupportedGateway;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  paymentMethod?: string;
  transactionReference?: string;
  status: OnlinePaymentStatus;
  paymentMethodDetails?: {
    method?: string; // upi, card, netbanking, wallet
    bank?: string;
    cardNetwork?: string;
    cardLast4?: string;
    vpa?: string; // UPI ID masked
    wallet?: string;
  };
  receiptId?: string;
  receiptNumber?: string;
  createdAt: string;
  confirmedAt?: string;
  verifiedServerSide: boolean;
  verificationSource: 'webhook' | 'server_verify_endpoint' | 'manual_reconcile';
  webhookEventId?: string;
  // Refund support
  refundedAmount?: number;
  refunds?: {
    refundId: string;
    gatewayRefundId: string;
    amount: number;
    reason: string;
    status: 'Pending' | 'Success' | 'Failed';
    createdAt: string;
    processedAt?: string;
  }[];
}

export interface WebhookEventRecord {
  id: string;
  webhookEventId: string;
  gateway: SupportedGateway;
  eventType: string;
  receivedAt: string;
  processedAt: string;
  status: 'PROCESSED' | 'SKIPPED_DUPLICATE' | 'FAILED_SIGNATURE' | 'FAILED_PROCESSING';
  orderId?: string;
  paymentId?: string;
  amount?: number;
  errorMessage?: string;
}

export type ReconciliationStatus =
  | 'Matched'
  | 'Amount Mismatch'
  | 'Missing Internal Record'
  | 'Missing Gateway Confirmation'
  | 'Pending Verification';

export interface ReconciliationRecord {
  id: string;
  gatewayOrder: string;
  gatewayPaymentId?: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  expectedAmount: number;
  gatewayPaymentAmount: number;
  internalPaymentAmount: number;
  status: ReconciliationStatus;
  mismatchDescription?: string;
  currency: string;
  lastCheckedAt: string;
  notes?: string;
}

// ==========================================
// PHASE 14 — CUSTOMER PORTAL, TICKETS & DOCS
// ==========================================

export type CustomerRole = 'Customer Admin' | 'Customer User';
export type CustomerUserStatus = 'Invited' | 'Active' | 'Suspended' | 'Disabled';
export type CustomerAccountStatus = CustomerUserStatus;

export interface CustomerUserPermissions {
  viewProposals: boolean;
  acceptProposal: boolean;
  viewInvoices: boolean;
  makePayment: boolean;
  viewPayments: boolean;
  viewReceipts: boolean;
  viewLedger: boolean;
  uploadDocuments: boolean;
  createTicket: boolean;
  replyTicket: boolean;
  viewTickets: boolean;
  manageCustomerUsers: boolean;
}

export const DEFAULT_CUSTOMER_ADMIN_PERMISSIONS: CustomerUserPermissions = {
  viewProposals: true,
  acceptProposal: true,
  viewInvoices: true,
  makePayment: true,
  viewPayments: true,
  viewReceipts: true,
  viewLedger: true,
  uploadDocuments: true,
  createTicket: true,
  replyTicket: true,
  viewTickets: true,
  manageCustomerUsers: true,
};

export const DEFAULT_CUSTOMER_USER_PERMISSIONS: CustomerUserPermissions = {
  viewProposals: true,
  acceptProposal: true,
  viewInvoices: true,
  makePayment: true,
  viewPayments: true,
  viewReceipts: true,
  viewLedger: true,
  uploadDocuments: true,
  createTicket: true,
  replyTicket: true,
  viewTickets: true,
  manageCustomerUsers: false,
};

export interface CustomerUserRecord {
  id: string; // Document ID (usually matches Firebase Auth uid or custom id)
  customerUserId: string; // Firebase Auth UID
  customerId: string; // Linked customer ID from customers collection
  organizationId: string; // Same as customerId
  customerName?: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: CustomerRole;
  status: CustomerUserStatus;
  permissions: CustomerUserPermissions;
  invitedAt?: string;
  invitedBy?: string;
  invitationToken?: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type SupportTicketStatus = 'Open' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed';

export type SupportTicketCategory =
  | 'General'
  | 'Technical Support'
  | 'Billing'
  | 'Payment'
  | 'Proposal'
  | 'Invoice'
  | 'Account'
  | 'Other';

export interface SupportTicket {
  id: string;
  ticketId: string;
  ticketNumber: string; // e.g. TICK-2026-0001
  customerId: string;
  customerUserId: string;
  customerName: string;
  subject: string;
  description: string;
  category: SupportTicketCategory | string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: string; // Employee UID
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  resolvedAt?: string;
  lastReplyAt?: string;
  lastReplyBy?: string;
  lastReplyType?: 'Customer' | 'Employee' | 'Admin';
}

export interface TicketMessage {
  id: string;
  messageId: string;
  ticketId: string;
  customerId: string;
  senderId: string;
  senderType: 'Customer' | 'Employee' | 'Admin';
  senderName: string;
  authorName?: string;
  authorRole?: string;
  message: string;
  attachments?: {
    name: string;
    url: string;
    size?: number;
    type?: string;
  }[];
  messageType: 'PUBLIC' | 'INTERNAL' | 'INTERNAL_NOTE'; // INTERNAL is strictly hidden from customers
  visibility?: 'PUBLIC' | 'INTERNAL' | 'INTERNAL_NOTE';
  createdAt: string;
}

export interface CustomerDocument {
  id: string;
  documentId: string;
  customerId: string;
  organizationId?: string;
  customerName?: string;
  name: string;
  type: string; // e.g. GST Certificate, Company Profile, Purchase Order, Requirement Document, Invoice, Proposal, Receipt, Other
  fileUrl: string;
  storagePath?: string;
  fileSize?: number; // in bytes
  fileType?: string; // mime type
  uploadedBy: string; // user ID
  uploadedByName?: string;
  uploadedByRole: 'Admin' | 'Employee' | 'Customer';
  uploadedAt: string;
  visibility: 'Customer' | 'Internal';
  status: 'Active' | 'Archived';
  description?: string;
}

export interface ProfileChangeRequest {
  id: string;
  requestId: string;
  customerId: string;
  customerUserId: string;
  customerName: string;
  requestedChanges: Partial<Customer>;
  currentSnapshot: Partial<Customer>;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  submittedAt?: string;
}

export interface ProposalChangeRequest {
  id: string;
  requestId: string;
  proposalId: string;
  proposalNumber: string;
  customerId: string;
  customerUserId: string;
  customerName: string;
  message: string;
  requestedChanges: string;
  status: 'Open' | 'In Review' | 'Resolved' | 'Cancelled';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CustomerAuditLog {
  id: string;
  logId: string;
  customerId: string;
  customerUserId: string;
  customerName: string;
  action:
    | 'CUSTOMER_LOGIN'
    | 'CUSTOMER_LOGOUT'
    | 'PROPOSAL_VIEWED'
    | 'PROPOSAL_ACCEPTED'
    | 'PROPOSAL_REJECTED'
    | 'PROPOSAL_CHANGE_REQUESTED'
    | 'INVOICE_VIEWED'
    | 'PAYMENT_STARTED'
    | 'DOCUMENT_UPLOADED'
    | 'TICKET_CREATED'
    | 'TICKET_REPLIED'
    | 'TICKET_CLOSED';
  relatedId?: string;
  relatedType?: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface CustomerNotification {
  id: string;
  notificationId: string;
  customerId: string;
  customerUserId?: string;
  type:
    | 'PROPOSAL_SENT'
    | 'PROPOSAL_VIEWED'
    | 'PROPOSAL_ACCEPTED'
    | 'PROPOSAL_REJECTED'
    | 'INVOICE_CREATED'
    | 'PAYMENT_REMINDER'
    | 'PAYMENT_CONFIRMED'
    | 'RECEIPT_GENERATED'
    | 'TICKET_UPDATED'
    | 'DOCUMENT_SHARED'
    | 'PROFILE_CHANGE_REVIEWED';
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  read: boolean;
  createdAt: string;
}

export type CustomerPortalTab =
  | 'dashboard'
  | 'company'
  | 'proposals'
  | 'invoices'
  | 'payments'
  | 'receipts'
  | 'outstanding'
  | 'ledger'
  | 'documents'
  | 'support'
  | 'profile'
  | 'notifications'
  | 'settings';

// ========================================================
// PHASE 15 — COMMUNICATION HUB, AUTOMATION, REMINDERS
// ========================================================

export type CommunicationChannel = 'EMAIL' | 'WHATSAPP';
export type CommunicationType = 'TRANSACTIONAL' | 'MARKETING';

export type CommunicationCategory =
  | 'Proposal'
  | 'Invoice'
  | 'Payment'
  | 'Receipt'
  | 'Reminder'
  | 'Follow-up'
  | 'Welcome'
  | 'Support'
  | 'General';

export type CommunicationStatus =
  | 'Draft'
  | 'Queued'
  | 'Sending'
  | 'Sent'
  | 'Delivered'
  | 'Read'
  | 'Bounced'
  | 'Failed'
  | 'Scheduled'
  | 'Cancelled'
  | 'WHATSAPP_OPENED';

export interface CommunicationAttachment {
  name: string;
  url?: string;
  fileUrl?: string;
  type?: string;
  size?: number;
  category?: 'Proposal PDF' | 'Invoice PDF' | 'Receipt PDF' | 'Customer Document' | 'File';
  storagePath?: string;
}

export interface CommunicationRecord {
  id: string;
  channel: CommunicationChannel;
  type: CommunicationType;
  category: CommunicationCategory;
  direction: 'OUTBOUND' | 'INBOUND';
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  leadId?: string;
  proposalId?: string;
  proposalNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  ticketId?: string;
  ticketNumber?: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  attachments?: CommunicationAttachment[];
  senderId: string;
  senderName: string;
  senderEmail?: string;
  status: CommunicationStatus;
  errorCategory?: string;
  errorMessage?: string;
  provider?: 'smtp' | 'resend' | 'sendgrid' | 'whatsapp_click_to_chat' | 'whatsapp_cloud_api' | 'none';
  providerMessageId?: string;
  threadId?: string;
  idempotencyKey?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  retryCount?: number;
  maxRetries?: number;
  lastRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateItem {
  id: string;
  templateId: string;
  name: string;
  subject: string;
  body: string;
  category: CommunicationCategory;
  status: 'Active' | 'Inactive';
  variables?: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplateItem {
  id: string;
  templateId: string;
  name: string;
  language: string;
  category: string;
  body: string;
  providerTemplateId?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
}

export type FollowupReminderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type FollowupReminderStatus = 'Pending' | 'Completed' | 'Cancelled' | 'Overdue';

export interface FollowupReminder {
  id: string;
  reminderId: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  stsId?: string;
  proposalId?: string;
  proposalNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  ticketId?: string;
  ticketNumber?: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  title: string;
  message: string;
  dueAt: string;
  priority: FollowupReminderPriority;
  status: FollowupReminderStatus;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  idempotencyKey?: string;
}

export type ScheduledMessageStatus = 'Scheduled' | 'Processing' | 'Sent' | 'Failed' | 'Cancelled';

export interface ScheduledCommunication {
  id: string;
  scheduledMessageId: string;
  type: CommunicationChannel;
  recipient: string;
  customerId?: string;
  customerName?: string;
  templateId?: string;
  templateName?: string;
  subject?: string;
  body: string;
  category: CommunicationCategory;
  communicationType: CommunicationType;
  scheduledAt: string;
  status: ScheduledMessageStatus;
  relatedRecordType?: 'Customer' | 'Lead' | 'Proposal' | 'Invoice' | 'Ticket';
  relatedRecordId?: string;
  relatedRecordNumber?: string;
  attachments?: CommunicationAttachment[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  processedAt?: string;
  errorMessage?: string;
  idempotencyKey?: string;
}

export interface AutomationConfigs {
  id?: string;
  proposalFollowup: {
    enabled: boolean;
    waitDays: number;
    sendEmail: boolean;
    sendWhatsApp: boolean;
    createReminder: boolean;
    reminderPriority: FollowupReminderPriority;
    templateId?: string;
  };
  invoiceReminder: {
    enabled: boolean;
    daysBeforeDue: number;
    onDueDate: boolean;
    daysAfterDue: number;
    sendEmail: boolean;
    sendWhatsApp: boolean;
    createReminder: boolean;
    templateId?: string;
  };
  paymentReceiptEmail: {
    enabled: boolean;
    templateId?: string;
  };
  supportNotifications: {
    enabled: boolean;
    notifyOnCreate: boolean;
    notifyOnReply: boolean;
    notifyOnResolve: boolean;
  };
  customerWelcome: {
    enabled: boolean;
    templateId?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface AutomationLogRecord {
  id: string;
  automationId: string;
  trigger: string;
  customerId?: string;
  customerName?: string;
  relatedRecordId?: string;
  relatedRecordType?: string;
  relatedRecordNumber?: string;
  action: string;
  status: 'SUCCESS' | 'SKIPPED_DUPLICATE' | 'SKIPPED_OPTED_OUT' | 'SKIPPED_NOT_MET' | 'FAILED';
  idempotencyKey: string;
  executedAt: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface CustomerConsentRecord {
  id: string;
  customerId: string;
  customerName?: string;
  channel: CommunicationChannel;
  purpose: 'Transactional' | 'Marketing';
  status: 'Opted In' | 'Opted Out';
  source: 'Customer Portal' | 'CRM Admin' | 'Unsubscribe Link' | 'Direct Request';
  timestamp: string;
  updatedBy?: string;
  notes?: string;
}

export interface CommunicationSettingsRecord {
  id?: string;
  defaultSenderName: string;
  defaultSenderEmail: string;
  replyTo: string;
  whatsappBusinessPhone?: string;
  whatsappBusinessAccountId?: string;
  whatsappConfigured?: boolean;
  dailySendLimit?: number;
  rateLimitMinutes?: number;
  marketingOptOutFooter?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type CommunicationHubTab =
  | 'overview'
  | 'email'
  | 'whatsapp'
  | 'templates'
  | 'scheduled'
  | 'reminders'
  | 'history'
  | 'automation'
  | 'settings';

// ==========================================
// PHASE 16 — PRODUCT, SERVICE, INVENTORY & PURCHASES
// ==========================================

export interface ProductCategory {
  id: string;
  categoryId: string; // e.g. CAT-2026-0001
  name: string;
  description?: string;
  type?: 'product' | 'service' | 'both';
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'Opening Stock'
  | 'Purchase'
  | 'Sale'
  | 'Adjustment'
  | 'Return'
  | 'Damaged'
  | 'Transfer'
  | 'Reservation'
  | 'Release'
  | 'Deduction';

export interface InventoryMovement {
  id: string;
  movementId: string;
  productId: string;
  productCode?: string;
  productName?: string;
  type: StockMovementType;
  quantity: number; // positive for addition, negative for reduction (or relative delta)
  referenceType?: 'Purchase Order' | 'Invoice' | 'Proposal' | 'Manual Adjustment' | 'Return' | 'Damaged' | 'Opening Stock' | string;
  referenceId?: string;
  previousStock: number;
  newStock: number;
  previousReserved?: number;
  newReserved?: number;
  reason: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export type PurchaseStatus =
  | 'Draft'
  | 'Ordered'
  | 'Partially Received'
  | 'Received'
  | 'Cancelled';

export interface SupplierRecord {
  id: string;
  supplierId: string; // e.g. SUP-2026-0001
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id?: string;
  productId: string;
  productCode?: string;
  productName?: string;
  productSnapshot?: Partial<ProductItem>;
  quantity: number;
  receivedQuantity?: number;
  purchasePrice: number;
  discount: number; // percentage
  taxRate: number; // GST percentage
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseRecord {
  id: string;
  purchaseId: string; // e.g. PO-2026-0001
  purchaseNumber: string;
  supplierId: string;
  supplierSnapshot: SupplierRecord;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount?: number;
  purchaseDate: string; // YYYY-MM-DD
  expectedDate?: string; // YYYY-MM-DD
  status: PurchaseStatus;
  notes?: string;
  receivedItems?: {
    productId: string;
    receivedQuantity: number;
    receivedAt: string;
    receivedBy?: string;
  }[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSpecificPrice {
  id: string;
  pricingId: string;
  customerId: string;
  customerName?: string;
  productId: string;
  productCode?: string;
  productName?: string;
  specialPrice: number;
  validFrom: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  status: 'Active' | 'Inactive' | 'Expired';
  createdAt: string;
  updatedAt: string;
}

export interface ProductSettings {
  id: string; // 'default'
  productCodePrefix: string; // 'PRD'
  serviceCodePrefix: string; // 'SRV'
  purchaseNumberPrefix: string; // 'PO'
  supplierCodePrefix: string; // 'SUP'
  stockTracking: boolean;
  allowNegativeStock: boolean;
  lowStockThreshold: number;
  defaultTaxRate: number;
  maxDiscountPercent: number;
  requirePriceOverrideReason: boolean;
  deductStockOn: 'Invoice Issued' | 'Invoice Paid' | 'Manual';
  updatedAt?: string;
  updatedBy?: string;
}

export interface InventoryStockSummary {
  productId: string;
  productCode: string;
  productName: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumQuantity: number;
  stockStatus: 'Available' | 'Low Stock' | 'Out of Stock' | 'Not Tracked';
  sellingPrice: number;
  purchasePrice?: number;
  estimatedGrossMargin?: number;
  estimatedGrossMarginPct?: number;
}

// ============================================================================
// PHASE 17: HR, EMPLOYEE MANAGEMENT, ATTENDANCE, LEAVE, TASKS & PAYROLL
// ============================================================================

export type EmploymentStatus =
  | 'Active'
  | 'Probation'
  | 'On Leave'
  | 'Suspended'
  | 'Inactive'
  | 'Exited';

export type DataScope =
  | 'Own Records'
  | 'Team Records'
  | 'Department Records'
  | 'All Records';

export interface EmployeeAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface EmployeeEmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface EmployeeBankAccountDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  branch?: string;
}

export interface EmployeeSalaryDetails {
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  ctc?: number;
  paymentMode?: 'Bank Transfer' | 'Cheque' | 'Cash';
}

export interface EmployeeRecord {
  id: string; // doc id
  employeeId: string; // unique code, e.g. EMP-2026-0001
  employeeCode: string; // unique code, e.g. EMP-2026-0001
  firstName: string;
  lastName: string;
  name: string; // formatted full name
  email: string;
  phone: string;
  profileImage?: string;
  designation: string;
  designationId?: string;
  department: string;
  departmentId?: string;
  roleId: string;
  roleName?: string;
  dataScope: DataScope;
  managerId?: string;
  managerName?: string;
  joiningDate: string; // YYYY-MM-DD
  employmentStatus: EmploymentStatus;
  address?: EmployeeAddress;
  emergencyContact?: EmployeeEmergencyContact;
  bankAccountDetails?: EmployeeBankAccountDetails;
  salaryDetails?: EmployeeSalaryDetails;
  uid?: string; // Firebase Auth UID if login access enabled
  hasLoginAccess: boolean;
  permissions?: EmployeePermissions;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
}

export interface DepartmentRecord {
  id: string;
  departmentId: string; // DEP-001
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface DesignationRecord {
  id: string;
  designationId: string; // DES-001
  name: string;
  departmentId: string;
  departmentName?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface RoleRecord {
  id: string;
  roleId: string; // e.g. ROLE-001
  name: string;
  description?: string;
  dataScope: DataScope;
  permissions: EmployeePermissions;
  isSystem?: boolean;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskStatus = 'Todo' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled';

export interface TaskRecord {
  id: string;
  taskId: string; // e.g. TSK-2026-0001
  taskNumber: string;
  title: string;
  description: string;
  assignedTo: string; // employeeId or uid
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  leadName?: string;
  proposalId?: string;
  proposalNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'Half Day'
  | 'Half-Day'
  | 'Absent'
  | 'Leave'
  | 'Holiday';

export interface AttendanceCorrection {
  originalCheckIn?: string;
  originalCheckOut?: string;
  correctedCheckIn?: string;
  correctedCheckOut?: string;
  reason: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
}

export interface AttendanceRecord {
  id: string;
  attendanceId: string; // ATT-2026-0001
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  department?: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO string / server timestamp
  checkOut?: string; // ISO string / server timestamp
  status: AttendanceStatus;
  workDuration?: number; // duration in minutes
  workDurationMinutes?: number; // alias
  workDurationFormatted?: string; // e.g. "8h 15m"
  isLate?: boolean; // alias
  source: 'Web' | 'Mobile' | 'System';
  notes?: string;
  isCorrected?: boolean;
  correction?: AttendanceCorrection;
  correctionHistory?: AttendanceCorrection[];
  originalCheckIn?: string;
  originalCheckOut?: string;
  correctedCheckIn?: string;
  correctedCheckOut?: string;
  correctionReason?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRecord {
  id: string;
  leaveId: string; // LV-2026-0001
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  department?: string;
  leaveType: string;
  leaveTypeId?: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  startDate?: string; // alias
  endDate?: string; // alias
  numberOfDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveTypeRecord {
  id: string;
  leaveTypeId: string; // LT-001
  name: string;
  code: string;
  annualLimit: number;
  carryForward: boolean;
  description?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface HolidayRecord {
  id: string;
  holidayId: string; // HOL-2026-001
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  status: 'Active' | 'Inactive';
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeActivityRecord {
  id: string;
  activityId: string;
  employeeId: string;
  employeeName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface LoginHistoryRecord {
  id: string;
  historyId: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  loginTime: string;
  logoutTime?: string;
  sessionStatus: 'Active' | 'Closed' | 'Expired';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  payrollId: string; // PAY-2026-0001
  monthYear: string; // e.g. "2026-09"
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  totalWorkingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  halfDays: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: 'Draft' | 'Approved' | 'Paid';
  paidDate?: string;
  paymentReference?: string;
  generatedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
}

/* =========================================================================
   PHASE 20: ADVANCED REPORTING, MIS, ANALYTICS & MANAGEMENT DASHBOARD
   ========================================================================= */

export type ReportCategory = 'sales' | 'finance' | 'operations' | 'hr';

export type ReportId =
  | 'sales'
  | 'leads'
  | 'sts'
  | 'calls'
  | 'followups'
  | 'followups_today'
  | 'proposals'
  | 'invoices'
  | 'collection'
  | 'receivables'
  | 'aging'
  | 'expenses'
  | 'profitability'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'attendance'
  | 'leave';

export interface ReportDefinition {
  id: ReportId;
  name: string;
  category: ReportCategory;
  description: string;
  allowedRoles: UserRole[];
  path: string;
}

export interface UniversalReportFilter {
  datePreset: 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'This Month' | 'Last Month' | 'This Quarter' | 'Last Quarter' | 'This Year' | 'Last Year' | 'Custom';
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  customerId?: string;
  department?: string;
  productId?: string;
  serviceId?: string;
  category?: string;
  status?: string;
  source?: string;
  paymentMethod?: string;
}

export interface ReportExportRecord {
  id: string;
  reportId: string;
  reportName: string;
  format: 'excel' | 'csv' | 'pdf';
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  dateRange: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filters: Record<string, any>;
  rowCount: number;
  summary?: Record<string, any>;
  fileName: string;
  fileUrl?: string;
}

export interface ScheduledReportRecord {
  id: string;
  reportId: ReportId;
  reportName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // e.g. "09:00"
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  recipients: string[]; // Email addresses
  recipientRoles: UserRole[];
  format: 'excel' | 'csv' | 'pdf';
  filters?: Partial<UniversalReportFilter>;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface ReportAuditLog {
  id: string;
  action: 'report_generated' | 'report_exported' | 'report_downloaded' | 'scheduled_created' | 'scheduled_modified' | 'scheduled_deleted';
  reportId: string;
  reportName: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  details?: string;
  format?: 'excel' | 'csv' | 'pdf';
  filtersApplied?: Record<string, any>;
}

export type DashboardWidgetId =
  | 'kpi_sales'
  | 'kpi_collection'
  | 'kpi_activity'
  | 'kpi_employee'
  | 'kpi_inventory'
  | 'kpi_finance'
  | 'alert_low_stock'
  | 'alert_overdue_payment'
  | 'alert_today_followups'
  | 'alert_tasks'
  | 'chart_sales_trend'
  | 'chart_revenue_expense';

export interface DashboardConfiguration {
  id: string;
  userId: string;
  visibleWidgets: DashboardWidgetId[];
  widgetOrder: DashboardWidgetId[];
  updatedAt: string;
}


