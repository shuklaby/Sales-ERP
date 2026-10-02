import * as XLSX from 'xlsx';
import { Customer, Lead, UserProfile } from '../types/crm';

export interface ColumnMapping {
  field: string;
  label: string;
  required: boolean;
  detectedColumn: string;
}

export interface MatchedRecordInfo {
  id: string;
  docId: string;
  type: 'customer' | 'lead';
  companyName: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  gstNumber?: string;
  status: string;
  assignedEmployeeName?: string;
  existingData: any;
}

export type DuplicateStatus = 'new' | 'exact_duplicate' | 'possible_duplicate' | 'intra_batch_duplicate';
export type RowAction = 'new' | 'update' | 'skip';

export interface ParsedRowRecord {
  rowIndex: number; // original Excel/CSV 1-indexed row number (excluding header)
  companyName: string;
  contactPerson: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  leadSource?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: string;
  estimatedValue?: number;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  notes?: string;
  rawRow: Record<string, any>;
  isValid: boolean;
  errors: string[];
  duplicateStatus: DuplicateStatus;
  matchedRecord?: MatchedRecordInfo;
  action: RowAction;
  isExampleRow?: boolean;
}

export interface BulkValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newCount: number;
  exactDuplicateCount: number;
  possibleDuplicateCount: number;
  updateCount: number;
  skipCount: number;
  records: ParsedRowRecord[];
  columnMappings: ColumnMapping[];
  detectedColumns: string[];
}

// ==================== PHONE & VALUE NORMALIZERS ====================

