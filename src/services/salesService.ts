import {
  Lead,
  STSRecord,
  Customer,
  SalesSourceRecord,
  SalesStatusRecord,
  UserProfile,
  CallRecord,
  FollowUpRecord,
  ProposalRecord,
} from '../types/crm';

export const DEFAULT_SALES_SOURCES: SalesSourceRecord[] = [
  { id: 'src_website', name: 'Website', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_indiamart', name: 'IndiaMART', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_referral', name: 'Referral', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_whatsapp', name: 'WhatsApp', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_phone', name: 'Phone', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_email', name: 'Email', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_google', name: 'Google', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_social_media', name: 'Social Media', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_walk_in', name: 'Walk-in', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'src_other', name: 'Other', isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

export const DEFAULT_SALES_STATUSES: SalesStatusRecord[] = [
  { id: 'st_new', name: 'New', color: 'blue', stageOrder: 1, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_contacted', name: 'Contacted', color: 'indigo', stageOrder: 2, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_interested', name: 'Interested', color: 'amber', stageOrder: 3, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_followup', name: 'Follow-up', color: 'orange', stageOrder: 4, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_proposal_sent', name: 'Proposal Sent', color: 'purple', stageOrder: 5, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_negotiation', name: 'Negotiation', color: 'cyan', stageOrder: 6, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_won', name: 'Won', color: 'emerald', stageOrder: 7, isWon: true, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_lost', name: 'Lost', color: 'rose', stageOrder: 8, isLost: true, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_converted', name: 'Converted', color: 'teal', stageOrder: 9, isWon: true, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'st_on_hold', name: 'On Hold', color: 'slate', stageOrder: 10, isActive: true, isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

/**
 * Generates unique Lead Number in the format: LEAD-2026-0001
 */
export function generateUniqueLeadNumber(existingLeads: Lead[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LEAD-${currentYear}-`;
  
  let maxSeq = 0;
  for (const lead of existingLeads) {
    const code = lead.leadNumber || lead.leadId;
    if (code && code.startsWith(prefix)) {
      const numPart = code.substring(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generates unique STS Number in the format: STS-2026-0001
 */
export function generateUniqueSTSNumber(existingSTS: STSRecord[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `STS-${currentYear}-`;

  let maxSeq = 0;
  for (const sts of existingSTS) {
    const code = sts.stsNumber || sts.stsId;
    if (code && code.startsWith(prefix)) {
      const numPart = code.substring(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export interface DuplicateDetectionResult {
  hasDuplicate: boolean;
  matches: Array<{
    type: 'phone' | 'email' | 'gst';
    customer: Customer;
    detail: string;
  }>;
}

/**
 * Clean phone string for comparison: removes non-digits, strips leading +91 or 0
 */
export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  return digits;
}

/**
 * Clean GST string for comparison
 */
export function normalizeGst(rawGst?: string): string {
  if (!rawGst) return '';
  return rawGst.trim().toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Check if a lead or new customer details conflict with existing Customers
 */
export function detectDuplicateCustomer(
  params: {
    phone?: string;
    email?: string;
    gstNumber?: string;
    excludeCustomerId?: string;
  },
  existingCustomers: Customer[]
): DuplicateDetectionResult {
  const cleanPhone = normalizePhone(params.phone);
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanGst = normalizeGst(params.gstNumber);

  const matches: DuplicateDetectionResult['matches'] = [];

  for (const cust of existingCustomers) {
    if (params.excludeCustomerId && (cust.id === params.excludeCustomerId || cust.customerId === params.excludeCustomerId)) {
      continue;
    }

    // Phone match
    if (cleanPhone && cleanPhone.length >= 7) {
      const custPhone = normalizePhone(cust.mobile || cust.phone || '');
      const custAlt = normalizePhone(cust.alternateMobile || cust.alternateNumber || '');
      if (custPhone === cleanPhone || custAlt === cleanPhone) {
        matches.push({
          type: 'phone',
          customer: cust,
          detail: `Phone number ${params.phone} matches existing customer "${cust.companyName}" (${cust.customerId})`,
        });
        continue;
      }
    }

    // Email match
    if (cleanEmail && cleanEmail.includes('@')) {
      const custEmail = (cust.email || '').trim().toLowerCase();
      if (custEmail && custEmail === cleanEmail) {
        matches.push({
          type: 'email',
          customer: cust,
          detail: `Email ${params.email} matches existing customer "${cust.companyName}" (${cust.customerId})`,
        });
        continue;
      }
    }

    // GST match
    if (cleanGst && cleanGst.length >= 10) {
      const custGst = normalizeGst(cust.gstNumber);
      if (custGst && custGst === cleanGst) {
        matches.push({
          type: 'gst',
          customer: cust,
          detail: `GST Number ${cleanGst} matches existing customer "${cust.companyName}" (${cust.customerId})`,
        });
      }
    }
  }

  return {
    hasDuplicate: matches.length > 0,
    matches,
  };
}

export interface ParsedLeadImportRow {
  rowIndex: number;
  companyName: string;
  contactPerson: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gstNumber?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  source?: string;
  industry?: string;
  requirement?: string;
  estimatedValue?: number;
  assignedEmployee?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  nextFollowUp?: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
  duplicateInfo?: string;
}

export function validateAndPrepareLeadImport(
  rawRows: Record<string, any>[],
  existingCustomers: Customer[],
  existingLeads: Lead[],
  employees: UserProfile[]
): {
  totalRows: number;
  validRows: ParsedLeadImportRow[];
  invalidRows: ParsedLeadImportRow[];
  duplicateRows: ParsedLeadImportRow[];
  allParsed: ParsedLeadImportRow[];
} {
  const validRows: ParsedLeadImportRow[] = [];
  const invalidRows: ParsedLeadImportRow[] = [];
  const duplicateRows: ParsedLeadImportRow[] = [];
  const allParsed: ParsedLeadImportRow[] = [];

  rawRows.forEach((row, idx) => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
        // Case-insensitive fallback
        const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rk of Object.keys(row)) {
          if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerK) {
            const v = String(row[rk]).trim();
            if (v !== '') return v;
          }
        }
      }
      return '';
    };

    const companyName = getVal(['Company Name', 'CompanyName', 'Company', 'Customer Name', 'Client Name']);
    const contactPerson = getVal(['Contact Person', 'ContactPerson', 'Name', 'Contact']);
    const phone = getVal(['Phone', 'Mobile', 'Phone Number', 'Mobile Number', 'Contact Number']);
    const alternatePhone = getVal(['Alternate Phone', 'Alternate Mobile', 'Alt Phone', 'AlternateNumber']);
    const email = getVal(['Email', 'Email Address', 'E-mail']);
    const gstNumber = getVal(['GST Number', 'GST', 'GSTIN', 'Tax ID']);
    const website = getVal(['Website', 'URL', 'Web']);
    const address = getVal(['Address', 'Street Address', 'Location']);
    const city = getVal(['City']);
    const state = getVal(['State']);
    const pincode = getVal(['Pincode', 'Zip', 'Postal Code', 'Zip Code']);
    const source = getVal(['Source', 'Lead Source']) || 'Import';
    const industry = getVal(['Industry', 'Sector']);
    const requirement = getVal(['Requirement', 'Requirements', 'Description', 'Notes']);
    const estValStr = getVal(['Estimated Value', 'EstimatedValue', 'Value', 'Deal Value', 'Amount']);
    const estimatedValue = estValStr ? parseFloat(estValStr.replace(/[^0-9.]/g, '')) || 0 : 0;
    const assignedEmpName = getVal(['Assigned Employee', 'Employee', 'Assigned To', 'Sales Rep']);
    const status = getVal(['Status', 'Lead Status']) || 'New';
    const priorityVal = getVal(['Priority', 'Lead Priority']) as 'Low' | 'Medium' | 'High' | 'Urgent';
    const priority = (['Low', 'Medium', 'High', 'Urgent'].includes(priorityVal) ? priorityVal : 'Medium') as 'Low' | 'Medium' | 'High' | 'Urgent';
    const nextFollowUp = getVal(['Next Follow-up', 'Next Followup', 'Follow-up Date', 'Followup']);

    // Match employee
    let assignedEmployeeId = '';
    let matchedEmpName = '';
    if (assignedEmpName) {
      const emp = employees.find(
        (e) =>
          e.name.toLowerCase().includes(assignedEmpName.toLowerCase()) ||
          e.email.toLowerCase() === assignedEmpName.toLowerCase()
      );
      if (emp) {
        assignedEmployeeId = emp.uid;
        matchedEmpName = emp.name;
      }
    }

    const item: ParsedLeadImportRow = {
      rowIndex: idx + 1,
      companyName,
      contactPerson: contactPerson || companyName,
      phone,
      alternatePhone,
      email,
      gstNumber,
      website,
      address,
      city,
      state,
      pincode,
      source,
      industry,
      requirement,
      estimatedValue,
      assignedEmployee: assignedEmpName,
      assignedEmployeeId,
      assignedEmployeeName: matchedEmpName,
      status,
      priority,
      nextFollowUp,
      isValid: true,
    };

    // Validation
    if (!companyName && !contactPerson) {
      item.isValid = false;
      item.validationError = 'Company Name or Contact Person is required';
      invalidRows.push(item);
    } else if (!phone && !email) {
      item.isValid = false;
      item.validationError = 'Phone number or Email is required for contacting lead';
      invalidRows.push(item);
    } else {
      // Check duplicate
      const dupCheck = detectDuplicateCustomer({ phone, email, gstNumber }, existingCustomers);
      const isLeadDup = existingLeads.some(
        (l) =>
          (phone && normalizePhone(l.mobile || l.phone) === normalizePhone(phone)) ||
          (email && email.includes('@') && (l.email || '').toLowerCase() === email.toLowerCase())
      );

      if (dupCheck.hasDuplicate) {
        item.isDuplicate = true;
        item.duplicateInfo = dupCheck.matches[0].detail;
        duplicateRows.push(item);
        validRows.push(item); // Valid, but flagged as duplicate for user confirmation
      } else if (isLeadDup) {
        item.isDuplicate = true;
        item.duplicateInfo = 'A Lead with matching phone or email already exists';
        duplicateRows.push(item);
        validRows.push(item);
      } else {
        validRows.push(item);
      }
    }

    allParsed.push(item);
  });

  return {
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    duplicateRows,
    allParsed,
  };
}

export interface ParsedSTSImportRow {
  rowIndex: number;
  customerName: string;
  phone: string;
  email?: string;
  requirement: string;
  assignedEmployee?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: string;
  talkStatus?: 'Yes' | 'No' | 'Callback' | 'Not Reachable';
  nextFollowUp?: string;
  remarks?: string;
  amount?: number;
  isValid: boolean;
  validationError?: string;
}

export function validateAndPrepareSTSImport(
  rawRows: Record<string, any>[],
  employees: UserProfile[]
): {
  totalRows: number;
  validRows: ParsedSTSImportRow[];
  invalidRows: ParsedSTSImportRow[];
  allParsed: ParsedSTSImportRow[];
} {
  const validRows: ParsedSTSImportRow[] = [];
  const invalidRows: ParsedSTSImportRow[] = [];
  const allParsed: ParsedSTSImportRow[] = [];

  rawRows.forEach((row, idx) => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
        const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rk of Object.keys(row)) {
          if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerK) {
            const v = String(row[rk]).trim();
            if (v !== '') return v;
          }
        }
      }
      return '';
    };

    const customerName = getVal(['Customer', 'Customer Name', 'Client', 'Company Name', 'Company']);
    const phone = getVal(['Phone', 'Mobile', 'Contact Number']);
    const email = getVal(['Email', 'E-mail']);
    const requirement = getVal(['Requirement', 'Requirements', 'Scope', 'Description']);
    const assignedEmpName = getVal(['Assigned Employee', 'Employee', 'Assigned To']);
    const status = getVal(['Status', 'STS Status']) || 'Draft';
    const rawTalk = getVal(['Talk Status', 'Talk Hui', 'TalkStatus']);
    const talkStatus = (['Yes', 'No', 'Callback', 'Not Reachable'].includes(rawTalk) ? rawTalk : undefined) as ParsedSTSImportRow['talkStatus'];
    const nextFollowUp = getVal(['Next Follow-up', 'Next Followup', 'Follow-up Date']);
    const remarks = getVal(['Remarks', 'Notes', 'Comments']);
    const rawAmt = getVal(['Amount', 'Value', 'Estimated Value']);
    const amount = rawAmt ? parseFloat(rawAmt.replace(/[^0-9.]/g, '')) || 0 : 0;

    let assignedEmployeeId = '';
    let matchedEmpName = '';
    if (assignedEmpName) {
      const emp = employees.find(
        (e) =>
          e.name.toLowerCase().includes(assignedEmpName.toLowerCase()) ||
          e.email.toLowerCase() === assignedEmpName.toLowerCase()
      );
      if (emp) {
        assignedEmployeeId = emp.uid;
        matchedEmpName = emp.name;
      }
    }

    const item: ParsedSTSImportRow = {
      rowIndex: idx + 1,
      customerName,
      phone,
      email,
      requirement: requirement || 'Requirement details pending specification',
      assignedEmployee: assignedEmpName,
      assignedEmployeeId,
      assignedEmployeeName: matchedEmpName,
      status,
      talkStatus,
      nextFollowUp,
      remarks,
      amount,
      isValid: true,
    };

    if (!customerName) {
      item.isValid = false;
      item.validationError = 'Customer Name / Company Name is required';
      invalidRows.push(item);
    } else {
      validRows.push(item);
    }

    allParsed.push(item);
  });

  return {
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    allParsed,
  };
}

/**
 * Calculates aggregate sales pipeline analytics
 */
export function calculateSalesMetrics(params: {
  leads: Lead[];
  stsRecords: STSRecord[];
  calls: CallRecord[];
  followups: FollowUpRecord[];
  proposals: ProposalRecord[];
  employees: UserProfile[];
}) {
  const { leads, stsRecords, calls, followups, proposals, employees } = params;

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === 'Won' || l.isConverted).length;
  const lostLeads = leads.filter((l) => l.status === 'Lost').length;
  const activeLeads = leads.filter((l) => !['Won', 'Lost', 'Converted', 'Archived'].includes(String(l.status)));
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const totalPipelineValue = leads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
  const wonPipelineValue = leads
    .filter((l) => l.status === 'Won' || l.isConverted)
    .reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

  // STS Metrics
  const totalSTS = stsRecords.length;
  const closedSTS = stsRecords.filter((s) => s.status === 'Closed' || s.status === 'Won').length;
  const totalSTSValue = stsRecords.reduce((sum, s) => sum + (Number(s.amount || s.estimatedValue) || 0), 0);

  // Follow-ups today & overdue
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayFollowups = followups.filter((f) => f.date === todayStr && f.status !== 'Completed' && f.status !== 'Cancelled');
  const overdueFollowups = followups.filter((f) => f.date < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled');
  const completedFollowups = followups.filter((f) => f.status === 'Completed');

  // Calls today
  const callsToday = calls.filter((c) => (c.initiatedAt || c.dateTime || c.createdAt).startsWith(todayStr));

  // Lead Sources breakdown
  const sourceMap: Record<string, { count: number; wonCount: number; totalValue: number }> = {};
  leads.forEach((l) => {
    const src = l.source || l.leadSource || 'Direct';
    if (!sourceMap[src]) {
      sourceMap[src] = { count: 0, wonCount: 0, totalValue: 0 };
    }
    sourceMap[src].count++;
    sourceMap[src].totalValue += Number(l.estimatedValue) || 0;
    if (l.status === 'Won' || l.isConverted) {
      sourceMap[src].wonCount++;
    }
  });

  const sourcePerformance = Object.entries(sourceMap).map(([source, stats]) => ({
    source,
    count: stats.count,
    wonCount: stats.wonCount,
    totalValue: stats.totalValue,
    conversionRate: stats.count > 0 ? Math.round((stats.wonCount / stats.count) * 100) : 0,
  }));

  // Employee conversion ranking
  const employeePerformance = employees.map((emp) => {
    const empLeads = leads.filter((l) => l.assignedEmployeeId === emp.uid);
    const empWon = empLeads.filter((l) => l.status === 'Won' || l.isConverted).length;
    const empCalls = calls.filter((c) => c.employeeId === emp.uid);
    const empFollowups = followups.filter((f) => f.employeeId === emp.uid && f.status === 'Completed');
    const empProposals = proposals.filter((p) => p.assignedEmployeeId === emp.uid || p.createdBy === emp.uid);
    const empWonValue = empLeads
      .filter((l) => l.status === 'Won' || l.isConverted)
      .reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

    return {
      employeeId: emp.uid,
      employeeName: emp.name,
      department: emp.department || 'Sales',
      leadsCount: empLeads.length,
      wonCount: empWon,
      conversionRate: empLeads.length > 0 ? Math.round((empWon / empLeads.length) * 100) : 0,
      totalWonValue: empWonValue,
      callsCount: empCalls.length,
      followupsCompleted: empFollowups.length,
      proposalsCount: empProposals.length,
    };
  }).sort((a, b) => b.totalWonValue - a.totalWonValue);

  return {
    totalLeads,
    wonLeads,
    lostLeads,
    activeLeads: activeLeads.length,
    conversionRate,
    totalPipelineValue,
    wonPipelineValue,
    totalSTS,
    closedSTS,
    totalSTSValue,
    dueTodayFollowupsCount: dueTodayFollowups.length,
    overdueFollowupsCount: overdueFollowups.length,
    completedFollowupsCount: completedFollowups.length,
    callsTodayCount: callsToday.length,
    sourcePerformance,
    employeePerformance,
  };
}
