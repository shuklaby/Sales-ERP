import { Customer, Lead, ProposalRecord, UserProfile } from '../types/crm';

export interface TemplateVariables {
  customerName?: string;
  companyName?: string;
  proposalNumber?: string;
  proposalAmount?: string | number;
  proposalLink?: string;
  employeeName?: string;
  contactPerson?: string;
  grandTotal?: string | number;
  validUntil?: string;
  employeePhone?: string;
  employeeEmail?: string;
  secureProposalLink?: string;
  [key: string]: string | number | undefined;
}

/**
 * Strips dangerous HTML, script tags, event handlers and unsafe schemes
 */
export function sanitizeEmailContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:[^"']*/gi, '');
}

/**
 * Extracts and prepares template variables from available CRM objects
 */
export function buildTemplateVariables(
  proposal?: ProposalRecord | null,
  customer?: Customer | null,
  lead?: Lead | null,
  employee?: UserProfile | null,
  appUrl?: string
): TemplateVariables {
  // Official company name
  const officialCompanyName = 'SparkGenTechnology';

  // Customer name
  const custName =
    customer?.contactPerson ||
    customer?.companyName ||
    lead?.contactPerson ||
    lead?.companyName ||
    proposal?.customerSnapshot?.contactPerson ||
    proposal?.customerName ||
    'Valued Client';

  const propNum = proposal?.proposalNumber || '';
  const total = proposal?.grandTotal !== undefined ? proposal.grandTotal.toLocaleString('en-IN') : '';
  const validUntil = proposal?.validUntil ? new Date(proposal.validUntil).toLocaleDateString('en-IN') : '';

  const empName = employee?.name || proposal?.assignedEmployeeName || proposal?.createdByName || 'Administrator';
  const empPhone = employee?.mobile || '+91 98765 43210';
  const empEmail = employee?.email || 'sales@sparkgentechnology.com';

  const baseUrl = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const token = proposal?.viewToken || proposal?.id || proposal?.proposalNumber;
  const proposalLink = token ? `${baseUrl}/proposal/${token}` : '';

  return {
    customerName: custName,
    companyName: officialCompanyName,
    proposalNumber: propNum,
    proposalAmount: total,
    proposalLink,
    employeeName: empName,
    // Backwards compatible aliases
    contactPerson: custName,
    grandTotal: total,
    validUntil,
    employeePhone: empPhone,
    employeeEmail: empEmail,
    secureProposalLink: proposalLink,
  };
}

/**
 * Replaces {{variable}} placeholders with real values.
 * Never inserts "undefined" or "null".
 * Strips dangerous HTML/script injection.
 */
export function interpolateEmailTemplate(templateText: string, variables: TemplateVariables): string {
  if (!templateText) return '';

  const sanitized = sanitizeEmailContent(templateText);

  return sanitized.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    return sanitizeEmailContent(String(val));
  });
}