export function normalizePhoneNumber(raw?: any): { normalized: string; display: string } {
  if (!raw) return { normalized: '', display: '' };
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');

  // Detect Indian Mobile Formats (10 digits, or with 91/0 prefix)
  if (digits.length === 10) {
    return {
      normalized: digits,
      display: `${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  } else if (digits.length === 11 && digits.startsWith('0')) {
    const clean = digits.slice(1);
    return {
      normalized: clean,
      display: `${clean.slice(0, 5)} ${clean.slice(5)}`,
    };
  } else if (digits.length === 12 && digits.startsWith('91')) {
    const clean = digits.slice(2);
    return {
      normalized: clean,
      display: `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`,
    };
  } else if (digits.length > 6) {
    return {
      normalized: digits,
      display: str,
    };
  }

  return { normalized: digits, display: str };
}

export function normalizeEmail(raw?: any): string {
  if (!raw) return '';
  return String(raw).trim().toLowerCase();
}

export function normalizeGST(raw?: any): string {
  if (!raw) return '';
  return String(raw).trim().toUpperCase().replace(/[\s-]/g, '');
}

export function normalizeCompanyName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\b(private|pvt|ltd|limited|llp|inc|corp|corporation)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==================== DATE NORMALIZER ====================

export function parseExcelDate(raw: any): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return '';
    return raw.toISOString().split('T')[0];
  }

  // If number (Excel serial date representation)
  if (typeof raw === 'number' && raw > 30000 && raw < 70000) {
    try {
      const utcDays = Math.floor(raw - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      return dateInfo.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  const str = String(raw).trim();
  if (!str) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
}

// ==================== COLUMN SYNONYMS DICTIONARY ====================

const FIELD_SYNONYMS: Record<string, string[]> = {
  companyName: ['company name', 'company', 'business name', 'organization', 'client', 'account name', 'firm name', 'client name'],
  contactPerson: ['contact person', 'contact name', 'person name', 'person', 'contact', 'name', 'poc', 'representative'],
  mobile: ['mobile', 'phone', 'mobile number', 'contact number', 'phone number', 'cell', 'primary phone', 'tel'],
  alternateMobile: ['alternate mobile', 'alternate number', 'alt mobile', 'phone 2', 'secondary phone', 'alternate phone', 'alt phone'],
  email: ['email', 'email id', 'e-mail', 'email address', 'mail'],
  gstNumber: ['gst number', 'gst', 'gstin', 'tax id', 'vat number'],
  address: ['address', 'street', 'street address', 'office address', 'location'],
  city: ['city', 'town'],
  state: ['state', 'province'],
  pincode: ['pincode', 'pin', 'zip', 'zip code', 'postal code', 'postal'],
  leadSource: ['lead source', 'source', 'channel', 'campaign', 'origin'],
  assignedEmployee: ['assigned employee', 'employee', 'sales rep', 'agent', 'owner', 'assigned to', 'rep', 'executive'],
  status: ['status', 'lead status', 'customer status', 'stage'],
  estimatedValue: ['estimated value', 'deal value', 'value', 'amount', 'budget', 'expected revenue', 'deal size'],
  nextFollowUpDate: ['next follow-up date', 'follow-up date', 'follow up date', 'next followup', 'followup date', 'due date', 'follow-up'],
  nextFollowUpTime: ['next follow-up time', 'follow-up time', 'follow up time', 'time'],
  notes: ['notes', 'remarks', 'requirement', 'comments', 'description', 'details'],
};

export const CUSTOMER_FIELDS_CONFIG = [
  { field: 'companyName', label: 'Company Name', required: true },
  { field: 'contactPerson', label: 'Contact Person', required: false },
  { field: 'mobile', label: 'Mobile Number', required: true },
  { field: 'alternateMobile', label: 'Alternate Mobile', required: false },
  { field: 'email', label: 'Email Address', required: false },
  { field: 'gstNumber', label: 'GST Number', required: false },
  { field: 'address', label: 'Address', required: false },
  { field: 'city', label: 'City', required: false },
  { field: 'state', label: 'State', required: false },
  { field: 'pincode', label: 'Pincode', required: false },
  { field: 'leadSource', label: 'Lead Source', required: false },
  { field: 'assignedEmployee', label: 'Assigned Employee', required: false },
  { field: 'status', label: 'Customer Status', required: false },
  { field: 'nextFollowUpDate', label: 'Next Follow-up Date', required: false },
  { field: 'nextFollowUpTime', label: 'Next Follow-up Time', required: false },
  { field: 'notes', label: 'Notes / Remarks', required: false },
];

export const LEAD_FIELDS_CONFIG = [
  { field: 'companyName', label: 'Company Name', required: true },
  { field: 'contactPerson', label: 'Contact Person', required: false },
  { field: 'mobile', label: 'Mobile Number', required: true },
  { field: 'email', label: 'Email Address', required: false },
  { field: 'gstNumber', label: 'GST Number', required: false },
  { field: 'address', label: 'Address', required: false },
  { field: 'city', label: 'City', required: false },
  { field: 'state', label: 'State', required: false },
  { field: 'pincode', label: 'Pincode', required: false },
  { field: 'leadSource', label: 'Lead Source', required: false },
  { field: 'assignedEmployee', label: 'Assigned Employee', required: false },
  { field: 'status', label: 'Lead Status', required: false },
  { field: 'estimatedValue', label: 'Estimated Value', required: false },
  { field: 'nextFollowUpDate', label: 'Next Follow-up Date', required: false },
  { field: 'nextFollowUpTime', label: 'Next Follow-up Time', required: false },
  { field: 'notes', label: 'Notes / Remarks', required: false },
];

// Valid Status Constants
export const VALID_CUSTOMER_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Meeting',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
  'Inactive',
  'Follow-up',
];

export const VALID_LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
  'Junk',
  'Interested',
  'Meeting',
];

export function mapStatusFuzzy(rawStatus: string, type: 'customers' | 'leads'): string {
  if (!rawStatus) return 'New';
  const clean = rawStatus.trim().toLowerCase();

  const validList = type === 'customers' ? VALID_CUSTOMER_STATUSES : VALID_LEAD_STATUSES;
  const exact = validList.find((s) => s.toLowerCase() === clean);
  if (exact) return exact;

  if (clean.includes('follow') || clean.includes('call')) {
    return type === 'customers' ? 'Follow-up' : 'Contacted';
  }
  if (clean.includes('won') || clean.includes('convert') || clean.includes('closed won')) return 'Won';
  if (clean.includes('lost') || clean.includes('dropped') || clean.includes('closed lost')) return 'Lost';
  if (clean.includes('meet')) return 'Meeting';
  if (clean.includes('prop') || clean.includes('quote')) return type === 'customers' ? 'Proposal Sent' : 'Proposal';
  if (clean.includes('negot')) return 'Negotiation';
  if (clean.includes('interest')) return 'Interested';
  if (clean.includes('qualif')) return 'Qualified';
  if (clean.includes('junk') || clean.includes('spam')) return type === 'leads' ? 'Junk' : 'Inactive';
  if (clean.includes('inactive')) return 'Inactive';

  return 'New';
}

// ==================== PARSE FILE & DETECT COLUMNS ====================

export async function readSpreadsheetFile(
  file: File
): Promise<{ rawRows: Record<string, any>[]; columns: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const columns: string[] = [];
  if (rawRows.length > 0) {
    Object.keys(rawRows[0]).forEach((k) => {
      const trimmed = k.trim();
      if (trimmed && !columns.includes(trimmed)) columns.push(trimmed);
    });
  }

  return { rawRows, columns };
}

export function autoDetectMappings(
  detectedColumns: string[],
  targetType: 'customers' | 'leads'
): ColumnMapping[] {
  const config = targetType === 'customers' ? CUSTOMER_FIELDS_CONFIG : LEAD_FIELDS_CONFIG;

  return config.map((item) => {
    let matchedCol = '';
    const synonyms = FIELD_SYNONYMS[item.field] || [item.label.toLowerCase()];

    for (const col of detectedColumns) {
      const lowerCol = col.toLowerCase().replace(/[\s_-]/g, ' ').trim();
      const directMatch = synonyms.some((syn) => {
        const lowerSyn = syn.toLowerCase().replace(/[\s_-]/g, ' ').trim();
        return lowerCol === lowerSyn || lowerCol.includes(lowerSyn) || lowerSyn.includes(lowerCol);
      });

      if (directMatch) {
        matchedCol = col;
        break;
      }
    }

    return {
      field: item.field,
      label: item.label,
      required: item.required,
      detectedColumn: matchedCol,
    };
  });
}

// ==================== VALIDATION & DEDUPLICATION ====================

export function validateAndDeduplicateRows(
  rawRows: Record<string, any>[],
  columnMappings: ColumnMapping[],
  targetType: 'customers' | 'leads',
  existingCustomers: Customer[],
  existingLeads: Lead[],
  employees: UserProfile[]
): BulkValidationSummary {
  // Mapping lookup map
  const mappingMap = new Map<string, string>();
  columnMappings.forEach((m) => {
    if (m.detectedColumn) {
      mappingMap.set(m.field, m.detectedColumn);
    }
  });

  // Build Normalized Lookups for Existing Records
  const existingMobilesMap = new Map<string, MatchedRecordInfo>();
  const existingEmailsMap = new Map<string, MatchedRecordInfo>();
  const existingGstsMap = new Map<string, MatchedRecordInfo>();

  existingCustomers.forEach((c) => {
    const { normalized } = normalizePhoneNumber(c.mobile);
    const info: MatchedRecordInfo = {
      id: c.customerId,
      docId: c.id,
      type: 'customer',
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      mobile: c.mobile,
      email: c.email,
      gstNumber: c.gstNumber,
      status: c.status,
      assignedEmployeeName: c.assignedEmployeeName,
      existingData: c,
    };
    if (normalized) existingMobilesMap.set(normalized, info);
    if (c.email) existingEmailsMap.set(normalizeEmail(c.email), info);
    if (c.gstNumber) existingGstsMap.set(normalizeGST(c.gstNumber), info);
  });

  existingLeads.forEach((l) => {
    const { normalized } = normalizePhoneNumber(l.mobile);
    const info: MatchedRecordInfo = {
      id: l.leadId,
      docId: l.id,
      type: 'lead',
      companyName: l.companyName,
      contactPerson: l.contactPerson,
      mobile: l.mobile,
      email: l.email,
      gstNumber: l.gstNumber,
      status: l.status,
      assignedEmployeeName: l.assignedEmployeeName,
      existingData: l,
    };
    if (normalized && !existingMobilesMap.has(normalized)) existingMobilesMap.set(normalized, info);
    if (l.email && !existingEmailsMap.has(normalizeEmail(l.email))) existingEmailsMap.set(normalizeEmail(l.email), info);
    if (l.gstNumber && !existingGstsMap.has(normalizeGST(l.gstNumber))) existingGstsMap.set(normalizeGST(l.gstNumber), info);
  });

  // Track intra-batch occurrences
  const batchMobilesSeen = new Map<string, number>();
  const batchEmailsSeen = new Map<string, number>();
  const batchGstsSeen = new Map<string, number>();

  const records: ParsedRowRecord[] = [];

  rawRows.forEach((row, idx) => {
    const rowIndex = idx + 2; // Row 1 is header
    const getVal = (fieldKey: string): string => {
      const colName = mappingMap.get(fieldKey);
      if (!colName) return '';
      const v = row[colName];
      return v !== undefined && v !== null ? String(v).trim() : '';
    };

    const companyName = getVal('companyName');
    const contactPerson = getVal('contactPerson');
    const rawMobile = getVal('mobile');
    const alternateMobile = getVal('alternateMobile');
    const rawEmail = getVal('email');
    const rawGst = getVal('gstNumber');
    const address = getVal('address');
    const city = getVal('city');
    const state = getVal('state');
    const pincode = getVal('pincode');
    const leadSource = getVal('leadSource') || 'Bulk Import';
    const rawEmployee = getVal('assignedEmployee');
    const rawStatus = getVal('status');
    const estimatedValueStr = getVal('estimatedValue');
    const nextFollowUpDate = parseExcelDate(getVal('nextFollowUpDate'));
    const nextFollowUpTime = getVal('nextFollowUpTime');
    const notes = getVal('notes');

    // Detect if this is an example row from sample template
    const isExampleRow =
      companyName.includes('[EXAMPLE') ||
      companyName.includes('DO NOT IMPORT') ||
      companyName.toLowerCase().includes('sample company') ||
      notes.includes('example row for reference');

    const errors: string[] = [];

    // 1. Mandatory Validations
    if (!companyName) {
      errors.push('Company Name is required');
    }

    const { normalized: normMobile, display: displayMobile } = normalizePhoneNumber(rawMobile);
    if (!rawMobile) {
      errors.push('Mobile number is mandatory');
    } else if (normMobile.length < 10) {
      errors.push(`Invalid mobile number format (${rawMobile}) - requires at least 10 digits`);
    }

    // 2. Format Validations
    const normEmail = normalizeEmail(rawEmail);
    if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      errors.push(`Invalid email format (${rawEmail})`);
    }

    const normGst = normalizeGST(rawGst);
    if (rawGst && normGst.length !== 15) {
      errors.push(`Invalid GSTIN format (${rawGst}) - must be 15 alphanumeric characters`);
    }

    if (pincode && pincode.replace(/\D/g, '').length !== 6) {
      errors.push(`Invalid postal pincode (${pincode}) - must be 6 digits`);
    }

    // 3. Employee Resolution (Section 19)
    let assignedEmployeeId = '';
    let assignedEmployeeName = '';
    if (rawEmployee) {
      const cleanEmp = rawEmployee.toLowerCase();
      const matchedEmp = employees.find(
        (e) =>
          (e.name && e.name.toLowerCase() === cleanEmp) ||
          (e.email && e.email.toLowerCase() === cleanEmp) ||
          (e.employeeId && e.employeeId.toLowerCase() === cleanEmp)
      );

      if (matchedEmp) {
        assignedEmployeeId = matchedEmp.uid || matchedEmp.id;
        assignedEmployeeName = matchedEmp.name;
      } else {
        errors.push(`Assigned employee "${rawEmployee}" not found in corporate directory`);
      }
    }

    // 4. Status Validation & Normalization (Section 20)
    const normalizedStatus = mapStatusFuzzy(rawStatus, targetType);

    // 5. Estimated Value Validation (Leads)
    let estimatedValue: number | undefined = undefined;
    if (estimatedValueStr) {
      const cleanVal = estimatedValueStr.replace(/[₹,$\s]/g, '');
      const parsedVal = parseFloat(cleanVal);
      if (isNaN(parsedVal) || parsedVal < 0) {
        errors.push(`Estimated value must be a valid positive number (${estimatedValueStr})`);
      } else {
        estimatedValue = parsedVal;
      }
    }

    // 6. Deduplication Engine (Section 7, 8, 9)
    let duplicateStatus: DuplicateStatus = 'new';
    let matchedRecord: MatchedRecordInfo | undefined = undefined;

    // Check against Firestore
    let matchedExisting: MatchedRecordInfo | undefined = undefined;
    if (normMobile && existingMobilesMap.has(normMobile)) {
      matchedExisting = existingMobilesMap.get(normMobile);
    } else if (normEmail && existingEmailsMap.has(normEmail)) {
      matchedExisting = existingEmailsMap.get(normEmail);
    } else if (normGst && existingGstsMap.has(normGst)) {
      matchedExisting = existingGstsMap.get(normGst);
    }

    if (matchedExisting) {
      matchedRecord = matchedExisting;
      const compNormA = normalizeCompanyName(companyName);
      const compNormB = normalizeCompanyName(matchedExisting.companyName);

      if (compNormA === compNormB) {
        duplicateStatus = 'exact_duplicate';
      } else {
        duplicateStatus = 'possible_duplicate';
      }
    } else {
      // Check intra-batch duplication
      if (normMobile && batchMobilesSeen.has(normMobile)) {
        duplicateStatus = 'intra_batch_duplicate';
        errors.push(`Duplicate mobile within file (same as Row #${batchMobilesSeen.get(normMobile)})`);
      } else if (normEmail && batchEmailsSeen.has(normEmail)) {
        duplicateStatus = 'intra_batch_duplicate';
        errors.push(`Duplicate email within file (same as Row #${batchEmailsSeen.get(normEmail)})`);
      } else if (normGst && batchGstsSeen.has(normGst)) {
        duplicateStatus = 'intra_batch_duplicate';
        errors.push(`Duplicate GST within file (same as Row #${batchGstsSeen.get(normGst)})`);
      }
    }

    if (normMobile) batchMobilesSeen.set(normMobile, rowIndex);
    if (normEmail) batchEmailsSeen.set(normEmail, rowIndex);
    if (normGst) batchGstsSeen.set(normGst, rowIndex);

    const isValid = errors.length === 0 && !isExampleRow;
    // Default action (Section 9): Skip if duplicate or invalid, 'new' if clean new record
    let action: RowAction = isValid && duplicateStatus === 'new' ? 'new' : 'skip';

    records.push({
      rowIndex,
      companyName,
      contactPerson,
      mobile: displayMobile || rawMobile,
      alternateMobile,
      email: normEmail || rawEmail,
      gstNumber: normGst || rawGst,
      address,
      city,
      state,
      pincode,
      leadSource,
      assignedEmployeeId,
      assignedEmployeeName,
      status: normalizedStatus,
      estimatedValue,
      nextFollowUpDate,
      nextFollowUpTime,
      notes,
      rawRow: row,
      isValid,
      errors,
      duplicateStatus,
      matchedRecord,
      action,
      isExampleRow,
    });
  });

  const validRows = records.filter((r) => r.isValid).length;
  const invalidRows = records.filter((r) => !r.isValid && !r.isExampleRow).length;
  const newCount = records.filter((r) => r.isValid && r.duplicateStatus === 'new').length;
  const exactDuplicateCount = records.filter((r) => r.duplicateStatus === 'exact_duplicate').length;
  const possibleDuplicateCount = records.filter((r) => r.duplicateStatus === 'possible_duplicate').length;

  return {
    totalRows: records.length,
    validRows,
    invalidRows,
    newCount,
    exactDuplicateCount,
    possibleDuplicateCount,
    updateCount: records.filter((r) => r.action === 'update').length,
    skipCount: records.filter((r) => r.action === 'skip').length,
    records,
    columnMappings,
    detectedColumns: Array.from(mappingMap.values()),
  };
}

// ==================== TEMPLATES GENERATION (Section 2, 3) ====================

export function downloadCustomerTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = [
    'Company Name',
    'Contact Person',
    'Mobile',
    'Alternate Mobile',
    'Email',
    'GST Number',
    'Address',
    'City',
    'State',
    'Pincode',
    'Lead Source',
    'Assigned Employee',
    'Status',
    'Next Follow-up Date',
    'Next Follow-up Time',
    'Notes',
  ];

  const exampleRow = {
    'Company Name': '[EXAMPLE - DO NOT IMPORT] Acme Global Industries',
    'Contact Person': 'Rohan Gupta',
    Mobile: '9876543210',
    'Alternate Mobile': '9876543211',
    Email: 'rohan.gupta@acme-global.com',
    'GST Number': '27ABCDE1234F1Z5',
    Address: 'Plot 101, Phase 2, Industrial Corridor',
    City: 'Pune',
    State: 'Maharashtra',
    Pincode: '411018',
    'Lead Source': 'Website Inbound',
    'Assigned Employee': 'Sales Rep',
    Status: 'New',
    'Next Follow-up Date': '2026-10-15',
    'Next Follow-up Time': '11:00 AM',
    Notes: 'Inquiry for high-speed network core switches and annual AMC coverage.',
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');

  const fileName = `Customer_Import_Template.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
}

export function downloadLeadTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = [
    'Company Name',
    'Contact Person',
    'Mobile',
    'Email',
    'GST Number',
    'Address',
    'City',
    'State',
    'Pincode',
    'Lead Source',
    'Assigned Employee',
    'Status',
    'Estimated Value',
    'Next Follow-up Date',
    'Next Follow-up Time',
    'Notes',
  ];

  const exampleRow = {
    'Company Name': '[EXAMPLE - DO NOT IMPORT] Apex Robotics Pvt Ltd',
    'Contact Person': 'Sunil Mehta',
    Mobile: '9812345678',
    Email: 'sunil@apexrobotics.example.com',
    'GST Number': '29ABCDE5678G1Z2',
    Address: '42, Electronic City Phase 1',
    City: 'Bengaluru',
    State: 'Karnataka',
    Pincode: '560100',
    'Lead Source': 'Trade Show',
    'Assigned Employee': 'Sales Rep',
    Status: 'Qualified',
    'Estimated Value': '350000',
    'Next Follow-up Date': '2026-10-18',
    'Next Follow-up Time': '02:30 PM',
    Notes: 'Requires enterprise cloud firewall and Wi-Fi 7 access points deployment.',
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  const fileName = `Lead_Import_Template.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
}

// ==================== ERROR REPORT EXPORT (Section 12, 26) ====================

export function exportErrorReport(
  records: ParsedRowRecord[],
  fileName: string,
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const rejectedOrDuplicates = records.filter(
    (r) => !r.isValid || r.duplicateStatus !== 'new' || r.action === 'skip'
  );

  const reportData = rejectedOrDuplicates.map((r) => ({
    'Original Row #': r.rowIndex,
    'Company Name': r.companyName || '-',
    'Contact Person': r.contactPerson || '-',
    Mobile: r.mobile || '-',
    Email: r.email || '-',
    GSTIN: r.gstNumber || '-',
    Status: r.status,
    'Validation Errors': r.errors.length > 0 ? r.errors.join('; ') : 'None',
    'Duplicate Category':
      r.duplicateStatus === 'exact_duplicate'
        ? 'Exact Duplicate in CRM'
        : r.duplicateStatus === 'possible_duplicate'
        ? 'Possible Duplicate in CRM'
        : r.duplicateStatus === 'intra_batch_duplicate'
        ? 'Duplicate Row in Same File'
        : 'Clean New Record',
    'Matched CRM Record': r.matchedRecord
      ? `${r.matchedRecord.companyName} (${r.matchedRecord.id}) - Mobile: ${r.matchedRecord.mobile}`
      : 'None',
    'Action Taken': r.action.toUpperCase(),
  }));

  const ws = XLSX.utils.json_to_sheet(reportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import_Error_Diagnostics');

  const outName = `${fileName}_Diagnostics_${Date.now()}.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, outName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, outName, { bookType: 'xlsx' });
  }
}

// ==================== COMPATIBILITY & HELPER EXPORTS ====================

export interface BulkValidationResult {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  records: ParsedRowRecord[];
  rejectedRecords: ParsedRowRecord[];
  columnMappings: ColumnMapping[];
  detectedColumns: string[];
}

export function downloadSampleTemplate(type: 'customers' | 'leads', format: 'xlsx' | 'csv' = 'xlsx') {
  if (type === 'customers') {
    downloadCustomerTemplate(format);
  } else {
    downloadLeadTemplate(format);
  }
}

export function exportRejectedToCsv(records: ParsedRowRecord[], fileName: string = 'Rejected_Records') {
  exportErrorReport(records, fileName, 'csv');
}

export async function parseAndValidateBulkFile(
  file: File,
  customers: Customer[],
  leads: Lead[],
  targetType: 'customers' | 'leads' = 'customers',
  employees: UserProfile[] = []
): Promise<BulkValidationResult> {
  const { rawRows, columns } = await readSpreadsheetFile(file);
  const columnMappings = autoDetectMappings(columns, targetType);
  const summary = validateAndDeduplicateRows(rawRows, columnMappings, targetType, customers, leads, employees);
  const rejectedRecords = summary.records.filter((r) => !r.isValid || r.duplicateStatus !== 'new');
  return {
    total: summary.totalRows,
    valid: summary.newCount,
    duplicates: summary.exactDuplicateCount + summary.possibleDuplicateCount,
    invalid: summary.invalidRows,
    records: summary.records,
    rejectedRecords,
    columnMappings: summary.columnMappings,
    detectedColumns: summary.detectedColumns,
  };
}
